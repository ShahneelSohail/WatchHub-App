import crypto from 'node:crypto';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';
import { PASSWORD, app, createUser, resetDb } from './helpers';

beforeEach(resetDb);

describe('bearer token auth', () => {
  it('returns a token from register and login that authenticates every route', async () => {
    const registered = await request(app).post('/api/auth/register').send({ name: 'Mobile User', email: 'mobile@example.com', password: PASSWORD }).expect(201);
    expect(registered.body.token).toEqual(expect.any(String));
    expect(registered.body.data.email).toBe('mobile@example.com');

    const login = await request(app).post('/api/auth/login').send({ email: 'mobile@example.com', password: PASSWORD }).expect(200);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`).expect(200);
    expect(me.body.data.email).toBe('mobile@example.com');
    await request(app).get('/api/cart').set('Authorization', `Bearer ${login.body.token}`).expect(200);
  });

  it('rejects a bad token and keeps setting the cookie for the web app', async () => {
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-token').expect(401);
    const user = await createUser();
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(200);
    expect(login.headers['set-cookie']?.[0]).toMatch(/watchhub_token=/);
  });

  it('serves catalogue images from the API host', async () => {
    const res = await request(app).get('/watches/aurora-pave-1.webp').expect(200);
    expect(res.headers['content-type']).toBe('image/webp');
  });
});

describe('password reset', () => {
  const original = env.NODE_ENV;
  afterEach(() => {
    env.NODE_ENV = original;
  });

  const requestReset = async (email: string) => {
    env.NODE_ENV = 'development';
    const res = await request(app).post('/api/auth/forgot-password').send({ email }).expect(200);
    env.NODE_ENV = original;
    return res.body.data as { message: string; resetUrl?: string; token?: string };
  };

  it('answers the same for unknown emails and hides the token outside development', async () => {
    const user = await createUser();
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' }).expect(200);
    const known = await request(app).post('/api/auth/forgot-password').send({ email: user.email }).expect(200);
    expect(known.body).toEqual(unknown.body);
    expect(await prisma.passwordReset.count({ where: { userId: user.id } })).toBe(1);
  });

  it('stores the token hashed and returns the link only in development', async () => {
    const user = await createUser();
    const { resetUrl, token } = await requestReset(user.email);
    expect(resetUrl).toBe(`${env.WEB_URL}/reset-password?token=${token}`);
    const stored = await prisma.passwordReset.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.tokenHash).toBe(crypto.createHash('sha256').update(token!).digest('hex'));
    expect(stored.tokenHash).not.toBe(token);
  });

  it('sets a new password once and rejects reuse and expired tokens', async () => {
    const user = await createUser();
    const { token } = await requestReset(user.email);

    await request(app).post('/api/auth/reset-password').send({ token, password: 'short' }).expect(400);
    await request(app).post('/api/auth/reset-password').send({ token, password: 'BrandNewPass1!' }).expect(204);
    await request(app).post('/api/auth/login').send({ email: user.email, password: 'BrandNewPass1!' }).expect(200);
    await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(400);

    const reuse = await request(app).post('/api/auth/reset-password').send({ token, password: 'AnotherPass1!' }).expect(400);
    expect(reuse.body.error.code).toBe('RESET_TOKEN_INVALID');

    const second = await requestReset(user.email);
    await prisma.passwordReset.updateMany({ where: { usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await request(app).post('/api/auth/reset-password').send({ token: second.token, password: 'AnotherPass1!' }).expect(400);
  });
});
