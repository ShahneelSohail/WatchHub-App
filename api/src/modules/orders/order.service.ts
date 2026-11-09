import type { OrderStatus, PaymentMethod, Prisma, ShippingMethod } from '@prisma/client';
import { corsOrigins, env } from '../../config/env';
import { badRequest, conflict } from '../../lib/http';
import { prisma, type Tx } from '../../lib/prisma';
import { getStripe } from '../../lib/stripe';
import { effectivePrice } from '../catalog/watch.dto';
import { availableStock, reserveStock, restoreStock } from '../catalog/stock';
import { notify } from '../notifications/notification.service';
import { COD_LIMIT, codUnavailableReason, couponDiscount, findUsableCoupon, orderTotals, roundMoney } from './pricing';

export const orderInclude = {
  items: { orderBy: { id: 'asc' } },
  events: { orderBy: { createdAt: 'asc' } },
  refunds: { orderBy: { createdAt: 'asc' } },
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

export const CANCELLABLE: Record<'customer' | 'admin', OrderStatus[]> = {
  customer: ['PENDING_PAYMENT', 'PENDING'],
  admin: ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED'],
};

const MIN_TRACKING_LENGTH = 6;
const MOBILE_RETURN_URL = 'watchhub://orders/{orderId}';

export const toOrderDto = ({ coupon, ...order }: OrderRow) => ({
  ...order,
  subtotal: Number(order.subtotal),
  shippingCost: Number(order.shippingCost),
  discount: Number(order.discount),
  total: Number(order.total),
  refundedAmount: Number(order.refundedAmount),
  couponCode: coupon?.code ?? null,
  items: order.items.map(item => ({ ...item, unitPrice: Number(item.unitPrice) })),
  refunds: order.refunds.map(refund => ({ ...refund, amount: Number(refund.amount) })),
});

export const recordStatus = async (tx: Tx, order: { id: number; userId: number }, status: OrderStatus, note?: string, actor?: string) => {
  await tx.orderEvent.create({ data: { orderId: order.id, status, note, actor } });
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
  const cart = await prisma.cartItem.findMany({ where: { userId }, include: { watch: { include: { colors: true } } }, orderBy: { id: 'asc' } });
  if (cart.length === 0) throw badRequest('Your cart is empty.', 'CART_EMPTY');
  const unavailable = cart.find(item => item.watch.status !== 'PUBLISHED');
  if (unavailable) throw badRequest(`${unavailable.watch.name} is no longer available. Remove it to continue.`, 'WATCH_UNAVAILABLE');

  const subtotal = roundMoney(cart.reduce((sum, item) => sum + effectivePrice(item.watch) * item.quantity, 0));
  const coupon = couponCode ? await findUsableCoupon(couponCode, subtotal, userId) : null;
  return { cart, coupon, totals: orderTotals(subtotal, shippingMethod, coupon ? couponDiscount(coupon, subtotal) : 0) };
};

export const codAvailability = (total: number) => {
  const reason = codUnavailableReason(total);
  return { codAvailable: reason === null, codLimit: COD_LIMIT, codReason: reason };
};

export const checkStock = async (userId: number) => {
  const cart = await prisma.cartItem.findMany({ where: { userId }, include: { watch: { include: { colors: true } } }, orderBy: { id: 'asc' } });
  const lines = cart.map(({ id, quantity, productColor, watch }) => {
    const available = watch.status === 'PUBLISHED' ? availableStock(watch, productColor) : 0;
    return {
      cartItemId: id,
      watchId: watch.id,
      name: watch.name,
      productColor,
      quantity,
      available,
      soldOut: available === 0,
      insufficient: available > 0 && quantity > available,
    };
  });
  return { ok: lines.every(line => !line.soldOut && !line.insufficient), lines };
};

export const placeOrder = async ({ userId, addressId, shippingMethod, paymentMethod, couponCode }: PlaceOrderInput) => {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw badRequest('Choose a delivery address.');
  const { cart, coupon, totals } = await quoteCart(userId, shippingMethod, couponCode);
  if (paymentMethod === 'COD') {
    const reason = codUnavailableReason(totals.total);
    if (reason) throw badRequest(reason, 'COD_LIMIT_EXCEEDED', { limit: COD_LIMIT });
  }
  const status: OrderStatus = paymentMethod === 'STRIPE' ? 'PENDING_PAYMENT' : 'PENDING';

  return prisma.$transaction(async tx => {
    for (const item of cart) {
      if (!(await reserveStock(tx, item.watchId, item.productColor, item.quantity))) {
        throw conflict(`${item.watch.name} is no longer available in the quantity you chose.`, 'OUT_OF_STOCK', { watchId: item.watchId, cartItemId: item.id });
      }
    }
    if (coupon) {
      const { count } = await tx.coupon.updateMany({
        where: { id: coupon.id, ...(coupon.usageLimit === null ? {} : { usageCount: { lt: coupon.usageLimit } }) },
        data: { usageCount: { increment: 1 } },
      });
      if (count === 0) throw conflict('That coupon has just been fully redeemed.', 'COUPON_EXHAUSTED');
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

export interface ReturnOptions {
  returnUrl?: string;
  platform?: 'web' | 'mobile';
}

export const isAllowedReturnUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'watchhub:' || [env.WEB_URL, ...corsOrigins].some(origin => new URL(origin).origin === url.origin);
  } catch {
    return false;
  }
};

const returnUrls = (orderId: number, { returnUrl, platform }: ReturnOptions) => {
  const template = returnUrl ?? (platform === 'mobile' ? MOBILE_RETURN_URL : undefined);
  if (!template) return { success: `${env.WEB_URL}/orders/${orderId}?paid=1`, cancel: `${env.WEB_URL}/orders/${orderId}` };
  const withStatus = (status: 'paid' | 'cancelled') => {
    const url = new URL(template.replace('{orderId}', String(orderId)));
    url.searchParams.set('status', status);
    return url.toString();
  };
  return { success: withStatus('paid'), cancel: withStatus('cancelled') };
};

export const createCheckoutSession = async (order: OrderRow, customerEmail: string, options: ReturnOptions = {}): Promise<string> => {
  const stripe = getStripe();
  const currency = 'usd';
  const toCents = (value: number) => Math.round(value * 100);
  const discount = Number(order.discount);
  const shippingCost = Number(order.shippingCost);
  const urls = returnUrls(order.id, options);

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
    success_url: urls.success,
    cancel_url: urls.cancel,
  });

  await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  if (!session.url) throw new Error('Stripe did not return a checkout URL.');
  return session.url;
};

export const markPaid = async (orderId: number): Promise<void> => {
  await prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.paymentStatus !== 'UNPAID' || order.status === 'CANCELLED') return;
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'PAID', status: 'CONFIRMED' } });
    await recordStatus(tx, order, 'CONFIRMED', 'Payment received');
  });
};

