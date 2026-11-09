import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { createAddress, createCatalogBase, createOrder, createUser, createWatch, resetDb, signedInUser } from './helpers';

beforeEach(resetDb);

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

describe('admin analytics', () => {
  it('compares revenue, orders, average order and new customers with the previous period', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await createUser();
    const watch = await createWatch({ stock: 50 });
    await createOrder(customer.id, { watchId: watch.id, total: 300, status: 'CONFIRMED', createdAt: daysAgo(1) });
    await createOrder(customer.id, { watchId: watch.id, total: 100, status: 'DELIVERED', createdAt: daysAgo(2) });
    await createOrder(customer.id, { watchId: watch.id, total: 200, status: 'DELIVERED', createdAt: daysAgo(9) });
    await createOrder(customer.id, { watchId: watch.id, total: 999, status: 'CANCELLED', createdAt: daysAgo(1) });
    await createOrder(customer.id, { watchId: watch.id, total: 999, status: 'PENDING_PAYMENT', createdAt: daysAgo(1) });
    await prisma.order.updateMany({ where: { total: 100 }, data: { refundedAmount: 20 } });

    const res = await agent.get('/api/admin/analytics?range=7d').expect(200);
    const { kpis, series, salesByCategory, statusCounts, recentOrders, bestSellers } = res.body.data;
    expect(kpis.revenue).toEqual({ value: 380, previous: 200, change: 180, changePercent: 90 });
    expect(kpis.orders).toMatchObject({ value: 2, previous: 1, change: 1, changePercent: 100 });
    expect(kpis.averageOrder).toMatchObject({ value: 190, previous: 200 });
    expect(kpis.newCustomers.value).toBe(1);

    expect(series).toHaveLength(7);
    expect(series.reduce((sum: number, point: { revenue: number }) => sum + point.revenue, 0)).toBe(380);
    expect(series.reduce((sum: number, point: { previousRevenue: number }) => sum + point.previousRevenue, 0)).toBe(200);

    expect(salesByCategory).toHaveLength(1);
    expect(salesByCategory[0]).toMatchObject({ revenue: 400, units: 2, share: 100 });
    expect(statusCounts).toEqual(expect.arrayContaining([{ status: 'CANCELLED', count: 1 }, { status: 'PENDING_PAYMENT', count: 1 }]));
    expect(recentOrders).toHaveLength(5);
    expect(recentOrders[0]).toMatchObject({ customerName: customer.name, items: expect.stringContaining('Test Watch') });
    expect(bestSellers[0]).toMatchObject({ watchId: watch.id, units: 2, share: 100 });
  });

  it('supports the 30 day and 12 month ranges and rejects unknown ranges', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await createUser();
    await createOrder(customer.id, { total: 500, status: 'CONFIRMED', createdAt: daysAgo(20) });
    await createOrder(customer.id, { total: 700, status: 'CONFIRMED', createdAt: daysAgo(100) });

    const month = await agent.get('/api/admin/analytics?range=30d').expect(200);
    expect(month.body.data.series).toHaveLength(30);
    expect(month.body.data.kpis.revenue.value).toBe(500);

    const year = await agent.get('/api/admin/analytics?range=12m').expect(200);
    expect(year.body.data.series).toHaveLength(12);
    expect(year.body.data.kpis.revenue.value).toBe(1200);
    await agent.get('/api/admin/analytics?range=5y').expect(400);
  });

  it('lists low-stock watches including sold-out ones', async () => {
    const { agent } = await signedInUser('ADMIN');
    await createWatch({ stock: 2, name: 'Almost Gone', lowStockThreshold: 5 });
    await createWatch({ stock: 0, name: 'Sold Out' });
    await createWatch({ stock: 30, name: 'Plenty' });

    const { lowStock } = (await agent.get('/api/admin/analytics')).body.data;
    expect(lowStock.map((watch: { name: string }) => watch.name)).toEqual(['Sold Out', 'Almost Gone']);
    expect(lowStock[1]).toMatchObject({ stock: 2, threshold: 5 });
  });
});

