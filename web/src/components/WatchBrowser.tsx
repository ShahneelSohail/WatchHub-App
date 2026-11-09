'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, withQuery } from '@/lib/api';
import { formatWholeMoney } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';
import type { Brand, Category, Watch } from '@/lib/types';
import { Icon } from './Icon';
import { Breadcrumb, Button, Checkbox, Chip, cx, EmptyState, ErrorState, Pagination, Switch } from './ui';
import { WatchCardSkeleton, WatchGrid } from './WatchCard';

const PAGE_SIZE = 12;
const FILTER_KEYS = ['q', 'categoryId', 'brandId', 'minPrice', 'maxPrice', 'inStock', 'featured', 'sort', 'page'] as const;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price, low to high' },
  { value: 'price_desc', label: 'Price, high to low' },
];

type Filters = Record<(typeof FILTER_KEYS)[number], string>;
interface FilterChip {
  label: string;
  clear: Partial<Filters>;
}
type Change = (changes: Partial<Filters>) => void;

const legend = 'mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-ink-secondary uppercase';

const PriceInputs = ({ filters, onChange }: { filters: Filters; onChange: Change }) => {
  const [min, setMin] = useState(filters.minPrice);
  const [max, setMax] = useState(filters.maxPrice);
  const [debouncedMin = '', debouncedMax = ''] = useDebounced(`${min}|${max}`, 400).split('|');

  useEffect(() => {
    setMin(filters.minPrice);
    setMax(filters.maxPrice);
  }, [filters.minPrice, filters.maxPrice]);
  useEffect(() => {
    if (debouncedMin !== filters.minPrice || debouncedMax !== filters.maxPrice) onChange({ minPrice: debouncedMin, maxPrice: debouncedMax });
  }, [debouncedMin, debouncedMax]);

  const digits = (value: string) => value.replace(/\D/g, '');
  const boxes = [
    { label: 'Minimum price', placeholder: 'Min', value: min, set: setMin },
    { label: 'Maximum price', placeholder: 'Max', value: max, set: setMax },
  ];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={legend}>Price, USD</legend>
      <div className="grid grid-cols-2 gap-2.5">
        {boxes.map(box => (
          <input key={box.label} aria-label={box.label} inputMode="numeric" placeholder={box.placeholder} value={box.value} onChange={event => box.set(digits(event.target.value))} className="h-11 min-w-0 rounded-card border border-line bg-surface px-3 text-[15px] outline-none placeholder:text-ink-muted hover:border-ink-muted focus:border-primary focus:ring-[3px] focus:ring-primary-tint lg:h-[42px] lg:text-sm" />
        ))}
      </div>
    </fieldset>
  );
};

const FilterPanel = ({ filters, categories, brands, onChange }: { filters: Filters; categories: Category[]; brands: Brand[]; onChange: Change }) => {
  const groups = [
    { title: 'Category', key: 'categoryId' as const, items: categories },
    { title: 'Brand', key: 'brandId' as const, items: brands },
  ];
  return (
    <div className="flex flex-col gap-6 xl:gap-7">
      {groups.map(group => (
        <fieldset key={group.title} className="flex flex-col">
          <legend className={legend}>{group.title}</legend>
          {group.items.map(item => (
            <Checkbox key={item.id} label={item.name} count={item.watchCount} checked={filters[group.key] === String(item.id)} onChange={checked => onChange({ [group.key]: checked ? String(item.id) : '' })} />
          ))}
        </fieldset>
      ))}
      <PriceInputs filters={filters} onChange={onChange} />
      <div className="flex min-h-11 items-center justify-between text-[15px] xl:min-h-10 xl:text-sm">
        In stock only
        <Switch label="In stock only" checked={filters.inStock === 'true'} onChange={checked => onChange({ inStock: checked ? 'true' : '' })} />
      </div>
    </div>
  );
};

