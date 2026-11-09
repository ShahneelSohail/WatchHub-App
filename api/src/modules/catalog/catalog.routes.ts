import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { email } from '../auth/auth.schemas';
import { money } from '../../lib/serialize';
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
        { sku: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
      ]
    : undefined,
});

const SEARCH_LIMIT = 6;

const searchQuery = z.object({ q: z.string().trim().min(1, 'Enter something to search for').max(100), limit: z.coerce.number().int().min(1).max(20).default(SEARCH_LIMIT) });
const emailBody = z.object({ email });
const idParams = z.object({ id: z.coerce.number().int().positive() });

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
    res.json({
      data: await prisma.banner.findMany({
        where: { isActive: true },
        include: { watch: { select: { id: true, slug: true, name: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
    });
  })
);

catalogRouter.get(
  '/faqs',
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.faq.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }) });
  })
);

catalogRouter.get(
  '/search',
  validate('query', searchQuery),
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query as unknown as z.infer<typeof searchQuery>;
    const contains = { contains: q, mode: 'insensitive' } as const;
    const [watches, brands, categories] = await Promise.all([
      prisma.watch.findMany({
        where: { status: 'PUBLISHED', OR: [{ name: contains }, { sku: contains }, { brand: { name: contains } }] },
        select: { id: true, slug: true, name: true, sku: true, price: true, salePrice: true, stock: true, images: true, brand: { select: { id: true, name: true } } },
        orderBy: { unitsSold: 'desc' },
        take: limit,
      }),
      prisma.brand.findMany({ where: { name: contains }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: limit }),
      prisma.category.findMany({ where: { name: contains }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: limit }),
    ]);
    res.json({
      data: {
        watches: watches.map(({ images, price, salePrice, ...watch }) => ({ ...watch, price: Number(price), salePrice: money(salePrice), image: images[0] ?? null })),
        brands,
        categories,
      },
    });
  })
);

catalogRouter.post(
  '/newsletter',
  validate('body', emailBody),
  asyncHandler(async (req, res) => {
    await prisma.newsletterSubscriber.upsert({ where: { email: req.body.email }, create: { email: req.body.email }, update: {} });
    res.status(201).json({ data: { subscribed: true } });
  })
);

catalogRouter.post(
  '/watches/:id/notify',
  optionalAuth,
  validate('params', idParams),
  validate('body', emailBody),
  asyncHandler(async (req, res) => {
    const watch = await prisma.watch.findFirst({ where: { id: Number(req.params.id), status: 'PUBLISHED' }, select: { id: true, stock: true } });
    if (!watch) throw notFound('Watch not found.');
    if (watch.stock > 0) throw badRequest('This watch is in stock right now.', 'IN_STOCK');

    const { email: address } = req.body;
    await prisma.stockSubscription.upsert({
      where: { watchId_email: { watchId: watch.id, email: address } },
      create: { watchId: watch.id, email: address, userId: req.user?.id },
      update: {},
    });
    res.status(201).json({ data: { subscribed: true } });
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
