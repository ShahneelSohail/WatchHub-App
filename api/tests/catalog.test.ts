import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { app, createCatalogBase, createDeliveredOrder, createWatch, resetDb, signedInUser } from './helpers';

beforeEach(resetDb);

describe('catalog', () => {
  it('lists only published watches and applies filters, search and sorting', async () => {
    const { brand, category } = await createCatalogBase();
    const other = await createCatalogBase();
    await createWatch({ name: 'Alpha Diver', price: 300, brandId: brand.id, categoryId: category.id });
    await createWatch({ name: 'Beta Dress', price: 900, brandId: other.brand.id, categoryId: other.category.id });
    await createWatch({ name: 'Gamma Sold Out', price: 500, stock: 0, brandId: brand.id, categoryId: category.id });
    await createWatch({ name: 'Hidden Draft', status: 'DRAFT' });

    const all = await request(app).get('/api/watches').expect(200);
    expect(all.body.data.map((watch: { name: string }) => watch.name)).not.toContain('Hidden Draft');
    expect(all.body.meta.total).toBe(3);

    const byBrand = await request(app).get(`/api/watches?brandId=${brand.id}&sort=price_desc`).expect(200);
    expect(byBrand.body.data.map((watch: { name: string }) => watch.name)).toEqual(['Gamma Sold Out', 'Alpha Diver']);

    const inStock = await request(app).get(`/api/watches?inStock=true&minPrice=400`).expect(200);
    expect(inStock.body.data.map((watch: { name: string }) => watch.name)).toEqual(['Beta Dress']);

    const search = await request(app).get('/api/watches?q=dress').expect(200);
    expect(search.body.data).toHaveLength(1);
  });

  it('shows a watch by slug with its sale percentage and hides drafts', async () => {
    const watch = await createWatch({ price: 200, salePrice: 150, colors: [{ name: 'Navy', hex: '#112233' }] });
    const draft = await createWatch({ status: 'DRAFT' });

    const res = await request(app).get(`/api/watches/${watch.slug}`).expect(200);
    expect(res.body.data).toMatchObject({ price: 200, salePrice: 150, discountPercent: 25, colors: [{ name: 'Navy' }] });
    await request(app).get(`/api/watches/${draft.slug}`).expect(404);
  });

  it('only lets customers with a delivered order review a watch, and averages ratings', async () => {
    const watch = await createWatch();
    const buyer = await signedInUser();
    const stranger = await signedInUser();
    await createDeliveredOrder(buyer.user.id, watch.id);

    await stranger.agent.post(`/api/watches/${watch.id}/reviews`).send({ rating: 5, comment: 'Never bought it.' }).expect(403);
    await buyer.agent.post(`/api/watches/${watch.id}/reviews`).send({ rating: 6, comment: 'Too high a rating' }).expect(400);
    await buyer.agent.post(`/api/watches/${watch.id}/reviews`).send({ rating: 4, comment: 'Solid watch for the price.' }).expect(201);
    await buyer.agent.post(`/api/watches/${watch.id}/reviews`).send({ rating: 5, comment: 'Even better after a month.' }).expect(201);

    expect(await prisma.review.count()).toBe(1);
    const detail = await request(app).get(`/api/watches/${watch.slug}`).expect(200);
    expect(detail.body.data.rating).toEqual({ average: 5, count: 1 });
    const reviews = await request(app).get(`/api/watches/${watch.id}/reviews`).expect(200);
    expect(reviews.body.data[0]).toMatchObject({ rating: 5, user: { name: buyer.user.name } });
  });
});