describe('inventory', () => {
  const trackedWatch = () =>
    createWatch({
      stock: 9,
      trackColorStock: true,
      lowStockThreshold: 3,
      sku: 'REF-1',
      colors: [
        { name: 'Navy', hex: '#112233', stock: 6 },
        { name: 'Pearl', hex: '#eeeeee', stock: 3 },
      ],
    });

  it('lists a row per colour with reserved units from open orders, and filters', async () => {
    const { agent } = await signedInUser('ADMIN');
    const watch = await trackedWatch();
    const customer = await createUser();
    await createOrder(customer.id, { watchId: watch.id, productColor: 'Navy', quantity: 2, status: 'CONFIRMED' });
    await createOrder(customer.id, { watchId: watch.id, productColor: 'Navy', quantity: 5, status: 'CANCELLED' });

    const res = await agent.get('/api/admin/inventory').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({ variant: 'Navy', sku: 'REF-1-01', onHand: 6, reserved: 2, available: 4, state: 'OK', colorId: expect.any(Number) });
    expect(res.body.data[1]).toMatchObject({ variant: 'Pearl', onHand: 3, reserved: 0, state: 'LOW' });
    expect(res.body.meta).toMatchObject({ skus: 2, unitsOnHand: 9, reserved: 2, soldOutSkus: 0, counts: { all: 2, low: 1, out: 0 } });
    expect((await agent.get('/api/admin/inventory?filter=low')).body.data).toHaveLength(1);
    expect((await agent.get('/api/admin/inventory?q=navy')).body.data).toHaveLength(1);
  });

  it('adjusts colour stock with a reason, keeps the product total in sync and records history', async () => {
    const { agent, user } = await signedInUser('ADMIN');
    const watch = await trackedWatch();
    const [navy, pearl] = await prisma.watchColor.findMany({ where: { watchId: watch.id }, orderBy: { id: 'asc' } });

    const res = await agent
      .post('/api/admin/inventory/adjust')
      .send({ reason: 'Stock count', items: [{ watchId: watch.id, colorId: navy!.id, newStock: 10 }, { watchId: watch.id, colorId: pearl!.id, newStock: 3 }] })
      .expect(200);
    expect(res.body.data.adjusted).toBe(1);
    expect((await prisma.watch.findUniqueOrThrow({ where: { id: watch.id } })).stock).toBe(13);

    const history = await agent.get(`/api/admin/inventory/history?watchId=${watch.id}`).expect(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0]).toMatchObject({ variant: 'Navy', delta: 4, newStock: 10, reason: 'Stock count', actor: user.name });

    await agent.post('/api/admin/inventory/adjust').send({ reason: 'x', items: [{ watchId: watch.id, newStock: 1 }] }).expect(400);
    await agent.post('/api/admin/inventory/adjust').send({ reason: '', items: [{ watchId: watch.id, colorId: navy!.id, newStock: 1 }] }).expect(400);
    await agent.post('/api/admin/inventory/adjust').send({ reason: 'x', items: [{ watchId: watch.id, colorId: navy!.id, newStock: -1 }] }).expect(400);
  });

  it('adjusts a watch without per-colour tracking directly and notifies subscribers on restock', async () => {
    const { agent } = await signedInUser('ADMIN');
    const subscriber = await signedInUser();
    const watch = await createWatch({ stock: 0 });
    await subscriber.agent.post(`/api/watches/${watch.id}/notify`).send({ email: subscriber.user.email }).expect(201);
    await agent.post('/api/admin/inventory/adjust').send({ reason: 'Restock delivery', items: [{ watchId: watch.id, colorId: 999, newStock: 4 }] }).expect(400);

    await agent.post('/api/admin/inventory/adjust').send({ reason: 'Restock delivery', items: [{ watchId: watch.id, newStock: 4 }] }).expect(200);
    expect((await prisma.watch.findUniqueOrThrow({ where: { id: watch.id } })).stock).toBe(4);
    expect(await prisma.notification.count({ where: { userId: subscriber.user.id, title: { contains: 'back in stock' } } })).toBe(1);
    expect(await prisma.stockSubscription.count()).toBe(0);
  });
});

