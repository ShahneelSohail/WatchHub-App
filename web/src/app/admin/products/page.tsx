'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TopbarAction, useSearchTerm } from '@/components/admin/chrome';
import { EmptyBlock, Tabs, buttonClass } from '@/components/admin/controls';
import { useAction, useWatchSummary } from '@/components/admin/data';
import { FormModal } from '@/components/admin/overlays';
import { Pill, StockPill, Tag, productTags } from '@/components/admin/pills';
import { BulkBar, BulkButton, DataTable, type Column } from '@/components/admin/table';
import type { AdminWatch } from '@/components/admin/types';
import { pluralize } from '@/components/admin/utils';
import { api, withQuery } from '@/lib/api';
import { formatMoney } from '@/lib/format';

type Filter = 'all' | 'PUBLISHED' | 'DRAFT' | 'low' | 'out';
type BulkAction = 'publish' | 'draft' | 'delete';

const PAGE_SIZE = 20;
const FILTER_PARAMS: Record<Filter, { status?: 'PUBLISHED' | 'DRAFT'; stock?: 'low' | 'out' }> = {
  all: {},
  PUBLISHED: { status: 'PUBLISHED' },
  DRAFT: { status: 'DRAFT' },
  low: { stock: 'low' },
  out: { stock: 'out' },
};
const BULK_MESSAGES: Record<BulkAction, string> = { publish: 'set active', draft: 'moved to draft', delete: 'deleted' };

const effectivePrice = (watch: AdminWatch) => watch.salePrice ?? watch.price;

const COLUMNS: Column<AdminWatch>[] = [
  {
    id: 'name',
    header: 'Product',
    track: 'minmax(0,2fr)',
    sortValue: watch => watch.name,
    cell: watch => (
      <span className="flex min-w-0 items-center gap-3">
        {watch.images[0] ? <img src={watch.images[0]} alt="" className="size-12 flex-none rounded-card bg-line object-cover" /> : <span className="size-12 flex-none rounded-card bg-line" />}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-medium">{watch.name}</span>
          <span className="text-xs text-ink-secondary">
            {watch.brand.name} · {watch.sku} · {pluralize(watch.colors.length, 'colour')}
          </span>
        </span>
      </span>
    ),
  },
  { id: 'category', header: 'Category', track: '104px', cell: watch => <span className="text-ink-secondary">{watch.category.name}</span> },
  {
    id: 'price',
    header: 'Price',
    track: '110px',
    align: 'right',
    sortValue: effectivePrice,
    cell: watch => (
      <span className="flex flex-col items-end gap-0.5">
        <span className={watch.salePrice ? 'font-medium text-danger tabular-nums' : 'font-medium tabular-nums'}>{formatMoney(effectivePrice(watch))}</span>
        {watch.salePrice && <span className="text-xs text-ink-muted line-through">{formatMoney(watch.price)}</span>}
      </span>
    ),
  },
  { id: 'stock', header: 'Stock', track: '120px', sortValue: watch => watch.stock, cell: watch => <StockPill stock={watch.stock} threshold={watch.lowStockThreshold} /> },
  {
    id: 'status',
    header: 'Status',
    track: '100px',
    cell: watch => (watch.status === 'PUBLISHED' ? <Pill tone="confirmed" dot>Active</Pill> : <Pill tone="neutral" dot dashed>Draft</Pill>),
  },
  {
    id: 'tags',
    header: 'Tags',
    track: 'minmax(0,1fr)',
    cell: watch => (
      <span className="flex flex-wrap gap-1">
        {productTags(watch).map(tag => (
          <Tag key={tag.kind} kind={tag.kind}>
            {tag.label}
          </Tag>
        ))}
      </span>
    ),
  },
  { id: 'edit', header: '', track: '72px', align: 'right', cell: watch => <span className="text-[13px] font-semibold text-link">Edit<span className="sr-only"> {watch.name}</span></span> },
];

export default function AdminProductsPage() {
  const router = useRouter();
  const q = useSearchTerm();
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setPage(1), [q, filter]);
  useEffect(() => setSelected(new Set()), [q, filter, page]);

  const products = useQuery({
    queryKey: ['admin', 'watches', { filter, page, q }],
    queryFn: () => api.page<AdminWatch>(withQuery('/admin/watches', { ...FILTER_PARAMS[filter], q, page, pageSize: PAGE_SIZE })),
    placeholderData: keepPreviousData,
  });
  const summary = useWatchSummary(q).data;

  const bulk = useAction((action: BulkAction) => api.post('/admin/watches/bulk', { ids: [...selected], action }), {
    success: (_, action) => `${pluralize(selected.size, 'product')} ${BULK_MESSAGES[action]}`,
    onSuccess: () => {
      setSelected(new Set());
      setConfirmDelete(false);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <TopbarAction>
        <Link href="/admin/products/new" className={buttonClass('primary')}>
          + New product
        </Link>
      </TopbarAction>
      <Tabs
        label="Product filter"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'all', label: 'All', count: summary?.all },
          { value: 'PUBLISHED', label: 'Active', count: summary?.published },
          { value: 'DRAFT', label: 'Draft', count: summary?.draft },
          { value: 'low', label: 'Low stock', count: summary?.lowStock },
          { value: 'out', label: 'Sold out', count: summary?.soldOut },
        ]}
      />
      {selected.size > 0 && (
        <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
          <BulkButton solid disabled={bulk.isPending} onClick={() => bulk.mutate('publish')}>
            Set active
          </BulkButton>
          <BulkButton disabled={bulk.isPending} onClick={() => bulk.mutate('draft')}>
            Move to draft
          </BulkButton>
          <BulkButton disabled={bulk.isPending} onClick={() => setConfirmDelete(true)}>
            Delete
          </BulkButton>
        </BulkBar>
      )}
      <DataTable
        label="Products"
        noun="product"
        columns={COLUMNS}
        rows={products.data?.items ?? []}
        rowKey={watch => watch.id}
        minWidth={1080}
        rowHeight="min-h-[68px]"
        loading={products.isPending}
        selected={selected}
        onSelect={setSelected}
        onRowClick={watch => router.push(`/admin/products/${watch.id}`)}
        server={products.data && { page: products.data.meta.page, totalPages: products.data.meta.totalPages, total: products.data.meta.total, onPage: setPage }}
        empty={<EmptyBlock title="No products match" description="Try another filter or clear the search." />}
      />
      {confirmDelete && (
        <FormModal
          title={`Delete ${pluralize(selected.size, 'product')}?`}
          sub="They are removed from the store and the catalogue. Past orders keep their snapshot."
          cta="Delete"
          tone="danger"
          busy={bulk.isPending}
          onSubmit={() => bulk.mutate('delete')}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
