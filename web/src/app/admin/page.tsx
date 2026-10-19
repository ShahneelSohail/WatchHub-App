'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { SalesChart } from '@/components/admin/SalesChart';
import { Badge, Card, DataTable, ErrorState, PageHeading, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import type { Dashboard } from '@/lib/types';

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Card>
    <p className="text-sm text-muted">{label}</p>
    <p className="mt-1 font-serif text-3xl font-semibold">{value}</p>
    {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
  </Card>
);

export default function AdminDashboardPage() {
  const dashboard = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => api.get<Dashboard>('/admin/dashboard') });

  if (dashboard.isPending) return <Spinner />;
  if (dashboard.isError) return <ErrorState message={dashboard.error.message} />;
  const data = dashboard.data;

  return (
    <>
      <PageHeading eyebrow="Overview" title="Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Revenue" value={formatMoney(data.totalRevenue)} hint="Excludes cancelled and unpaid card orders" />
        <Stat label="Orders" value={String(data.orderCount)} hint={`${data.pendingOrders} awaiting confirmation`} />
        <Stat label="Average order value" value={formatMoney(data.averageOrderValue)} />
        <Stat label="Customers" value={String(data.customerCount)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <h2 className="mb-2 font-serif text-xl">Revenue, last 14 days</h2>
          <SalesChart days={data.salesByDay} />
        </Card>
        <Card>
          <h2 className="mb-4 font-serif text-xl">Orders by status</h2>
          <ul className="space-y-3 text-sm">
            {data.statusBreakdown.map(entry => (
              <li key={entry.status} className="flex items-center justify-between">
                <Badge value={entry.status} />
                <span className="font-medium">{entry.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <h2 className="mt-10 mb-4 font-serif text-xl">Recent orders</h2>
      <DataTable headers={['Order', 'Customer', 'Date', 'Status', 'Total']}>
        {data.recentOrders.map(order => (
          <tr key={order.id}>
            <td>
              <Link href={`/admin/orders/${order.id}`} className="font-medium text-navy hover:underline">
                #{order.id}
              </Link>
            </td>
            <td>{order.customerName}</td>
            <td className="text-muted">{formatDate(order.createdAt)}</td>
            <td>
              <Badge value={order.status} />
            </td>
            <td className="font-medium">{formatMoney(order.total)}</td>
          </tr>
        ))}
      </DataTable>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-serif text-xl">Best sellers</h2>
          <ul className="space-y-3 text-sm">
            {data.topWatches.map(watch => (
              <li key={watch.id} className="flex items-center gap-3">
                <img src={watch.images[0]} alt="" className="h-10 w-10 rounded-lg bg-sand object-contain p-1" />
                <Link href={`/watches/${watch.slug}`} className="flex-1 hover:text-navy">
                  {watch.name}
                </Link>
                <span className="text-muted">{watch.unitsSold} sold</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-serif text-xl">Low stock</h2>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-muted">Everything is well stocked.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {data.lowStock.map(watch => (
                <li key={watch.id} className="flex items-center justify-between">
                  <Link href={`/admin/products/${watch.id}`} className="hover:text-navy">
                    {watch.name} <span className="text-faint">({watch.sku})</span>
                  </Link>
                  <span className={watch.stock === 0 ? 'font-medium text-red-700' : 'font-medium text-amber-700'}>{watch.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