const SortMenu = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => (event.type === 'keydown' ? (event as KeyboardEvent).key === 'Escape' : !root.current?.contains(event.target as Node)) && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button onClick={() => setOpen(current => !current)} aria-haspopup="listbox" aria-expanded={open} className="flex h-11 w-full items-center justify-between gap-2.5 rounded-card border border-line bg-surface px-3.5 text-sm hover:border-primary">
        <span className="hidden text-ink-secondary xl:inline">Sort:</span>
        <span className="truncate">{SORT_OPTIONS.find(option => option.value === value)?.label}</span>
        <Icon name="chevronDown" size={14} strokeWidth={1.8} />
      </button>
      {open && (
        <div role="listbox" className="absolute top-[50px] right-0 z-10 w-60 rounded-card border border-line bg-surface p-1.5 shadow-menu animate-rise">
          {SORT_OPTIONS.map(option => (
            <button
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cx('flex min-h-11 w-full items-center justify-between px-3 text-left text-sm hover:bg-page xl:min-h-10', option.value === value ? 'text-primary' : 'text-ink')}
            >
              {option.label}
              {option.value === value && <Icon name="check" size={14} strokeWidth={2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FilterSheet = ({ open, onClose, total, onClear, children }: { open: boolean; onClose: () => void; total?: number; onClear: () => void; children: React.ReactNode }) => (
  <>
    <div onClick={onClose} className={cx('fixed inset-0 z-[60] bg-primary-dark transition-opacity duration-300 xl:hidden', open ? 'opacity-60' : 'pointer-events-none opacity-0')} />
    <div role="dialog" aria-label="Filters" aria-hidden={!open} inert={!open} className={cx('fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[86%] max-w-[640px] flex-col rounded-t-sheet border-t border-line bg-surface transition-transform duration-[420ms] ease-out-soft xl:hidden', open ? 'translate-y-0' : 'translate-y-[102%]')}>
      <div className="flex justify-center pt-2.5">
        <span className="h-1 w-9 rounded-full bg-line" />
      </div>
      <div className="flex items-center justify-between py-1.5 pr-3 pl-5">
        <span className="font-display text-2xl">Filter</span>
        <button onClick={onClose} aria-label="Close filters" className="grid h-11 w-11 place-items-center">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-4">{children}</div>
      <div className="flex gap-2.5 border-t border-line px-5 pt-3 pb-7">
        <Button variant="secondary" size="lg" onClick={onClear}>
          Clear
        </Button>
        <Button size="lg" className="flex-1" onClick={onClose}>
          {total === undefined ? 'Show results' : `Show ${total} ${total === 1 ? 'watch' : 'watches'}`}
        </Button>
      </div>
    </div>
  </>
);

export const WatchBrowser = ({ title = 'All watches', crumb = 'All watches' }: { title?: string; crumb?: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map(key => [key, searchParams.get(key) ?? ''])) as Filters;
  const [sheetOpen, setSheetOpen] = useState(false);

  const setFilters: Change = changes => router.replace(withQuery(pathname, { ...filters, page: '', ...changes }), { scroll: false });
  const clearAll = () => setFilters({ q: '', categoryId: '', brandId: '', minPrice: '', maxPrice: '', inStock: '', featured: '' });

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') });
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api.get<Brand[]>('/brands') });
  const watches = useQuery({
    queryKey: ['watches', filters],
    queryFn: () => api.page<Watch>(withQuery('/watches', { ...filters, inStock: filters.inStock === 'true' ? 'true' : '', pageSize: PAGE_SIZE })),
    placeholderData: previous => previous,
  });

  const candidates: (FilterChip | false | '')[] = [
    filters.q && { label: `“${filters.q}”`, clear: { q: '' } },
    filters.featured === 'true' && { label: 'Featured', clear: { featured: '' } },
    filters.categoryId && { label: categories.data?.find(category => String(category.id) === filters.categoryId)?.name ?? 'Category', clear: { categoryId: '' } },
    filters.brandId && { label: brands.data?.find(brand => String(brand.id) === filters.brandId)?.name ?? 'Brand', clear: { brandId: '' } },
    (filters.minPrice || filters.maxPrice) && { label: `${filters.minPrice ? formatWholeMoney(Number(filters.minPrice)) : '$0'}–${filters.maxPrice ? formatWholeMoney(Number(filters.maxPrice)) : 'any'}`, clear: { minPrice: '', maxPrice: '' } },
    filters.inStock === 'true' && { label: 'In stock', clear: { inStock: '' } },
  ];
  const chips = candidates.filter((chip): chip is FilterChip => Boolean(chip));

  const total = watches.data?.meta.total;
  const panel = <FilterPanel filters={filters} categories={categories.data ?? []} brands={brands.data ?? []} onChange={setFilters} />;

  return (
    <div className="wrap pt-5 pb-16 md:pt-8 md:pb-24">
      <div className="hidden md:block">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: crumb }]} />
      </div>
      <div className="mt-0 mb-5 flex flex-col gap-1.5 md:mt-4 md:mb-8 md:flex-row md:items-end md:justify-between">
        <p className="text-eyebrow font-semibold uppercase text-ink-secondary md:hidden">Catalogue</p>
        <div className="flex items-baseline justify-between md:contents">
          <h1 className="font-display text-4xl leading-none font-normal md:text-[44px] md:font-medium xl:text-h1">{title}</h1>
          <span className="text-[13px] text-ink-secondary md:text-sm">{total === undefined ? '' : total === 1 ? '1 watch' : `${total} watches`}</span>
        </div>
      </div>

      <div className="grid items-start gap-10 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside aria-label="Filters" className="sticky top-[100px] hidden flex-col gap-7 rounded-card border border-line bg-surface p-6 xl:flex">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold">Filters</span>
            <button onClick={clearAll} className="text-[13px] font-medium text-primary">
              Clear all
            </button>
          </div>
          {panel}
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="sticky top-16 z-20 -mx-4 flex gap-2 border-b border-line bg-page px-4 py-2.5 md:static md:mx-0 md:justify-between md:border-0 md:bg-transparent md:p-0 xl:min-h-11">
            <button onClick={() => setSheetOpen(true)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-card border border-line text-sm md:flex-none md:px-5 xl:hidden">
              <Icon name="sliders" size={16} />
              Filter
              {chips.length > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-on-primary">{chips.length}</span>}
            </button>
            <div className="hidden flex-wrap items-center gap-2 xl:flex">
              {chips.map(chip => (
                <Chip key={chip.label} label={chip.label} onRemove={() => setFilters(chip.clear)} />
              ))}
            </div>
            <div className="flex-[1.3] md:flex-none">
              <SortMenu value={filters.sort || 'newest'} onChange={sort => setFilters({ sort })} />
            </div>
          </div>
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 xl:hidden">
              {chips.map(chip => (
                <Chip key={chip.label} label={chip.label} onRemove={() => setFilters(chip.clear)} />
              ))}
              <button onClick={clearAll} className="h-8 px-1.5 text-[13px] text-primary underline underline-offset-[3px]">
                Clear all
              </button>
            </div>
          )}

          {watches.isPending ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-4 xl:gap-6">
              {Array.from({ length: 6 }, (_, index) => (
                <WatchCardSkeleton key={index} />
              ))}
            </div>
          ) : watches.isError ? (
            <ErrorState message={watches.error.message} />
          ) : watches.data.items.length === 0 ? (
            <EmptyState dashed title="No watches match" description="Try removing a filter or widening the price range." action={<Button size="lg" onClick={clearAll}>Clear all filters</Button>} />
          ) : (
            <>
              <WatchGrid watches={watches.data.items} />
              <Pagination meta={watches.data.meta} onChange={page => setFilters({ page: String(page) })} />
            </>
          )}
        </div>
      </div>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} total={total} onClear={clearAll}>
        {panel}
      </FilterSheet>
    </div>
  );
};
