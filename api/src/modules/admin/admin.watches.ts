import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { imageUpload, MAX_IMAGES_PER_WATCH, removeUploads, uploadedPath } from '../../lib/upload';
import { validate } from '../../middleware/validate';
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
    stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
    images: z.array(z.string().min(1)).max(MAX_IMAGES_PER_WATCH, `A watch can have at most ${MAX_IMAGES_PER_WATCH} images`).default([]),
    specifications: z.record(z.string().trim().min(1).max(60), z.string().trim().max(200)).default({}),
    colors: z
      .array(z.object({ name: z.string().trim().min(1).max(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour such as #1a237e'), image: z.string().max(300).nullish().transform(value => value || null) }))
      .max(8)
      .default([]),
    hasBeltOption: z.boolean().default(false),
    hasChainOption: z.boolean().default(false),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
    isFeatured: z.boolean().default(false),
    isLimitedEdition: z.boolean().default(false),
  })
  .refine(watch => watch.salePrice === null || watch.salePrice < watch.price, { message: 'Sale price must be lower than the price', path: ['salePrice'] });

type WatchInput = z.infer<typeof watchSchema>;

const listQuery = pageQuery.extend({ q: z.string().trim().max(100).optional(), status: z.enum(['DRAFT', 'PUBLISHED']).optional() });

const slugify = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const uniqueSlug = async (name: string, ignoreId?: number): Promise<string> => {
  const base = slugify(name) || 'watch';
  for (let suffix = 1; ; suffix += 1) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`;
    if (!(await prisma.watch.findFirst({ where: { slug, NOT: { id: ignoreId } }, select: { id: true } }))) return slug;
  }
};

const toData = ({ colors, ...watch }: WatchInput) => ({ ...watch, colors: { create: colors } });

const loadWatch = async (id: number) => {
  const watch = await prisma.watch.findUnique({ where: { id }, include: watchInclude });
  if (!watch) throw notFound('Watch not found.');
  const [dto] = await watchDtos([watch]);
  return dto;
};

export const watchAdminRouter = Router();

watchAdminRouter.get(
  '/watches',
  validate('query', listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, status } = req.query as unknown as z.infer<typeof listQuery>;
    const where = {
      status,
      OR: q ? [{ name: { contains: q, mode: 'insensitive' as const } }, { sku: { contains: q, mode: 'insensitive' as const } }] : undefined,
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
