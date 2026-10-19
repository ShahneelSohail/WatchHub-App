import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { getStripe } from '../../lib/stripe';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { cancelOrder, createCheckoutSession, markPaid, orderInclude, placeOrder, quoteCart, toOrderDto } from './order.service';

const idParams = z.object({ id: z.coerce.number().int().positive() });

const shippingMethod = z.enum(['STANDARD', 'EXPRESS']);
const couponCode = z.string().trim().max(40).optional().transform(value => value || undefined);

const quoteSchema = z.object({ shippingMethod, couponCode });
const checkoutSchema = quoteSchema.extend({
  addressId: z.number().int().positive('Choose a delivery address'),
  paymentMethod: z.enum(['STRIPE', 'COD']),
});

const findOwnOrder = async (id: number, userId: number) => {
  const order = await prisma.order.findFirst({ where: { id, userId }, include: orderInclude });
  if (!order) throw notFound('Order not found.');
  return order;
};

export const checkoutRouter = Router();
checkoutRouter.use(requireAuth);

checkoutRouter.post(
  '/quote',
  validate('body', quoteSchema),
  asyncHandler(async (req, res) => {
    const { totals, coupon } = await quoteCart(currentUser(req).id, req.body.shippingMethod, req.body.couponCode);
    res.json({ data: { ...totals, couponCode: coupon?.code ?? null } });
  })
);

checkoutRouter.post(
  '/',
  validate('body', checkoutSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    if (req.body.paymentMethod === 'STRIPE') getStripe();

    const order = await placeOrder({ userId: user.id, ...req.body });
    const checkoutUrl = order.paymentMethod === 'STRIPE' ? await createCheckoutSession(order, user.email) : null;
    res.status(201).json({ data: { order: toOrderDto(order), checkoutUrl } });
  })
);

export const orderRouter = Router();
orderRouter.use(requireAuth);

orderRouter.get(
  '/',
  validate('query', pageQuery),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const { page, pageSize } = req.query as unknown as z.infer<typeof pageQuery>;
    const [total, orders] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.findMany({ where: { userId }, include: orderInclude, orderBy: { createdAt: 'desc' }, ...paginate({ page, pageSize }) }),
    ]);
    res.json({ data: orders.map(toOrderDto), meta: pageMeta(page, pageSize, total) });
  })
);

orderRouter.get(
  '/:id',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    res.json({ data: toOrderDto(await findOwnOrder(Number(req.params.id), currentUser(req).id)) });
  })
);

orderRouter.post(
  '/:id/cancel',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const order = await findOwnOrder(Number(req.params.id), userId);
    const cancellable = order.status === 'PENDING_PAYMENT' || (['PENDING', 'CONFIRMED'].includes(order.status) && order.paymentStatus === 'UNPAID');
    if (!cancellable) throw badRequest('This order can no longer be cancelled online. Please contact support.');

    await cancelOrder(order.id, 'Cancelled by customer');
    res.json({ data: toOrderDto(await findOwnOrder(order.id, userId)) });
  })
);

orderRouter.post(
  '/:id/pay',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const order = await findOwnOrder(Number(req.params.id), user.id);
    if (order.paymentMethod !== 'STRIPE' || order.status !== 'PENDING_PAYMENT') throw badRequest('This order is not waiting for a card payment.');

    res.json({ data: { checkoutUrl: await createCheckoutSession(order, user.email) } });
  })
);

orderRouter.post(
  '/:id/confirm-payment',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const order = await findOwnOrder(Number(req.params.id), userId);
    if (order.stripeSessionId && order.paymentStatus === 'UNPAID') {
      const session = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
      if (session.payment_status === 'paid') await markPaid(order.id);
    }
    res.json({ data: toOrderDto(await findOwnOrder(order.id, userId)) });
  })
);
