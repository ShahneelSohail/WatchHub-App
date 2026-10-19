'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { TicketThread } from '@/components/TicketThread';
import { useToast } from '@/components/Providers';
import { Card, EmptyState, Field, PageHeading, Select, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { titleCase } from '@/lib/format';
import type { Ticket, TicketPriority, TicketStatus } from '@/lib/types';

const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function AdminTicketPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const key = ['admin', 'ticket', id];
  const ticket = useQuery({ queryKey: key, queryFn: () => api.get<Ticket>(`/admin/tickets/${id}`) });
  const store = (updated: Ticket) => {
    queryClient.setQueryData(key, updated);
    queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
  };
  const patch = useMutation({
    mutationFn: (body: object) => api.patch<Ticket>(`/admin/tickets/${id}`, body),
    onSuccess: updated => {
      store(updated);
      toast('success', 'Ticket updated.');
    },
    onError: (error: Error) => toast('error', error.message),
  });

  if (ticket.isPending) return <Spinner />;
  if (ticket.isError) return <EmptyState title="Ticket not found" />;
  const data = ticket.data;

  return (
    <>
      <PageHeading eyebrow={`Ticket #${data.id} from ${data.user?.name} (${data.user?.email})`} title={data.subject} />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <TicketThread ticket={data} replyLabel="Reply to customer" onReply={async message => store(await api.post<Ticket>(`/admin/tickets/${id}/messages`, { message }))} />
        <Card className="space-y-4 self-start">
          <Field label="Status">
            <Select value={data.status} onChange={event => patch.mutate({ status: event.target.value })}>
              {STATUSES.map(status => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={data.priority} onChange={event => patch.mutate({ priority: event.target.value })}>
              {PRIORITIES.map(priority => (
                <option key={priority} value={priority}>
                  {titleCase(priority)}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      </div>
    </>
  );
}
