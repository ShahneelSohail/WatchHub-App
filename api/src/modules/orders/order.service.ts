import type { OrderStatus, PaymentMethod, Prisma, ShippingMethod } from '@prisma/client';
import { env } from '../../config/env';
import { badRequest, conflict } from '../../lib/http';
import { prisma, type Tx } from '../../lib/prisma';
import { getStripe } from '../../lib/stripe';
import { effectivePrice } from '../catalog/watch.dto';
import { notify } from '../notifications/notification.service';
import { couponDiscount, findUsableCoupon, orderTotals, roundMoney } from './pricing';

export const orderInclude = {
  items: { orderBy: { id: 'asc' } },
  events: { orderBy: { createdAt: 'asc' } },
  coupon: { select: { code: true } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'is waiting for payment',
  PENDING: 'has been received',
  CONFIRMED: 'has been confirmed',
  SHIPPED: 'is on its way',
  DELIVERED: 'has been delivered',
  CANCELLED: 'has been cancelled',
};

const FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

export const toOrderDto = ({ coupon, ...order }: OrderRow) => ({
  ...order,
  subtotal: Number(order.subtotal),
  shippingCost: Number(order.shippingCost),
  discount: Number(order.discount),
  total: Number(order.total),
  couponCode: coupon?.code ?? null,
  items: order.items.map(item => ({ ...item, unitPrice: Number(item.unitPrice) })),
});

const recordStatus = async (tx: Tx, order: { id: number; userId: number }, status: OrderStatus, note?: string) => {
  await tx.orderEvent.create({ data: { orderId: order.id, status, note } });
  await notify(order.userId, `Order #${order.id} update`, `Your order ${STATUS_MESSAGES[status]}.`, `/orders/${order.id}`, tx);
};

interface PlaceOrderInput {
  userId: number;
  addressId: number;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  couponCode?: string;
}

export const quoteCart = async (userId: number, shippingMethod: ShippingMethod, couponCode?: string) => {
  const cart = await prisma.cartItem.findMany({ where: { userId }, include: { watch: true }, orderBy: { id: 'asc' } });
  if (cart.length === 0) throw badRequest('Your cart is empty.');
  const unavailable = cart.find(item => item.watch.status !== 'PUBLISHED');
  if (unavailable) throw badRequest(`${unavailable.watch.name} is no longer available. Remove it to continue.`);

  const subtotal = roundMoney(cart.reduce((sum, item) => sum + effectivePrice(item.watch) * item.quantity, 0));
  const coupon = couponCode ? await findUsableCoupon(couponCode, subtotal, userId) : null;
  return { cart, coupon, totals: orderTotals(subtotal, shippingMethod, coupon ? couponDiscount(coupon, subtotal) : 0) };
};

export const placeOrder = async ({ userId, addressId, shippingMethod, paymentMethod, couponCode }: PlaceOrderInput) => {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw badRequest('Choose a delivery address.');
  const { cart, coupon, totals } = await quoteCart(userId, shippingMethod, couponCode);
  const status: OrderStatus = paymentMethod === 'STRIPE' ? 'PENDING_PAYMENT' : 'PENDING';

  return prisma.$transaction(async tx => {
    for (const item of cart) {
      const { count } = await tx.watch.updateMany({
        where: { id: item.watchId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity }, unitsSold: { increment: item.quantity } },
      });
      if (count === 0) throw conflict(`${item.watch.name} is no longer available in the quantity you chose.`);
    }
    if (coupon) {
      const { count } = await tx.coupon.updateMany({
        where: { id: coupon.id, ...(coupon.usageLimit === null ? {} : { usageCount: { lt: coupon.usageLimit } }) },
        data: { usageCount: { increment: 1 } },
      });
      if (count === 0) throw conflict('That coupon has just been fully redeemed.');
    }

    const { recipient, addressLine, city, state, zip, country, phone } = address;
    const order = await tx.order.create({
      data: {
        userId,
        status,
        paymentMethod,
        shippingMethod,
        ...totals,
        couponId: coupon?.id,
        shippingAddress: { recipient, addressLine, city, state, zip, country, phone },
        items: {
          create: cart.map(({ watch, quantity, strapType, strapColor, productColor }) => ({
            watchId: watch.id,
            name: watch.name,
            image: watch.images[0],
            quantity,
            unitPrice: effectivePrice(watch),
            strapType,
            strapColor,
            productColor,
          })),
        },
        events: { create: { status } },
      },
      include: orderInclude,
    });
    await tx.cartItem.deleteMany({ where: { userId } });
    await notify(userId, `Order #${order.id} placed`, `Thank you! Your order ${STATUS_MESSAGES[status]}.`, `/orders/${order.id}`, tx);
    return order;
  });
};

