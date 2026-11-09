import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { getStripe } from '../../lib/stripe';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CANCELLABLE, cancelOrder, checkStock, codAvailability, createCheckoutSession, isAllowedReturnUrl, markPaid, orderInclude, placeOrder, quoteCart, switchToCod, toOrderDto } from './order.service';
import { COD_LIMIT, SHIPPING_COSTS } from './pricing';

const idParams = z.object({ id: z.coerce.number().int().positive() });

const shippingMethod = z.enum(['STANDARD', 'EXPRESS']);
const couponCode = z.string().trim().max(40).optional().transform(value => value || undefined);

const returnOptions = z.object({
  returnUrl: z.string().max(300).refine(isAllowedReturnUrl, 'That return URL is not allowed').optional(),
  platform: z.enum(['web', 'mobile']).optional(),
});

const quoteSchema = z.object({ shippingMethod: shippingMethod.default('STANDARD'), couponCode });
const checkoutSchema = quoteSchema.extend({
  shippingMethod,
  addressId: z.number().int().positive('Choose a delivery address'),
  paymentMethod: z.enum(['STRIPE', 'COD']),
  ...returnOptions.shape,
});

const findOwnOrder = async (id: number, userId: number) => {
  const order = await prisma.order.findFirst({ where: { id, userId }, include: orderInclude });
  if (!order) throw notFound('Order not found.');
  return order;
};

export const checkoutRouter = Router();
checkoutRouter.use(requireAuth);

checkoutRouter.get('/options', (_req, res) => {
  res.json({ data: { cardPayments: Boolean(env.STRIPE_SECRET_KEY), shippingCosts: SHIPPING_COSTS, codLimit: COD_LIMIT } });
});

checkoutRouter.post(
  '/quote',
  validate('body', quoteSchema),
  asyncHandler(async (req, res) => {
    const { totals, coupon } = await quoteCart(currentUser(req).id, req.body.shippingMethod, req.body.couponCode);
    res.json({ data: { ...totals, couponCode: coupon?.code ?? null, ...codAvailability(totals.total) } });
  })
);

checkoutRouter.get(
  '/stock',
  asyncHandler(async (req, res) => {
    res.json({ data: await checkStock(currentUser(req).id) });
  })
);

checkoutRouter.post(
  '/',
  validate('body', checkoutSchema),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    if (req.body.paymentMethod === 'STRIPE') getStripe();

    const { returnUrl, platform, ...input } = req.body as z.infer<typeof checkoutSchema>;
    const order = await placeOrder({ userId: user.id, ...input });
    const checkoutUrl = order.paymentMethod === 'STRIPE' ? await createCheckoutSession(order, user.email, { returnUrl, platform }) : null;
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
    if (!CANCELLABLE.customer.includes(order.status)) throw badRequest('This order can no longer be cancelled online. Please contact support.', 'CANCEL_NOT_ALLOWED');

    await cancelOrder(order.id, 'Cancelled by customer');
    res.json({ data: toOrderDto(await findOwnOrder(order.id, userId)) });
  })
);

orderRouter.post(
  '/:id/pay',
  validate('params', idParams),
  validate('body', returnOptions),
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const order = await findOwnOrder(Number(req.params.id), user.id);
    if (order.paymentMethod !== 'STRIPE' || order.status !== 'PENDING_PAYMENT') throw badRequest('This order is not waiting for a card payment.');

    res.json({ data: { checkoutUrl: await createCheckoutSession(order, user.email, req.body) } });
  })
);

orderRouter.post(
  '/:id/switch-to-cod',
  validate('params', idParams),
  asyncHandler(async (req, res) => {
    const { id: userId } = currentUser(req);
    const order = await findOwnOrder(Number(req.params.id), userId);
    if (order.paymentMethod !== 'STRIPE' || order.status !== 'PENDING_PAYMENT') throw badRequest('This order is not waiting for a card payment.');

    await switchToCod(order.id);
    res.json({ data: toOrderDto(await findOwnOrder(order.id, userId)) });
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
