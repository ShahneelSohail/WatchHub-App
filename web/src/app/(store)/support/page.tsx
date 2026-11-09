'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { TicketBadge, TicketPanel } from '@/components/TicketPanel';
import { EmptyState, LinkButton, Spinner, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Ticket } from '@/lib/types';

const NewTicketButton = () => <LinkButton href="/support/new">+ New ticket</LinkButton>;

const SupportContent = () => {
  const router = useRouter();
  const selected = useSearchParams().get('t');
  const tickets = useQuery({ queryKey: ['tickets'], queryFn: () => api.get<Ticket[]>('/support/tickets') });

  if (tickets.isPending) return <Spinner />;
  if (!tickets.data?.length) return <EmptyState icon="message" title="No tickets yet" description="Your conversations with our team will show up here." action={<NewTicketButton />} />;

  const activeId = String(tickets.data.find(ticket => String(ticket.id) === selected)?.id ?? tickets.data[0]!.id);
  return (
    <div className="flex flex-wrap items-start gap-4">
      <ul className="w-full overflow-hidden rounded-card border border-line bg-surface lg:w-[380px] lg:shrink-0">
        {tickets.data.map(ticket => {
          const active = String(ticket.id) === activeId;
          return (
            <li key={ticket.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/support?t=${ticket.id}`}
                onClick={event => {
                  if (!window.matchMedia('(min-width: 1024px)').matches) {
                    event.preventDefault();
                    router.push(`/support/${ticket.id}`);
                  }
                }}
                className={cx('flex flex-col gap-1.5 border-l-[3px] px-4 py-3.5 transition-colors hover:bg-page', active ? 'border-primary lg:bg-primary-tint/40' : 'border-transparent')}
              >
                <span className="flex justify-between gap-2">
                  <span className="text-[15px] font-semibold">{ticket.subject}</span>
                  <span className="shrink-0 text-xs text-ink-secondary">{formatDate(ticket.updatedAt)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-ink-secondary">Ticket #{ticket.id}</span>
                  <TicketBadge status={ticket.status} className="h-[22px] px-2 text-[11px]" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="hidden min-w-0 flex-1 lg:block">
        <TicketPanel key={activeId} id={activeId} />
      </div>
    </div>
  );
};

export default function SupportPage() {
  return (
    <RequireAuth>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[30px] leading-[1.05] font-medium md:text-4xl lg:text-[40px]">Support</h1>
          <span className="text-sm text-ink-secondary">We reply within 4 working hours, Monday to Saturday.</span>
        </div>
        <NewTicketButton />
      </div>
      <Suspense fallback={<Spinner />}>
        <SupportContent />
      </Suspense>
    </RequireAuth>
  );
}
