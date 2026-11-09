'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Chip, EmptyState, ErrorState, Spinner } from '@/components/ui';
import { WatchGrid } from '@/components/WatchCard';
import { api, withQuery } from '@/lib/api';
import { useDebounced } from '@/lib/hooks';
import type { Category, Watch } from '@/lib/types';

const SUGGESTIONS = ['Diver', 'Chronograph', 'Moonphase', 'Smartwatch', 'Rose gold'];

const SearchResults = () => {
  const router = useRouter();
  const urlQuery = useSearchParams().get('q') ?? '';
  const [input, setInput] = useState(urlQuery);
  const [category, setCategory] = useState('All');
  const term = useDebounced(input.trim(), 300);

  useEffect(() => setInput(urlQuery), [urlQuery]);
  useEffect(() => {
    if (term !== urlQuery.trim()) router.replace(withQuery('/search', { q: term }), { scroll: false });
  }, [term]);

  const results = useQuery({ queryKey: ['search', urlQuery], queryFn: () => api.get<Watch[]>(withQuery('/watches', { q: urlQuery, pageSize: 60 })), placeholderData: previous => previous });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') });

  const all = results.data ?? [];
  const tabs = ['All', ...(categories.data ?? []).map(entry => entry.name)].map(name => ({ name, count: name === 'All' ? all.length : all.filter(watch => watch.category.name === name).length }));
  const shown = all.filter(watch => category === 'All' || watch.category.name === category);

  return (
    <div className="wrap flex flex-col gap-5 py-6 pb-16 md:py-8">
      <label className="flex h-14 items-center gap-3 rounded-card border border-primary bg-surface px-4 ring-[3px] ring-primary-tint">
        <Icon name="search" size={20} strokeWidth={1.8} className="text-primary" />
        <input value={input} onChange={event => setInput(event.target.value)} aria-label="Search watches" placeholder="Search by watch, brand or reference" className="h-[52px] min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink-muted" />
        {input && (
          <button type="button" onClick={() => setInput('')} aria-label="Clear search" className="grid h-9 w-9 place-items-center rounded-full bg-page text-ink-secondary">
            <Icon name="close" size={14} strokeWidth={2} />
          </button>
        )}
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[30px] leading-[1.1] font-medium md:text-4xl lg:text-[40px]">{urlQuery.trim() ? `Results for “${urlQuery.trim()}”` : 'All watches'}</h1>
        <span className="text-sm text-ink-secondary">{shown.length === 1 ? '1 watch' : `${shown.length} watches`}</span>
      </div>
      {all.length > 0 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {tabs.map(tab => (
            <Chip key={tab.name} label={tab.name} count={tab.count} selected={category === tab.name} onClick={() => setCategory(tab.name)} />
          ))}
        </div>
      )}
      {results.isPending ? (
        <Spinner />
      ) : results.isError ? (
        <ErrorState message={results.error.message} />
      ) : shown.length > 0 ? (
        <WatchGrid watches={shown} wide />
      ) : (
        <EmptyState
          dashed
          title={`No watches match “${urlQuery.trim()}”`}
          description="Check the spelling, try a brand name, or search one of these:"
          action={SUGGESTIONS.map(suggestion => (
            <button key={suggestion} onClick={() => { setCategory('All'); setInput(suggestion); }} className="h-[38px] rounded-pill border border-line bg-surface px-3.5 text-sm font-medium text-primary hover:border-primary">
              {suggestion}
            </button>
          ))}
        />
      )}
    </div>
  );
};

export default function SearchPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SearchResults />
    </Suspense>
  );
}
