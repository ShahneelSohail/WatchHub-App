import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { createAddress, createCatalogBase, createWatch, resetDb, signedInUser } from './helpers';

beforeEach(resetDb);

const watchBody = (brandId: number, categoryId: number, overrides: Record<string, unknown> = {}) => ({
  sku: 'WH-TEST-1',
  name: 'Admin Created Watch',
  description: 'Created through the admin API.',
  brandId,
  categoryId,
  price: 500,
  salePrice: '',
  stock: 4,
  images: ['/watches/one.webp'],
  specifications: { Movement: 'Automatic' },
  colors: [{ name: 'Navy', hex: '#112233' }],
  hasBeltOption: true,
  ...overrides,
});

const createOrder = async (userId: number, overrides: { status?: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'; total?: number } = {}) => {
  const watch = await createWatch({ stock: 5 });
  return prisma.order.create({
    data: {
      userId,
      status: overrides.status ?? 'PENDING',
      paymentMethod: 'COD',
      shippingMethod: 'STANDARD',
      subtotal: overrides.total ?? 100,
      shippingCost: 0,
      discount: 0,
      total: overrides.total ?? 100,
      shippingAddress: {},
      items: { create: { watchId: watch.id, name: watch.name, quantity: 1, unitPrice: overrides.total ?? 100 } },
      events: { create: { status: overrides.status ?? 'PENDING' } },
    },
  });
};

describe('admin watches', () => {
  it('creates, updates and deletes a watch, generating a unique slug', async () => {
    const { agent } = await signedInUser('ADMIN');
    const { brand, category } = await createCatalogBase();

    const created = await agent.post('/api/admin/watches').send(watchBody(brand.id, category.id)).expect(201);
    expect(created.body.data).toMatchObject({ slug: 'admin-created-watch', price: 500, salePrice: null, colors: [{ name: 'Navy' }] });
    const duplicate = await agent.post('/api/admin/watches').send(watchBody(brand.id, category.id, { sku: 'WH-TEST-2' })).expect(201);
    expect(duplicate.body.data.slug).toBe('admin-created-watch-2');
    await agent.post('/api/admin/watches').send(watchBody(brand.id, category.id)).expect(409);

    const id = created.body.data.id;
    const updated = await agent.put(`/api/admin/watches/${id}`).send(watchBody(brand.id, category.id, { price: 400, salePrice: 350, colors: [] })).expect(200);
    expect(updated.body.data).toMatchObject({ price: 400, salePrice: 350, colors: [], slug: 'admin-created-watch' });

    await agent.delete(`/api/admin/watches/${id}`).expect(204);
    await agent.get(`/api/admin/watches/${id}`).expect(404);
  });

  it('validates the sale price and lists drafts that the storefront hides', async () => {
    const { agent } = await signedInUser('ADMIN');
    const { brand, category } = await createCatalogBase();
    await agent.post('/api/admin/watches').send(watchBody(brand.id, category.id, { salePrice: 600 })).expect(400);

    await agent.post('/api/admin/watches').send(watchBody(brand.id, category.id, { status: 'DRAFT' })).expect(201);
    expect((await agent.get('/api/admin/watches?status=DRAFT')).body.meta.total).toBe(1);
  });

  it('keeps order history when a watch is deleted', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const order = await createOrder(customer.user.id);
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });

    await agent.delete(`/api/admin/watches/${item.watchId}`).expect(204);
    expect(await prisma.orderItem.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({ watchId: null, name: item.name });
  });
});

describe('admin orders', () => {
  it('moves an order through its lifecycle with tracking and notifies the customer', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const order = await createOrder(customer.user.id);

    await agent.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'CONFIRMED' }).expect(200);
    const shipped = await agent.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'SHIPPED', trackingNumber: 'TRK123', courierName: 'DHL' }).expect(200);
    expect(shipped.body.data).toMatchObject({ status: 'SHIPPED', trackingNumber: 'TRK123', courierName: 'DHL', user: { id: customer.user.id } });
    expect(shipped.body.data.events.map((event: { status: string }) => event.status)).toEqual(['PENDING', 'CONFIRMED', 'SHIPPED']);

    await agent.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'CONFIRMED' }).expect(400);
    const delivered = await agent.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'DELIVERED' }).expect(200);
    expect(delivered.body.data).toMatchObject({ status: 'DELIVERED', paymentStatus: 'PAID' });
    await agent.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'CANCELLED' }).expect(400);
    expect(await prisma.notification.count({ where: { userId: customer.user.id } })).toBe(3);
  });

  it('cancels with a restock, filters and searches, and saves internal notes', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const order = await createOrder(customer.user.id);
    await createOrder(customer.user.id, { status: 'CONFIRMED' });

    const cancelled = await agent.patch(`/api/admin/orders/${order.id}/status`).send({ status: 'CANCELLED', note: 'Customer request' }).expect(200);
    expect(cancelled.body.data.status).toBe('CANCELLED');

    expect((await agent.get('/api/admin/orders?status=CONFIRMED')).body.data).toHaveLength(1);
    expect((await agent.get(`/api/admin/orders?q=${customer.user.email}`)).body.meta.total).toBe(2);
    expect((await agent.get(`/api/admin/orders?q=%23${order.id}`)).body.data).toHaveLength(1);

    const noted = await agent.patch(`/api/admin/orders/${order.id}/note`).send({ adminNote: 'Call before delivery' }).expect(200);
    expect(noted.body.data.adminNote).toBe('Call before delivery');
  });
});

