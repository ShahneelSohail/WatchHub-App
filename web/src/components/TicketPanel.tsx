'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Ticket } from '@/lib/types';
import { TicketThread } from './TicketThread';
import Link from 'next/link';
import { Badge, Spinner } from './ui';

export const TicketBadge = ({ status, className }: { status: Ticket['status']; className?: string }) => <Badge value={status} label={status === 'PENDING' ? 'Awaiting you' : undefined} tone={status === 'PENDING' ? 'tint' : undefined} className={className} />;

export const TicketPanel = ({ id }: { id: string }) => {
  const queryClient = useQueryClient();
  const key = ['ticket', id];
  const ticket = useQuery({ queryKey: key, queryFn: () => api.get<Ticket>(`/support/tickets/${id}`) });

  if (ticket.isPending) return <Spinner />;
  if (ticket.isError) return <p className="rounded-card border border-line bg-surface p-6 text-sm text-ink-secondary">Ticket not found.</p>;

  return (
    <section className="flex min-w-0 flex-col rounded-card border border-line bg-surface">
      <div className="flex flex-col gap-1.5 border-b border-line px-5 py-4">
        <h2 className="font-display text-[22px] leading-tight">{ticket.data.subject}</h2>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-secondary">
          <span>Ticket #{ticket.data.id}</span>
          <span>·</span>
          <span>Opened {formatDate(ticket.data.createdAt)}</span>
          {ticket.data.order && (
            <Link href={`/orders/${ticket.data.order.id}`} className="font-semibold text-primary">
              Order #{ticket.data.order.id}
            </Link>
          )}
          <TicketBadge status={ticket.data.status} />
        </div>
      </div>
      <TicketThread
        asCustomer
        ticket={ticket.data}
        onReply={async message => {
          queryClient.setQueryData(key, await api.post<Ticket>(`/support/tickets/${id}/messages`, { message }));
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }}
      />
    </section>
  );
};
