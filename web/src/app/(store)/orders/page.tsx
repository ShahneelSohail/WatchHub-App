'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { Badge, Card, EmptyState, ErrorState, LinkButton, PageHeading, Pagination, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import type { Order } from '@/lib/types';

const OrderList = () => {
  const [page, setPage] = useState(1);
  const orders = useQuery({ queryKey: ['orders', page], queryFn: () => api.page<Order>(`/orders?page=${page}&pageSize=10`) });

  if (orders.isPending) return <Spinner />;
  if (orders.isError) return <ErrorState message={orders.error.message} />;
  if (orders.data.items.length === 0) return <EmptyState title="No orders yet" description="When you place an order it will show up here." action={<LinkButton href="/watches">Start shopping</LinkButton>} />;

  return (
    <>
      <ul className="space-y-4">
        {orders.data.items.map(order => (
          <li key={order.id}>
            <Link href={`/orders/${order.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-4 transition hover:border-navy">
                <div>
                  <p className="font-serif text-lg">Order #{order.id}</p>
                  <p className="text-sm text-muted">
                    {formatDate(order.createdAt)} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge value={order.status} />
                  <Badge value={order.paymentStatus} />
                  <span className="w-24 text-right font-semibold">{formatMoney(order.total)}</span>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination meta={orders.data.meta} onChange={setPage} />
    </>
  );
};

export default function OrdersPage() {
  return (
    <RequireAuth>
      <PageHeading eyebrow="Your account" title="My orders" />
      <OrderList />
    </RequireAuth>
  );
}
