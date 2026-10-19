import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { currentUser } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { notify } from '../notifications/notification.service';
import { ticketInclude } from '../support/support.routes';
import { idParams } from './admin.crud';

const userQuery = pageQuery.extend({ q: z.string().trim().max(100).optional(), role: z.enum(['ADMIN', 'CUSTOMER']).optional() });
const userPatch = z.object({ isBlocked: z.boolean().optional(), role: z.enum(['ADMIN', 'CUSTOMER']).optional() });

const reviewQuery = pageQuery.extend({ status: z.enum(['APPROVED', 'HIDDEN']).optional() });
const reviewPatch = z.object({
  status: z.enum(['APPROVED', 'HIDDEN']).optional(),
  adminReply: z
    .string()
    .trim()
    .max(500)
    .transform(value => value || null)
    .optional(),
});

const ticketQuery = pageQuery.extend({ status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional() });
const ticketPatch = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});
const replySchema = z.object({ message: z.string().trim().min(2, 'Please write a reply').max(2000) });

const loadTicket = async (id: number) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id }, include: { ...ticketInclude, user: { select: { id: true, name: true, email: true } } } });
  if (!ticket) throw notFound('Ticket not found.');
  return ticket;
};

export const peopleAdminRouter = Router();

peopleAdminRouter.get(
  '/users',
  validate('query', userQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q, role } = req.query as unknown as z.infer<typeof userQuery>;
    const where: Prisma.UserWhereInput = {
      role,
      OR: q ? [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] : undefined,
    };
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, phone: true, role: true, isBlocked: true, createdAt: true, _count: { select: { orders: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginate({ page, pageSize }),
      }),
    ]);
    const spent = await prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: users.map(user => user.id) }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    });
    const spentByUser = new Map(spent.map(row => [row.userId, Number(row._sum.total ?? 0)]));
    res.json({
      data: users.map(({ _count, ...user }) => ({ ...user, orderCount: _count.orders, totalSpent: spentByUser.get(user.id) ?? 0 })),
      meta: pageMeta(page, pageSize, total),
    });
  })
);

peopleAdminRouter.patch(
  '/users/:id',
  validate('params', idParams),
  validate('body', userPatch),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (id === currentUser(req).id) throw badRequest('You cannot change your own role or block yourself.');
    const user = await prisma.user.update({
      where: { id },
      data: req.body,
      select: { id: true, email: true, name: true, role: true, isBlocked: true },
    });
    res.json({ data: user });
  })
);

peopleAdminRouter.get(
  '/reviews',
  validate('query', reviewQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status } = req.query as unknown as z.infer<typeof reviewQuery>;
    const [total, reviews] = await Promise.all([
      prisma.review.count({ where: { status } }),
      prisma.review.findMany({
        where: { status },
        include: { user: { select: { name: true, email: true } }, watch: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginate({ page, pageSize }),
      }),
    ]);
    res.json({ data: reviews, meta: pageMeta(page, pageSize, total) });
  })
);

peopleAdminRouter.patch(
  '/reviews/:id',
  validate('params', idParams),
  validate('body', reviewPatch),
  asyncHandler(async (req, res) => {
    res.json({ data: await prisma.review.update({ where: { id: Number(req.params.id) }, data: req.body }) });
  })
);

peopleAdminRouter.delete(
  '/reviews/:id',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    await prisma.review.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);

peopleAdminRouter.get(
  '/tickets',
  validate('query', ticketQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, status } = req.query as unknown as z.infer<typeof ticketQuery>;
    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where: { status } }),
      prisma.supportTicket.findMany({
        where: { status },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { updatedAt: 'desc' },
        ...paginate({ page, pageSize }),
      }),
    ]);
    res.json({ data: tickets, meta: pageMeta(page, pageSize, total) });
  })
);

peopleAdminRouter.get(
  '/tickets/:id',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    res.json({ data: await loadTicket(Number(req.params.id)) });
  })
);

peopleAdminRouter.patch(
  '/tickets/:id',
  validate('params', idParams),
  validate('body', ticketPatch),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.supportTicket.update({ where: { id }, data: req.body });
    res.json({ data: await loadTicket(id) });
  })
);

peopleAdminRouter.post(
  '/tickets/:id/messages',
  validate('params', idParams),
  validate('body', replySchema),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const ticket = await loadTicket(id);
    await prisma.$transaction(async tx => {
      await tx.supportTicket.update({
        where: { id },
        data: { status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status, messages: { create: { authorId: currentUser(req).id, message: req.body.message } } },
      });
      await notify(ticket.userId, `New reply on "${ticket.subject}"`, 'Our team has replied to your support ticket.', `/support/${id}`, tx);
    });
    res.status(201).json({ data: await loadTicket(id) });
  })
);
