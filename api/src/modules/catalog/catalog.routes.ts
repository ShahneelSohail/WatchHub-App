import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { watchDtos, watchInclude } from './watch.dto';

const SORTS = {
  newest: { createdAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  popular: { unitsSold: 'desc' },
} satisfies Record<string, Prisma.WatchOrderByWithRelationInput>;

const optionalId = z.coerce.number().int().positive().optional();
const optionalPrice = z.coerce.number().min(0).optional();

export const watchListQuery = pageQuery.extend({
  q: z.string().trim().max(100).optional(),
  brandId: optionalId,
  categoryId: optionalId,
  minPrice: optionalPrice,
  maxPrice: optionalPrice,
  inStock: z.enum(['true', 'false']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).default('newest'),
});

type WatchListQuery = z.infer<typeof watchListQuery>;

export const watchWhere = ({ q, brandId, categoryId, minPrice, maxPrice, inStock, featured }: WatchListQuery): Prisma.WatchWhereInput => ({
  status: 'PUBLISHED',
  brandId,
  categoryId,
  isFeatured: featured === 'true' ? true : undefined,
  stock: inStock === 'true' ? { gt: 0 } : undefined,
  price: minPrice === undefined && maxPrice === undefined ? undefined : { gte: minPrice, lte: maxPrice },
  OR: q
    ? [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
      ]
    : undefined,
});

export const catalogRouter = Router();

catalogRouter.get(
  '/brands',
  asyncHandler(async (_req, res) => {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { watches: { where: { status: 'PUBLISHED' } } } } } });
    res.json({ data: brands.map(({ _count, ...brand }) => ({ ...brand, watchCount: _count.watches })) });
  })
);

catalogRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { watches: { where: { status: 'PUBLISHED' } } } } } });
    res.json({ data: categories.map(({ _count, ...category }) => ({ ...category, watchCount: _count.watches })) });
  })
);

catalogRouter.get(
  '/banners',
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.banner.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }) });
  })
);

catalogRouter.get(
  '/faqs',
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.faq.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }) });
  })
);

catalogRouter.get(
  '/watches',
  validate('query', watchListQuery),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as WatchListQuery;
    const where = watchWhere(query);
    const [total, watches] = await Promise.all([
      prisma.watch.count({ where }),
      prisma.watch.findMany({ where, include: watchInclude, orderBy: SORTS[query.sort], ...paginate(query) }),
    ]);
    res.json({ data: await watchDtos(watches), meta: pageMeta(query.page, query.pageSize, total) });
  })
);

catalogRouter.get(
  '/watches/:slug',
  asyncHandler(async (req, res) => {
    const watch = await prisma.watch.findFirst({ where: { slug: String(req.params.slug), status: 'PUBLISHED' }, include: watchInclude });
    if (!watch) throw notFound('Watch not found.');
    const [dto] = await watchDtos([watch]);
    res.json({ data: dto });
  })
);
