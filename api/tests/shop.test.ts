import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createWatch, resetDb, signedInUser } from './helpers';

beforeEach(resetDb);

const address = { recipient: 'Ada Lovelace', addressLine: '12 Analytical Way', city: 'London', state: 'LDN', zip: 'N1 9GU', country: 'United Kingdom' };

describe('cart', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/cart').expect(401);
  });

  it('merges identical lines, keeps different options apart and totals with the sale price', async () => {
    const { agent } = await signedInUser();
    const watch = await createWatch({ price: 200, salePrice: 150, hasBeltOption: true, colors: [{ name: 'Navy', hex: '#112233' }] });

    await agent.post('/api/cart').send({ watchId: watch.id, quantity: 1, productColor: 'Navy' }).expect(201);
    await agent.post('/api/cart').send({ watchId: watch.id, quantity: 2, productColor: 'Navy' }).expect(201);
    const res = await agent.post('/api/cart').send({ watchId: watch.id, quantity: 1, strapType: 'BELT' }).expect(201);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({ quantity: 3, lineTotal: 450, productColor: 'Navy' });
  });

  it('rejects unavailable options, out of stock watches and quantities above the stock', async () => {
    const { agent } = await signedInUser();
    const watch = await createWatch({ stock: 2, colors: [{ name: 'Navy', hex: '#112233' }] });
    const soldOut = await createWatch({ stock: 0 });
    const draft = await createWatch({ status: 'DRAFT' });

    await agent.post('/api/cart').send({ watchId: watch.id, strapType: 'CHAIN' }).expect(400);
    await agent.post('/api/cart').send({ watchId: watch.id, productColor: 'Pink' }).expect(400);
    await agent.post('/api/cart').send({ watchId: watch.id, quantity: 3 }).expect(400);
    await agent.post('/api/cart').send({ watchId: soldOut.id }).expect(400);
    await agent.post('/api/cart').send({ watchId: draft.id }).expect(404);
  });

  it('updates and removes lines, and never touches another customer\'s cart', async () => {
    const owner = await signedInUser();
    const other = await signedInUser();
    const watch = await createWatch();
    const added = await owner.agent.post('/api/cart').send({ watchId: watch.id }).expect(201);
    const lineId = added.body.data[0].id;

    await other.agent.patch(`/api/cart/${lineId}`).send({ quantity: 2 }).expect(404);
    await other.agent.delete(`/api/cart/${lineId}`).expect(200);
    const updated = await owner.agent.patch(`/api/cart/${lineId}`).send({ quantity: 4 }).expect(200);
    expect(updated.body.data[0].quantity).toBe(4);
    const emptied = await owner.agent.delete(`/api/cart/${lineId}`).expect(200);
    expect(emptied.body.data).toEqual([]);
  });
});

describe('wishlist', () => {
  it('adds a watch once, lists it and removes it', async () => {
    const { agent } = await signedInUser();
    const watch = await createWatch();

    await agent.put(`/api/wishlist/${watch.id}`).expect(200);
    const again = await agent.put(`/api/wishlist/${watch.id}`).expect(200);
    expect(again.body.data).toHaveLength(1);
    const removed = await agent.delete(`/api/wishlist/${watch.id}`).expect(200);
    expect(removed.body.data).toEqual([]);
  });
});

describe('addresses', () => {
  it('makes the first address the default and moves the default when asked', async () => {
    const { agent } = await signedInUser();
    const first = await agent.post('/api/addresses').send(address).expect(201);
    expect(first.body.data[0].isDefault).toBe(true);

    const second = await agent.post('/api/addresses').send({ ...address, city: 'Paris', isDefault: true }).expect(201);
    expect(second.body.data.map((entry: { city: string; isDefault: boolean }) => [entry.city, entry.isDefault])).toEqual([
      ['Paris', true],
      ['London', false],
    ]);
  });

  it('validates input and keeps addresses private', async () => {
    const owner = await signedInUser();
    const other = await signedInUser();
    await owner.agent.post('/api/addresses').send({ ...address, city: '' }).expect(400);
    const created = await owner.agent.post('/api/addresses').send(address).expect(201);

    await other.agent.put(`/api/addresses/${created.body.data[0].id}`).send(address).expect(404);
    await other.agent.delete(`/api/addresses/${created.body.data[0].id}`).expect(200);
    expect((await owner.agent.get('/api/addresses')).body.data).toHaveLength(1);
  });
});
