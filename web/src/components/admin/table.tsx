'use client';

import { useMemo, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { cx } from '../ui';
import { pluralize } from './utils';
import { Checkbox, IconButton, Skeleton } from './controls';
import { Icon } from './icons';

export interface Column<T> {
  id: string;
  header: string;
  track: string;
  align?: 'left' | 'right';
  sortValue?: (row: T) => string | number;
  cell: (row: T) => ReactNode;
}

type Key = string | number;
type SortState = { id: string; dir: 'asc' | 'desc' };

export interface ServerPage {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}

interface DataTableProps<T, K extends Key> {
  label: string;
  noun: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => K;
  minWidth: number;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  selected?: ReadonlySet<K>;
  onSelect?: (next: Set<K>) => void;
  defaultSort?: SortState;
  pageSize?: number;
  server?: ServerPage;
  rowHeight?: string;
}

const SKELETON_ROWS = 6;
const HEADER_CELL = 'text-xs font-semibold tracking-[0.06em] uppercase';


const compare = (a: string | number, b: string | number) => (a > b ? 1 : a < b ? -1 : 0);

interface TableFooterProps {
  summary: string;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

export const TableFooter = ({ summary, page, totalPages, onPage }: TableFooterProps) => (
  <div className="flex items-center justify-between px-5 py-3 text-[13px] text-ink-secondary">
    <span>{summary}</span>
    <span className="flex items-center gap-2">
      {totalPages > 1 && <IconButton icon="arrowLeft" label="Previous page" framed disabled={page <= 1} onClick={() => onPage(page - 1)} />}
      <span>
        Page {page} of {totalPages}
      </span>
      {totalPages > 1 && <IconButton icon="arrowRight" label="Next page" framed disabled={page >= totalPages} onClick={() => onPage(page + 1)} />}
    </span>
  </div>
);


export const DataTable = <T, K extends Key>({
  label,
  noun,
  columns,
  rows,
  rowKey,
  minWidth,
  loading = false,
  empty,
  onRowClick,
  selected,
  onSelect,
  defaultSort,
  pageSize,
  server,
  rowHeight = 'min-h-[60px]',
}: DataTableProps<T, K>) => {
  const [sort, setSort] = useState<SortState | undefined>(defaultSort);
  const [clientPage, setClientPage] = useState(1);

  const sorted = useMemo(() => {
    const column = columns.find(candidate => candidate.id === sort?.id);
    if (!sort || !column?.sortValue) return rows;
    const value = column.sortValue;
    const direction = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => compare(value(a), value(b)) * direction);
  }, [rows, columns, sort]);

  const totalPages = server?.totalPages ?? Math.max(1, Math.ceil(sorted.length / (pageSize ?? Infinity)));
  const page = Math.min(server?.page ?? clientPage, totalPages);
  const visible = !server && pageSize ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;
  const goTo = server?.onPage ?? setClientPage;

  const template = [selected ? '44px' : null, ...columns.map(column => column.track)].filter(Boolean).join(' ');
  const gridStyle: CSSProperties = { gridTemplateColumns: template };
  const allSelected = visible.length > 0 && visible.every(row => selected?.has(rowKey(row)));

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return;
    const textFirst = typeof column.sortValue(rows[0] as T) === 'string';
    setSort(current => (current?.id === column.id ? { id: column.id, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { id: column.id, dir: textFirst ? 'asc' : 'desc' }));
  };

  const toggleRow = (row: T) => {
    if (!selected || !onSelect) return;
    const next = new Set(selected);
    const key = rowKey(row);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelect(next);
  };

  const rowPadding = selected ? 'pr-5 pl-2' : 'px-5';

  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="max-xl:overflow-x-auto">
        <div role="table" aria-label={label} style={{ '--table-min': `${minWidth}px` } as CSSProperties} className="max-xl:min-w-(--table-min)">
          <div role="row" style={gridStyle} className={cx('sticky top-[72px] z-5 grid h-11 items-center gap-3 border-b border-line bg-page text-ink-secondary', rowPadding)}>
            {selected && onSelect && (
              <div role="columnheader" className="max-xl:sticky max-xl:left-0 max-xl:z-1 max-xl:bg-page">
                <Checkbox ariaLabel="Select all" checked={allSelected} onChange={() => onSelect(allSelected ? new Set() : new Set(visible.map(rowKey)))} />
              </div>
            )}
            {columns.map(column => {
              const active = sort?.id === column.id;
              return (
                <div key={column.id} role="columnheader" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cx(HEADER_CELL, column.align === 'right' && 'text-right')}>
                  {column.sortValue ? (
                    <button type="button" onClick={() => toggleSort(column)} className={cx('inline-flex cursor-pointer items-center gap-1 uppercase hover:text-ink', active && 'text-ink')}>
                      {column.header}
                      {active && <Icon name={sort.dir === 'asc' ? 'arrowUp' : 'arrowDown'} size={11} strokeWidth={2.4} />}
                    </button>
                  ) : (
                    column.header
                  )}
                </div>
              );
            })}
          </div>

          {loading
            ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <div key={index} role="row" aria-hidden="true" style={gridStyle} className={cx('grid items-center gap-3 border-b border-line', rowHeight, rowPadding)}>
                  {selected && <span />}
                  {columns.map(column => (
                    <Skeleton key={column.id} className="h-3.5 w-3/4" />
                  ))}
                </div>
              ))
            : visible.map((row, index) => {
                const key = rowKey(row);
                const isSelected = selected?.has(key) ?? false;
                return (
                  <div
                    key={key}
                    role="row"
                    aria-selected={selected ? isSelected : undefined}
                    onClick={onRowClick && (() => onRowClick(row))}
                    style={{ ...gridStyle, animationDelay: `${Math.min(index, 12) * 25}ms` }}
                    className={cx('grid animate-rise items-center gap-3 border-b border-line text-sm transition-colors', rowHeight, rowPadding, isSelected ? 'bg-primary-tint' : 'bg-surface hover:bg-page', onRowClick && 'cursor-pointer')}
                  >
                    {selected && (
                      <div role="cell" className="max-xl:sticky max-xl:left-0 max-xl:z-1 max-xl:bg-inherit">
                        <Checkbox ariaLabel={`Select ${noun}`} checked={isSelected} onChange={() => toggleRow(row)} />
                      </div>
                    )}
                    {columns.map(column => (
                      <div key={column.id} role="cell" className={cx('min-w-0', column.align === 'right' && 'text-right')}>
                        {column.cell(row)}
                      </div>
                    ))}
                  </div>
                );
              })}

          {!loading && rows.length === 0 && empty}
        </div>
      </div>
      <TableFooter summary={loading ? ' ' : pluralize(server?.total ?? rows.length, noun)} page={page} totalPages={totalPages} onPage={goTo} />
    </div>
  );
};

interface BulkBarProps {
  count: number;
  onClear: () => void;
  children: ReactNode;
}

export const BulkBar = ({ count, onClear, children }: BulkBarProps) => (
  <div className="flex animate-rise items-center gap-2.5 rounded-card bg-primary-dark py-2 pr-2 pl-4 text-sm text-white ring-1 ring-white/10">
    <span className="font-semibold">{count} selected</span>
    <span className="flex-1" />
    {children}
    <button type="button" onClick={onClear} className="h-[34px] cursor-pointer px-3 text-[13px] text-indigo-100 hover:text-white">
      Clear
    </button>
  </div>
);

export const BulkButton = ({ solid = false, ...props }: { solid?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={cx('h-[34px] cursor-pointer rounded-card px-3.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-50', solid ? 'bg-white font-semibold text-primary-dark' : 'border border-white/30 text-white hover:bg-white/10')}
    {...props}
  />
);
