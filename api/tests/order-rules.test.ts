import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { addToCart, createAddress, createOrder, createWatch, resetDb, signedInUser } from './helpers';
import { stripeFake } from './stripe-mock';

vi.mock('../src/lib/stripe', () => import('./stripe-mock.js'));

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  stripeFake.coupons.create.mockResolvedValue({ id: 'stripe-coupon' });
  stripeFake.checkout.sessions.create.mockResolvedValue({ id: 'cs_test_rules', url: 'https://checkout.stripe.test/cs_test_rules' });
});

const shopper = async (options: { price?: number; quantity?: number } = {}) => {
  const buyer = await signedInUser();
  const watch = await createWatch({ price: options.price ?? 100, stock: 10 });
  const address = await createAddress(buyer.user.id);
  await addToCart(buyer.user.id, watch.id, options.quantity ?? 1);
  return { ...buyer, watch, address };
};

const checkoutBody = (addressId: number, overrides: Record<string, unknown> = {}) => ({ addressId, shippingMethod: 'STANDARD', paymentMethod: 'COD', ...overrides });

describe('coupon validation codes', () => {
  it('returns a code per failure so the cart can show the right message', async () => {
    const { agent } = await shopper({ price: 200 });
    await prisma.coupon.createMany({
      data: [
        { code: 'BIGSPEND', type: 'FIXED', value: 20, minAmount: 500 },
        { code: 'OLD', type: 'PERCENTAGE', value: 10, expiresAt: new Date(Date.now() - 1000) },
        { code: 'GONE', type: 'PERCENTAGE', value: 10, usageLimit: 1, usageCount: 1 },
        { code: 'PAUSED', type: 'PERCENTAGE', value: 10, isActive: false },
        { code: 'LATER', type: 'PERCENTAGE', value: 10, startsAt: new Date(Date.now() + 86400000) },
        { code: 'GOOD', type: 'PERCENTAGE', value: 10 },
      ],
    });
    const quote = (couponCode: string) => agent.post('/api/checkout/quote').send({ couponCode });
    const code = async (couponCode: string) => (await quote(couponCode).expect(400)).body.error.code;

    expect(await code('NOPE')).toBe('COUPON_INVALID');
    expect(await code('PAUSED')).toBe('COUPON_INVALID');
    expect(await code('OLD')).toBe('COUPON_EXPIRED');
    expect(await code('GONE')).toBe('COUPON_EXHAUSTED');
    expect(await code('LATER')).toBe('COUPON_NOT_STARTED');
    const minimum = (await quote('BIGSPEND').expect(400)).body.error;
    expect(minimum).toMatchObject({ code: 'COUPON_MIN_NOT_MET', details: { minAmount: 500 } });
    expect((await quote('good').expect(200)).body.data).toMatchObject({ discount: 20, total: 180, couponCode: 'GOOD' });
  });
});

describe('cash on delivery limit', () => {
  it('disables cash on delivery from $3,000 and says why', async () => {
    const { agent, address } = await shopper({ price: 3000 });

    const quote = await agent.post('/api/checkout/quote').send({}).expect(200);
    expect(quote.body.data).toMatchObject({ total: 3000, codAvailable: false, codLimit: 3000, codReason: expect.stringContaining('under $3,000') });

    const blocked = await agent.post('/api/checkout').send(checkoutBody(address.id)).expect(400);
    expect(blocked.body.error.code).toBe('COD_LIMIT_EXCEEDED');
    await agent.post('/api/checkout').send(checkoutBody(address.id, { paymentMethod: 'STRIPE' })).expect(201);
  });

  it('allows cash on delivery just under the limit', async () => {
    const { agent, address } = await shopper({ price: 2999 });
    expect((await agent.post('/api/checkout/quote').send({})).body.data.codAvailable).toBe(true);
    await agent.post('/api/checkout').send(checkoutBody(address.id)).expect(201);
  });

  it('lets a customer switch a waiting card order to cash on delivery, closing the Stripe session', async () => {
    const { agent, address } = await shopper();
    const placed = await agent.post('/api/checkout').send(checkoutBody(address.id, { paymentMethod: 'STRIPE' })).expect(201);
    const orderId = placed.body.data.order.id as number;
    expect(placed.body.data.order.status).toBe('PENDING_PAYMENT');

    const switched = await agent.post(`/api/orders/${orderId}/switch-to-cod`).expect(200);
    expect(switched.body.data).toMatchObject({ status: 'PENDING', paymentMethod: 'COD', paymentStatus: 'UNPAID' });
    expect(stripeFake.checkout.sessions.expire).toHaveBeenCalledWith('cs_test_rules');
    await agent.post(`/api/orders/${orderId}/switch-to-cod`).expect(400);
  });
});

