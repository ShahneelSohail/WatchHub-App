export type Role = 'ADMIN' | 'CUSTOMER';
export type StrapType = 'BELT' | 'CHAIN';
export type OrderStatus = 'PENDING_PAYMENT' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'STRIPE' | 'COD';
export type PaymentStatus = 'UNPAID' | 'PAID';
export type ShippingMethod = 'STANDARD' | 'EXPRESS';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  createdAt: string;
}

export interface Brand {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  watchCount?: number;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  watchCount?: number;
}

export interface WatchColor {
  id?: number;
  name: string;
  hex: string;
  image: string | null;
}

export interface Rating {
  average: number | null;
  count: number;
}

export interface Watch {
  id: number;
  sku: string;
  slug: string;
  name: string;
  description: string;
  brand: { id: number; name: string; logoUrl: string | null };
  category: { id: number; name: string };
  price: number;
  salePrice: number | null;
  discountPercent: number | null;
  stock: number;
  images: string[];
  specifications: Record<string, string>;
  hasBeltOption: boolean;
  hasChainOption: boolean;
  colors: WatchColor[];
  status: 'DRAFT' | 'PUBLISHED';
  isFeatured: boolean;
  isLimitedEdition: boolean;
  rating: Rating;
  createdAt: string;
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  adminReply: string | null;
  createdAt: string;
  user: { name: string };
}

export interface CartLine {
  id: number;
  quantity: number;
  strapType: StrapType | null;
  strapColor: string | null;
  productColor: string | null;
  lineTotal: number;
  watch: Watch;
}

export interface Address {
  id: number;
  recipient: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export type ShippingAddress = Omit<Address, 'id' | 'isDefault'>;

export interface Totals {
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  couponCode: string | null;
}

export interface OrderItem {
  id: number;
  watchId: number | null;
  name: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  strapType: StrapType | null;
  strapColor: string | null;
  productColor: string | null;
}

export interface OrderEvent {
  id: number;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface Order extends Totals {
  id: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingMethod: ShippingMethod;
  shippingAddress: ShippingAddress;
  trackingNumber: string | null;
  courierName: string | null;
  adminNote: string | null;
  createdAt: string;
  items: OrderItem[];
  events: OrderEvent[];
}

export interface AdminOrder extends Order {
  user: { id: number; name: string; email: string };
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Banner {
  id: number;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  link: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
}

export interface Coupon {
  id: number;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: string;
  minAmount: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  usageLimit: number | null;
  usageCount: number;
  limitPerUser: number | null;
}

export interface TicketMessage {
  id: number;
  message: string;
  createdAt: string;
  author: { name: string; role: Role };
}

export interface Ticket {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
  user?: { id: number; name: string; email: string };
}

export interface AdminCustomer {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  isBlocked: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export interface AdminReview {
  id: number;
  rating: number;
  comment: string;
  status: 'APPROVED' | 'HIDDEN';
  adminReply: string | null;
  createdAt: string;
  user: { name: string; email: string };
  watch: { id: number; name: string; slug: string };
}

export interface Dashboard {
  totalRevenue: number;
  orderCount: number;
  customerCount: number;
  pendingOrders: number;
  averageOrderValue: number;
  statusBreakdown: { status: OrderStatus; count: number }[];
  salesByDay: { date: string; revenue: number; orders: number }[];
  recentOrders: (Order & { customerName: string })[];
  lowStock: { id: number; name: string; sku: string; stock: number }[];
  topWatches: { id: number; name: string; slug: string; unitsSold: number; images: string[] }[];
}
