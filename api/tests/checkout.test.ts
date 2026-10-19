import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { addToCart, app, createAddress, createWatch, resetDb, signedInUser } from './helpers';
import { stripeFake } from './stripe-mock';

vi.mock('../src/lib/stripe', () => import('./stripe-mock.js'));

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  stripeFake.coupons.create.mockResolvedValue({ id: 'stripe-coupon' });
  stripeFake.checkout.sessions.create.mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.test/cs_test_123' });
});

const setup = async (options: { stock?: number; quantity?: number; price?: number } = {}) => {
  const buyer = await signedInUser();
  const watch = await createWatch({ price: options.price ?? 100, stock: options.stock ?? 5 });
  const address = await createAddress(buyer.user.id);
  await addToCart(buyer.user.id, watch.id, options.quantity ?? 2);
  return { ...buyer, watch, address };
};

describe('checkout options', () => {
  it('tells the web app whether card payments are available and what shipping costs', async () => {
    const { agent } = await signedInUser();
    const res = await agent.get('/api/checkout/options').expect(200);
    expect(res.body.data).toEqual({ cardPayments: true, shippingCosts: { STANDARD: 0, EXPRESS: 25 } });
  });
});

describe('checkout quote', () => {
  it('totals the cart with shipping and a percentage coupon', async () => {
    const { agent } = await setup();
    await prisma.coupon.create({ data: { code: 'TEN', type: 'PERCENTAGE', value: 10 } });

    const res = await agent.post('/api/checkout/quote').send({ shippingMethod: 'EXPRESS', couponCode: 'ten' }).expect(200);
    expect(res.body.data).toEqual({ subtotal: 200, shippingCost: 25, discount: 20, total: 205, couponCode: 'TEN' });
  });

  it.each([
    ['unknown', { code: 'NOPE', type: 'FIXED' as const, value: 5, isActive: false }, 'NOPE'],
    ['expired', { code: 'OLD', type: 'FIXED' as const, value: 5, expiresAt: new Date(Date.now() - 1000) }, 'OLD'],
    ['below the minimum spend', { code: 'BIG', type: 'FIXED' as const, value: 5, minAmount: 1000 }, 'BIG'],
    ['fully redeemed', { code: 'GONE', type: 'FIXED' as const, value: 5, usageLimit: 1, usageCount: 1 }, 'GONE'],
  ])('rejects a coupon that is %s', async (_label, coupon, code) => {
    const { agent } = await setup();
    await prisma.coupon.create({ data: coupon });
    await agent.post('/api/checkout/quote').send({ shippingMethod: 'STANDARD', couponCode: code }).expect(400);
  });

  it('refuses an empty cart', async () => {
    const { agent } = await signedInUser();
    await agent.post('/api/checkout/quote').send({ shippingMethod: 'STANDARD' }).expect(400);
  });
});

