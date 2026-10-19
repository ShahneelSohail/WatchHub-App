'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, DataTable, EmptyState, Input, PageHeading, Pagination, Select, Spinner } from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { formatDate, formatMoney, titleCase } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import type { AdminOrder, OrderStatus } from '@/lib/types';

const STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const orders = useQuery({ queryKey: ['admin', 'orders', q, status, page], queryFn: () => api.page<AdminOrder>(withQuery('/admin/orders', { q, status, page, pageSize: 12 })), placeholderData: previous => previous });

  return (
    <>
      <PageHeading eyebrow="Fulfilment" title="Orders" />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={event => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Order number, name or email"
          aria-label="Search orders"
          className="max-w-xs"
        />
        <Select
          value={status}
          onChange={event => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="max-w-52"
        >
          <option value="">All statuses</option>
          {STATUSES.map(entry => (
            <option key={entry} value={entry}>
              {titleCase(entry)}
            </option>
          ))}
        </Select>
      </div>
      {orders.isPending ? (
        <Spinner />
      ) : orders.data?.items.length === 0 ? (
        <EmptyState title="No orders found" />
      ) : (
        <>
          <DataTable headers={['Order', 'Customer', 'Date', 'Payment', 'Status', 'Total']}>
            {orders.data?.items.map(order => (
              <tr key={order.id}>
                <td>
                  <Link href={`/admin/orders/${order.id}`} className="font-medium text-navy hover:underline">
                    #{order.id}
                  </Link>
                </td>
                <td>
                  <p>{order.user.name}</p>
                  <p className="text-xs text-faint">{order.user.email}</p>
                </td>
                <td className="text-muted">{formatDate(order.createdAt)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">{order.paymentMethod === 'COD' ? 'COD' : 'Card'}</span>
                    <Badge value={order.paymentStatus} />
                  </div>
                </td>
                <td>
                  <Badge value={order.status} />
                </td>
                <td className="font-medium">{formatMoney(order.total)}</td>
              </tr>
            ))}
          </DataTable>
          {orders.data && <Pagination meta={orders.data.meta} onChange={setPage} />}
        </>
      )}
    </>
  );
}
