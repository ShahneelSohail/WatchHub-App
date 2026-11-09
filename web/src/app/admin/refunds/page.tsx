'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSearchTerm } from '@/components/admin/chrome';
import { EmptyBlock } from '@/components/admin/controls';
import { DataTable, type Column } from '@/components/admin/table';
import type { AdminRefund, RefundMeta } from '@/components/admin/types';
import { shortDate } from '@/components/admin/utils';
import { api, withQuery } from '@/lib/api';
import { formatMoney } from '@/lib/format';

const PAGE_SIZE = 20;

const COLUMNS: Column<AdminRefund>[] = [
  { id: 'id', header: 'Refund', track: '100px', sortValue: refund => refund.id, cell: refund => <span className="font-semibold">RF-{String(refund.id).padStart(4, '0')}</span> },
  {
    id: 'order',
    header: 'Order',
    track: '110px',
    cell: refund => (
      <Link href={`/admin/orders/${refund.order.id}`} onClick={event => event.stopPropagation()} className="font-semibold text-link hover:underline">
        #{refund.order.id}
      </Link>
    ),
  },
  { id: 'customer', header: 'Customer', track: 'minmax(0,1.3fr)', sortValue: refund => refund.customer.name, cell: refund => <span className="truncate">{refund.customer.name}</span> },
  { id: 'reason', header: 'Reason', track: 'minmax(0,1fr)', cell: refund => <span className="text-ink-secondary">{refund.reason}</span> },
  { id: 'method', header: 'Method', track: 'minmax(0,1.2fr)', cell: refund => <span className="text-ink-secondary">{refund.method === 'STRIPE' ? 'Card (Stripe)' : 'Cash on delivery'}</span> },
  { id: 'date', header: 'Date', track: '110px', sortValue: refund => new Date(refund.createdAt).getTime(), cell: refund => <span className="text-ink-secondary">{shortDate(refund.createdAt)}</span> },
  { id: 'amount', header: 'Amount', track: '110px', align: 'right', sortValue: refund => refund.amount, cell: refund => <span className="font-semibold tabular-nums">{formatMoney(refund.amount)}</span> },
];

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1.5 rounded-card border border-line bg-surface px-5 py-[18px]">
    <span className="text-[13px] text-ink-secondary">{label}</span>
    <span className="text-[26px] font-semibold tabular-nums">{value}</span>
  </div>
);

export default function AdminRefundsPage() {
  const router = useRouter();
  const q = useSearchTerm();
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q]);

  const refunds = useQuery({
    queryKey: ['admin', 'refunds', { q, page }],
    queryFn: () => api.page<AdminRefund>(withQuery('/admin/refunds', { q, page, pageSize: PAGE_SIZE })),
    placeholderData: keepPreviousData,
  });
  const meta = refunds.data?.meta as unknown as RefundMeta | undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-1">
        <StatTile label="Refunded, last 30 days" value={formatMoney(meta?.refundedLast30Days ?? 0)} />
        <StatTile label="Refunds, last 30 days" value={String(meta?.refundCountLast30Days ?? 0)} />
        <StatTile label="Refund rate" value={`${meta?.refundRate ?? 0}%`} />
      </div>
      <DataTable
        label="Refunds"
        noun="refund"
        columns={COLUMNS}
        rows={refunds.data?.items ?? []}
        rowKey={refund => refund.id}
        minWidth={900}
        rowHeight="min-h-14"
        loading={refunds.isPending}
        defaultSort={{ id: 'date', dir: 'desc' }}
        onRowClick={refund => router.push(`/admin/orders/${refund.order.id}`)}
        server={refunds.data && { page: refunds.data.meta.page, totalPages: refunds.data.meta.totalPages, total: refunds.data.meta.total, onPage: setPage }}
        empty={<EmptyBlock icon="refunds" title="No refunds yet" description="Refunds are issued from an order." />}
      />
      <p className="text-[13px] text-ink-secondary">Refunds are issued from an order. Card refunds return through Stripe in 5 to 10 days; cash-on-delivery refunds are paid by bank transfer.</p>
    </div>
  );
}
