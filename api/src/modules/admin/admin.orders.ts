import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { currentUser } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CANCELLABLE, advanceOrder, cancelOrder, orderInclude, sendPaymentReminder, toOrderDto } from '../orders/order.service';
import { issueRefund } from '../orders/refund.service';
import { idParams } from './admin.crud';

const ORDER_STATUSES = ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

const REFUND_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const SORTS = {
  date: { defaultDir: 'desc', orderBy: direction => ({ createdAt: direction }) },
  total: { defaultDir: 'desc', orderBy: direction => ({ total: direction }) },
  customer: { defaultDir: 'asc', orderBy: direction => ({ user: { name: direction } }) },
  id: { defaultDir: 'desc', orderBy: direction => ({ id: direction }) },
} satisfies Record<string, { defaultDir: Prisma.SortOrder; orderBy: (direction: Prisma.SortOrder) => Prisma.OrderOrderByWithRelationInput }>;

const searchQuery = z.object({ q: z.string().trim().max(100).optional() });

const listQuery = pageQuery.extend({
  ...searchQuery.shape,
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'PARTLY_REFUNDED', 'REFUNDED']).optional(),
  userId: z.coerce.number().int().positive().optional(),
  sort: z.enum(['date', 'total', 'customer', 'id']).default('date'),
  dir: z.enum(['asc', 'desc']).optional(),
});

const refundListQuery = pageQuery.extend(searchQuery.shape);

const optionalText = (max: number) => z.string().trim().max(max).optional().transform(value => value || undefined);

const statusSchema = z.object({
  status: z.enum(['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  note: optionalText(300),
  trackingNumber: optionalText(60),
  courierName: optionalText(60),
  restock: z.boolean().default(true),
});

const noteSchema = z.object({ adminNote: z.string().trim().max(1000).transform(value => value || null) });
const orderNoteSchema = z.object({ body: z.string().trim().min(1, 'Write a note').max(1000) });
const refundSchema = z.object({ amount: z.coerce.number().positive('Enter an amount greater than $0'), reason: z.string().trim().min(1, 'Choose a reason').max(200) });
const bulkConfirmSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(100) });

const adminInclude = { ...orderInclude, user: { select: { id: true, name: true, email: true } } } satisfies Prisma.OrderInclude;
const detailInclude = { ...adminInclude, notes: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true } } } } } satisfies Prisma.OrderInclude;

const orderIdMatches = (q: string): { id: number }[] => (/^#?\d+$/.test(q) ? [{ id: Number(q.replace('#', '')) }] : []);

const searchWhere = (q?: string): Prisma.OrderWhereInput => ({
  OR: q
    ? [
        ...orderIdMatches(q),
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { items: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ]
    : undefined,
});

const loadOrder = async (id: number) => {
  const found = await prisma.order.findUnique({ where: { id }, include: detailInclude });
  if (!found) throw notFound('Order not found.');
  const { user, notes, ...order } = found;
  return { ...toOrderDto(order), user, notes: notes.map(({ id: noteId, body, author, createdAt }) => ({ id: noteId, body, by: author.name, createdAt })) };
};

export const orderAdminRouter = Router();

orderAdminRouter.get(
  '/orders',
  validate('query', listQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status, paymentStatus, userId, q, sort, dir } = req.query as unknown as z.infer<typeof listQuery>;
    const where: Prisma.OrderWhereInput = { status, paymentStatus, userId, ...searchWhere(q) };
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({ where, include: adminInclude, orderBy: SORTS[sort].orderBy(dir ?? SORTS[sort].defaultDir), ...paginate({ page, pageSize }) }),
    ]);
    res.json({ data: orders.map(({ user, ...order }) => ({ ...toOrderDto(order), user })), meta: pageMeta(page, pageSize, total) });
  })
);

