import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { PASSWORD, app, createUser, loginAs, resetDb } from './helpers';

beforeEach(resetDb);

const newUser = { name: 'Ada Lovelace', email: 'ada@example.com', password: PASSWORD };

describe('auth', () => {
  it('registers a customer, signs them in and never returns the password hash', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send(newUser).expect(201);

    expect(res.body.data).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', role: 'CUSTOMER' });
    expect(res.body.data.passwordHash).toBeUndefined();
    await agent.get('/api/auth/me').expect(200);
  });

  it('rejects duplicate emails and invalid input', async () => {
    await request(app).post('/api/auth/register').send(newUser).expect(201);
    await request(app).post('/api/auth/register').send(newUser).expect(409);
    const short = await request(app).post('/api/auth/register').send({ ...newUser, email: 'other@example.com', password: 'short' }).expect(400);
    expect(short.body.error.message).toMatch(/at least 8/);
    await request(app).post('/api/auth/register').send({ ...newUser, email: 'not-an-email' }).expect(400);
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    const user = await createUser();
    await loginAs(user.email);
    await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrong-password' }).expect(400);
    await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD }).expect(400);
  });

  it('blocks blocked users from signing in and drops their existing session', async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);
    await prisma.user.update({ where: { id: user.id }, data: { isBlocked: true } });

    await agent.get('/api/auth/me').expect(401);
    await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(403);
  });

  it('requires authentication for the profile and clears the session on logout', async () => {
    await request(app).get('/api/auth/me').expect(401);
    const user = await createUser();
    const agent = await loginAs(user.email);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('updates the profile and changes the password', async () => {
    const user = await createUser();
    const agent = await loginAs(user.email);

    const updated = await agent.patch('/api/auth/me').send({ name: 'New Name', email: 'new@example.com', phone: '+1 555 0100' }).expect(200);
    expect(updated.body.data).toMatchObject({ name: 'New Name', email: 'new@example.com', phone: '+1 555 0100' });

    await agent.post('/api/auth/change-password').send({ currentPassword: 'nope-nope', newPassword: 'BrandNew123!' }).expect(400);
    await agent.post('/api/auth/change-password').send({ currentPassword: PASSWORD, newPassword: 'BrandNew123!' }).expect(204);
    await request(app).post('/api/auth/login').send({ email: 'new@example.com', password: 'BrandNew123!' }).expect(200);
  });

  it('keeps customers out of the admin API', async () => {
    const customer = await createUser();
    const agent = await loginAs(customer.email);
    await agent.get('/api/admin/dashboard').expect(403);
    await request(app).get('/api/admin/dashboard').expect(401);
  });
});
