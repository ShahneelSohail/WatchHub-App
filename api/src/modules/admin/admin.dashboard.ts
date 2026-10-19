import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { asyncHandler } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { orderInclude, toOrderDto } from '../orders/order.service';

const CHART_DAYS = 14;
const LOW_STOCK_LIMIT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

export const dashboardAdminRouter = Router();

dashboardAdminRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - (CHART_DAYS - 1) * DAY_MS);
    since.setUTCHours(0, 0, 0, 0);
    const live: Prisma.OrderWhereInput = { status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] } };

    const [revenue, orderCount, customerCount, pendingOrders, recentOrderRows, statusGroups, lowStock, topWatches, chartOrders] = await Promise.all([
      prisma.order.aggregate({ where: live, _sum: { total: true }, _count: { _all: true } }),
      prisma.order.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.findMany({ include: { ...orderInclude, user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 6 }),
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.watch.findMany({ where: { status: 'PUBLISHED', stock: { lte: LOW_STOCK_LIMIT } }, select: { id: true, name: true, sku: true, stock: true }, orderBy: { stock: 'asc' }, take: 8 }),
      prisma.watch.findMany({ where: { unitsSold: { gt: 0 } }, select: { id: true, name: true, slug: true, unitsSold: true, images: true }, orderBy: { unitsSold: 'desc' }, take: 5 }),
      prisma.order.findMany({ where: { ...live, createdAt: { gte: since } }, select: { createdAt: true, total: true } }),
    ]);

    const byDay = new Map(Array.from({ length: CHART_DAYS }, (_, index) => [dayKey(new Date(since.getTime() + index * DAY_MS)), { revenue: 0, orders: 0 }]));
    chartOrders.forEach(({ createdAt, total }) => {
      const bucket = byDay.get(dayKey(createdAt));
      if (bucket) {
        bucket.revenue += Number(total);
        bucket.orders += 1;
      }
    });

    const totalRevenue = Number(revenue._sum.total ?? 0);
    res.json({
      data: {
        totalRevenue,
        orderCount,
        customerCount,
        pendingOrders,
        averageOrderValue: revenue._count._all === 0 ? 0 : Math.round((totalRevenue / revenue._count._all) * 100) / 100,
        statusBreakdown: statusGroups.map(group => ({ status: group.status, count: group._count })),
        salesByDay: [...byDay].map(([date, totals]) => ({ date, ...totals })),
        recentOrders: recentOrderRows.map(({ user, ...order }) => ({ ...toOrderDto(order), customerName: user.name })),
        lowStock,
        topWatches,
      },
    });
  })
);
