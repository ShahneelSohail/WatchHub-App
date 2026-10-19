import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { advanceOrder, cancelOrder, orderInclude, toOrderDto } from '../orders/order.service';
import { idParams } from './admin.crud';

const ORDER_STATUSES = ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

const listQuery = pageQuery.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});

const optionalText = (max: number) => z.string().trim().max(max).optional().transform(value => value || undefined);

const statusSchema = z.object({
  status: z.enum(['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  note: optionalText(300),
  trackingNumber: optionalText(60),
  courierName: optionalText(60),
});

const noteSchema = z.object({ adminNote: z.string().trim().max(1000).transform(value => value || null) });

const adminInclude = { ...orderInclude, user: { select: { id: true, name: true, email: true } } } satisfies Prisma.OrderInclude;

const loadOrder = async (id: number) => {
  const found = await prisma.order.findUnique({ where: { id }, include: adminInclude });
  if (!found) throw notFound('Order not found.');
  const { user, ...order } = found;
  return { ...toOrderDto(order), user };
};

export const orderAdminRouter = Router();

orderAdminRouter.get(
  '/orders',
  validate('query', listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status, q } = req.query as unknown as z.infer<typeof listQuery>;
    const orderId = q && /^#?\d+$/.test(q) ? Number(q.replace('#', '')) : undefined;
    const where: Prisma.OrderWhereInput = {
      status,
      OR: q ? [{ id: orderId }, { user: { email: { contains: q, mode: 'insensitive' } } }, { user: { name: { contains: q, mode: 'insensitive' } } }] : undefined,
    };
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({ where, include: adminInclude, orderBy: { createdAt: 'desc' }, ...paginate({ page, pageSize }) }),
    ]);
    res.json({ data: orders.map(({ user, ...order }) => ({ ...toOrderDto(order), user })), meta: pageMeta(page, pageSize, total) });
  })
);

orderAdminRouter.get(
  '/orders/:id',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    res.json({ data: await loadOrder(Number(req.params.id)) });
  })
);

orderAdminRouter.patch(
  '/orders/:id/status',
  validate('params', idParams),
  validate('body', statusSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { status, ...shipment } = req.body as z.infer<typeof statusSchema>;
    const order = await prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!order) throw notFound('Order not found.');

    if (status === 'CANCELLED') {
      if (order.status === 'DELIVERED') throw badRequest('A delivered order cannot be cancelled.');
      await cancelOrder(id, shipment.note ?? 'Cancelled by the store');
    } else {
      await advanceOrder(id, { status, ...shipment });
    }
    res.json({ data: await loadOrder(id) });
  })
);

orderAdminRouter.patch(
  '/orders/:id/note',
  validate('params', idParams),
  validate('body', noteSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.order.update({ where: { id }, data: { adminNote: req.body.adminNote } });
    res.json({ data: await loadOrder(id) });
  })
);
