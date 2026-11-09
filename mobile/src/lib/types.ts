export type StrapType = 'BELT' | 'CHAIN';
export type OrderStatus = 'PENDING_PAYMENT' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'STRIPE' | 'COD';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTLY_REFUNDED' | 'REFUNDED';
export type ShippingMethod = 'STANDARD' | 'EXPRESS';
export type TicketStatus = 'OPEN' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type Role = 'ADMIN' | 'CUSTOMER';

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
  stock: number | null;
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
  lowStockThreshold: number;
  trackColorStock: boolean;
  images: string[];
  specifications: Record<string, string>;
  hasBeltOption: boolean;
  hasChainOption: boolean;
  colors: WatchColor[];
  isFeatured: boolean;
  isLimitedEdition: boolean;
  isNew: boolean;
  rating: { average: number | null; count: number };
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

export type AddressInput = Omit<Address, 'id'>;

export interface Totals {
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  couponCode: string | null;
}

export interface Quote extends Totals {
  codAvailable: boolean;
  codLimit: number;
  codReason: string | null;
}

export interface StockLine {
  cartItemId: number;
  watchId: number;
  name: string;
  quantity: number;
  available: number;
  soldOut: boolean;
  insufficient: boolean;
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
  shippingAddress: Omit<Address, 'id' | 'isDefault'>;
  trackingNumber: string | null;
  courierName: string | null;
  createdAt: string;
  items: OrderItem[];
  events: OrderEvent[];
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
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  link: string | null;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
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
  createdAt: string;
  updatedAt: string;
  order: { id: number; status: OrderStatus } | null;
  messages?: TicketMessage[];
}
