import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const idParams = z.object({ id: z.coerce.number().int().positive() });
const message = z.string().trim().min(2, 'Please write a message').max(2000, 'Messages cannot exceed 2000 characters');

const ticketSchema = z.object({
  subject: z.string().trim().min(3, 'Please add a subject').max(150, 'Subject cannot exceed 150 characters'),
  message,
});

export const ticketInclude = {
  messages: { orderBy: { createdAt: 'asc' }, include: { author: { select: { name: true, role: true } } } },
} as const;

const findOwnTicket = async (id: number, userId: number) => {
  const ticket = await prisma.supportTicket.findFirst({ where: { id, userId }, include: ticketInclude });
  if (!ticket) throw notFound('Ticket not found.');
  return ticket;
};

export const supportRouter = Router();
supportRouter.use(requireAuth);

supportRouter.get(
  '/tickets',
  asyncHandler(async (req, res) => {
    res.json({ data: await prisma.supportTicket.findMany({ where: { userId: currentUser(req).id }, orderBy: { updatedAt: 'desc' } }) });
  })
);

supportRouter.post(
  '/tickets',
  validate('body', ticketSchema),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const ticket = await prisma.supportTicket.create({
      data: { userId, subject: req.body.subject, messages: { create: { authorId: userId, message: req.body.message } } },
      include: ticketInclude,
    });
    res.status(201).json({ data: ticket });
  })
);

supportRouter.get(
  '/tickets/:id',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    res.json({ data: await findOwnTicket(Number(req.params.id), currentUser(req).id) });
  })
);

supportRouter.post(
  '/tickets/:id/messages',
  validate('params', idParams),
  validate('body', z.object({ message })),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const ticket = await findOwnTicket(Number(req.params.id), userId);
    if (ticket.status === 'CLOSED') throw badRequest('This ticket is closed. Please open a new one.');

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'OPEN', messages: { create: { authorId: userId, message: req.body.message } } },
    });
    res.status(201).json({ data: await findOwnTicket(ticket.id, userId) });
  })
);
