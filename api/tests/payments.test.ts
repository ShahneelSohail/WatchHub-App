import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { addToCart, app, createAddress, createWatch, resetDb, signedInUser } from './helpers';
import { stripeFake } from './stripe-mock';

vi.mock('../src/lib/stripe', () => import('./stripe-mock.js'));

const SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  stripeFake.checkout.sessions.create.mockResolvedValue({ id: 'cs_test_webhook', url: 'https://checkout.stripe.test/x' });
});

const placeCardOrder = async () => {
  const { user, agent } = await signedInUser();
  const watch = await createWatch({ stock: 3 });
  const address = await createAddress(user.id);
  await addToCart(user.id, watch.id, 1);
  const res = await agent.post('/api/checkout').send({ addressId: address.id, shippingMethod: 'STANDARD', paymentMethod: 'STRIPE' }).expect(201);
  return { orderId: res.body.data.order.id as number, watch };
};

const sendEvent = (type: string, object: Record<string, unknown>, secret = SECRET) => {
  const payload = JSON.stringify({ id: 'evt_test', object: 'event', type, data: { object } });
  const signature = stripeFake.webhooks.generateTestHeaderString({ payload, secret });
  return request(app).post('/api/payments/webhook').set('stripe-signature', signature).set('content-type', 'application/json').send(payload);
};

describe('Stripe webhook', () => {
  it('rejects requests with a missing or forged signature', async () => {
    await request(app).post('/api/payments/webhook').set('content-type', 'application/json').send('{}').expect(400);
    await sendEvent('checkout.session.completed', {}, 'whsec_someone_else').expect(400);
  });

  it('marks the order paid and confirmed once, even if Stripe retries the event', async () => {
    const { orderId } = await placeCardOrder();
    const session = { id: 'cs_test_webhook', payment_status: 'paid', metadata: { orderId: String(orderId) } };

    await sendEvent('checkout.session.completed', session).expect(200);
    await sendEvent('checkout.session.completed', session).expect(200);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { events: true } });
    expect(order).toMatchObject({ paymentStatus: 'PAID', status: 'CONFIRMED' });
    expect(order.events.filter(event => event.status === 'CONFIRMED')).toHaveLength(1);
  });

  it('cancels an unpaid order and restocks the watch when its session expires', async () => {
    const { orderId, watch } = await placeCardOrder();
    await sendEvent('checkout.session.expired', { id: 'cs_test_webhook', metadata: { orderId: String(orderId) } }).expect(200);

    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('CANCELLED');
    expect((await prisma.watch.findUniqueOrThrow({ where: { id: watch.id } })).stock).toBe(3);
  });

  it('ignores the expiry of an older session that was replaced by a retry', async () => {
    const { orderId } = await placeCardOrder();
    await sendEvent('checkout.session.expired', { id: 'cs_test_older', metadata: { orderId: String(orderId) } }).expect(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe('PENDING_PAYMENT');
  });
});
