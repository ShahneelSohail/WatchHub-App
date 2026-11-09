'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Panel, Segmented, Skeleton } from '@/components/admin/controls';
import { useAnalytics } from '@/components/admin/data';
import { OrderStatusPill, ORDER_STATUS_LABELS, StockPill } from '@/components/admin/pills';
import { SalesChart } from '@/components/admin/SalesChart';
import type { Analytics, AnalyticsRange, KpiDelta } from '@/components/admin/types';
import { cx } from '@/components/ui';
import { formatMoney, formatWholeMoney } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';

const RANGES: { value: AnalyticsRange; label: string; title: string; previous: string }[] = [
  { value: '7d', label: '7 days', title: 'last 7 days', previous: 'previous 7 days' },
  { value: '30d', label: '30 days', title: 'last 30 days', previous: 'previous 30 days' },
  { value: '12m', label: '12 months', title: 'last 12 months', previous: 'previous 12 months' },
];

const DONUT_ORDER: OrderStatus[] = ['DELIVERED', 'SHIPPED', 'CONFIRMED', 'PENDING', 'PENDING_PAYMENT', 'CANCELLED'];
const donutColor = (status: OrderStatus) => `var(--color-donut-${status.toLowerCase().replace('_', '-')})`;

const formatDelta = ({ change, changePercent }: KpiDelta, money: boolean): string => {
  const sign = change >= 0 ? '+' : '−';
  if (changePercent !== null) return `${sign}${Math.abs(changePercent)}%`;
  return sign + (money ? formatWholeMoney(Math.abs(change)) : Math.abs(change));
};

const KpiTile = ({ label, value, delta, sub, money = false }: { label: string; value: string; delta: KpiDelta; sub: string; money?: boolean }) => (
  <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
    <span className="text-[13px] text-ink-secondary">{label}</span>
    <span className="text-[30px] font-semibold tracking-[-0.01em] tabular-nums">{value}</span>
    <span className="flex items-center gap-1.5 text-xs">
      <span className={cx('inline-flex h-5 items-center rounded-pill border px-[7px] font-semibold', delta.change >= 0 ? 'border-pill-green-bd bg-pill-green-bg text-pill-green-fg' : 'border-pill-red-bd bg-pill-red-bg text-pill-red-fg')}>{formatDelta(delta, money)}</span>
      <span className="text-ink-secondary">{sub}</span>
    </span>
  </div>
);

const PanelLink = ({ href, children }: { href: string; children: string }) => (
  <Link href={href} className="text-[13px] font-semibold text-link hover:underline">
    {children}
  </Link>
);

const Thumb = ({ src }: { src: string | null }) => (src ? <img src={src} alt="" className="size-11 rounded-card bg-line object-cover" /> : <span className="size-11 rounded-card bg-line" />);

