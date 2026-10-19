import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const idParams = z.object({ id: z.coerce.number().int().positive() });

export const notificationRouter = Router();
notificationRouter.use(requireAuth);

notificationRouter.get(
  '/',
  validate('query', pageQuery),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const { page, pageSize } = req.query as unknown as z.infer<typeof pageQuery>;
    const [total, unread, items] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, readAt: null } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, ...paginate({ page, pageSize }) }),
    ]);
    res.json({ data: items, meta: { ...pageMeta(page, pageSize, total), unread } });
  })
);

notificationRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: currentUser(req).id, readAt: null }, data: { readAt: new Date() } });
    res.status(204).end();
  })
);

notificationRouter.post(
  '/:id/read',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { id: Number(req.params.id), userId: currentUser(req).id, readAt: null }, data: { readAt: new Date() } });
    res.status(204).end();
  })
);
