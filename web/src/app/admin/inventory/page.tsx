'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchTerm } from '@/components/admin/chrome';
import { Alert, EmptyBlock, SelectInput, Tabs } from '@/components/admin/controls';
import { useAction } from '@/components/admin/data';
import { Icon } from '@/components/admin/icons';
import { StockPill } from '@/components/admin/pills';
import { DataTable, type Column } from '@/components/admin/table';
import type { InventoryMeta, InventoryRow } from '@/components/admin/types';
import { pluralize } from '@/components/admin/utils';
import { cx } from '@/components/ui';
import { api, withQuery } from '@/lib/api';

type Filter = 'all' | 'low' | 'out';

const REASONS = ['Stock count', 'Supplier delivery', 'Customer return', 'Damaged or lost', 'Correction'];
const PAGE_SIZE = 25;
const STEP_BUTTON = 'size-9 cursor-pointer text-base text-ink hover:bg-page focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary';

const StatTile = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col gap-1.5 rounded-card border border-line bg-surface px-5 py-[18px]">
    <span className="text-[13px] text-ink-secondary">{label}</span>
    <span className="text-[26px] font-semibold tabular-nums">{value}</span>
  </div>
);

export default function AdminInventoryPage() {
  const q = useSearchTerm();
  const [filter, setFilter] = useState<Filter>('all');
  const [targets, setTargets] = useState<Record<string, { row: InventoryRow; next: number }>>({});
  const [reason, setReason] = useState(REASONS[0]!);

  const inventory = useQuery({
    queryKey: ['admin', 'inventory', { q, filter }],
    queryFn: () => api.page<InventoryRow>(withQuery('/admin/inventory', { q, filter })),
    placeholderData: keepPreviousData,
  });

  useEffect(() => setTargets({}), [q]);

  const adjust = useAction(() => api.post('/admin/inventory/adjust', { reason, items: Object.values(targets).map(({ row, next }) => ({ watchId: row.watchId, colorId: row.colorId, newStock: next })) }), {
    success: () => `Stock updated for ${pluralize(Object.keys(targets).length, 'SKU')}`,
    onSuccess: () => setTargets({}),
  });

  const rows = inventory.data?.items ?? [];
  const nextOf = (row: InventoryRow) => targets[row.key]?.next ?? row.onHand;
  const setNext = (row: InventoryRow, value: number) =>
    setTargets(current => {
      const rest = Object.fromEntries(Object.entries(current).filter(([key]) => key !== row.key));
      const next = Math.max(0, value);
      return next === row.onHand ? rest : { ...rest, [row.key]: { row, next } };
    });

  const columns: Column<InventoryRow>[] = [
    {
      id: 'product',
      header: 'Product · colour',
      track: 'minmax(0,2fr)',
      cell: row => (
        <span className="flex min-w-0 items-center gap-3">
          {row.image ? <img src={row.image} alt="" className="size-10 flex-none rounded-card bg-line object-cover" /> : <span className="size-10 flex-none rounded-card bg-line" />}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium">{row.name}</span>
            {row.variant && (
              <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
                <span className="size-2.5 rounded-pill shadow-[0_0_0_1px_var(--color-line)]" style={{ backgroundColor: row.hex ?? undefined }} />
                {row.variant}
              </span>
            )}
          </span>
        </span>
      ),
    },
    { id: 'sku', header: 'SKU', track: '120px', cell: row => <span className="text-[13px] text-ink-secondary tabular-nums">{row.sku}</span> },
    { id: 'onHand', header: 'On hand', track: '90px', align: 'right', cell: row => <span className="tabular-nums">{row.onHand}</span> },
    { id: 'reserved', header: 'Reserved', track: '90px', align: 'right', cell: row => <span className="text-ink-secondary tabular-nums">{row.reserved}</span> },
    {
      id: 'available',
      header: 'Available',
      track: '90px',
      align: 'right',
      cell: row => <span className={cx('font-semibold tabular-nums', nextOf(row) - row.reserved < 0 && 'text-danger-ink')}>{nextOf(row) - row.reserved}</span>,
    },
    { id: 'status', header: 'Status', track: '130px', cell: row => <StockPill stock={nextOf(row)} threshold={row.threshold} /> },
    {
      id: 'adjust',
      header: 'Adjust',
      track: '180px',
      align: 'right',
      cell: row => {
        const delta = nextOf(row) - row.onHand;
        return (
          <span className="flex items-center justify-end gap-2">
            <span className="min-w-[30px] text-right text-[13px] font-semibold text-link tabular-nums">{delta ? (delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`) : ''}</span>
            <span className="flex items-center rounded-card border border-line bg-surface">
              <button type="button" aria-label={`Decrease ${row.sku}`} className={STEP_BUTTON} onClick={() => setNext(row, nextOf(row) - 1)}>
                <Icon name="minus" size={14} />
              </button>
              <input
                value={nextOf(row)}
                inputMode="numeric"
                aria-label={`Stock for ${row.sku}`}
                onChange={event => setNext(row, Number(event.target.value.replace(/\D/g, '')) || 0)}
                className="h-9 w-12 border-x border-line bg-transparent text-center text-sm outline-none tabular-nums focus:bg-primary-tint"
              />
              <button type="button" aria-label={`Increase ${row.sku}`} className={STEP_BUTTON} onClick={() => setNext(row, nextOf(row) + 1)}>
                <Icon name="plus" size={14} />
              </button>
            </span>
          </span>
        );
      },
    },
  ];

  const meta = inventory.data?.meta as unknown as InventoryMeta | undefined;
  const dirty = Object.keys(targets).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2">
        <StatTile label="SKUs" value={meta?.skus ?? 0} />
        <StatTile label="Units on hand" value={meta?.unitsOnHand ?? 0} />
        <StatTile label="Reserved by open orders" value={meta?.reserved ?? 0} />
        <StatTile label="Sold out SKUs" value={meta?.soldOutSkus ?? 0} />
      </div>
      <Tabs
        label="Inventory filter"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'all', label: 'All', count: meta?.counts.all },
          { value: 'low', label: 'Low stock', count: meta?.counts.low },
          { value: 'out', label: 'Sold out', count: meta?.counts.out },
        ]}
      />
      {inventory.isError && (
        <Alert tone="red" role="alert">
          {inventory.error.message}
        </Alert>
      )}
      <DataTable label="Inventory" noun="SKU" columns={columns} rows={rows} rowKey={row => row.key} minWidth={900} loading={inventory.isPending} pageSize={PAGE_SIZE} empty={<EmptyBlock title="No SKUs match" description="Try another filter or clear the search." />} />
      {dirty > 0 && (
        <div className="sticky bottom-4 z-6 flex animate-rise flex-wrap items-center gap-3 rounded-card bg-primary-dark py-3 pr-3 pl-5 text-white shadow-dialog ring-1 ring-white/10">
          <span className="text-sm font-semibold">{dirty === 1 ? '1 unsaved adjustment' : `${dirty} unsaved adjustments`}</span>
          <span className="text-[13px] text-indigo-100">Adjustments are logged with your name and today’s date.</span>
          <span className="flex-1" />
          <SelectInput aria-label="Reason" value={reason} onChange={event => setReason(event.target.value)} className="h-[38px] w-auto text-[13px]">
            {REASONS.map(option => (
              <option key={option}>{option}</option>
            ))}
          </SelectInput>
          <button type="button" onClick={() => setTargets({})} className="h-[38px] cursor-pointer rounded-card border border-white/30 px-3.5 text-[13px] hover:bg-white/10">
            Discard
          </button>
          <button type="button" disabled={adjust.isPending} onClick={() => adjust.mutate(undefined)} className="h-[38px] cursor-pointer rounded-card bg-white px-4 text-[13px] font-semibold text-primary-dark disabled:opacity-60">
            Save adjustments
          </button>
        </div>
      )}
    </div>
  );
}