const StatusDonut = ({ counts }: { counts: Analytics['statusCounts'] }) => {
  const router = useRouter();
  const total = counts.reduce((sum, entry) => sum + entry.count, 0);
  const countOf = (status: OrderStatus) => counts.find(entry => entry.status === status)?.count ?? 0;
  let accumulated = 0;
  const segments = DONUT_ORDER.map(status => {
    const from = accumulated;
    accumulated += total === 0 ? 0 : (countOf(status) / total) * 100;
    return `${donutColor(status)} ${from}% ${accumulated}%`;
  });

  return (
    <Panel title="Orders by status" subtitle="Click a status to filter orders" className="flex flex-col">
      <div className="flex items-center gap-6">
        <div className="relative size-[148px] flex-none rounded-pill" style={{ background: total ? `conic-gradient(${segments.join(',')})` : 'var(--color-line)' }}>
          <div className="absolute inset-6 flex flex-col items-center justify-center rounded-pill bg-surface">
            <span className="text-[28px] font-semibold">{total}</span>
            <span className="text-xs text-ink-secondary">orders</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          {DONUT_ORDER.map(status => (
            <button key={status} type="button" onClick={() => router.push(`/admin/orders?status=${status}`)} className="flex h-[30px] cursor-pointer items-center gap-2.5 rounded-card px-1.5 text-left text-[13px] hover:bg-page">
              <span className="size-2.5 rounded-card shadow-[inset_0_0_0_1px_rgb(17_24_39/0.08)]" style={{ backgroundColor: donutColor(status) }} />
              <span className="flex-1">{ORDER_STATUS_LABELS[status]}</span>
              <span className="text-ink-secondary tabular-nums">{countOf(status)}</span>
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
};

const DashboardSkeleton = () => (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
      {[0, 1, 2, 3].map(index => (
        <Skeleton key={index} className="h-[124px]" />
      ))}
    </div>
    <Skeleton className="h-[340px]" />
    <Skeleton className="h-64" />
  </div>
);

export default function AdminDashboardPage() {
  const router = useRouter();
  const [range, setRange] = useState<AnalyticsRange>('7d');
  const analytics = useAnalytics(range);

  if (analytics.isError)
    return (
      <Alert tone="red" role="alert">
        {analytics.error.message}
      </Alert>
    );
  if (!analytics.data) return <DashboardSkeleton />;

  const data = analytics.data;
  const period = RANGES.find(option => option.value === range)!;
  const vsPrevious = `vs ${period.previous}`;
  const periodRevenue = data.series.reduce((sum, point) => sum + point.revenue, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
        <KpiTile label="Revenue" value={formatWholeMoney(data.kpis.revenue.value)} delta={data.kpis.revenue} sub={vsPrevious} money />
        <KpiTile label="Orders" value={String(data.kpis.orders.value)} delta={data.kpis.orders} sub={vsPrevious} />
        <KpiTile label="Average order" value={formatWholeMoney(data.kpis.averageOrder.value)} delta={data.kpis.averageOrder} sub={vsPrevious} money />
        <KpiTile label="New customers" value={String(data.kpis.newCustomers.value)} delta={data.kpis.newCustomers} sub={vsPrevious} />
      </div>

      <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] gap-4 max-xl:grid-cols-1">
        <section className="flex flex-col gap-[18px] rounded-card border border-line bg-surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[15px] font-semibold">Revenue, {period.title}</h2>
              <span className="text-[13px] text-ink-secondary">{formatWholeMoney(periodRevenue)} · hover a bar for the total</span>
            </div>
            <Segmented label="Revenue range" options={RANGES} value={range} onChange={setRange} />
          </div>
          <SalesChart series={data.series} range={range} />
        </section>
        <StatusDonut counts={data.statusCounts} />
      </div>

      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] items-start gap-4 max-xl:grid-cols-1">
        <Panel title="Recent orders" action={<PanelLink href="/admin/orders">View all</PanelLink>} flush>
          {data.recentOrders.map(order => (
            <button key={order.id} type="button" onClick={() => router.push(`/admin/orders/${order.id}`)} className="grid w-full cursor-pointer grid-cols-[72px_minmax(0,1fr)_auto_80px] items-center gap-3 border-b border-line px-5 py-3 text-left text-sm hover:bg-page">
              <span className="font-semibold text-link">#{order.id}</span>
              <span className="truncate">{order.customerName}</span>
              <OrderStatusPill status={order.status} />
              <span className="text-right font-medium tabular-nums">{formatMoney(order.total)}</span>
            </button>
          ))}
          {data.recentOrders.length === 0 && <p className="px-5 py-6 text-sm text-ink-secondary">No orders yet.</p>}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Sales by category" subtitle={`Share of revenue, ${period.title}`}>
            <ul className="flex flex-col gap-3.5">
              {data.salesByCategory.map(category => (
                <li key={category.categoryId} className="flex flex-col gap-1.5 text-sm">
                  <span className="flex justify-between">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-ink-secondary tabular-nums">
                      {formatWholeMoney(category.revenue)} · {category.share}%
                    </span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-pill bg-primary-tint">
                    <span className="block h-full bg-primary" style={{ width: `${category.share}%` }} />
                  </span>
                </li>
              ))}
              {data.salesByCategory.length === 0 && <p className="text-sm text-ink-secondary">No sales in this period.</p>}
            </ul>
          </Panel>
          <Panel title="Best sellers" flush>
            {data.bestSellers.map(seller => (
              <div key={seller.watchId} className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 border-b border-line px-5 py-3">
                <Thumb src={seller.image} />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{seller.name}</span>
                    <span className="tabular-nums">{formatWholeMoney(seller.revenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-primary-tint">
                      <span className="block h-full bg-primary" style={{ width: `${seller.share}%` }} />
                    </span>
                    <span className="text-xs whitespace-nowrap text-ink-secondary">{seller.units} sold</span>
                  </div>
                </div>
              </div>
            ))}
            {data.bestSellers.length === 0 && <p className="px-5 py-6 text-sm text-ink-secondary">No sales in this period.</p>}
          </Panel>
        </div>

        <Panel title="Low stock" action={<PanelLink href="/admin/inventory">Inventory</PanelLink>} flush>
          {data.lowStock.map(product => (
            <Link key={product.id} href={`/admin/products/${product.id}`} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-5 py-3 hover:bg-page">
              <Thumb src={product.image} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{product.name}</span>
                <span className="text-xs text-ink-secondary">{product.sku}</span>
              </span>
              <StockPill stock={product.stock} threshold={product.threshold} />
            </Link>
          ))}
          {data.lowStock.length === 0 && <p className="px-5 py-6 text-sm text-ink-secondary">Every product is above its threshold.</p>}
        </Panel>
      </div>
    </div>
  );
}
