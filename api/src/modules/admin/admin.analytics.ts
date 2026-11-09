import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { validate } from '../../middleware/validate';
import { stockAlertIds } from '../catalog/stock';

type Unit = 'day' | 'month';

const RANGES = { '7d': { unit: 'day', length: 7 }, '30d': { unit: 'day', length: 30 }, '12m': { unit: 'month', length: 12 } } as const satisfies Record<string, { unit: Unit; length: number }>;

const RECENT_ORDERS = 6;
const LOW_STOCK_LIMIT = 8;
const BEST_SELLERS = 5;

const analyticsQuery = z.object({ range: z.enum(['7d', '30d', '12m']).default('7d') });

const roundTo = (value: number, places: number): number => Math.round(value * 10 ** places) / 10 ** places;

const bucketStart = (unit: Unit, now: Date, stepsBack: number): Date =>
  unit === 'day'
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - stepsBack))
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - stepsBack, 1));

const bucketKey = (unit: Unit, date: Date): string => date.toISOString().slice(0, unit === 'day' ? 10 : 7);

const withDelta = (value: number, previous: number) => ({
  value: roundTo(value, 2),
  previous: roundTo(previous, 2),
  change: roundTo(value - previous, 2),
  changePercent: previous === 0 ? null : roundTo(((value - previous) / previous) * 100, 1),
});

interface Totals {
  revenue: number;
  orders: number;
}

const sumTotals = (rows: Totals[]): Totals => ({
  revenue: rows.reduce((total, row) => total + row.revenue, 0),
  orders: rows.reduce((total, row) => total + row.orders, 0),
});

const averageOrder = ({ revenue, orders }: Totals): number => (orders === 0 ? 0 : revenue / orders);

const live: Prisma.OrderWhereInput = { status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] } };

export const analyticsAdminRouter = Router();

analyticsAdminRouter.get(
  '/analytics',
  validate('query', analyticsQuery),
  asyncHandler(async (req, res) => {
    const { range } = req.query as unknown as z.infer<typeof analyticsQuery>;
    const { unit, length } = RANGES[range];
    const now = new Date();
    const currentStarts = Array.from({ length }, (_, index) => bucketStart(unit, now, length - 1 - index));
    const previousStarts = Array.from({ length }, (_, index) => bucketStart(unit, now, 2 * length - 1 - index));
    const currentStart = currentStarts[0]!;
    const currentIndex = new Map(currentStarts.map((start, index) => [bucketKey(unit, start), index]));
    const previousIndex = new Map(previousStarts.map((start, index) => [bucketKey(unit, start), index]));

    const [orders, customerDates, items, statusGroups, recent, lowStockIds] = await Promise.all([
      prisma.order.findMany({ where: { ...live, createdAt: { gte: previousStarts[0]! } }, select: { createdAt: true, total: true, refundedAmount: true } }),
      prisma.user.findMany({ where: { role: 'CUSTOMER', createdAt: { gte: previousStarts[0]! } }, select: { createdAt: true } }),
      prisma.orderItem.findMany({
        where: { order: { ...live, createdAt: { gte: currentStart } } },
        select: { watchId: true, name: true, image: true, quantity: true, unitPrice: true, watch: { select: { category: { select: { id: true, name: true } } } } },
      }),
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.order.findMany({
        include: { user: { select: { name: true } }, items: { select: { name: true, quantity: true }, orderBy: { id: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        take: RECENT_ORDERS,
      }),
      stockAlertIds(0),
    ]);

    const current: Totals[] = currentStarts.map(() => ({ revenue: 0, orders: 0 }));
    const previous: Totals[] = previousStarts.map(() => ({ revenue: 0, orders: 0 }));
    orders.forEach(({ createdAt, total, refundedAmount }) => {
      const key = bucketKey(unit, createdAt);
      const bucket = current[currentIndex.get(key) ?? -1] ?? previous[previousIndex.get(key) ?? -1];
      if (bucket) {
        bucket.revenue += Number(total) - Number(refundedAmount);
        bucket.orders += 1;
      }
    });

    const currentTotals = sumTotals(current);
    const previousTotals = sumTotals(previous);
    const newCustomers = customerDates.filter(({ createdAt }) => createdAt >= currentStart).length;

    const categories = new Map<number, { categoryId: number; name: string; revenue: number; units: number }>();
    const sellers = new Map<number, { watchId: number; name: string; image: string | null; units: number; revenue: number }>();
    items.forEach(({ watchId, name, image, quantity, unitPrice, watch }) => {
      const revenue = quantity * Number(unitPrice);
      if (watch) {
        const category = categories.get(watch.category.id) ?? { categoryId: watch.category.id, name: watch.category.name, revenue: 0, units: 0 };
        category.revenue += revenue;
        category.units += quantity;
        categories.set(watch.category.id, category);
      }
      if (watchId !== null) {
        const seller = sellers.get(watchId) ?? { watchId, name, image, units: 0, revenue: 0 };
        seller.units += quantity;
        seller.revenue += revenue;
        sellers.set(watchId, seller);
      }
    });
    const categoryRevenue = [...categories.values()].reduce((total, category) => total + category.revenue, 0);
    const topSellers = [...sellers.values()].sort((a, b) => b.units - a.units).slice(0, BEST_SELLERS);

    const lowStock = await prisma.watch.findMany({
      where: { id: { in: lowStockIds } },
      select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true, images: true, brand: { select: { name: true } } },
      orderBy: { stock: 'asc' },
      take: LOW_STOCK_LIMIT,
    });

    res.json({
      data: {
        range,
        kpis: {
          revenue: withDelta(currentTotals.revenue, previousTotals.revenue),
          orders: withDelta(currentTotals.orders, previousTotals.orders),
          averageOrder: withDelta(averageOrder(currentTotals), averageOrder(previousTotals)),
          newCustomers: withDelta(newCustomers, customerDates.length - newCustomers),
        },
        series: currentStarts.map((start, index) => ({
          date: start.toISOString(),
          revenue: roundTo(current[index]!.revenue, 2),
          orders: current[index]!.orders,
          previousDate: previousStarts[index]!.toISOString(),
          previousRevenue: roundTo(previous[index]!.revenue, 2),
          previousOrders: previous[index]!.orders,
        })),
        salesByCategory: [...categories.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .map(category => ({ ...category, revenue: roundTo(category.revenue, 2), share: categoryRevenue === 0 ? 0 : roundTo((category.revenue / categoryRevenue) * 100, 1) })),
        statusCounts: statusGroups.map(group => ({ status: group.status, count: group._count })),
        recentOrders: recent.map(({ id, status, paymentStatus, paymentMethod, total, createdAt, user, items: lines }) => ({
          id,
          status,
          paymentStatus,
          paymentMethod,
          total: Number(total),
          createdAt,
          customerName: user.name,
          items: lines.map(line => (line.quantity > 1 ? `${line.name} x${line.quantity}` : line.name)).join(', '),
        })),
        lowStock: lowStock.map(({ images, brand, lowStockThreshold, ...watch }) => ({ ...watch, threshold: lowStockThreshold, brand: brand.name, image: images[0] ?? null })),
        bestSellers: topSellers.map(seller => ({ ...seller, revenue: roundTo(seller.revenue, 2), share: roundTo((seller.units / topSellers[0]!.units) * 100, 1) })),
      },
    });
  })
);
