import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, forbidden, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const idParams = z.object({ id: z.coerce.number().int().positive() });

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Choose a rating from 1 to 5').max(5, 'Choose a rating from 1 to 5'),
  comment: z.string().trim().min(5, 'Please write at least 5 characters').max(1000, 'Reviews cannot exceed 1000 characters'),
});

export const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  adminReply: true,
  createdAt: true,
  user: { select: { name: true } },
} as const;

export const reviewRouter = Router();

reviewRouter.get(
  '/:id/reviews',
  validate('params', idParams),
  validate('query', pageQuery),
  asyncHandler(async (req, res) => {
    const watchId = Number(req.params.id);
    const { page, pageSize } = req.query as unknown as z.infer<typeof pageQuery>;
    const where = { watchId, status: 'APPROVED' } as const;
    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({ where, select: reviewSelect, orderBy: { createdAt: 'desc' }, ...paginate({ page, pageSize }) }),
    ]);
    res.json({ data: reviews, meta: pageMeta(page, pageSize, total) });
  })
);

reviewRouter.post(
  '/:id/reviews',
  requireAuth,
  validate('params', idParams),
  validate('body', reviewSchema),
  asyncHandler(async (req, res) => {
    const watchId = Number(req.params.id);
    const { id: userId } = currentUser(req);
    if (!(await prisma.watch.findFirst({ where: { id: watchId, status: 'PUBLISHED' }, select: { id: true } }))) throw notFound('Watch not found.');

    const purchased = await prisma.orderItem.findFirst({ where: { watchId, order: { userId, status: 'DELIVERED' } }, select: { id: true } });
    if (!purchased) throw forbidden('Only customers who received this watch can review it.');

    const { rating, comment } = req.body;
    const review = await prisma.review.upsert({
      where: { userId_watchId: { userId, watchId } },
      create: { userId, watchId, rating, comment },
      update: { rating, comment, status: 'APPROVED' },
      select: reviewSelect,
    });
    res.status(201).json({ data: review });
  })
);