interface CancelOptions {
  restock?: boolean;
  actor?: string;
}

export const cancelOrder = async (orderId: number, note: string, { restock = true, actor }: CancelOptions = {}): Promise<void> => {
  await prisma.$transaction(async tx => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    if (order.status === 'CANCELLED') return;
    if (restock) {
      for (const item of order.items) {
        if (item.watchId !== null) await restoreStock(tx, item.watchId, item.productColor, item.quantity);
      }
    }
    if (order.couponId !== null) await tx.coupon.update({ where: { id: order.couponId }, data: { usageCount: { decrement: 1 } } });
    await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
    await recordStatus(tx, order, 'CANCELLED', restock ? note : `${note} · Items not restocked`, actor);
  });
};

export const expireOrder = async (orderId: number, sessionId: string): Promise<void> => {
  const stale = await prisma.order.findFirst({ where: { id: orderId, stripeSessionId: sessionId, status: 'PENDING_PAYMENT' }, select: { id: true } });
  if (stale) await cancelOrder(orderId, 'Payment session expired');
};

export const switchToCod = async (orderId: number): Promise<void> => {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const reason = codUnavailableReason(Number(order.total));
  if (reason) throw badRequest(reason, 'COD_LIMIT_EXCEEDED', { limit: COD_LIMIT });
  if (order.stripeSessionId) await getStripe().checkout.sessions.expire(order.stripeSessionId);
  await prisma.$transaction(async tx => {
    await tx.order.update({ where: { id: orderId }, data: { paymentMethod: 'COD', status: 'PENDING', stripeSessionId: null } });
    await recordStatus(tx, order, 'PENDING', 'Switched to cash on delivery');
  });
};

export const sendPaymentReminder = async (orderId: number, actor: string): Promise<void> => {
  await prisma.$transaction(async tx => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.status !== 'PENDING_PAYMENT') throw badRequest('Only orders waiting for payment can get a payment reminder.');
    await tx.orderEvent.create({ data: { orderId, status: order.status, note: 'Payment reminder sent to customer', actor } });
    await notify(order.userId, `Order #${orderId} is waiting for payment`, 'Pay now to keep your watch reserved.', `/orders/${orderId}`, tx);
  });
};

interface Shipment {
  status: OrderStatus;
  note?: string;
  trackingNumber?: string;
  courierName?: string;
  actor?: string;
}

export const advanceOrder = async (orderId: number, { status, note, trackingNumber, courierName, actor }: Shipment): Promise<void> => {
  await prisma.$transaction(async tx => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const from = FLOW.indexOf(order.status);
    const to = FLOW.indexOf(status);
    if (from === -1 || to <= from) throw badRequest(`An order that is ${order.status.toLowerCase().replace('_', ' ')} cannot move to ${status.toLowerCase()}.`);

    const tracking = trackingNumber ?? order.trackingNumber;
    const courier = courierName ?? order.courierName;
    if (status === 'SHIPPED' && (!courier || !tracking || tracking.length < MIN_TRACKING_LENGTH)) {
      throw badRequest(`A courier and a tracking number of at least ${MIN_TRACKING_LENGTH} characters are required to ship an order.`, 'TRACKING_REQUIRED');
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        trackingNumber: tracking,
        courierName: courier,
        paymentStatus: status === 'DELIVERED' && order.paymentStatus === 'UNPAID' ? 'PAID' : undefined,
      },
    });
    await recordStatus(tx, order, status, note, actor);
  });
};
