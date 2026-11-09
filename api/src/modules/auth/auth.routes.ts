import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { asyncHandler, badRequest, conflict, forbidden } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { AUTH_COOKIE, cookieOptions, signToken } from '../../lib/tokens';
import { currentUser, requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, profileSchema, registerSchema, resetPasswordSchema } from './auth.schemas';

const BCRYPT_ROUNDS = 10;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 30;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export const publicUser = { id: true, email: true, name: true, phone: true, role: true, createdAt: true } as const;

const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  limit: env.NODE_ENV === 'test' ? 1000 : AUTH_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Please try again later.' } },
});

const startSession = (res: Response, userId: number): string => {
  const token = signToken(userId);
  res.cookie(AUTH_COOKIE, token, cookieOptions);
  return token;
};

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validate('body', registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) throw conflict('That email is already registered.');

    const user = await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) },
      select: publicUser,
    });
    res.status(201).json({ data: user, token: startSession(res, user.id) });
  })
);

authRouter.post(
  '/login',
  authLimiter,
  validate('body', loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid) throw badRequest('Invalid email or password.');
    if (user.isBlocked) throw forbidden('Your account has been blocked. Please contact support.');

    const token = startSession(res, user.id);
    res.json({ data: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, createdAt: user.createdAt }, token });
  })
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: currentUser(req).id }, select: publicUser });
    res.json({ data: user });
  })
);

authRouter.patch(
  '/me',
  requireAuth,
  validate('body', profileSchema),
  asyncHandler(async (req, res) => {
    const { id } = currentUser(req);
    const { name, email, phone } = req.body;
    const taken = await prisma.user.findFirst({ where: { email, NOT: { id } }, select: { id: true } });
    if (taken) throw conflict('That email is already registered.');

    const user = await prisma.user.update({ where: { id }, data: { name, email, phone }, select: publicUser });
    res.json({ data: user });
  })
);

authRouter.post(
  '/change-password',
  requireAuth,
  authLimiter,
  validate('body', changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { id } = currentUser(req);
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw badRequest('Current password is incorrect.');

    await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) } });
    res.status(204).end();
  })
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validate('body', forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email }, select: { id: true, isBlocked: true } });
    const message = 'If that email is registered, a reset link is on its way.';
    if (!user || user.isBlocked) return res.json({ data: { message } });

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordReset.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) } });
    res.json({ data: env.NODE_ENV === 'development' ? { message, resetUrl: `${env.WEB_URL}/reset-password?token=${token}`, token } : { message } });
  })
);

authRouter.post(
  '/reset-password',
  authLimiter,
  validate('body', resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const reset = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(req.body.token) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) throw badRequest('This reset link is invalid or has expired.', 'RESET_TOKEN_INVALID');

    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(req.body.password, BCRYPT_ROUNDS) } }),
      prisma.passwordReset.updateMany({ where: { userId: reset.userId, usedAt: null }, data: { usedAt: now } }),
    ]);
    res.status(204).end();
  })
);
