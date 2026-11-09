import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { imageUpload, MAX_IMAGES_PER_WATCH, removeUploads, uploadedPath } from '../../lib/upload';
import { validate } from '../../middleware/validate';
import { releaseStockSubscriptions, stockAlertIds } from '../catalog/stock';
import { watchDtos, watchInclude } from '../catalog/watch.dto';
import { idParams } from './admin.crud';

const optionalPrice = z.preprocess(value => (value === '' ? null : value), z.coerce.number().positive().nullish().transform(value => value ?? null));

const watchSchema = z
  .object({
    sku: z.string().trim().min(1, 'SKU is required').max(40),
    name: z.string().trim().min(1, 'Name is required').max(150),
    description: z.string().trim().min(1, 'Description is required').max(3000),
    brandId: z.coerce.number().int().positive('Choose a brand'),
    categoryId: z.coerce.number().int().positive('Choose a category'),
    price: z.coerce.number().positive('Price must be greater than zero'),
    salePrice: optionalPrice,
    stock: z.coerce.number().int().min(0, 'Stock cannot be negative').default(0),
    lowStockThreshold: z.coerce.number().int().min(0, 'Threshold cannot be negative').default(5),
    images: z.array(z.string().min(1)).max(MAX_IMAGES_PER_WATCH, `A watch can have at most ${MAX_IMAGES_PER_WATCH} images`).default([]),
    specifications: z.record(z.string().trim().min(1).max(60), z.string().trim().max(200)).default({}),
    colors: z
      .array(z.object({ name: z.string().trim().min(1).max(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour such as #1a237e'), image: z.string().max(300).nullish().transform(value => value || null), stock: z.coerce.number().int().min(0, 'Stock cannot be negative').optional() }))
      .max(8)
      .default([]),
    hasBeltOption: z.boolean().default(false),
    hasChainOption: z.boolean().default(false),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
    isFeatured: z.boolean().default(false),
    isLimitedEdition: z.boolean().default(false),
    isNew: z.boolean().default(false),
  })
  .refine(watch => watch.salePrice === null || watch.salePrice < watch.price, { message: 'Sale price must be lower than the price', path: ['salePrice'] });

type WatchInput = z.infer<typeof watchSchema>;

const searchQuery = z.object({ q: z.string().trim().max(100).optional() });
const listQuery = pageQuery.extend({ ...searchQuery.shape, status: z.enum(['DRAFT', 'PUBLISHED']).optional(), stock: z.enum(['low', 'out']).optional() });
const bulkSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), action: z.enum(['publish', 'draft', 'delete']) });

const slugify = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const uniqueSlug = async (name: string, ignoreId?: number): Promise<string> => {
  const base = slugify(name) || 'watch';
  for (let suffix = 1; ; suffix += 1) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`;
    if (!(await prisma.watch.findFirst({ where: { slug, NOT: { id: ignoreId } }, select: { id: true } }))) return slug;
  }
};

const toData = ({ colors, stock, ...watch }: WatchInput) => {
  const trackColorStock = colors.some(color => color.stock !== undefined);
  return {
    ...watch,
    trackColorStock,
    stock: trackColorStock ? colors.reduce((sum, color) => sum + (color.stock ?? 0), 0) : stock,
    colors: { create: colors.map(color => ({ ...color, stock: color.stock ?? 0 })) },
  };
};

const searchWhere = (q?: string): Prisma.WatchWhereInput => ({
  OR: q ? [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }] : undefined,
});

const loadWatch = async (id: number) => {
  const watch = await prisma.watch.findUnique({ where: { id }, include: watchInclude });
  if (!watch) throw notFound('Watch not found.');
  const [dto] = await watchDtos([watch]);
  return dto;
};

export const watchAdminRouter = Router();

watchAdminRouter.get(
  '/watches/summary',
  validate('query', searchQuery),
  asyncHandler(async (req, res) => {
    const base = searchWhere((req.query as z.infer<typeof searchQuery>).q);
    const [all, published, draft, low, soldOut] = await Promise.all([
      prisma.watch.count({ where: base }),
      prisma.watch.count({ where: { ...base, status: 'PUBLISHED' } }),
      prisma.watch.count({ where: { ...base, status: 'DRAFT' } }),
      stockAlertIds(1).then(ids => prisma.watch.count({ where: { ...base, id: { in: ids } } })),
      prisma.watch.count({ where: { ...base, stock: 0 } }),
    ]);
    res.json({ data: { all, published, draft, lowStock: low, soldOut } });
  })
);

watchAdminRouter.post(
  '/watches/bulk',
  validate('body', bulkSchema),
  asyncHandler(async (req, res) => {
    const { ids, action } = req.body as z.infer<typeof bulkSchema>;
    if (action === 'delete') {
      const watches = await prisma.watch.findMany({ where: { id: { in: ids } }, select: { images: true } });
      const { count } = await prisma.watch.deleteMany({ where: { id: { in: ids } } });
      await removeUploads(watches.flatMap(watch => watch.images));
      return res.json({ data: { affected: count } });
    }
    const { count } = await prisma.watch.updateMany({ where: { id: { in: ids } }, data: { status: action === 'publish' ? 'PUBLISHED' : 'DRAFT' } });
    res.json({ data: { affected: count } });
  })
);

watchAdminRouter.get(
  '/watches',
  validate('query', listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, status, stock } = req.query as unknown as z.infer<typeof listQuery>;
    const where: Prisma.WatchWhereInput = {
      ...searchWhere(q),
      status,
      stock: stock === 'out' ? 0 : undefined,
      id: stock === 'low' ? { in: await stockAlertIds(1) } : undefined,
    };
    const [total, watches] = await Promise.all([
      prisma.watch.count({ where }),
      prisma.watch.findMany({ where, include: watchInclude, orderBy: { createdAt: 'desc' }, ...paginate({ page, pageSize }) }),
    ]);
    res.json({ data: await watchDtos(watches), meta: pageMeta(page, pageSize, total) });
  })
);

watchAdminRouter.get(
  '/watches/:id',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    res.json({ data: await loadWatch(Number(req.params.id)) });
  })
);

watchAdminRouter.post(
  '/watches',
  validate('body', watchSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as WatchInput;
    const watch = await prisma.watch.create({ data: { ...toData(input), slug: await uniqueSlug(input.name) } });
    await releaseStockSubscriptions([watch.id]);
    res.status(201).json({ data: await loadWatch(watch.id) });
  })
);

watchAdminRouter.put(
  '/watches/:id',
  validate('params', idParams),
  validate('body', watchSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const input = req.body as WatchInput;
    const existing = await prisma.watch.findUnique({ where: { id }, select: { images: true, name: true, slug: true } });
    if (!existing) throw notFound('Watch not found.');

    await prisma.$transaction([
      prisma.watchColor.deleteMany({ where: { watchId: id } }),
      prisma.watch.update({ where: { id }, data: { ...toData(input), slug: existing.name === input.name ? existing.slug : await uniqueSlug(input.name, id) } }),
    ]);
    await removeUploads(existing.images.filter(url => !input.images.includes(url)));
    await releaseStockSubscriptions([id]);
    res.json({ data: await loadWatch(id) });
  })
);

watchAdminRouter.delete(
  '/watches/:id',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    const watch = await prisma.watch.delete({ where: { id: Number(req.params.id) }, select: { images: true } });
    await removeUploads(watch.images);
    res.status(204).end();
  })
);

watchAdminRouter.post(
  '/uploads',
  imageUpload.array('images', MAX_IMAGES_PER_WATCH),
  (req, res) => {
    res.status(201).json({ data: (req.files as Express.Multer.File[]).map(uploadedPath) });
  }
);
