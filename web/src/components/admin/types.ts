import type { Order, OrderStatus, Watch } from '@/lib/types';

export type AdminPaymentStatus = 'UNPAID' | 'PAID' | 'PARTLY_REFUNDED' | 'REFUNDED';

export interface AdminOrder extends Omit<Order, 'paymentStatus' | 'events'> {
  paymentStatus: AdminPaymentStatus;
  refundedAmount: number;
  user: { id: number; name: string; email: string };
  events: (Order['events'][number] & { actor: string | null })[];
  notes?: { id: number; body: string; createdAt: string; author: { name: string } }[];
  refunds?: { id: number; amount: number; reason: string; createdAt: string }[];
}

export interface AdminRefund {
  id: number;
  amount: number;
  reason: string;
  method: 'STRIPE' | 'COD';
  createdAt: string;
  order: { id: number; status: OrderStatus; total: number };
  customer: { id: number; name: string };
}

export interface RefundMeta {
  refundedLast30Days: number;
  refundCountLast30Days: number;
  refundRate: number;
}

export type AnalyticsRange = '7d' | '30d' | '12m';

export interface KpiDelta {
  value: number;
  previous: number;
  change: number;
  changePercent: number | null;
}

export interface Analytics {
  range: AnalyticsRange;
  kpis: { revenue: KpiDelta; orders: KpiDelta; averageOrder: KpiDelta; newCustomers: KpiDelta };
  series: { date: string; revenue: number; orders: number }[];
  salesByCategory: { categoryId: number; name: string; revenue: number; units: number; share: number }[];
  statusCounts: { status: OrderStatus; count: number }[];
  recentOrders: { id: number; status: OrderStatus; total: number; createdAt: string; customerName: string }[];
  lowStock: { id: number; name: string; sku: string; stock: number; threshold: number; brand: string; image: string | null }[];
  bestSellers: { watchId: number; name: string; image: string | null; units: number; revenue: number; share: number }[];
}

export interface AdminWatch extends Omit<Watch, 'colors'> {
  lowStockThreshold: number;
  trackColorStock: boolean;
  isNew: boolean;
  unitsSold: number;
  colors: { id: number; name: string; hex: string; image: string | null; stock: number | null }[];
}

export interface WatchSummary {
  all: number;
  published: number;
  draft: number;
  lowStock: number;
  soldOut: number;
}

export interface InventoryRow {
  key: string;
  watchId: number;
  colorId: number | null;
  name: string;
  variant: string | null;
  hex: string | null;
  sku: string;
  image: string | null;
  threshold: number;
  onHand: number;
  reserved: number;
  available: number;
  state: 'OK' | 'LOW' | 'OUT';
}

export interface InventoryMeta {
  skus: number;
  unitsOnHand: number;
  reserved: number;
  soldOutSkus: number;
  counts: { all: number; low: number; out: number };
}

export interface AdminCoupon {
  id: number;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minAmount: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
  limitPerUser: number | null;
  isExpired: boolean;
}

export interface TaxonomyItem {
  id: number;
  name: string;
  description: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  _count: { watches: number };
}

export interface AdminBanner {
  id: number;
  imageUrl: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  link: string | null;
  watchId: number | null;
  isActive: boolean;
  sortOrder: number;
  watch: { id: number; name: string } | null;
}

export interface AdminFaq {
  id: number;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
}

export type AdminTicketStatus = 'OPEN' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type AdminTicketPriority = 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketMessageKind = 'CUSTOMER' | 'ADMIN' | 'INTERNAL';

export interface AdminTicketMessage {
  id: number;
  message: string;
  kind: TicketMessageKind;
  createdAt: string;
  author: { name: string; role: 'ADMIN' | 'CUSTOMER' };
}

export interface AdminTicket {
  id: number;
  subject: string;
  status: AdminTicketStatus;
  priority: AdminTicketPriority;
  createdAt: string;
  updatedAt: string;
  user: { id: number; name: string; email: string };
  order?: { id: number; status: OrderStatus; total: number } | null;
  lastMessage?: { message: string; kind: TicketMessageKind; createdAt: string } | null;
  messages?: AdminTicketMessage[];
}
