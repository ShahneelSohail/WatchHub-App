import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, notFound } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { watchDtos, watchInclude } from '../catalog/watch.dto';

const watchParams = z.object({ watchId: z.coerce.number().int().positive() });

const loadWishlist = async (userId: number) => {
  const rows = await prisma.wishlistItem.findMany({
    where: { userId, watch: { status: 'PUBLISHED' } },
    include: { watch: { include: watchInclude } },
    orderBy: { addedAt: 'desc' },
  });
  return watchDtos(rows.map(row => row.watch));
};

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

wishlistRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await loadWishlist(currentUser(req).id) });
  })
);

wishlistRouter.put(
  '/:watchId',
  validate('params', watchParams),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const watchId = Number(req.params.watchId);
    if (!(await prisma.watch.findFirst({ where: { id: watchId, status: 'PUBLISHED' }, select: { id: true } }))) throw notFound('Watch not found.');

    await prisma.wishlistItem.upsert({ where: { userId_watchId: { userId, watchId } }, create: { userId, watchId }, update: {} });
    res.json({ data: await loadWishlist(userId) });
  })
);

wishlistRouter.delete(
  '/:watchId',
  validate('params', watchParams),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    await prisma.wishlistItem.deleteMany({ where: { userId, watchId: Number(req.params.watchId) } });
    res.json({ data: await loadWishlist(userId) });
  })
);