describe('cancel rules', () => {
  it('lets customers cancel only while pending payment or pending', async () => {
    const { agent, user } = await signedInUser();
    const cancelStatus = async (status: 'PENDING_PAYMENT' | 'PENDING' | 'CONFIRMED' | 'SHIPPED', expected: number) => {
      const order = await createOrder(user.id, { status });
      const res = await agent.post(`/api/orders/${order.id}/cancel`).expect(expected);
      return res.body;
    };

    expect((await cancelStatus('PENDING_PAYMENT', 200)).data.status).toBe('CANCELLED');
    expect((await cancelStatus('PENDING', 200)).data.status).toBe('CANCELLED');
    expect((await cancelStatus('CONFIRMED', 400)).error.code).toBe('CANCEL_NOT_ALLOWED');
    await cancelStatus('SHIPPED', 400);
  });

  it('lets admins cancel before shipping, with or without restocking, and records who did it', async () => {
    const { agent, user: admin } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const restocked = await createWatch({ stock: 5 });
    const kept = await createWatch({ stock: 5 });
    const first = await createOrder(customer.user.id, { watchId: restocked.id, quantity: 2, status: 'CONFIRMED' });
    const second = await createOrder(customer.user.id, { watchId: kept.id, quantity: 2, status: 'PENDING_PAYMENT' });
    const shipped = await createOrder(customer.user.id, { status: 'SHIPPED' });

    const cancelled = await agent.patch(`/api/admin/orders/${first.id}/status`).send({ status: 'CANCELLED', note: 'Customer request' }).expect(200);
    expect(cancelled.body.data.events.at(-1)).toMatchObject({ status: 'CANCELLED', note: 'Customer request', actor: admin.name });
    expect((await prisma.watch.findUniqueOrThrow({ where: { id: restocked.id } })).stock).toBe(7);

    await agent.patch(`/api/admin/orders/${second.id}/status`).send({ status: 'CANCELLED', note: 'Payment not received', restock: false }).expect(200);
    expect((await prisma.watch.findUniqueOrThrow({ where: { id: kept.id } })).stock).toBe(5);

    const refused = await agent.patch(`/api/admin/orders/${shipped.id}/status`).send({ status: 'CANCELLED' }).expect(400);
    expect(refused.body.error.code).toBe('CANCEL_NOT_ALLOWED');
  });
});