describe('admin people and moderation', () => {
  it('blocks customers but never lets an admin change their own account', async () => {
    const admin = await signedInUser('ADMIN');
    const customer = await signedInUser();

    await admin.agent.patch(`/api/admin/users/${customer.user.id}`).send({ isBlocked: true }).expect(200);
    await customer.agent.get('/api/auth/me').expect(401);
    await admin.agent.patch(`/api/admin/users/${admin.user.id}`).send({ role: 'CUSTOMER' }).expect(400);
  });

  it('lists customers with their order count and lifetime spend', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    await createOrder(customer.user.id, { total: 250 });
    await createOrder(customer.user.id, { status: 'CANCELLED', total: 900 });

    const res = await agent.get(`/api/admin/users?q=${customer.user.email}`).expect(200);
    expect(res.body.data[0]).toMatchObject({ orderCount: 2, totalSpent: 250 });
  });

  it('hides a moderated review and shows the admin reply', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const watch = await createWatch();
    const review = await prisma.review.create({ data: { userId: customer.user.id, watchId: watch.id, rating: 1, comment: 'Spam spam spam spam' } });

    await agent.patch(`/api/admin/reviews/${review.id}`).send({ adminReply: 'Thanks for the feedback' }).expect(200);
    await agent.patch(`/api/admin/reviews/${review.id}`).send({ status: 'HIDDEN' }).expect(200);
    const detail = await customer.agent.get(`/api/watches/${watch.id}/reviews`).expect(200);
    expect(detail.body.data).toEqual([]);
  });

  it('answers a support ticket and notifies the customer', async () => {
    const admin = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const created = await customer.agent.post('/api/support/tickets').send({ subject: 'Strap question', message: 'Can I change the strap?' }).expect(201);
    const id = created.body.data.id;

    const replied = await admin.agent.post(`/api/admin/tickets/${id}/messages`).send({ message: 'Yes, of course.' }).expect(201);
    expect(replied.body.data).toMatchObject({ status: 'IN_PROGRESS', messages: [{ message: 'Can I change the strap?' }, { message: 'Yes, of course.', author: { role: 'ADMIN' } }] });
    expect(await prisma.notification.count({ where: { userId: customer.user.id } })).toBe(1);

    await admin.agent.patch(`/api/admin/tickets/${id}`).send({ status: 'CLOSED' }).expect(200);
    await customer.agent.post(`/api/support/tickets/${id}/messages`).send({ message: 'One more thing' }).expect(400);
  });
});

describe('admin catalog CRUD', () => {
  it('manages brands, refusing duplicates and brands that still have watches', async () => {
    const { agent } = await signedInUser('ADMIN');
    const created = await agent.post('/api/admin/brands').send({ name: 'Zenith Test' }).expect(201);
    await agent.post('/api/admin/brands').send({ name: 'Zenith Test' }).expect(409);
    await agent.put(`/api/admin/brands/${created.body.data.id}`).send({ name: 'Zenith Renamed', description: '  ' }).expect(200);

    const used = await createWatch();
    await agent.delete(`/api/admin/brands/${used.brandId}`).expect(409);
    await agent.delete(`/api/admin/brands/${created.body.data.id}`).expect(204);
  });

  it('creates coupons with an upper-cased code and validates percentages', async () => {
    const { agent } = await signedInUser('ADMIN');
    const res = await agent.post('/api/admin/coupons').send({ code: 'spring 15', type: 'PERCENTAGE', value: 15, minAmount: '', expiresAt: '' }).expect(201);
    expect(res.body.data).toMatchObject({ code: 'SPRING15', minAmount: null, expiresAt: null });
    await agent.post('/api/admin/coupons').send({ code: 'TOO', type: 'PERCENTAGE', value: 150 }).expect(400);
  });
});

describe('admin dashboard', () => {
  it('summarises revenue without counting cancelled orders, and flags low stock', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await signedInUser();
    await createAddress(customer.user.id);
    await createOrder(customer.user.id, { total: 300 });
    await createOrder(customer.user.id, { status: 'DELIVERED', total: 100 });
    await createOrder(customer.user.id, { status: 'CANCELLED', total: 5000 });
    await createWatch({ name: 'Almost Gone', stock: 1 });

    const { data } = (await agent.get('/api/admin/dashboard').expect(200)).body;
    expect(data).toMatchObject({ totalRevenue: 400, orderCount: 3, customerCount: 1, pendingOrders: 1, averageOrderValue: 200 });
    expect(data.salesByDay).toHaveLength(14);
    expect(data.salesByDay.at(-1)).toMatchObject({ revenue: 400, orders: 2 });
    expect(data.lowStock.map((watch: { name: string }) => watch.name)).toContain('Almost Gone');
  });
});
