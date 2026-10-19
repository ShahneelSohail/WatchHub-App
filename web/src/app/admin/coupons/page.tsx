'use client';

import { ResourceManager, type ColumnConfig, type FieldConfig } from '@/components/admin/ResourceManager';
import { Badge, PageHeading } from '@/components/ui';
import { formatDate, formatMoney } from '@/lib/format';
import type { Coupon } from '@/lib/types';

const fields: FieldConfig[] = [
  { name: 'code', label: 'Code', type: 'text', required: true },
  { name: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'PERCENTAGE', label: 'Percentage off' }, { value: 'FIXED', label: 'Fixed amount off' }] },
  { name: 'value', label: 'Value', type: 'number', required: true, hint: 'A percentage (1 to 100) or an amount in USD.' },
  { name: 'minAmount', label: 'Minimum spend (USD)', type: 'number' },
  { name: 'startsAt', label: 'Starts', type: 'datetime' },
  { name: 'expiresAt', label: 'Expires', type: 'datetime' },
  { name: 'usageLimit', label: 'Total redemptions allowed', type: 'number' },
  { name: 'limitPerUser', label: 'Redemptions per customer', type: 'number' },
  { name: 'isActive', label: 'Active', type: 'checkbox' },
];

const columns: ColumnConfig<Coupon>[] = [
  { header: 'Code', cell: coupon => <span className="font-mono font-medium">{coupon.code}</span> },
  { header: 'Discount', cell: coupon => (coupon.type === 'PERCENTAGE' ? `${Number(coupon.value)}%` : formatMoney(Number(coupon.value))) },
  { header: 'Used', cell: coupon => `${coupon.usageCount}${coupon.usageLimit === null ? '' : ` / ${coupon.usageLimit}`}` },
  { header: 'Expires', cell: coupon => (coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Never') },
  {
    header: 'Status',
    cell: coupon => {
      const expired = coupon.expiresAt !== null && new Date(coupon.expiresAt) < new Date();
      return coupon.isActive && !expired ? <Badge value="PUBLISHED" label="Active" /> : <Badge value="CANCELLED" label={expired ? 'Expired' : 'Inactive'} />;
    },
  },
];

export default function AdminCouponsPage() {
  return (
    <>
      <PageHeading eyebrow="Marketing" title="Coupons" />
      <ResourceManager<Coupon> title="Coupon codes" singular="Coupon" path="/admin/coupons" fields={fields} columns={columns} defaults={{ code: '', type: 'PERCENTAGE', value: '', minAmount: '', startsAt: '', expiresAt: '', usageLimit: '', limitPerUser: '', isActive: true }} />
    </>
  );
}
