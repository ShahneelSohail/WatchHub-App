import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
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
  title: optionalText(120),
  subtitle: optionalText(200),
  link: optionalText(200),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
const faqSchema = z.object({
  question: text('Question', 200),
  answer: text('Answer', 1000),
  category: text('Category', 60).default('General'),
  sortOrder: z.coerce.number().int().default(0),
});
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

export const catalogAdminRouter = Router();

catalogAdminRouter.use(
  '/brands',
  crudRouter({
    schema: brandSchema,
    list: () => prisma.brand.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { watches: true } } } }),
    create: data => prisma.brand.create({ data }),
    update: (id, data) => prisma.brand.update({ where: { id }, data }),
    remove: id => prisma.brand.delete({ where: { id } }),
  })
);

catalogAdminRouter.use(
  '/categories',
  crudRouter({
    schema: categorySchema,
    list: () => prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { watches: true } } } }),
    create: data => prisma.category.create({ data }),
    update: (id, data) => prisma.category.update({ where: { id }, data }),
    remove: id => prisma.category.delete({ where: { id } }),
  })
);

catalogAdminRouter.use(
  '/banners',
  crudRouter({
    schema: bannerSchema,
    list: () => prisma.banner.findMany({ orderBy: { sortOrder: 'asc' } }),
    create: data => prisma.banner.create({ data }),
    update: (id, data) => prisma.banner.update({ where: { id }, data }),
    remove: id => prisma.banner.delete({ where: { id } }),
  })
);

catalogAdminRouter.use(
  '/faqs',
  crudRouter({
    schema: faqSchema,
    list: () => prisma.faq.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
    create: data => prisma.faq.create({ data }),
    update: (id, data) => prisma.faq.update({ where: { id }, data }),
    remove: id => prisma.faq.delete({ where: { id } }),
  })
);

catalogAdminRouter.use(
  '/coupons',
  crudRouter({
    schema: couponSchema,
    list: () => prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
    create: data => prisma.coupon.create({ data }),
    update: (id, data) => prisma.coupon.update({ where: { id }, data }),
    remove: id => prisma.coupon.delete({ where: { id } }),
  })
);
