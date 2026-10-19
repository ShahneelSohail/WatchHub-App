'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';
import { TicketThread } from '@/components/TicketThread';
import { Badge, EmptyState, LinkButton, PageHeading, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Ticket } from '@/lib/types';

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const key = ['ticket', id];
  const ticket = useQuery({ queryKey: key, queryFn: () => api.get<Ticket>(`/support/tickets/${id}`) });

  if (ticket.isPending) return <Spinner />;
  if (ticket.isError) return <EmptyState title="Ticket not found" action={<LinkButton href="/support">Back to support</LinkButton>} />;

  return (
    <div className="max-w-3xl">
      <PageHeading eyebrow={`Ticket #${ticket.data.id}`} title={ticket.data.subject} action={<Badge value={ticket.data.status} />} />
      <TicketThread
        ticket={ticket.data}
        onReply={async message => {
          queryClient.setQueryData(key, await api.post<Ticket>(`/support/tickets/${id}/messages`, { message }));
        }}
      />
    </div>
  );
};

export default function TicketPage() {
  return (
    <RequireAuth>
      <TicketDetail />
    </RequireAuth>
  );
}
