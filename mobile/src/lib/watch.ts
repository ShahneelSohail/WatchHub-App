import { colors } from '@/theme';
import type { BadgeStyle } from '@/components/ui';
import type { StrapType, Watch } from './types';

export const unitPrice = (watch: Watch): number => watch.salePrice ?? watch.price;

export const stockOf = (watch: Watch, colorIndex = 0): number => (watch.trackColorStock ? (watch.colors[colorIndex]?.stock ?? 0) : watch.stock);

export const isSoldOut = (watch: Watch, colorIndex = 0): boolean => stockOf(watch, colorIndex) === 0;

export const STRAP_OPTIONS: { type: StrapType; label: string; detail: string }[] = [
  { type: 'BELT', label: 'Leather belt', detail: 'Hand-stitched calf' },
  { type: 'CHAIN', label: 'Metal chain', detail: 'Brushed steel links' },
];

export const availableStraps = (watch: Watch) =>
  STRAP_OPTIONS.filter(({ type }) => (type === 'BELT' ? watch.hasBeltOption : watch.hasChainOption));

export const watchImage = (watch: Watch, colorIndex = 0): string | null => watch.colors[colorIndex]?.image ?? watch.images[colorIndex] ?? watch.images[0] ?? null;

export const watchBadge = (watch: Watch): BadgeStyle | null => {
  if (isSoldOut(watch)) return { text: 'Sold out', fg: colors.secondary, bg: colors.surface, border: colors.line };
  if (watch.discountPercent) return { text: `Sale −${watch.discountPercent}%`, fg: colors.onPrimary, bg: colors.danger, border: colors.danger };
  if (watch.isLimitedEdition) return { text: 'Limited', fg: colors.primary, bg: colors.tint, border: colors.primary };
  if (watch.stock <= watch.lowStockThreshold) return { text: 'Low stock', fg: colors.warningInk, bg: colors.warningSurface, border: colors.warningStrong };
  if (watch.isNew) return { text: 'New', fg: colors.primary, bg: colors.surface, border: colors.tint };
  return null;
};

export const stockStatus = (watch: Watch, colorIndex = 0): { text: string; color: string } => {
  const stock = stockOf(watch, colorIndex);
  if (stock === 0) return { text: 'Sold out', color: colors.secondary };
  if (stock <= watch.lowStockThreshold) return { text: `Only ${stock} left in stock`, color: colors.warningInk };
  return { text: 'In stock · ships within 24 h', color: colors.success };
};

export const priceColor = (watch: Watch): string => (watch.salePrice ? colors.danger : colors.ink);
