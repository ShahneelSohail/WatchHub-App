import type { IconName } from './icons';

export type NavKey = 'dash' | 'orders' | 'refunds' | 'customers' | 'coupons' | 'products' | 'inventory' | 'taxonomy' | 'reviews' | 'content' | 'tickets';

export interface NavItem {
  key: NavKey;
  label: string;
  href: string;
  icon: IconName;
  searchPlaceholder?: string;
}

export const DEFAULT_SEARCH_PLACEHOLDER = 'Search orders, customers, watches';

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: 'Overview', items: [{ key: 'dash', label: 'Dashboard', href: '/admin', icon: 'dash' }] },
  {
    label: 'Sales',
    items: [
      { key: 'orders', label: 'Orders', href: '/admin/orders', icon: 'orders', searchPlaceholder: DEFAULT_SEARCH_PLACEHOLDER },
      { key: 'refunds', label: 'Refunds', href: '/admin/refunds', icon: 'refunds', searchPlaceholder: 'Search refunds' },
      { key: 'customers', label: 'Customers', href: '/admin/customers', icon: 'customers', searchPlaceholder: 'Search customers' },
      { key: 'coupons', label: 'Coupons', href: '/admin/coupons', icon: 'coupons' },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { key: 'products', label: 'Products', href: '/admin/products', icon: 'products', searchPlaceholder: 'Search products or references' },
      { key: 'inventory', label: 'Inventory', href: '/admin/inventory', icon: 'inventory', searchPlaceholder: 'Search SKUs' },
      { key: 'taxonomy', label: 'Brands & categories', href: '/admin/catalog', icon: 'taxonomy' },
      { key: 'reviews', label: 'Reviews', href: '/admin/reviews', icon: 'reviews', searchPlaceholder: 'Search reviews' },
    ],
  },
  { label: 'Content', items: [{ key: 'content', label: 'Banners & FAQs', href: '/admin/content', icon: 'content' }] },
  { label: 'Support', items: [{ key: 'tickets', label: 'Support tickets', href: '/admin/tickets', icon: 'tickets', searchPlaceholder: 'Search tickets' }] },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap(group => group.items);

export const isNavActive = (item: NavItem, pathname: string): boolean => (item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href));