export const createCheckoutSession = async (order: OrderRow, customerEmail: string): Promise<string> => {
  const stripe = getStripe();
  const currency = 'usd';
  const toCents = (value: number) => Math.round(value * 100);
  const discount = Number(order.discount);
  const shippingCost = Number(order.shippingCost);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customerEmail,
    client_reference_id: String(order.id),
    metadata: { orderId: String(order.id) },
    line_items: order.items.map(item => ({
      quantity: item.quantity,
      price_data: { currency, unit_amount: toCents(Number(item.unitPrice)), product_data: { name: item.name } },
    })),
    shipping_options:
      shippingCost > 0
        ? [{ shipping_rate_data: { type: 'fixed_amount', display_name: 'Express shipping', fixed_amount: { amount: toCents(shippingCost), currency } } }]
        : undefined,
    discounts: discount > 0 ? [{ coupon: (await stripe.coupons.create({ amount_off: toCents(discount), currency, duration: 'once' })).id }] : undefined,
    success_url: `${env.WEB_URL}/orders/${order.id}?paid=1`,
    cancel_url: `${env.WEB_URL}/orders/${order.id}`,
  });

  await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  if (!session.url) throw new Error('Stripe did not return a checkout URL.');
  return session.url;
};

export const markPaid = async (orderId: number): Promise<void> => {
  await prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.paymentStatus === 'PAID' || order.status === 'CANCELLED') return;
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'PAID', status: 'CONFIRMED' } });
    await recordStatus(tx, order, 'CONFIRMED', 'Payment received');
  });
};

export const cancelOrder = async (orderId: number, note: string): Promise<void> => {
  await prisma.$transaction(async tx => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.status === 'CANCELLED') return;
    for (const item of order.items) {
      if (item.watchId === null) continue;
      await tx.watch.update({ where: { id: item.watchId }, data: { stock: { increment: item.quantity }, unitsSold: { decrement: item.quantity } } });
    }
    if (order.couponId !== null) await tx.coupon.update({ where: { id: order.couponId }, data: { usageCount: { decrement: 1 } } });
    await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
    await recordStatus(tx, order, 'CANCELLED', note);
  });
};

export const expireOrder = async (orderId: number, sessionId: string): Promise<void> => {
  const stale = await prisma.order.findFirst({ where: { id: orderId, stripeSessionId: sessionId, status: 'PENDING_PAYMENT' }, select: { id: true } });
  if (stale) await cancelOrder(orderId, 'Payment session expired');
};

interface Shipment {
  status: OrderStatus;
  note?: string;
  trackingNumber?: string;
  courierName?: string;
}

export const advanceOrder = async (orderId: number, { status, note, trackingNumber, courierName }: Shipment): Promise<void> => {
  await prisma.$transaction(async tx => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const from = FLOW.indexOf(order.status);
    const to = FLOW.indexOf(status);
    if (from === -1 || to <= from) throw badRequest(`An order that is ${order.status.toLowerCase().replace('_', ' ')} cannot move to ${status.toLowerCase()}.`);

    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        trackingNumber: trackingNumber ?? order.trackingNumber,
        courierName: courierName ?? order.courierName,
        paymentStatus: status === 'DELIVERED' ? 'PAID' : undefined,
      },
    });
    await recordStatus(tx, order, status, note);
  });
};
