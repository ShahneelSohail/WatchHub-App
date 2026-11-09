'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { orderSummaryLine } from '@/components/OrderParts';
import { RequireAuth } from '@/components/RequireAuth';
import { Badge, Button, Chip, EmptyState, ErrorState, LinkButton, PageHeading, Pagination, Spinner, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { awaitingPayment, usePayOrder } from '@/lib/orders';
import type { Order } from '@/lib/types';

const PAGE_SIZE = 10;
const IN_PROGRESS = ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED', 'SHIPPED'];

const TABS = [
  { label: 'All', test: () => true },
  { label: 'In progress', test: (order: Order) => IN_PROGRESS.includes(order.status) },
  { label: 'Delivered', test: (order: Order) => order.status === 'DELIVERED' },
  { label: 'Cancelled', test: (order: Order) => order.status === 'CANCELLED' },
];

const estimate = (order: Order): { text: string; tone: string } =>
  order.status === 'PENDING_PAYMENT'
    ? { text: 'Ships after payment', tone: 'text-warning-ink' }
    : order.status === 'DELIVERED'
      ? { text: `Delivered ${formatDate(order.events.find(event => event.status === 'DELIVERED')?.createdAt ?? order.createdAt)}`, tone: 'text-success-ink' }
      : order.status === 'CANCELLED'
        ? { text: 'Cancelled', tone: 'text-ink-secondary' }
        : { text: `${order.items.reduce((sum, item) => sum + item.quantity, 0)} items`, tone: 'text-ink-secondary' };

const OrderCard = ({ order, index }: { order: Order; index: number }) => {
  const pay = usePayOrder();
  const note = estimate(order);
  const meta = [
    { label: 'Order', value: `#${order.id}`, className: 'font-semibold text-primary' },
    { label: 'Placed', value: formatDate(order.createdAt) },
    { label: 'Total', value: formatMoney(order.total), className: 'font-semibold tabular-nums' },
  ];
  return (
    <article className="rounded-card border border-line bg-surface animate-rise" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border-b border-line px-[18px] py-3.5">
        <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-[13px]">
          {meta.map(item => (
            <span key={item.label} className="flex flex-col gap-0.5">
              <span className="text-ink-secondary">{item.label}</span>
              <span className={item.className}>{item.value}</span>
            </span>
          ))}
        </div>
        <Badge value={order.status} className="h-[26px]" />
      </div>
      <div className="flex flex-wrap items-center gap-4 px-[18px] py-4">
        <div className="flex gap-2">
          {order.items.slice(0, 3).map(item => (
            <img key={item.id} src={item.image ?? ''} alt="" className={cx('h-16 w-16 rounded-card bg-line object-cover', order.status === 'CANCELLED' && 'opacity-50')} />
          ))}
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-[15px] font-medium">{orderSummaryLine(order)}</span>
          <span className={cx('text-[13px]', note.tone)}>{note.text}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {awaitingPayment(order) && (
            <Button loading={pay.isPending} onClick={() => pay.mutate(order.id)}>
              Pay now
            </Button>
          )}
          <Link href={`/orders/${order.id}`} className="inline-flex h-11 items-center rounded-card border border-primary bg-surface px-[18px] text-sm font-semibold text-primary hover:bg-primary-tint" aria-label={`Order #${order.id}: view order`}>
            View order
          </Link>
        </div>
      </div>
    </article>
  );
};

const OrderList = () => {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState(TABS[0]!.label);
  const orders = useQuery({ queryKey: ['orders', 'all'], queryFn: () => api.page<Order>('/orders?pageSize=60') });

  if (orders.isPending) return <Spinner />;
  if (orders.isError) return <ErrorState message={orders.error.message} />;
  const all = orders.data.items;
  if (all.length === 0) return <EmptyState icon="receipt" title="No orders yet" description="When you buy a watch, you’ll be able to track it and see its warranty here." action={<LinkButton href="/watches" size="lg">Shop all watches</LinkButton>} />;

  const filtered = all.filter(TABS.find(entry => entry.label === tab)!.test);
  const meta = { page, pageSize: PAGE_SIZE, total: filtered.length, totalPages: Math.ceil(filtered.length / PAGE_SIZE) };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(entry => (
          <Chip
            key={entry.label}
            label={entry.label}
            count={all.filter(entry.test).length}
            selected={tab === entry.label}
            onClick={() => {
              setTab(entry.label);
              setPage(1);
            }}
          />
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-line bg-surface px-5 py-10 text-center text-sm text-ink-secondary">No orders in this view.</p>
      ) : (
        filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((order, index) => <OrderCard key={order.id} order={order} index={index} />)
      )}
      <Pagination meta={meta} onChange={setPage} />
    </div>
  );
};

export default function OrdersPage() {
  return (
    <RequireAuth>
      <PageHeading title="My orders" />
      <OrderList />
    </RequireAuth>
  );
}
