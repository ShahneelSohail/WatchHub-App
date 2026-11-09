import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { currentUser } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { notify } from '../notifications/notification.service';
import { adminTicketInclude } from '../support/support.routes';
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

const ticketStatus = z.enum(['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
const ticketQuery = pageQuery.extend({
  status: z
    .string()
    .optional()
    .transform(value => value?.split(','))
    .pipe(z.array(ticketStatus).optional()),
  q: z.string().trim().max(100).optional(),
});
const ticketPatch = z.object({
  status: ticketStatus.optional(),
  priority: z.enum(['LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});
const replySchema = z.object({
  message: z.string().trim().min(2, 'Please write a reply').max(2000),
  kind: z.enum(['ADMIN', 'INTERNAL']).default('ADMIN'),
});

const loadTicket = async (id: number) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id }, include: { ...adminTicketInclude, user: { select: { id: true, name: true, email: true } } } });
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
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          _count: { select: { orders: true } },
          addresses: { where: { isDefault: true }, select: { city: true, country: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        ...paginate({ page, pageSize }),
      }),
    ]);
    const spent = await prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: users.map(user => user.id) }, status: { not: 'CANCELLED' } },
      _sum: { total: true, refundedAmount: true },
    });
    const spentByUser = new Map(spent.map(row => [row.userId, Number(row._sum.total ?? 0) - Number(row._sum.refundedAmount ?? 0)]));
    res.json({
      data: users.map(({ _count, addresses, ...user }) => ({
        ...user,
        location: addresses[0] ? `${addresses[0].city}, ${addresses[0].country}` : null,
        orderCount: _count.orders,
        totalSpent: spentByUser.get(user.id) ?? 0,
      })),
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
    const { page, pageSize, status, q } = req.query as unknown as z.infer<typeof ticketQuery>;
    const where: Prisma.SupportTicketWhereInput = {
      status: status ? { in: status } : undefined,
      OR: q
        ? [...(/^#?\d+$/.test(q) ? [{ id: Number(q.replace('#', '')) }] : []), { subject: { contains: q, mode: 'insensitive' } }, { user: { name: { contains: q, mode: 'insensitive' } } }]
        : undefined,
    };
    const [total, tickets, statusGroups] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { message: true, kind: true, createdAt: true } },
        },
        orderBy: { updatedAt: 'desc' },
        ...paginate({ page, pageSize }),
      }),
      prisma.supportTicket.groupBy({ by: ['status'], where: { ...where, status: undefined }, _count: true }),
    ]);
    res.json({
      data: tickets.map(({ messages, ...ticket }) => ({ ...ticket, lastMessage: messages[0] ?? null })),
      meta: { ...pageMeta(page, pageSize, total), counts: Object.fromEntries(statusGroups.map(group => [group.status, group._count])) },
    });
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
    const { message, kind } = req.body as z.infer<typeof replySchema>;
    const isReply = kind === 'ADMIN';
    await prisma.$transaction(async tx => {
      await tx.supportTicket.update({
        where: { id },
        data: { status: isReply && ticket.status === 'OPEN' ? 'PENDING' : ticket.status, messages: { create: { authorId: currentUser(req).id, message, kind } } },
      });
      if (isReply) await notify(ticket.userId, `New reply on "${ticket.subject}"`, 'Our team has replied to your support ticket.', `/support/${id}`, tx);
    });
    res.status(201).json({ data: await loadTicket(id) });
  })
);
