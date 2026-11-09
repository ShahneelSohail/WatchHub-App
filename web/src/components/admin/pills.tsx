import type { CSSProperties, ReactNode } from 'react';
import type { OrderStatus, PaymentMethod } from '@/lib/types';
import { cx } from '../ui';
import type { AdminPaymentStatus, AdminTicketPriority, AdminTicketStatus } from './types';

export type Tone = 'pending-payment' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'green' | 'amber' | 'red' | 'blue' | 'neutral';

const toneStyle = (tone: Tone): CSSProperties => ({
  color: `var(--color-pill-${tone}-fg)`,
  backgroundColor: `var(--color-pill-${tone}-bg)`,
  borderColor: `var(--color-pill-${tone}-bd)`,
});

const HEIGHTS = { sm: 'h-[22px] text-[11px]', md: 'h-6 text-xs', lg: 'h-[26px] text-xs' } as const;

interface PillProps {
  tone: Tone;
  children: ReactNode;
  dot?: boolean;
  dashed?: boolean;
  strike?: boolean;
  square?: boolean;
  upper?: boolean;
  size?: keyof typeof HEIGHTS;
}

export const Pill = ({ tone, children, dot = false, dashed = false, strike = false, square = false, upper = false, size = 'md' }: PillProps) => (
  <span
    style={toneStyle(tone)}
    className={cx(
      'inline-flex items-center gap-1.5 border px-[9px] font-semibold whitespace-nowrap',
      HEIGHTS[size],
      square ? 'rounded-card' : 'rounded-pill',
      dashed ? 'border-dashed' : 'border-solid',
      strike && 'line-through',
      upper && 'tracking-[0.06em] uppercase'
    )}
  >
    {dot && <span className="h-1.5 w-1.5 rounded-pill" style={{ backgroundColor: `var(--color-pill-${tone}-dot)` }} />}
    {children}
  </span>
);

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Pending payment',
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const ORDER_STATUS_TONES: Record<OrderStatus, Tone> = {
  PENDING_PAYMENT: 'pending-payment',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

export const OrderStatusPill = ({ status, size }: { status: OrderStatus; size?: PillProps['size'] }) => (
  <Pill tone={ORDER_STATUS_TONES[status]} dot dashed={status === 'PENDING_PAYMENT'} strike={status === 'CANCELLED'} size={size}>
    {ORDER_STATUS_LABELS[status]}
  </Pill>
);

interface PaymentPillProps {
  method: PaymentMethod;
  status: AdminPaymentStatus;
  size?: PillProps['size'];
}

export const paymentLabel = ({ method, status }: Omit<PaymentPillProps, 'size'>): { tone: Tone; label: string } => {
  if (status === 'REFUNDED') return { tone: 'blue', label: 'Refunded' };
  if (status === 'PARTLY_REFUNDED') return { tone: 'blue', label: 'Partly refunded' };
  if (status === 'PAID') return { tone: 'green', label: 'Paid' };
  return method === 'COD' ? { tone: 'neutral', label: 'Cash on delivery' } : { tone: 'amber', label: 'Unpaid' };
};

export const PaymentPill = ({ size, ...payment }: PaymentPillProps) => {
  const { tone, label } = paymentLabel(payment);
  return (
    <Pill tone={tone} square size={size}>
      {label}
    </Pill>
  );
};

export const StockPill = ({ stock, threshold }: { stock: number; threshold: number }) =>
  stock <= 0 ? <Pill tone="red">Sold out</Pill> : stock <= threshold ? <Pill tone="amber">{stock} left</Pill> : <Pill tone="green">{stock} in stock</Pill>;

const TICKET_TONES: Record<AdminTicketStatus, Tone> = { OPEN: 'confirmed', PENDING: 'amber', IN_PROGRESS: 'amber', RESOLVED: 'green', CLOSED: 'neutral' };
export const TICKET_STATUS_LABELS: Record<AdminTicketStatus, string> = { OPEN: 'Open', PENDING: 'Pending', IN_PROGRESS: 'Pending', RESOLVED: 'Resolved', CLOSED: 'Closed' };

export const TicketStatusPill = ({ status }: { status: AdminTicketStatus }) => (
  <Pill tone={TICKET_TONES[status]} size="sm">
    {TICKET_STATUS_LABELS[status]}
  </Pill>
);

export const PRIORITY_LABELS: Record<AdminTicketPriority, string> = { LOW: 'Low', NORMAL: 'Normal', MEDIUM: 'Normal', HIGH: 'High', URGENT: 'Urgent' };
export const PRIORITY_DOTS: Record<AdminTicketPriority, string> = { LOW: 'bg-ink-muted', NORMAL: 'bg-primary-hover', MEDIUM: 'bg-primary-hover', HIGH: 'bg-warning', URGENT: 'bg-danger' };

const TAG_STYLES = {
  sale: 'border-danger bg-danger text-white',
  limited: 'border-primary bg-primary-tint text-link',
  new: 'border-primary-tint bg-surface text-link',
  featured: 'border-line bg-surface text-ink-secondary',
} as const;

export type TagKind = keyof typeof TAG_STYLES;

export const Tag = ({ kind, children, large = false }: { kind: TagKind; children: ReactNode; large?: boolean }) => (
  <span className={cx('inline-flex items-center rounded-card border font-semibold tracking-[0.06em] whitespace-nowrap uppercase', large ? 'h-6 px-[9px] text-[11px]' : 'h-[22px] px-[7px] text-[10px]', TAG_STYLES[kind])}>{children}</span>
);

export interface ProductFlags {
  price: number;
  salePrice: number | null;
  isLimitedEdition: boolean;
  isNew: boolean;
  isFeatured: boolean;
}

export const productTags = ({ price, salePrice, isLimitedEdition, isNew, isFeatured }: ProductFlags): { kind: TagKind; label: string }[] => [
  ...(salePrice ? [{ kind: 'sale' as const, label: `Sale −${Math.round((1 - salePrice / price) * 100)}%` }] : []),
  ...(isLimitedEdition ? [{ kind: 'limited' as const, label: 'Limited' }] : []),
  ...(isNew ? [{ kind: 'new' as const, label: 'New' }] : []),
  ...(isFeatured ? [{ kind: 'featured' as const, label: 'Featured' }] : []),
];