describe('placing an order', () => {
  it('creates a cash on delivery order, reserves stock, empties the cart and notifies the customer', async () => {
    const { agent, watch, address } = await setup({ stock: 5, quantity: 2 });

    const res = await agent.post('/api/checkout').send({ addressId: address.id, shippingMethod: 'STANDARD', paymentMethod: 'COD' }).expect(201);
    expect(res.body.data.checkoutUrl).toBeNull();
    expect(res.body.data.order).toMatchObject({ status: 'PENDING', paymentStatus: 'UNPAID', total: 200, items: [{ quantity: 2, name: watch.name }] });
    expect(res.body.data.order.shippingAddress).toMatchObject({ city: 'Springfield' });

    expect((await prisma.watch.findUniqueOrThrow({ where: { id: watch.id } })).stock).toBe(3);
    expect(await prisma.cartItem.count()).toBe(0);
    expect(await prisma.notification.count()).toBe(1);
  });

  it('starts a Stripe Checkout session for card orders and keeps them unpaid until confirmed', async () => {
    const { agent, address } = await setup();
    await prisma.coupon.create({ data: { code: 'FIVE', type: 'FIXED', value: 5 } });

    const res = await agent.post('/api/checkout').send({ addressId: address.id, shippingMethod: 'EXPRESS', paymentMethod: 'STRIPE', couponCode: 'FIVE' }).expect(201);
    expect(res.body.data.checkoutUrl).toBe('https://checkout.stripe.test/cs_test_123');
    expect(res.body.data.order).toMatchObject({ status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID', total: 220 });

    const session = stripeFake.checkout.sessions.create.mock.calls[0]![0];
    expect(session).toMatchObject({ mode: 'payment', metadata: { orderId: String(res.body.data.order.id) }, discounts: [{ coupon: 'stripe-coupon' }] });
    expect(session.line_items[0].price_data.unit_amount).toBe(10000);
    expect(stripeFake.coupons.create).toHaveBeenCalledWith(expect.objectContaining({ amount_off: 500 }));
    expect((await prisma.order.findUniqueOrThrow({ where: { id: res.body.data.order.id } })).stripeSessionId).toBe('cs_test_123');
  });

  it('refuses to oversell: the second buyer of the last watch loses', async () => {
    const first = await setup({ stock: 1, quantity: 1 });
    const second = await signedInUser();
    await addToCart(second.user.id, first.watch.id, 1);
    const secondAddress = await createAddress(second.user.id);

    await first.agent.post('/api/checkout').send({ addressId: first.address.id, shippingMethod: 'STANDARD', paymentMethod: 'COD' }).expect(201);
    const lost = await second.agent.post('/api/checkout').send({ addressId: secondAddress.id, shippingMethod: 'STANDARD', paymentMethod: 'COD' }).expect(409);
    expect(lost.body.error.message).toMatch(/no longer available/);
    expect((await prisma.watch.findUniqueOrThrow({ where: { id: first.watch.id } })).stock).toBe(0);
  });

  it('rejects an address that belongs to someone else and a missing payment method', async () => {
    const { agent } = await setup();
    const stranger = await signedInUser();
    const foreign = await createAddress(stranger.user.id);

    await agent.post('/api/checkout').send({ addressId: foreign.id, shippingMethod: 'STANDARD', paymentMethod: 'COD' }).expect(400);
    await agent.post('/api/checkout').send({ addressId: foreign.id, shippingMethod: 'STANDARD' }).expect(400);
  });

  it('enforces the per-customer coupon limit and counts usage', async () => {
    const { agent, address, user, watch } = await setup({ quantity: 1 });
    const coupon = await prisma.coupon.create({ data: { code: 'ONCE', type: 'FIXED', value: 10, limitPerUser: 1 } });
    const body = { addressId: address.id, shippingMethod: 'STANDARD', paymentMethod: 'COD', couponCode: 'ONCE' };

    await agent.post('/api/checkout').send(body).expect(201);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usageCount).toBe(1);

    await addToCart(user.id, watch.id, 1);
    await agent.post('/api/checkout').send(body).expect(400);
  });
});

describe('managing an order', () => {
  const placeCodOrder = async () => {
    const context = await setup({ stock: 5, quantity: 2 });
    const res = await context.agent.post('/api/checkout').send({ addressId: context.address.id, shippingMethod: 'STANDARD', paymentMethod: 'COD' }).expect(201);
    return { ...context, orderId: res.body.data.order.id as number };
  };

  it('lets customers cancel an unshipped cash order, restocking the watch', async () => {
    const { agent, watch, orderId } = await placeCodOrder();
    const res = await agent.post(`/api/orders/${orderId}/cancel`).expect(200);
    expect(res.body.data.status).toBe('CANCELLED');
    expect((await prisma.watch.findUniqueOrThrow({ where: { id: watch.id } })).stock).toBe(5);
    await agent.post(`/api/orders/${orderId}/cancel`).expect(400);
  });

  it('hides orders from other customers', async () => {
    const { orderId } = await placeCodOrder();
    const stranger = await signedInUser();
    await stranger.agent.get(`/api/orders/${orderId}`).expect(404);
    expect((await stranger.agent.get('/api/orders')).body.data).toEqual([]);
  });

  it('confirms a card payment by asking Stripe for the session', async () => {
    const { agent, address } = await setup();
    const placed = await agent.post('/api/checkout').send({ addressId: address.id, shippingMethod: 'STANDARD', paymentMethod: 'STRIPE' }).expect(201);
    const orderId = placed.body.data.order.id;

    stripeFake.checkout.sessions.retrieve.mockResolvedValueOnce({ payment_status: 'unpaid' });
    expect((await agent.post(`/api/orders/${orderId}/confirm-payment`).expect(200)).body.data.paymentStatus).toBe('UNPAID');

    stripeFake.checkout.sessions.retrieve.mockResolvedValueOnce({ payment_status: 'paid' });
    const paid = await agent.post(`/api/orders/${orderId}/confirm-payment`).expect(200);
    expect(paid.body.data).toMatchObject({ paymentStatus: 'PAID', status: 'CONFIRMED' });
    await agent.post(`/api/orders/${orderId}/cancel`).expect(400);
  });

  it('lets a customer retry payment on a pending card order', async () => {
    const { agent, address } = await setup();
    const placed = await agent.post('/api/checkout').send({ addressId: address.id, shippingMethod: 'STANDARD', paymentMethod: 'STRIPE' }).expect(201);
    stripeFake.checkout.sessions.create.mockResolvedValueOnce({ id: 'cs_test_retry', url: 'https://checkout.stripe.test/retry' });

    const res = await agent.post(`/api/orders/${placed.body.data.order.id}/pay`).expect(200);
    expect(res.body.data.checkoutUrl).toBe('https://checkout.stripe.test/retry');
  });
});
