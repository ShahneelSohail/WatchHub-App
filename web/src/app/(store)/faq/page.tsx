'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Eyebrow, LinkButton, Spinner, cx } from '@/components/ui';
import { api } from '@/lib/api';
import type { Faq } from '@/lib/types';

const FaqItem = ({ faq, expanded, onToggle }: { faq: Faq; expanded: boolean; onToggle: () => void }) => (
  <div className="border-b border-line last:border-b-0">
    <button onClick={onToggle} aria-expanded={expanded} className={cx('flex min-h-[58px] w-full items-center justify-between gap-4 px-[18px] py-3.5 text-left text-base font-medium', expanded ? 'text-primary' : 'text-ink')}>
      <span>{faq.question}</span>
      <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors', expanded ? 'bg-primary text-on-primary' : 'bg-page text-ink')}>
        <Icon name="chevronDown" size={14} strokeWidth={2} className={cx('transition-transform duration-300', expanded && 'rotate-180')} />
      </span>
    </button>
    {expanded && <p className="max-w-[680px] px-[18px] pb-[18px] text-[15px] leading-[1.65] text-ink-secondary animate-rise">{faq.answer}</p>}
  </div>
);

export default function FaqPage() {
  const faqs = useQuery({ queryKey: ['faqs'], queryFn: () => api.get<Faq[]>('/faqs') });
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const needle = query.trim().toLowerCase();
  const matching = (faqs.data ?? []).filter(faq => !needle || `${faq.question} ${faq.answer}`.toLowerCase().includes(needle));
  const groups = Object.entries(matching.reduce<Record<string, Faq[]>>((byCategory, faq) => ({ ...byCategory, [faq.category]: [...(byCategory[faq.category] ?? []), faq] }), {}));

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-6">
      <div className="flex flex-col items-start gap-2.5">
        <Eyebrow>Help centre</Eyebrow>
        <h1 className="font-display text-[30px] leading-[1.05] font-medium md:text-4xl lg:text-[40px]">Frequently asked questions</h1>
      </div>
      <label className="flex h-[52px] items-center gap-2.5 rounded-card border border-line bg-surface px-3.5 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-tint">
        <Icon name="search" size={18} className="text-ink-secondary" />
        <input value={query} onChange={event => setQuery(event.target.value)} aria-label="Search questions" placeholder="Search questions, e.g. returns" className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-muted" />
      </label>
      {faqs.isPending ? (
        <Spinner />
      ) : (
        <>
          {groups.map(([category, items]) => (
            <section key={category} className="flex flex-col gap-2">
              <h2 className="text-[13px] font-semibold tracking-[0.12em] text-ink-secondary uppercase">{category}</h2>
              <div className="rounded-card border border-line bg-surface">
                {items.map(faq => (
                  <FaqItem key={faq.id} faq={faq} expanded={Boolean(needle) || openId === faq.id} onToggle={() => setOpenId(openId === faq.id ? null : faq.id)} />
                ))}
              </div>
            </section>
          ))}
          {groups.length === 0 && <p className="rounded-card border border-dashed border-line bg-surface px-5 py-8 text-center text-[15px] text-ink-secondary">No questions match “{query}”.</p>}
        </>
      )}
      <div className="flex flex-wrap items-center gap-4 rounded-card bg-primary-tint p-[22px]">
        <span className="flex min-w-[240px] flex-1 flex-col gap-1">
          <span className="font-display text-[22px] text-primary">Still need help?</span>
          <span className="text-sm text-primary">Open a ticket and we’ll reply within 4 working hours.</span>
        </span>
        <LinkButton href="/support/new" size="lg" className="h-[46px]">
          Contact support
        </LinkButton>
      </div>
    </div>
  );
}