describe('admin order handling', () => {
  it('requires a courier and a tracking number to ship', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const order = await createOrder(customer.user.id, { status: 'CONFIRMED' });

    const missing = await agent.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'SHIPPED' }).expect(400);
    expect(missing.body.error.code).toBe('TRACKING_REQUIRED');
    await agent.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'SHIPPED', courierName: 'UPS', trackingNumber: '123' }).expect(400);
    const shipped = await agent.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'SHIPPED', courierName: 'UPS', trackingNumber: '1Z999AA1' }).expect(200);
    expect(shipped.body.data).toMatchObject({ status: 'SHIPPED', courierName: 'UPS', trackingNumber: '1Z999AA1' });
  });

  it('adds internal notes with their author and shows them on the order', async () => {
    const { agent, user } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const order = await createOrder(customer.user.id);

    const res = await agent.post(`/api/admin/orders/${order.id}/notes`).send({ body: 'Call before delivery' }).expect(201);
    expect(res.body.data.notes).toEqual([expect.objectContaining({ body: 'Call before delivery', by: user.name })]);
    await agent.post(`/api/admin/orders/${order.id}/notes`).send({ body: '  ' }).expect(400);
    const own = await customer.agent.get(`/api/orders/${order.id}`).expect(200);
    expect(own.body.data.notes).toBeUndefined();
  });

  it('sends payment reminders only for orders waiting for payment', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const waiting = await createOrder(customer.user.id, { status: 'PENDING_PAYMENT', paymentMethod: 'STRIPE' });
    const pending = await createOrder(customer.user.id);

    const res = await agent.post(`/api/admin/orders/${waiting.id}/payment-reminder`).expect(200);
    expect(res.body.data.events.at(-1).note).toBe('Payment reminder sent to customer');
    expect(await prisma.notification.count({ where: { userId: customer.user.id, title: { contains: 'waiting for payment' } } })).toBe(1);
    await agent.post(`/api/admin/orders/${pending.id}/payment-reminder`).expect(400);
  });

  it('confirms only the pending orders in a bulk selection', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const pending = await createOrder(customer.user.id);
    const shipped = await createOrder(customer.user.id, { status: 'SHIPPED' });

    const res = await agent.post('/api/admin/orders/bulk-confirm').send({ ids: [pending.id, shipped.id] }).expect(200);
    expect(res.body.data.confirmed).toBe(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe('CONFIRMED');
  });

  it('counts orders per status, sorts, and filters by customer and payment status', async () => {
    const { agent } = await signedInUser('ADMIN');
    const alice = await signedInUser();
    const bob = await signedInUser();
    await createOrder(alice.user.id, { total: 50 });
    await createOrder(alice.user.id, { total: 500, status: 'CONFIRMED', paymentStatus: 'PAID' });
    await createOrder(bob.user.id, { total: 200, status: 'CONFIRMED' });

    const counts = await agent.get('/api/admin/orders/counts').expect(200);
    expect(counts.body.data).toMatchObject({ all: 3, PENDING: 1, CONFIRMED: 2, SHIPPED: 0, PENDING_PAYMENT: 0 });

    const byTotal = await agent.get('/api/admin/orders?sort=total').expect(200);
    expect(byTotal.body.data.map((order: { total: number }) => order.total)).toEqual([500, 200, 50]);
    expect((await agent.get('/api/admin/orders?sort=total&dir=asc')).body.data[0].total).toBe(50);
    expect((await agent.get(`/api/admin/orders?userId=${bob.user.id}`)).body.meta.total).toBe(1);
    expect((await agent.get('/api/admin/orders?paymentStatus=PAID')).body.meta.total).toBe(1);
    expect((await agent.get('/api/admin/orders?q=Test%20Watch')).body.meta.total).toBe(3);
  });
});

describe('Stripe return URLs', () => {
  const sessionArgs = () => stripeFake.checkout.sessions.create.mock.calls[0]![0] as { success_url: string; cancel_url: string };

  it('keeps the web defaults', async () => {
    const { agent, address } = await shopper();
    const res = await agent.post('/api/checkout').send(checkoutBody(address.id, { paymentMethod: 'STRIPE' })).expect(201);
    expect(sessionArgs()).toMatchObject({
      success_url: `http://localhost:3000/orders/${res.body.data.order.id}?paid=1`,
      cancel_url: `http://localhost:3000/orders/${res.body.data.order.id}`,
    });
  });

  it('uses the watchhub deep link for mobile and accepts an explicit return URL', async () => {
    const { agent, address } = await shopper();
    const res = await agent.post('/api/checkout').send(checkoutBody(address.id, { paymentMethod: 'STRIPE', platform: 'mobile' })).expect(201);
    const id = res.body.data.order.id;
    expect(sessionArgs()).toEqual(expect.objectContaining({ success_url: `watchhub://orders/${id}?status=paid`, cancel_url: `watchhub://orders/${id}?status=cancelled` }));

    stripeFake.checkout.sessions.create.mockClear();
    await agent.post(`/api/orders/${id}/pay`).send({ returnUrl: 'http://localhost:3000/checkout/result?order={orderId}' }).expect(200);
    expect(sessionArgs().success_url).toBe(`http://localhost:3000/checkout/result?order=${id}&status=paid`);
  });

  it('refuses return URLs that point somewhere else', async () => {
    const { agent, address } = await shopper();
    await agent.post('/api/checkout').send(checkoutBody(address.id, { paymentMethod: 'STRIPE', returnUrl: 'https://evil.example.com/steal' })).expect(400);
    await agent.post('/api/checkout').send(checkoutBody(address.id, { paymentMethod: 'STRIPE', returnUrl: 'javascript:alert(1)' })).expect(400);
  });
});
