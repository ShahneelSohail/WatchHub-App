'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, withQuery } from '@/lib/api';
import { useDebounced } from '@/lib/hooks';
import type { Brand, Category, Watch } from '@/lib/types';
import { EmptyState, ErrorState, Field, Input, PageHeading, Pagination, Select, Spinner } from './ui';
import { WatchGrid } from './WatchCard';

const PAGE_SIZE = 12;
const FILTER_KEYS = ['q', 'categoryId', 'brandId', 'minPrice', 'maxPrice', 'inStock', 'featured', 'sort', 'page'] as const;

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export const WatchBrowser = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map(key => [key, searchParams.get(key) ?? '']));

  const setFilters = (changes: Record<string, string>) => {
    const next = { ...filters, page: '', ...changes };
    router.replace(withQuery(pathname, next), { scroll: false });
  };

  const [search, setSearch] = useState(filters.q ?? '');
  const debouncedSearch = useDebounced(search);
  useEffect(() => {
    if (debouncedSearch !== filters.q) setFilters({ q: debouncedSearch });
  }, [debouncedSearch]);

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') });
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api.get<Brand[]>('/brands') });
  const watches = useQuery({
    queryKey: ['watches', filters],
    queryFn: () => api.page<Watch>(withQuery('/watches', { ...filters, inStock: filters.inStock === 'true' ? 'true' : '', pageSize: PAGE_SIZE })),
    placeholderData: previous => previous,
  });

  return (
    <>
      <PageHeading eyebrow="The collection" title="All watches" />
      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Filters">
          <Field label="Search">
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, brand or keyword" />
          </Field>
          <Field label="Category">
            <Select value={filters.categoryId} onChange={event => setFilters({ categoryId: event.target.value })}>
              <option value="">All categories</option>
              {categories.data?.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand">
            <Select value={filters.brandId} onChange={event => setFilters({ brandId: event.target.value })}>
              <option value="">All brands</option>
              {brands.data?.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min price">
              <Input type="number" min={0} value={filters.minPrice} onChange={event => setFilters({ minPrice: event.target.value })} placeholder="$0" />
            </Field>
            <Field label="Max price">
              <Input type="number" min={0} value={filters.maxPrice} onChange={event => setFilters({ maxPrice: event.target.value })} placeholder="Any" />
            </Field>
          </div>
          <Field label="Sort by">
            <Select value={filters.sort || 'newest'} onChange={event => setFilters({ sort: event.target.value })}>
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={filters.inStock === 'true'} onChange={event => setFilters({ inStock: event.target.checked ? 'true' : '' })} className="h-4 w-4 accent-navy" />
            In stock only
          </label>
        </aside>

        <section>
          {watches.isPending ? (
            <Spinner />
          ) : watches.isError ? (
            <ErrorState message={watches.error.message} />
          ) : watches.data.items.length === 0 ? (
            <EmptyState title="No watches match your filters" description="Try removing a filter or searching for something else." />
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">{watches.data.meta.total} watches</p>
              <WatchGrid watches={watches.data.items} />
              <Pagination meta={watches.data.meta} onChange={page => setFilters({ page: String(page) })} />
            </>
          )}
        </section>
      </div>
    </>
  );
};
