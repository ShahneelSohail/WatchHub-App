import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { OrderStatus, PaymentMethod, PaymentStatus, Role, StrapType } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

export const app = createApp();

export const PASSWORD = 'Password123!';

export const resetDb = async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '\_prisma%'`;
  const names = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
};

let counter = 0;
const next = () => (counter += 1);

export const createUser = async (overrides: { role?: Role; isBlocked?: boolean; email?: string; name?: string } = {}) => {
  const n = next();
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user${n}@example.com`,
      name: overrides.name ?? `Test User ${n}`,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role: overrides.role ?? 'CUSTOMER',
      isBlocked: overrides.isBlocked ?? false,
    },
  });
};

export const loginAs = async (email: string) => {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
  return agent;
};

export const signedInUser = async (role: Role = 'CUSTOMER') => {
  const user = await createUser({ role });
  return { user, agent: await loginAs(user.email) };
};

export const createCatalogBase = async () => {
  const [brand, category] = await Promise.all([prisma.brand.create({ data: { name: `Brand ${next()}` } }), prisma.category.create({ data: { name: `Category ${next()}` } })]);
  return { brand, category };
};

interface WatchOverrides {
  name?: string;
  price?: number;
  salePrice?: number;
  stock?: number;
  status?: 'DRAFT' | 'PUBLISHED';
  hasBeltOption?: boolean;
  colors?: { name: string; hex: string; stock?: number }[];
  trackColorStock?: boolean;
  lowStockThreshold?: number;
  sku?: string;
  brandId?: number;
  categoryId?: number;
}

export const createWatch = async (overrides: WatchOverrides = {}) => {
  const n = next();
  const base = overrides.brandId && overrides.categoryId ? { brand: { id: overrides.brandId }, category: { id: overrides.categoryId } } : await createCatalogBase();
  return prisma.watch.create({
    data: {
      sku: overrides.sku ?? `SKU-${n}`,
      slug: `test-watch-${n}`,
      name: overrides.name ?? `Test Watch ${n}`,
      description: 'A reliable watch for testing.',
      brandId: base.brand.id,
      categoryId: base.category.id,
      price: overrides.price ?? 100,
      salePrice: overrides.salePrice,
      stock: overrides.stock ?? 10,
      status: overrides.status ?? 'PUBLISHED',
      hasBeltOption: overrides.hasBeltOption ?? false,
      trackColorStock: overrides.trackColorStock ?? false,
      lowStockThreshold: overrides.lowStockThreshold ?? 5,
      images: ['/watches/test.webp'],
      colors: { create: overrides.colors ?? [] },
    },
  });
};

export const createAddress = (userId: number) =>
  prisma.address.create({
    data: { userId, recipient: 'Test Buyer', addressLine: '1 Main Street', city: 'Springfield', state: 'IL', zip: '62701', country: 'United States', isDefault: true },
  });

export const addToCart = (userId: number, watchId: number, quantity = 1, options: { strapType?: StrapType } = {}) =>
  prisma.cartItem.create({ data: { userId, watchId, quantity, ...options } });

export const createDeliveredOrder = (userId: number, watchId: number) =>
  prisma.order.create({
    data: {
      userId,
      status: 'DELIVERED',
      paymentMethod: 'COD',
      paymentStatus: 'PAID',
      shippingMethod: 'STANDARD',
      subtotal: 100,
      shippingCost: 0,
      discount: 0,
      total: 100,
      shippingAddress: {},
      items: { create: { watchId, name: 'Test Watch', quantity: 1, unitPrice: 100 } },
    },
  });

interface OrderOverrides {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  total?: number;
  watchId?: number;
  quantity?: number;
  productColor?: string;
  createdAt?: Date;
  stripeSessionId?: string;
}

export const createOrder = async (userId: number, overrides: OrderOverrides = {}) => {
  const watchId = overrides.watchId ?? (await createWatch({ stock: 20 })).id;
  const total = overrides.total ?? 100;
  const status = overrides.status ?? 'PENDING';
  return prisma.order.create({
    data: {
      userId,
      status,
      paymentMethod: overrides.paymentMethod ?? 'COD',
      paymentStatus: overrides.paymentStatus ?? 'UNPAID',
      shippingMethod: 'STANDARD',
      subtotal: total,
      shippingCost: 0,
      discount: 0,
      total,
      shippingAddress: {},
      createdAt: overrides.createdAt,
      stripeSessionId: overrides.stripeSessionId,
      items: { create: { watchId, name: 'Test Watch', quantity: overrides.quantity ?? 1, unitPrice: total, productColor: overrides.productColor } },
      events: { create: { status } },
    },
  });
};