orderAdminRouter.get(
  '/orders/counts',
  validate('query', searchQuery),
  asyncHandler(async (req, res) => {
    const groups = await prisma.order.groupBy({ by: ['status'], where: searchWhere((req.query as z.infer<typeof searchQuery>).q), _count: true });
    const counts = Object.fromEntries(ORDER_STATUSES.map(status => [status, groups.find(group => group.status === status)?._count ?? 0]));
    res.json({ data: { all: groups.reduce((sum, group) => sum + group._count, 0), ...counts } });
  })
);

orderAdminRouter.post(
  '/orders/bulk-confirm',
  validate('body', bulkConfirmSchema),
  asyncHandler(async (req, res) => {
    const pending = await prisma.order.findMany({ where: { id: { in: req.body.ids }, status: 'PENDING' }, select: { id: true } });
    for (const { id } of pending) await advanceOrder(id, { status: 'CONFIRMED', actor: currentUser(req).name });
    res.json({ data: { confirmed: pending.length } });
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
    const { status, restock, ...shipment } = req.body as z.infer<typeof statusSchema>;
    const order = await prisma.order.findUnique({ where: { id }, select: { status: true } });
    if (!order) throw notFound('Order not found.');
    const actor = currentUser(req).name;

    if (status === 'CANCELLED') {
      if (!CANCELLABLE.admin.includes(order.status)) {
        throw badRequest(`A ${order.status.toLowerCase().replace('_', ' ')} order cannot be cancelled.`, 'CANCEL_NOT_ALLOWED');
      }
      await cancelOrder(id, shipment.note ?? 'Cancelled by the store', { restock, actor });
    } else {
      await advanceOrder(id, { status, ...shipment, actor });
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

orderAdminRouter.post(
  '/orders/:id/notes',
  validate('params', idParams),
  validate('body', orderNoteSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.orderNote.create({ data: { orderId: id, authorId: currentUser(req).id, body: req.body.body } });
    res.status(201).json({ data: await loadOrder(id) });
  })
);

orderAdminRouter.post(
  '/orders/:id/refunds',
  validate('params', idParams),
  validate('body', refundSchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await issueRefund(id, { ...(req.body as z.infer<typeof refundSchema>), actor: currentUser(req).name });
    res.status(201).json({ data: await loadOrder(id) });
  })
);

orderAdminRouter.post(
  '/orders/:id/payment-reminder',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await sendPaymentReminder(id, currentUser(req).name);
    res.json({ data: await loadOrder(id) });
  })
);

orderAdminRouter.get(
  '/refunds',
  validate('query', refundListQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q } = req.query as unknown as z.infer<typeof refundListQuery>;
    const where: Prisma.RefundWhereInput = {
      OR: q ? [...orderIdMatches(q).map(({ id }) => ({ orderId: id })), { reason: { contains: q, mode: 'insensitive' } }, { order: { user: { name: { contains: q, mode: 'insensitive' } } } }] : undefined,
    };
    const since = new Date(Date.now() - REFUND_WINDOW_DAYS * DAY_MS);
    const [total, refunds, recent, recentOrders] = await Promise.all([
      prisma.refund.count({ where }),
      prisma.refund.findMany({
        where,
        include: { order: { select: { id: true, status: true, total: true, user: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
        ...paginate({ page, pageSize }),
      }),
      prisma.refund.findMany({ where: { createdAt: { gte: since } }, select: { orderId: true, amount: true } }),
      prisma.order.count({ where: { createdAt: { gte: since }, status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] } } }),
    ]);
    const refundedOrders = new Set(recent.map(refund => refund.orderId)).size;
    res.json({
      data: refunds.map(({ amount, order, ...refund }) => ({ ...refund, amount: Number(amount), order: { id: order.id, status: order.status, total: Number(order.total) }, customer: order.user })),
      meta: {
        ...pageMeta(page, pageSize, total),
        refundedLast30Days: recent.reduce((sum, refund) => sum + Number(refund.amount), 0),
        refundCountLast30Days: recent.length,
        refundRate: recentOrders === 0 ? 0 : Math.round((refundedOrders / recentOrders) * 1000) / 10,
      },
    });
  })
);
