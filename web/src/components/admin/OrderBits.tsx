import { formatMoney } from '@/lib/format';
import type { OrderItem, OrderStatus } from '@/lib/types';
import type { AdminOrder } from './types';
import { shortDate } from './utils';

export const COURIERS = ['DHL Express', 'UPS', 'FedEx', 'Royal Mail'] as const;
export const CANCEL_REASONS = ['Customer request', 'Payment not received', 'Out of stock', 'Suspected fraud'] as const;

export const REFUND_REASONS = ['Returned item', 'Arrived damaged', 'Strap exchange', 'Goodwill gesture', 'Order cancelled'] as const;

export const FLOW: OrderStatus[] = ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

export const itemSummary = (items: OrderItem[]): string => items.map(item => item.name + (item.quantity > 1 ? ` ×${item.quantity}` : '')).join(', ');

export const orderCsvRows = (orders: AdminOrder[]) =>
  orders.map(order => [order.id, order.user.name, order.user.email, itemSummary(order.items), shortDate(order.createdAt), order.status, `${order.paymentMethod} ${order.paymentStatus}`, formatMoney(order.total)]);

export const ORDER_CSV_HEADER = ['Order', 'Customer', 'Email', 'Items', 'Date', 'Status', 'Payment', 'Total'];
