'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api, withQuery } from '@/lib/api';
import { useDebounced } from '@/lib/hooks';
import { formatMoney } from '@/lib/format';
import type { Category } from '@/lib/types';
import { Icon } from './Icon';
import { useStoreUi } from './StoreUi';
import { cx } from './ui';

const RECENT_KEY = 'watchhub:recent-searches';
const MAX_RECENT = 4;

const readRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};

interface SearchHit {
  id: number;
  slug: string;
  name: string;
  sku: string;
  price: number;
  salePrice: number | null;
  image: string;
  brand: { name: string };
}
interface SearchResponse {
  watches: SearchHit[];
  brands: { id: number; name: string }[];
  categories: { id: number; name: string }[];
}

const GroupLabel = ({ children }: { children: string }) => <p className="p-2 text-[11px] font-semibold tracking-[0.14em] text-ink-secondary uppercase">{children}</p>;

export const CommandPalette = () => {
  const { searchOpen, closeSearch } = useStoreUi();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const term = useDebounced(query.trim(), 200);

  useEffect(() => {
    if (!searchOpen) return;
    setRecent(readRecent());
    setQuery('');
    setActive(0);
    const timer = setTimeout(() => input.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [searchOpen]);

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories'), enabled: searchOpen });
  const results = useQuery({ queryKey: ['palette', term], queryFn: () => api.get<SearchResponse>(withQuery('/search', { q: term, limit: 6 })), enabled: searchOpen && term.length > 0 });
  const hits = results.data?.watches ?? [];
  const related = [...(results.data?.brands ?? []).map(brand => ({ key: `b${brand.id}`, label: brand.name, kind: 'Brand', href: `/watches?brandId=${brand.id}` })), ...(results.data?.categories ?? []).map(category => ({ key: `c${category.id}`, label: category.name, kind: 'Category', href: `/watches?categoryId=${category.id}` }))];

  const showResults = term.length > 0;
  const entries = showResults
    ? [...hits.map(watch => ({ key: `w${watch.id}`, go: () => router.push(`/watches/${watch.slug}`) })), ...related.map(entry => ({ key: entry.key, go: () => router.push(entry.href) }))]
    : (categories.data ?? []).map(category => ({ key: `c${category.id}`, go: () => router.push(`/watches?categoryId=${category.id}`) }));

  const remember = (value: string) => localStorage.setItem(RECENT_KEY, JSON.stringify([value, ...readRecent().filter(entry => entry !== value)].slice(0, MAX_RECENT)));

  const submitSearch = (value: string) => {
    remember(value);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(current => Math.max(0, Math.min(entries.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))));
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (showResults && entries.length && !event.shiftKey) {
        remember(term);
        entries[active]?.go();
      } else if (showResults) submitSearch(term);
      else entries[active]?.go();
    }
  };

  return (
    <>
      <div onClick={closeSearch} className={cx('fixed inset-0 z-[70] bg-primary-dark/45 transition-opacity duration-200', searchOpen ? 'opacity-100' : 'pointer-events-none opacity-0')} />
      <div
        role="dialog"
        aria-label="Search"
        aria-hidden={!searchOpen}
        inert={!searchOpen}
        onKeyDown={onKeyDown}
        className={cx(
          'fixed inset-0 z-[71] flex flex-col overflow-hidden bg-page transition-[opacity,transform] duration-[250ms] md:inset-x-auto md:top-[110px] md:bottom-auto md:left-1/2 md:w-[640px] md:max-w-[calc(100%-40px)] md:-translate-x-1/2 md:rounded-card md:border md:border-line md:bg-surface md:shadow-dialog',
          searchOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2.5 opacity-0'
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-line pr-3 pl-4 md:pr-4 md:pl-5">
          <Icon name="search" size={20} strokeWidth={1.8} className="text-primary" />
          <input ref={input} value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} aria-label="Search watches" placeholder="Search by watch, brand or reference" className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-muted md:text-[17px]" />
          <button onClick={closeSearch} className="hidden h-[26px] rounded-card border border-line bg-page px-2 text-[11px] font-semibold text-ink-secondary md:block">
            ESC
          </button>
          <button onClick={closeSearch} className="h-11 px-2 text-sm text-primary md:hidden">
            Cancel
          </button>
        </div>
        <div className="max-h-full flex-1 overflow-y-auto p-3 md:max-h-[440px] md:flex-none">
          {!showResults && (
            <>
              {recent.length > 0 && (
                <>
                  <GroupLabel>Recent</GroupLabel>
                  <div className="flex flex-wrap gap-2 px-2 pb-3">
                    {recent.map(entry => (
                      <button key={entry} onClick={() => setQuery(entry)} className="h-8 rounded-pill border border-line bg-surface px-3 text-[13px] hover:border-primary">
                        {entry}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <GroupLabel>Jump to</GroupLabel>
              {categories.data?.map((category, index) => (
                <button key={category.id} onClick={entries[index]?.go} onMouseEnter={() => setActive(index)} className={cx('flex h-11 w-full items-center justify-between rounded-card px-2.5 text-left text-[15px]', active === index && 'bg-primary-tint text-primary')}>
                  {category.name}
                  <span className="text-xs whitespace-nowrap text-ink-muted">Category ↵</span>
                </button>
              ))}
            </>
          )}
          {showResults && hits.length > 0 && (
            <>
              <GroupLabel>{hits.length === 1 ? '1 result' : `${hits.length} results`}</GroupLabel>
              {hits.map((watch, index) => (
                <button key={watch.id} onClick={entries[index]?.go} onMouseEnter={() => setActive(index)} className={cx('grid w-full grid-cols-[52px_1fr_auto] items-center gap-3.5 rounded-card px-2.5 py-2 text-left', active === index && 'bg-primary-tint')}>
                  <img src={watch.image} alt="" className="h-[52px] w-[52px] rounded-card bg-line object-cover" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold tracking-[0.12em] text-ink-secondary uppercase">
                      {watch.brand.name} · {watch.sku}
                    </span>
                    <span className="font-display text-lg">{watch.name}</span>
                  </span>
                  <span className={cx('text-sm font-semibold', watch.salePrice !== null && 'text-danger')}>{formatMoney(watch.salePrice ?? watch.price)}</span>
                </button>
              ))}
            </>
          )}
          {showResults && related.length > 0 && (
            <>
              <GroupLabel>Browse</GroupLabel>
              {related.map((entry, offset) => (
                <button key={entry.key} onClick={entries[hits.length + offset]?.go} onMouseEnter={() => setActive(hits.length + offset)} className={cx('flex h-11 w-full items-center justify-between rounded-card px-2.5 text-left text-[15px]', active === hits.length + offset && 'bg-primary-tint text-primary')}>
                  {entry.label}
                  <span className="text-xs whitespace-nowrap text-ink-muted">{entry.kind} ↵</span>
                </button>
              ))}
            </>
          )}
          {showResults && results.data && entries.length === 0 && (
            <div className="flex flex-col gap-1.5 py-10 text-center">
              <span className="font-display text-[22px]">Nothing for “{term}”</span>
              <span className="text-sm text-ink-secondary">Check the spelling or try a brand name.</span>
            </div>
          )}
        </div>
        <div className="hidden gap-4 border-t border-line bg-page px-5 py-2.5 text-xs text-ink-secondary md:flex">
          <span>↑↓ to navigate</span>
          <span>↵ to open</span>
          <span>⇧↵ all results</span>
          <span>ESC to close</span>
        </div>
      </div>
    </>
  );
};
