import { Prisma } from '@prisma/client';
import { prisma, type Tx } from '../../lib/prisma';
import { notify } from '../notifications/notification.service';

interface StockedWatch {
  stock: number;
  trackColorStock: boolean;
  colors: { name: string; stock: number }[];
}

export const availableStock = (watch: StockedWatch, productColor: string | null): number => {
  const color = watch.trackColorStock && productColor ? watch.colors.find(candidate => candidate.name === productColor) : undefined;
  return color ? color.stock : watch.stock;
};

export const reserveStock = async (tx: Tx, watchId: number, productColor: string | null, quantity: number): Promise<boolean> => {
  const watch = await tx.watch.findUniqueOrThrow({ where: { id: watchId }, select: { trackColorStock: true } });
  const colorWhere = watch.trackColorStock && productColor ? { watchId, name: productColor } : undefined;
  if (colorWhere) {
    const { count } = await tx.watchColor.updateMany({ where: { ...colorWhere, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
    if (count === 0) return false;
  }
  const { count } = await tx.watch.updateMany({
    where: { id: watchId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity }, unitsSold: { increment: quantity } },
  });
  return count > 0;
};

export const restoreStock = async (tx: Tx, watchId: number, productColor: string | null, quantity: number): Promise<void> => {
  const watch = await tx.watch.findUnique({ where: { id: watchId }, select: { trackColorStock: true } });
  if (!watch) return;
  if (watch.trackColorStock && productColor) {
    await tx.watchColor.updateMany({ where: { watchId, name: productColor }, data: { stock: { increment: quantity } } });
  }
  await tx.watch.update({ where: { id: watchId }, data: { stock: { increment: quantity }, unitsSold: { decrement: quantity } } });
};

export const stockAlertIds = async (minStock: 0 | 1): Promise<number[]> => {
  const rows = await prisma.$queryRaw<{ id: number }[]>(
    Prisma.sql`SELECT id FROM "Watch" WHERE status = 'PUBLISHED' AND stock >= ${minStock} AND stock <= "lowStockThreshold"`
  );
  return rows.map(row => row.id);
};

export const releaseStockSubscriptions = async (watchIds: number[]): Promise<void> => {
  const subscriptions = await prisma.stockSubscription.findMany({
    where: { watchId: { in: watchIds }, watch: { stock: { gt: 0 }, status: 'PUBLISHED' } },
    include: { watch: { select: { name: true, slug: true } } },
  });
  await prisma.$transaction(async tx => {
    for (const { userId, watch } of subscriptions) {
      if (userId !== null) await notify(userId, `${watch.name} is back in stock`, 'The watch you asked about can be ordered again.', `/watches/${watch.slug}`, tx);
    }
    await tx.stockSubscription.deleteMany({ where: { id: { in: subscriptions.map(subscription => subscription.id) } } });
  });
};