describe('admin watches', () => {
  const body = async (overrides: Record<string, unknown> = {}) => {
    const { brand, category } = await createCatalogBase();
    return {
      sku: 'NEW-1',
      name: 'Colour Stock Watch',
      description: 'Has stock per colour.',
      brandId: brand.id,
      categoryId: category.id,
      price: 300,
      images: ['/watches/one.webp'],
      colors: [
        { name: 'Navy', hex: '#112233', stock: 4 },
        { name: 'Pearl', hex: '#eeeeee', stock: 2 },
      ],
      lowStockThreshold: 3,
      isNew: true,
      ...overrides,
    };
  };

  it('sums colour stock into the product stock and exposes threshold, new flag and colour stock', async () => {
    const { agent } = await signedInUser('ADMIN');
    const created = await agent.post('/api/admin/watches').send(await body()).expect(201);
    expect(created.body.data).toMatchObject({
      stock: 6,
      lowStockThreshold: 3,
      isNew: true,
      trackColorStock: true,
      colors: [{ name: 'Navy', stock: 4 }, { name: 'Pearl', stock: 2 }],
    });

    const legacy = await agent.post('/api/admin/watches').send(await body({ sku: 'NEW-2', name: 'Legacy', stock: 8, colors: [{ name: 'Navy', hex: '#112233' }] })).expect(201);
    expect(legacy.body.data).toMatchObject({ stock: 8, trackColorStock: false, colors: [{ name: 'Navy', stock: null }] });
  });

  it('filters by stock state, summarises tabs and applies bulk actions', async () => {
    const { agent } = await signedInUser('ADMIN');
    const low = await createWatch({ stock: 2, lowStockThreshold: 5 });
    const out = await createWatch({ stock: 0 });
    const draft = await createWatch({ stock: 20, status: 'DRAFT' });
    await createWatch({ stock: 20 });

    expect((await agent.get('/api/admin/watches?stock=low')).body.data.map((watch: { id: number }) => watch.id)).toEqual([low.id]);
    expect((await agent.get('/api/admin/watches?stock=out')).body.data.map((watch: { id: number }) => watch.id)).toEqual([out.id]);
    expect((await agent.get('/api/admin/watches/summary')).body.data).toEqual({ all: 4, published: 3, draft: 1, lowStock: 1, soldOut: 1 });

    const published = await agent.post('/api/admin/watches/bulk').send({ ids: [draft.id], action: 'publish' }).expect(200);
    expect(published.body.data.affected).toBe(1);
    expect((await prisma.watch.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('PUBLISHED');
    await agent.post('/api/admin/watches/bulk').send({ ids: [draft.id, out.id], action: 'draft' }).expect(200);
    expect(await prisma.watch.count({ where: { status: 'DRAFT' } })).toBe(2);
    await agent.post('/api/admin/watches/bulk').send({ ids: [draft.id, out.id], action: 'delete' }).expect(200);
    expect(await prisma.watch.count()).toBe(2);
  });
});

describe('per-colour stock at checkout', () => {
  it('limits the cart to the chosen colour, reserves and restores that colour only', async () => {
    const { agent, user } = await signedInUser();
    const watch = await createWatch({
      stock: 5,
      trackColorStock: true,
      colors: [
        { name: 'Navy', hex: '#112233', stock: 1 },
        { name: 'Pearl', hex: '#eeeeee', stock: 4 },
      ],
    });
    const address = await createAddress(user.id);

    const tooMany = await agent.post('/api/cart').send({ watchId: watch.id, quantity: 2, productColor: 'Navy' }).expect(400);
    expect(tooMany.body.error).toMatchObject({ code: 'INSUFFICIENT_STOCK', details: { available: 1 } });
    await agent.post('/api/cart').send({ watchId: watch.id, quantity: 1, productColor: 'Navy' }).expect(201);

    const stock = await agent.get('/api/checkout/stock').expect(200);
    expect(stock.body.data).toMatchObject({ ok: true, lines: [{ productColor: 'Navy', quantity: 1, available: 1, soldOut: false, insufficient: false }] });

    const order = await agent.post('/api/checkout').send({ addressId: address.id, shippingMethod: 'STANDARD', paymentMethod: 'COD' }).expect(201);
    const colors = await prisma.watchColor.findMany({ where: { watchId: watch.id }, orderBy: { id: 'asc' } });
    expect(colors.map(color => color.stock)).toEqual([0, 4]);
    expect((await prisma.watch.findUniqueOrThrow({ where: { id: watch.id } })).stock).toBe(4);

    await agent.post(`/api/orders/${order.body.data.order.id}/cancel`).expect(200);
    expect((await prisma.watchColor.findMany({ where: { watchId: watch.id }, orderBy: { id: 'asc' } })).map(color => color.stock)).toEqual([1, 4]);
    expect((await prisma.watch.findUniqueOrThrow({ where: { id: watch.id } })).stock).toBe(5);
  });

  it('flags sold-out lines so checkout can block them', async () => {
    const { agent, user } = await signedInUser();
    const watch = await createWatch({ stock: 3 });
    await prisma.cartItem.create({ data: { userId: user.id, watchId: watch.id, quantity: 2 } });
    await prisma.watch.update({ where: { id: watch.id }, data: { stock: 0 } });

    const stock = await agent.get('/api/checkout/stock').expect(200);
    expect(stock.body.data).toMatchObject({ ok: false, lines: [{ available: 0, soldOut: true }] });
    expect((await agent.get('/api/cart')).body.data[0]).toMatchObject({ soldOut: true, available: 0 });

    const address = await createAddress(user.id);
    const res = await agent.post('/api/checkout').send({ addressId: address.id, shippingMethod: 'STANDARD', paymentMethod: 'COD' }).expect(409);
    expect(res.body.error).toMatchObject({ code: 'OUT_OF_STOCK', details: { watchId: watch.id } });
  });
});
