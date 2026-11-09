import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { createOrder, createUser, resetDb, signedInUser } from './helpers';
import { stripeFake } from './stripe-mock';

vi.mock('../src/lib/stripe', () => import('./stripe-mock.js'));

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  stripeFake.refunds.create.mockResolvedValue({ id: 're_test_1' });
  stripeFake.checkout.sessions.retrieve.mockResolvedValue({ id: 'cs_test_1', payment_intent: 'pi_test_1' });
});

const paidOrder = async (overrides: Parameters<typeof createOrder>[1] = {}) => {
  const customer = await createUser();
  return createOrder(customer.id, { status: 'CONFIRMED', paymentStatus: 'PAID', total: 200, ...overrides });
};

describe('refunds', () => {
  it('records partial refunds, moves the payment status and refuses to refund more than was paid', async () => {
    const { agent } = await signedInUser('ADMIN');
    const order = await paidOrder();

    const partial = await agent.post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 50, reason: 'Strap exchange' }).expect(201);
    expect(partial.body.data).toMatchObject({ paymentStatus: 'PARTLY_REFUNDED', refundedAmount: 50, refunds: [{ amount: 50, reason: 'Strap exchange', method: 'COD', stripeRefundId: null }] });
    expect(stripeFake.refunds.create).not.toHaveBeenCalled();

    const tooMuch = await agent.post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 150.01, reason: 'Goodwill gesture' }).expect(400);
    expect(tooMuch.body.error).toMatchObject({ code: 'REFUND_EXCEEDS_BALANCE', details: { max: 150 } });

    const rest = await agent.post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 150, reason: 'Returned item' }).expect(201);
    expect(rest.body.data).toMatchObject({ paymentStatus: 'REFUNDED', refundedAmount: 200 });
    await agent.post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 1, reason: 'Returned item' }).expect(400);
  });

  it('refunds through Stripe when the order was paid by card', async () => {
    const { agent } = await signedInUser('ADMIN');
    const order = await paidOrder({ paymentMethod: 'STRIPE', stripeSessionId: 'cs_test_1' });

    const res = await agent.post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 75.5, reason: 'Arrived damaged' }).expect(201);
    expect(stripeFake.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_test_1', amount: 7550 });
    expect(res.body.data.refunds[0]).toMatchObject({ method: 'STRIPE', stripeRefundId: 're_test_1' });
  });

  it('only refunds paid orders, validates the body and needs an admin', async () => {
    const { agent } = await signedInUser('ADMIN');
    const unpaid = await paidOrder({ paymentStatus: 'UNPAID' });
    await agent.post(`/api/admin/orders/${unpaid.id}/refunds`).send({ amount: 10, reason: 'Goodwill gesture' }).expect(400);
    await agent.post(`/api/admin/orders/${unpaid.id}/refunds`).send({ amount: 0, reason: 'Goodwill gesture' }).expect(400);

    const customer = await signedInUser();
    await customer.agent.post(`/api/admin/orders/${unpaid.id}/refunds`).send({ amount: 10, reason: 'x' }).expect(403);
  });

  it('keeps a refunded order refunded when the payment webhook is replayed or the order is delivered', async () => {
    const { agent } = await signedInUser('ADMIN');
    const order = await paidOrder({ status: 'SHIPPED' });
    await prisma.order.update({ where: { id: order.id }, data: { trackingNumber: 'TRACK-1', courierName: 'DHL Express' } });
    await agent.post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 200, reason: 'Returned item' }).expect(201);

    const delivered = await agent.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'DELIVERED' }).expect(200);
    expect(delivered.body.data.paymentStatus).toBe('REFUNDED');
  });

  it('lists refunds with the 30 day summary', async () => {
    const { agent } = await signedInUser('ADMIN');
    const order = await paidOrder();
    await agent.post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 40, reason: 'Goodwill gesture' }).expect(201);
    await agent.post(`/api/admin/orders/${order.id}/refunds`).send({ amount: 60, reason: 'Returned item' }).expect(201);

    const res = await agent.get('/api/admin/refunds').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({ amount: 60, reason: 'Returned item', order: { id: order.id }, customer: { name: expect.any(String) } });
    expect(res.body.meta).toMatchObject({ total: 2, refundedLast30Days: 100, refundCountLast30Days: 2, refundRate: 100 });
    expect((await agent.get('/api/admin/refunds?q=goodwill')).body.data).toHaveLength(1);
    expect((await agent.get(`/api/admin/refunds?q=%23${order.id}`)).body.data).toHaveLength(2);
  });
});
