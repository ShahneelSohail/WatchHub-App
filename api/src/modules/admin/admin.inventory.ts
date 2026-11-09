import type { OrderStatus, WatchStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, badRequest, notFound } from '../../lib/http';
import { pageMeta, pageQuery, paginate } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { currentUser } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { releaseStockSubscriptions } from '../catalog/stock';

const RESERVING_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED'];

const inventoryQuery = z.object({ q: z.string().trim().max(100).optional(), filter: z.enum(['all', 'low', 'out']).default('all') });
const historyQuery = pageQuery.extend({ watchId: z.coerce.number().int().positive().optional() });
const adjustSchema = z.object({
  reason: z.string().trim().min(1, 'Choose a reason').max(100),
  items: z
    .array(
      z.object({
        watchId: z.number().int().positive(),
        colorId: z.number().int().positive().nullish(),
        newStock: z.number().int().min(0, 'Stock cannot be negative'),
      })
    )
    .min(1, 'Nothing to adjust')
    .max(200),
});

interface InventoryRow {
  key: string;
  watchId: number;
  colorId: number | null;
  name: string;
  variant: string | null;
  hex: string | null;
  sku: string;
  image: string | null;
  threshold: number;
  watchStatus: WatchStatus;
  onHand: number;
  reserved: number;
}

export const inventoryAdminRouter = Router();

inventoryAdminRouter.get(
  '/inventory',
  validate('query', inventoryQuery),
  asyncHandler(async (req, res) => {
    const { q, filter } = req.query as unknown as z.infer<typeof inventoryQuery>;
    const [watches, reservedGroups] = await Promise.all([
      prisma.watch.findMany({ include: { colors: { orderBy: { id: 'asc' } } }, orderBy: { name: 'asc' } }),
      prisma.orderItem.groupBy({
        by: ['watchId', 'productColor'],
        where: { watchId: { not: null }, order: { status: { in: RESERVING_STATUSES } } },
        _sum: { quantity: true },
      }),
    ]);
    const reserved = (watchId: number, color?: string) =>
      reservedGroups.filter(group => group.watchId === watchId && (color === undefined || group.productColor === color)).reduce((sum, group) => sum + (group._sum.quantity ?? 0), 0);

    const allRows = watches.flatMap((watch): InventoryRow[] => {
      const base = { watchId: watch.id, name: watch.name, threshold: watch.lowStockThreshold, watchStatus: watch.status };
      if (!watch.trackColorStock) {
        return [{ ...base, key: `${watch.id}:0`, colorId: null, variant: null, hex: null, sku: watch.sku, image: watch.images[0] ?? null, onHand: watch.stock, reserved: reserved(watch.id) }];
      }
      return watch.colors.map((color, index) => ({
        ...base,
        key: `${watch.id}:${color.id}`,
        colorId: color.id,
        variant: color.name,
        hex: color.hex,
        sku: `${watch.sku}-${String(index + 1).padStart(2, '0')}`,
        image: color.image ?? watch.images[0] ?? null,
        onHand: color.stock,
        reserved: reserved(watch.id, color.name),
      }));
    });

    const needle = q?.toLowerCase();
    const matching = allRows.filter(row => !needle || `${row.name} ${row.variant ?? ''} ${row.sku}`.toLowerCase().includes(needle));
    const isLow = (row: { onHand: number; threshold: number }) => row.onHand > 0 && row.onHand <= row.threshold;
    const rows = matching.filter(row => filter === 'all' || (filter === 'low' ? isLow(row) : row.onHand === 0));

    res.json({
      data: rows.map(row => ({ ...row, available: row.onHand - row.reserved, state: row.onHand === 0 ? 'OUT' : isLow(row) ? 'LOW' : 'OK' })),
      meta: {
        skus: matching.length,
        unitsOnHand: matching.reduce((sum, row) => sum + row.onHand, 0),
        reserved: matching.reduce((sum, row) => sum + row.reserved, 0),
        soldOutSkus: matching.filter(row => row.onHand === 0).length,
        counts: { all: matching.length, low: matching.filter(isLow).length, out: matching.filter(row => row.onHand === 0).length },
      },
    });
  })
);

inventoryAdminRouter.post(
  '/inventory/adjust',
  validate('body', adjustSchema),
  asyncHandler(async (req, res) => {
    const { reason, items } = req.body as z.infer<typeof adjustSchema>;
    const actor = currentUser(req).name;

    const adjusted = await prisma.$transaction(async tx => {
      let count = 0;
      for (const { watchId, colorId, newStock } of items) {
        const watch = await tx.watch.findUnique({ where: { id: watchId }, include: { colors: true } });
        if (!watch) throw notFound('Watch not found.');
        const color = colorId ? watch.colors.find(candidate => candidate.id === colorId) : undefined;
        if (colorId && (!watch.trackColorStock || !color)) throw badRequest('That colour does not track its own stock.', 'COLOR_NOT_TRACKED');
        if (!colorId && watch.trackColorStock) throw badRequest('This watch tracks stock per colour. Adjust a colour instead.', 'COLOR_REQUIRED');

        const current = color ? color.stock : watch.stock;
        if (newStock === current) continue;
        if (color) {
          await tx.watchColor.update({ where: { id: color.id }, data: { stock: newStock } });
          await tx.watch.update({ where: { id: watchId }, data: { stock: watch.stock + newStock - current } });
        } else {
          await tx.watch.update({ where: { id: watchId }, data: { stock: newStock } });
        }
        await tx.stockAdjustment.create({ data: { watchId, variant: color?.name ?? null, delta: newStock - current, newStock, reason, actor } });
        count += 1;
      }
      return count;
    });

    await releaseStockSubscriptions(items.map(item => item.watchId));
    res.json({ data: { adjusted } });
  })
);

inventoryAdminRouter.get(
  '/inventory/history',
  validate('query', historyQuery),
  asyncHandler(async (req, res) => {
    const { page, pageSize, watchId } = req.query as unknown as z.infer<typeof historyQuery>;
    const where = { watchId };
    const [total, history] = await Promise.all([
      prisma.stockAdjustment.count({ where }),
      prisma.stockAdjustment.findMany({
        where,
        include: { watch: { select: { name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
        ...paginate({ page, pageSize }),
      }),
    ]);
    res.json({ data: history, meta: pageMeta(page, pageSize, total) });
  })
);
