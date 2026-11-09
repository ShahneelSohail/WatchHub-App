import type { CartLine, OrderItem, StrapType, Watch } from './types';

export const COD_LIMIT = 3000;

export const STRAP_LABELS: Record<StrapType, string> = { BELT: 'Leather belt', CHAIN: 'Metal chain' };
export const STRAP_DETAILS: Record<StrapType, string> = { BELT: 'Hand-stitched calf', CHAIN: 'Brushed steel links' };

export const STRAP_COLORS = [
  { name: 'Black', hex: '#1c1c1e' },
  { name: 'Brown', hex: '#6b4428' },
  { name: 'Navy', hex: '#1b2a4a' },
  { name: 'Tan', hex: '#c8a27a' },
];

export type BadgeTone = 'soldOut' | 'sale' | 'limited' | 'low' | 'new';

export const watchBadge = (watch: Pick<Watch, 'stock' | 'discountPercent' | 'isLimitedEdition' | 'isNew' | 'lowStockThreshold'>): { label: string; tone: BadgeTone } | null => {
  if (watch.stock === 0) return { label: 'Sold out', tone: 'soldOut' };
  if (watch.discountPercent !== null) return { label: `Sale −${watch.discountPercent}%`, tone: 'sale' };
  if (watch.isLimitedEdition) return { label: 'Limited', tone: 'limited' };
  if (watch.stock <= watch.lowStockThreshold) return { label: 'Low stock', tone: 'low' };
  if (watch.isNew) return { label: 'New', tone: 'new' };
  return null;
};

export const stockLine = (stock: number, threshold: number): { text: string; tone: 'success' | 'warning' | 'muted' } =>
  stock === 0 ? { text: 'Sold out', tone: 'muted' } : stock <= threshold ? { text: `Only ${stock} left in stock`, tone: 'warning' } : { text: 'In stock · ships within 24 h', tone: 'success' };

export const watchImage = (watch: Pick<Watch, 'images' | 'colors'>, colorName?: string | null): string | undefined => watch.colors.find(color => color.name === colorName)?.image ?? watch.images[0];

type Options = Pick<CartLine | OrderItem, 'productColor' | 'strapType' | 'strapColor'>;

export const optionSummary = ({ productColor, strapType, strapColor }: Options): string =>
  [productColor, strapType && `${STRAP_LABELS[strapType]}${strapColor ? ` (${strapColor})` : ''}`].filter(Boolean).join(' · ');

export const unitPrice = (watch: Pick<Watch, 'price' | 'salePrice'>): number => watch.salePrice ?? watch.price;

export const isSoldOut = (line: CartLine): boolean => line.watch.stock < 1;

export const exceedsStock = (line: CartLine): boolean => line.watch.stock >= 1 && line.quantity > line.watch.stock;
