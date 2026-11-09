import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { app, createCatalogBase, createOrder, createUser, createWatch, resetDb, signedInUser } from './helpers';

beforeEach(resetDb);

describe('taxonomy', () => {
  it('refuses to delete a brand or category that still has watches, with a code and count', async () => {
    const { agent } = await signedInUser('ADMIN');
    const watch = await createWatch();

    const brand = await agent.delete(`/api/admin/brands/${watch.brandId}`).expect(409);
    expect(brand.body.error).toMatchObject({ code: 'IN_USE', details: { watchCount: 1 } });
    await agent.delete(`/api/admin/categories/${watch.categoryId}`).expect(409);

    const { brand: empty, category } = await createCatalogBase();
    await agent.delete(`/api/admin/brands/${empty.id}`).expect(204);
    await agent.delete(`/api/admin/categories/${category.id}`).expect(204);
  });

  it('lists how many watches each brand has', async () => {
    const { agent } = await signedInUser('ADMIN');
    await createWatch();
    expect((await agent.get('/api/admin/brands')).body.data[0]._count.watches).toBe(1);
  });
});

describe('banners and FAQs', () => {
  it('appends new banners, links them to a watch, reorders them and hides inactive ones', async () => {
    const { agent } = await signedInUser('ADMIN');
    const watch = await createWatch();
    const create = (title: string, extra: Record<string, unknown> = {}) =>
      agent.post('/api/admin/banners').send({ imageUrl: '/watches/a.webp', eyebrow: 'No 01', title, watchId: watch.id, ...extra }).expect(201);

    const first = (await create('First')).body.data;
    const second = (await create('Second')).body.data;
    const hidden = (await create('Hidden', { isActive: false })).body.data;
    expect([first.sortOrder, second.sortOrder, hidden.sortOrder]).toEqual([0, 1, 2]);

    await agent.put('/api/admin/banners/reorder').send({ ids: [second.id, first.id, hidden.id] }).expect(204);
    const admin = await agent.get('/api/admin/banners').expect(200);
    expect(admin.body.data.map((banner: { title: string }) => banner.title)).toEqual(['Second', 'First', 'Hidden']);
    expect(admin.body.data[0]).toMatchObject({ eyebrow: 'No 01', watch: { id: watch.id } });

    const publicBanners = await request(app).get('/api/banners').expect(200);
    expect(publicBanners.body.data.map((banner: { title: string }) => banner.title)).toEqual(['Second', 'First']);
    expect(publicBanners.body.data[0].watch).toMatchObject({ slug: watch.slug });
  });

  it('keeps FAQ order per category and only shows active questions publicly', async () => {
    const { agent } = await signedInUser('ADMIN');
    const create = (question: string, category: string, extra: Record<string, unknown> = {}) =>
      agent.post('/api/admin/faqs').send({ question, answer: 'An answer.', category, ...extra }).expect(201);

    const a = (await create('A?', 'Orders')).body.data;
    const b = (await create('B?', 'Orders')).body.data;
    const other = (await create('C?', 'Payments')).body.data;
    await create('Draft?', 'Orders', { isActive: false });
    expect([a.sortOrder, b.sortOrder, other.sortOrder]).toEqual([0, 1, 0]);

    await agent.put('/api/admin/faqs/reorder').send({ ids: [b.id, a.id] }).expect(204);
    expect((await agent.get('/api/admin/faqs')).body.data.map((faq: { question: string }) => faq.question)).toEqual(['B?', 'A?', 'Draft?', 'C?']);
    expect((await request(app).get('/api/faqs')).body.data.map((faq: { question: string }) => faq.question)).toEqual(['B?', 'A?', 'C?']);
  });
});

describe('coupons for the admin', () => {
  it('returns numbers and flags expired coupons', async () => {
    const { agent } = await signedInUser('ADMIN');
    await agent.post('/api/admin/coupons').send({ code: 'SOON', type: 'FIXED', value: 25, minAmount: 100, usageLimit: 10, expiresAt: new Date(Date.now() + 86400000).toISOString() }).expect(201);
    await agent.post('/api/admin/coupons').send({ code: 'PAST', type: 'PERCENTAGE', value: 10, expiresAt: new Date(Date.now() - 86400000).toISOString() }).expect(201);

    const list = (await agent.get('/api/admin/coupons')).body.data as { code: string; value: number; minAmount: number | null; isExpired: boolean; usageCount: number }[];
    expect(list.find(coupon => coupon.code === 'SOON')).toMatchObject({ value: 25, minAmount: 100, isExpired: false, usageCount: 0 });
    expect(list.find(coupon => coupon.code === 'PAST')).toMatchObject({ minAmount: null, isExpired: true });
  });
});

