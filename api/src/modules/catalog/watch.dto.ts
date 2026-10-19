import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { money } from '../../lib/serialize';

export const watchInclude = { brand: true, category: true, colors: true } satisfies Prisma.WatchInclude;

export type WatchRow = Prisma.WatchGetPayload<{ include: typeof watchInclude }>;

export interface RatingSummary {
  average: number | null;
  count: number;
}

const NO_RATING: RatingSummary = { average: null, count: 0 };

export const effectivePrice = (watch: { price: Prisma.Decimal; salePrice: Prisma.Decimal | null }): number => Number(watch.salePrice ?? watch.price);

export const ratingSummaries = async (watchIds: number[]): Promise<Map<number, RatingSummary>> => {
  const groups = await prisma.review.groupBy({
    by: ['watchId'],
    where: { watchId: { in: watchIds }, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map(groups.map(group => [group.watchId, { average: group._avg.rating === null ? null : Math.round(group._avg.rating * 10) / 10, count: group._count.rating }]));
};

export const toWatchDto = (watch: WatchRow, ratings: Map<number, RatingSummary>) => {
  const price = Number(watch.price);
  const salePrice = money(watch.salePrice);
  return {
    id: watch.id,
    sku: watch.sku,
    slug: watch.slug,
    name: watch.name,
    description: watch.description,
    brand: { id: watch.brand.id, name: watch.brand.name, logoUrl: watch.brand.logoUrl },
    category: { id: watch.category.id, name: watch.category.name },
    price,
    salePrice,
    discountPercent: salePrice === null ? null : Math.round((1 - salePrice / price) * 100),
    stock: watch.stock,
    images: watch.images,
    specifications: watch.specifications as Record<string, string>,
    hasBeltOption: watch.hasBeltOption,
    hasChainOption: watch.hasChainOption,
    colors: watch.colors.map(({ id, name, hex, image }) => ({ id, name, hex, image })),
    status: watch.status,
    isFeatured: watch.isFeatured,
    isLimitedEdition: watch.isLimitedEdition,
    rating: ratings.get(watch.id) ?? NO_RATING,
    createdAt: watch.createdAt,
  };
};

export const watchDtos = async (watches: WatchRow[]) => {
  const ratings = await ratingSummaries(watches.map(watch => watch.id));
  return watches.map(watch => toWatchDto(watch, ratings));
};
