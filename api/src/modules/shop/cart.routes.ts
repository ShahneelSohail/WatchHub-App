import type { StrapType } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { effectivePrice, ratingSummaries, toWatchDto, watchInclude } from '../catalog/watch.dto';

const MAX_QUANTITY = 10;

const idParams = z.object({ id: z.coerce.number().int().positive() });
const quantity = z.number().int().min(1, 'Quantity must be at least 1').max(MAX_QUANTITY, `You can buy at most ${MAX_QUANTITY} of one watch`);
const nullableText = z.string().trim().max(50).nullish().transform(value => value || null);

const addSchema = z.object({
  watchId: z.number().int().positive(),
  quantity: quantity.default(1),
  strapType: z.enum(['BELT', 'CHAIN']).nullish().transform(value => value ?? null),
  strapColor: nullableText,
  productColor: nullableText,
});

const updateSchema = z.object({ quantity });

const cartInclude = { watch: { include: watchInclude } } as const;

export const loadCart = async (userId: number) => {
  const items = await prisma.cartItem.findMany({ where: { userId }, include: cartInclude, orderBy: { createdAt: 'asc' } });
  const ratings = await ratingSummaries(items.map(item => item.watchId));
  return items.map(({ watch, ...item }) => ({
    id: item.id,
    quantity: item.quantity,
    strapType: item.strapType,
    strapColor: item.strapColor,
    productColor: item.productColor,
    lineTotal: Math.round(effectivePrice(watch) * item.quantity * 100) / 100,
    watch: toWatchDto(watch, ratings),
  }));
};

const assertOptions = (
  watch: { status: string; stock: number; hasBeltOption: boolean; hasChainOption: boolean; colors: { name: string }[] },
  options: { strapType: StrapType | null; productColor: string | null },
  wanted: number
) => {
  if (watch.status !== 'PUBLISHED') throw notFound('Watch not found.');
  if (wanted > watch.stock) throw badRequest(watch.stock === 0 ? 'This watch is out of stock.' : `Only ${watch.stock} left in stock.`);
  if (options.strapType === 'BELT' && !watch.hasBeltOption) throw badRequest('This watch is not available with a belt strap.');
  if (options.strapType === 'CHAIN' && !watch.hasChainOption) throw badRequest('This watch is not available with a chain strap.');
  if (options.productColor && !watch.colors.some(color => color.name === options.productColor)) throw badRequest('That colour is not available for this watch.');
};

export const cartRouter = Router();
cartRouter.use(requireAuth);

cartRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await loadCart(currentUser(req).id) });
  })
);

cartRouter.post(
  '/',
  validate('body', addSchema),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const { watchId, quantity: added, strapType, strapColor, productColor } = req.body;
    const watch = await prisma.watch.findUnique({ where: { id: watchId }, include: { colors: true } });
    if (!watch) throw notFound('Watch not found.');

    const existing = await prisma.cartItem.findFirst({ where: { userId, watchId, strapType, strapColor, productColor } });
    const wanted = Math.min((existing?.quantity ?? 0) + added, MAX_QUANTITY);
    assertOptions(watch, { strapType, productColor }, wanted);

    if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: wanted } });
    else await prisma.cartItem.create({ data: { userId, watchId, quantity: wanted, strapType, strapColor, productColor } });
    res.status(201).json({ data: await loadCart(userId) });
  })
);

cartRouter.patch(
  '/:id',
  validate('params', idParams),
  validate('body', updateSchema),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const item = await prisma.cartItem.findFirst({ where: { id: Number(req.params.id), userId }, include: { watch: { include: { colors: true } } } });
    if (!item) throw notFound('Cart item not found.');
    assertOptions(item.watch, item, req.body.quantity);

    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: req.body.quantity } });
    res.json({ data: await loadCart(userId) });
  })
);

cartRouter.delete(
  '/:id',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    await prisma.cartItem.deleteMany({ where: { id: Number(req.params.id), userId } });
    res.json({ data: await loadCart(userId) });
  })
);
