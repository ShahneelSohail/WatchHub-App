import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, notFound } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { phone } from '../auth/auth.schemas';

const idParams = z.object({ id: z.coerce.number().int().positive() });
const required = (label: string, max = 150) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const addressSchema = z.object({
  recipient: required('Recipient name', 100),
  addressLine: required('Address'),
  city: required('City', 100),
  state: required('State', 100),
  zip: required('ZIP code', 20),
  country: required('Country', 100),
  phone,
  isDefault: z.boolean().default(false),
});

const loadAddresses = (userId: number) => prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });

export const addressRouter = Router();
addressRouter.use(requireAuth);

addressRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await loadAddresses(currentUser(req).id) });
  })
);

addressRouter.post(
  '/',
  validate('body', addressSchema),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const isDefault = req.body.isDefault || (await prisma.address.count({ where: { userId } })) === 0;
    await prisma.$transaction(async tx => {
      if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      await tx.address.create({ data: { ...req.body, isDefault, userId } });
    });
    res.status(201).json({ data: await loadAddresses(userId) });
  })
);

addressRouter.put(
  '/:id',
  validate('params', idParams),
  validate('body', addressSchema),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const id = Number(req.params.id);
    if (!(await prisma.address.findFirst({ where: { id, userId }, select: { id: true } }))) throw notFound('Address not found.');

    await prisma.$transaction(async tx => {
      if (req.body.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      await tx.address.update({ where: { id }, data: req.body });
    });
    res.json({ data: await loadAddresses(userId) });
  })
);

addressRouter.delete(
  '/:id',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    await prisma.address.deleteMany({ where: { id: Number(req.params.id), userId } });
    res.json({ data: await loadAddresses(userId) });
  })
);
