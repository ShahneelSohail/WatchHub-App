import type { Coupon } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, conflict } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { crudRouter } from './admin.crud';

const text = (label: string, max = 150) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);
const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, 'That text is too long')
    .nullish()
    .transform(value => value || null);
const optionalDate = z.preprocess(value => (value === '' ? null : value), z.coerce.date().nullish().transform(value => value ?? null));
const optionalNumber = z.preprocess(value => (value === '' ? null : value), z.coerce.number().min(0).nullish().transform(value => value ?? null));

const brandSchema = z.object({ name: text('Brand name', 100), description: optionalText(), logoUrl: optionalText() });
const categorySchema = z.object({ name: text('Category name', 100), description: optionalText(), imageUrl: optionalText() });
const bannerSchema = z.object({
  imageUrl: text('Image', 300),
  eyebrow: optionalText(60),
  title: optionalText(120),
  subtitle: optionalText(200),
  link: optionalText(200),
  watchId: z.number().int().positive().nullish().transform(value => value ?? null),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().optional(),
});
const faqSchema = z.object({
  question: text('Question', 200),
  answer: text('Answer', 1000),
  category: text('Category', 60).default('General'),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().optional(),
});
const reorderSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(200) });
const couponSchema = z
  .object({
    code: text('Code', 40).transform(value => value.toUpperCase().replace(/\s+/g, '')),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.coerce.number().positive('Value must be greater than zero'),
    minAmount: optionalNumber,
    startsAt: optionalDate,
    expiresAt: optionalDate,
    isActive: z.boolean().default(true),
    usageLimit: optionalNumber,
    limitPerUser: optionalNumber,
  })
  .refine(coupon => coupon.type !== 'PERCENTAGE' || coupon.value <= 100, { message: 'A percentage discount cannot exceed 100', path: ['value'] });

const toCouponDto = ({ value, minAmount, ...coupon }: Coupon) => ({
  ...coupon,
  value: Number(value),
  minAmount: minAmount === null ? null : Number(minAmount),
  isExpired: coupon.expiresAt !== null && coupon.expiresAt < new Date(),
});

const guardedDelete = async (kind: 'brand' | 'category', id: number, name: string, count: number) => {
  if (count > 0) throw conflict(`${name} still has ${count} ${count === 1 ? 'watch' : 'watches'}. Move them first.`, 'IN_USE', { watchCount: count });
  await (kind === 'brand' ? prisma.brand.delete({ where: { id } }) : prisma.category.delete({ where: { id } }));
};

const reorder = (model: 'banner' | 'faq') =>
  asyncHandler(async (req, res) => {
    const { ids } = req.body as z.infer<typeof reorderSchema>;
    await prisma.$transaction(
      ids.map((id, sortOrder) => (model === 'banner' ? prisma.banner.updateMany({ where: { id }, data: { sortOrder } }) : prisma.faq.updateMany({ where: { id }, data: { sortOrder } })))
    );
    res.status(204).end();
  });

export const catalogAdminRouter = Router();

catalogAdminRouter.use(
  '/brands',
  crudRouter({
    schema: brandSchema,
    list: () => prisma.brand.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { watches: true } } } }),
    create: data => prisma.brand.create({ data }),
    update: (id, data) => prisma.brand.update({ where: { id }, data }),
    remove: async id => {
      const brand = await prisma.brand.findUniqueOrThrow({ where: { id }, include: { _count: { select: { watches: true } } } });
      await guardedDelete('brand', id, brand.name, brand._count.watches);
    },
  })
);

catalogAdminRouter.use(
  '/categories',
  crudRouter({
    schema: categorySchema,
    list: () => prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { watches: true } } } }),
    create: data => prisma.category.create({ data }),
    update: (id, data) => prisma.category.update({ where: { id }, data }),
    remove: async id => {
      const category = await prisma.category.findUniqueOrThrow({ where: { id }, include: { _count: { select: { watches: true } } } });
      await guardedDelete('category', id, category.name, category._count.watches);
    },
  })
);

catalogAdminRouter.put('/banners/reorder', validate('body', reorderSchema), reorder('banner'));

catalogAdminRouter.use(
  '/banners',
  crudRouter({
    schema: bannerSchema,
    list: () => prisma.banner.findMany({ include: { watch: { select: { id: true, name: true } } }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
    create: async ({ sortOrder, ...data }) => {
      const last = await prisma.banner.aggregate({ _max: { sortOrder: true } });
      return prisma.banner.create({ data: { ...data, sortOrder: sortOrder ?? (last._max.sortOrder ?? -1) + 1 } });
    },
    update: (id, data) => prisma.banner.update({ where: { id }, data }),
    remove: id => prisma.banner.delete({ where: { id } }),
  })
);

catalogAdminRouter.put('/faqs/reorder', validate('body', reorderSchema), reorder('faq'));

catalogAdminRouter.use(
  '/faqs',
  crudRouter({
    schema: faqSchema,
    list: () => prisma.faq.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }] }),
    create: async ({ sortOrder, ...data }) => {
      const last = await prisma.faq.aggregate({ where: { category: data.category }, _max: { sortOrder: true } });
      return prisma.faq.create({ data: { ...data, sortOrder: sortOrder ?? (last._max.sortOrder ?? -1) + 1 } });
    },
    update: (id, data) => prisma.faq.update({ where: { id }, data }),
    remove: id => prisma.faq.delete({ where: { id } }),
  })
);

catalogAdminRouter.use(
  '/coupons',
  crudRouter({
    schema: couponSchema,
    list: async () => (await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })).map(toCouponDto),
    create: async data => toCouponDto(await prisma.coupon.create({ data })),
    update: async (id, data) => toCouponDto(await prisma.coupon.update({ where: { id }, data })),
    remove: id => prisma.coupon.delete({ where: { id } }),
  })
);