describe('search, newsletter and notify me', () => {
  it('searches watches by name, brand and reference plus brands and categories', async () => {
    const { brand, category } = await createCatalogBase();
    const named = await createWatch({ name: 'Orbis Celeste', brandId: brand.id, categoryId: category.id, sku: 'WH-001' });
    await createWatch({ name: 'Unrelated', sku: 'ZZ-999' });
    await createWatch({ name: 'Orbis Draft', status: 'DRAFT' });

    const byName = await request(app).get('/api/search?q=orbis').expect(200);
    expect(byName.body.data.watches).toHaveLength(1);
    expect(byName.body.data.watches[0]).toMatchObject({ id: named.id, slug: named.slug, sku: 'WH-001', price: 100, image: '/watches/test.webp', brand: { name: brand.name } });
    expect((await request(app).get('/api/search?q=wh-001')).body.data.watches).toHaveLength(1);

    const byBrand = await request(app).get(`/api/search?q=${encodeURIComponent(brand.name)}`).expect(200);
    expect(byBrand.body.data.watches).toHaveLength(1);
    expect(byBrand.body.data.brands).toEqual([{ id: brand.id, name: brand.name }]);
    expect((await request(app).get(`/api/search?q=${encodeURIComponent(category.name)}`)).body.data.categories).toHaveLength(1);
    await request(app).get('/api/search?q=').expect(400);
  });

  it('matches references in the catalogue search too', async () => {
    await createWatch({ sku: 'REF-4242' });
    expect((await request(app).get('/api/watches?q=ref-4242')).body.meta.total).toBe(1);
  });

  it('signs people up to the newsletter once', async () => {
    await request(app).post('/api/newsletter').send({ email: 'Reader@Example.com' }).expect(201);
    await request(app).post('/api/newsletter').send({ email: 'reader@example.com' }).expect(201);
    await request(app).post('/api/newsletter').send({ email: 'nope' }).expect(400);
    expect(await prisma.newsletterSubscriber.count()).toBe(1);
  });

  it('records notify-me requests for sold-out watches only, without duplicates', async () => {
    const soldOut = await createWatch({ stock: 0 });
    const available = await createWatch({ stock: 5 });

    await request(app).post(`/api/watches/${soldOut.id}/notify`).send({ email: 'fan@example.com' }).expect(201);
    await request(app).post(`/api/watches/${soldOut.id}/notify`).send({ email: 'fan@example.com' }).expect(201);
    expect(await prisma.stockSubscription.count()).toBe(1);
    const inStock = await request(app).post(`/api/watches/${available.id}/notify`).send({ email: 'fan@example.com' }).expect(400);
    expect(inStock.body.error.code).toBe('IN_STOCK');
    await request(app).post('/api/watches/9999/notify').send({ email: 'fan@example.com' }).expect(404);
  });

  it('notifies signed-in subscribers when an admin restocks through the watch editor', async () => {
    const admin = await signedInUser('ADMIN');
    const fan = await signedInUser();
    const watch = await createWatch({ stock: 0 });
    await fan.agent.post(`/api/watches/${watch.id}/notify`).send({ email: fan.user.email }).expect(201);

    await admin.agent
      .put(`/api/admin/watches/${watch.id}`)
      .send({ sku: watch.sku, name: watch.name, description: 'Restocked.', brandId: watch.brandId, categoryId: watch.categoryId, price: 100, stock: 3 })
      .expect(200);
    expect(await prisma.notification.count({ where: { userId: fan.user.id, title: { contains: 'back in stock' } } })).toBe(1);
  });
});

describe('customers', () => {
  it('lists location, order count and lifetime spend net of cancellations and refunds', async () => {
    const { agent } = await signedInUser('ADMIN');
    const customer = await createUser({ name: 'Maya Test' });
    await prisma.address.create({ data: { userId: customer.id, recipient: 'Maya', addressLine: '1 Road', city: 'San Diego', state: 'CA', zip: '92101', country: 'United States', isDefault: true } });
    await createOrder(customer.id, { total: 300, status: 'DELIVERED', paymentStatus: 'PAID' });
    const refunded = await createOrder(customer.id, { total: 200, status: 'DELIVERED', paymentStatus: 'PARTLY_REFUNDED' });
    await prisma.order.update({ where: { id: refunded.id }, data: { refundedAmount: 50 } });
    await createOrder(customer.id, { total: 999, status: 'CANCELLED' });

    const res = await agent.get('/api/admin/users?q=maya').expect(200);
    expect(res.body.data[0]).toMatchObject({ name: 'Maya Test', location: 'San Diego, United States', orderCount: 3, totalSpent: 450, isBlocked: false, role: 'CUSTOMER' });
  });
});

