'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopbarAction, useSearchTerm } from '@/components/admin/chrome';
import { Button, EmptyBlock, Tabs } from '@/components/admin/controls';
import { useAction, useAnalytics } from '@/components/admin/data';
import { ORDER_CSV_HEADER, itemSummary, orderCsvRows } from '@/components/admin/OrderBits';
import { ORDER_STATUS_LABELS, OrderStatusPill, PaymentPill } from '@/components/admin/pills';
import { BulkBar, BulkButton, DataTable, type Column } from '@/components/admin/table';
import type { AdminOrder } from '@/components/admin/types';
import { downloadCsv, pluralize, shortDate } from '@/components/admin/utils';
import { api, withQuery } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';
import { useToast } from '@/components/Providers';

type StatusFilter = 'ALL' | OrderStatus;

const PAGE_SIZE = 20;
const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

const COLUMNS: Column<AdminOrder>[] = [
  {
    id: 'id',
    header: 'Order',
    track: '104px',
    sortValue: order => order.id,
    cell: order => (
      <Link href={`/admin/orders/${order.id}`} onClick={event => event.stopPropagation()} className="font-semibold text-link hover:underline">
        #{order.id}
      </Link>
    ),
  },
  {
    id: 'customer',
    header: 'Customer',
    track: 'minmax(0,1.3fr)',
    sortValue: order => order.user.name,
    cell: order => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate">{order.user.name}</span>
        <span className="truncate text-xs text-ink-secondary">{order.user.email}</span>
      </span>
    ),
  },
  { id: 'items', header: 'Items', track: 'minmax(0,1.5fr)', cell: order => <span className="block truncate text-ink-secondary">{itemSummary(order.items)}</span> },
  { id: 'date', header: 'Date', track: '104px', sortValue: order => new Date(order.createdAt).getTime(), cell: order => <span className="whitespace-nowrap text-ink-secondary">{shortDate(order.createdAt)}</span> },
  { id: 'status', header: 'Status', track: '156px', cell: order => <OrderStatusPill status={order.status} /> },
  { id: 'payment', header: 'Payment', track: '140px', cell: order => <PaymentPill method={order.paymentMethod} status={order.paymentStatus} /> },
  { id: 'total', header: 'Total', track: '96px', align: 'right', sortValue: order => order.total, cell: order => <span className="font-medium tabular-nums">{formatMoney(order.total)}</span> },
];

const isStatus = (value: string | null): value is OrderStatus => STATUSES.includes(value as OrderStatus);

export default function AdminOrdersPage() {
  const router = useRouter();
  const toast = useToast();
  const q = useSearchTerm();
  const initial = useSearchParams().get('status');
  const [status, setStatus] = useState<StatusFilter>(isStatus(initial) ? initial : 'ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => setPage(1), [q, status]);
  useEffect(() => setSelected(new Set()), [q, status, page]);

  const orders = useQuery({
    queryKey: ['admin', 'orders', { status, page, q }],
    queryFn: () => api.page<AdminOrder>(withQuery('/admin/orders', { status: status === 'ALL' ? undefined : status, q, page, pageSize: PAGE_SIZE })),
    placeholderData: keepPreviousData,
  });
  const breakdown = useAnalytics('7d').data?.statusCounts;
  const countOf = (value: StatusFilter) => (value === 'ALL' ? breakdown?.reduce((sum, entry) => sum + entry.count, 0) : (breakdown?.find(entry => entry.status === value)?.count ?? 0));

  const rows = orders.data?.items ?? [];
  const selectedRows = rows.filter(order => selected.has(order.id));
  const pendingIds = selectedRows.filter(order => order.status === 'PENDING').map(order => order.id);

  const confirm = useAction((ids: number[]) => Promise.all(ids.map(id => api.patch(`/admin/orders/${id}/status`, { status: 'CONFIRMED' }))), {
    success: (_, ids) => `${pluralize(ids.length, 'order')} confirmed`,
    onSuccess: () => setSelected(new Set()),
  });

  const exportRows = (list: AdminOrder[], message: string) => {
    downloadCsv('orders.csv', ORDER_CSV_HEADER, orderCsvRows(list));
    toast('success', message);
  };

  return (
    <div className="flex flex-col gap-4">
      <TopbarAction>
        <Button variant="primary" onClick={() => exportRows(rows, 'Orders exported as CSV')} disabled={rows.length === 0}>
          Export CSV
        </Button>
      </TopbarAction>
      <Tabs label="Order status" value={status} onChange={setStatus} tabs={[{ value: 'ALL', label: 'All', count: countOf('ALL') }, ...STATUSES.map(value => ({ value, label: ORDER_STATUS_LABELS[value], count: countOf(value) }))]} />
      {selectedRows.length > 0 && (
        <BulkBar count={selectedRows.length} onClear={() => setSelected(new Set())}>
          <BulkButton solid disabled={confirm.isPending} onClick={() => (pendingIds.length ? confirm.mutate(pendingIds) : toast('error', 'No pending orders in the selection'))}>
            Confirm pending
          </BulkButton>
          <BulkButton onClick={() => exportRows(selectedRows, `${pluralize(selectedRows.length, 'order')} exported as CSV`)}>Export selected</BulkButton>
        </BulkBar>
      )}
      <DataTable
        label="Orders"
        noun="order"
        columns={COLUMNS}
        rows={rows}
        rowKey={order => order.id}
        minWidth={1040}
        loading={orders.isPending}
        defaultSort={{ id: 'date', dir: 'desc' }}
        selected={selected}
        onSelect={setSelected}
        onRowClick={order => router.push(`/admin/orders/${order.id}`)}
        server={orders.data && { page: orders.data.meta.page, totalPages: orders.data.meta.totalPages, total: orders.data.meta.total, onPage: setPage }}
        empty={<EmptyBlock icon="orders" title="No orders match" description="Try another status or clear the search." />}
      />
    </div>
  );
}