describe('support tickets', () => {
  const openTicket = async (customer: Awaited<ReturnType<typeof signedInUser>>, extra: Record<string, unknown> = {}) =>
    (await customer.agent.post('/api/support/tickets').send({ subject: 'Where is my parcel?', message: 'It has not moved for days.', ...extra }).expect(201)).body.data;

  it('opens tickets as Open / Normal, optionally linked to the customer order', async () => {
    const customer = await signedInUser();
    const order = await createOrder(customer.user.id);
    const stranger = await createOrder((await createUser()).id);

    const ticket = await openTicket(customer, { orderId: order.id });
    expect(ticket).toMatchObject({ status: 'OPEN', priority: 'NORMAL', orderId: order.id, order: { id: order.id }, messages: [{ kind: 'CUSTOMER' }] });
    await customer.agent.post('/api/support/tickets').send({ subject: 'Not mine', message: 'Someone else order', orderId: stranger.id }).expect(404);
  });

  it('keeps internal notes away from the customer and does not move the status', async () => {
    const admin = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const ticket = await openTicket(customer);

    const noted = await admin.agent.post(`/api/admin/tickets/${ticket.id}/messages`).send({ message: 'Checked with DHL', kind: 'INTERNAL' }).expect(201);
    expect(noted.body.data).toMatchObject({ status: 'OPEN', messages: [{ kind: 'CUSTOMER' }, { kind: 'INTERNAL', author: { role: 'ADMIN' } }] });
    expect(await prisma.notification.count({ where: { userId: customer.user.id } })).toBe(0);

    const seen = await customer.agent.get(`/api/support/tickets/${ticket.id}`).expect(200);
    expect(seen.body.data.messages).toHaveLength(1);
  });

  it('moves an open ticket to Pending when the team replies and back to Open on the customer reply', async () => {
    const admin = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const ticket = await openTicket(customer);

    const replied = await admin.agent.post(`/api/admin/tickets/${ticket.id}/messages`).send({ message: 'It shipped this morning.' }).expect(201);
    expect(replied.body.data).toMatchObject({ status: 'PENDING', messages: [{ kind: 'CUSTOMER' }, { kind: 'ADMIN' }] });
    expect(await prisma.notification.count({ where: { userId: customer.user.id } })).toBe(1);

    const answered = await customer.agent.post(`/api/support/tickets/${ticket.id}/messages`).send({ message: 'Thanks!' }).expect(201);
    expect(answered.body.data.status).toBe('OPEN');
    expect(answered.body.data.messages.at(-1).kind).toBe('CUSTOMER');
  });

  it('sets status and priority, filters by several statuses, searches and counts per status', async () => {
    const admin = await signedInUser('ADMIN');
    const customer = await signedInUser();
    const first = await openTicket(customer);
    const second = await openTicket(customer, { subject: 'Strap sizing' });
    await openTicket(customer, { subject: 'Warranty question' });

    await admin.agent.patch(`/api/admin/tickets/${first.id}`).send({ status: 'RESOLVED', priority: 'URGENT' }).expect(200);
    await admin.agent.patch(`/api/admin/tickets/${second.id}`).send({ status: 'PENDING', priority: 'LOW' }).expect(200);
    await admin.agent.patch(`/api/admin/tickets/${second.id}`).send({ status: 'NOPE' }).expect(400);

    const all = await admin.agent.get('/api/admin/tickets').expect(200);
    expect(all.body.meta.counts).toEqual({ OPEN: 1, PENDING: 1, RESOLVED: 1 });
    expect(all.body.data[0].lastMessage).toMatchObject({ kind: 'CUSTOMER' });

    const resolved = await admin.agent.get('/api/admin/tickets?status=RESOLVED,CLOSED').expect(200);
    expect(resolved.body.data.map((ticket: { id: number }) => ticket.id)).toEqual([first.id]);
    expect(resolved.body.data[0]).toMatchObject({ priority: 'URGENT', user: { name: customer.user.name } });
    expect((await admin.agent.get('/api/admin/tickets?q=strap')).body.data).toHaveLength(1);
    expect((await admin.agent.get(`/api/admin/tickets?q=%23${second.id}`)).body.data).toHaveLength(1);
  });
});
