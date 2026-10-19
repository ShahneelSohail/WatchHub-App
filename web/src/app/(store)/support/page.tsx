'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeading, Spinner, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Ticket } from '@/lib/types';

const NewTicket = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (body: { subject: string; message: string }) => api.post<Ticket>('/support/tickets', body),
    onSuccess: ticket => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      router.push(`/support/${ticket.id}`);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as { subject: string; message: string };
    create.mutate(values);
  };

  return (
    <Card>
      <h2 className="mb-4 font-serif text-xl">Open a new ticket</h2>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Subject">
          <Input name="subject" required minLength={3} maxLength={150} placeholder="How can we help?" />
        </Field>
        <Field label="Message">
          <Textarea name="message" required minLength={2} placeholder="Tell us what happened. Include your order number if you have one." />
        </Field>
        {create.isError && <ErrorState message={create.error.message} />}
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Sending…' : 'Send to support'}
        </Button>
      </form>
    </Card>
  );
};

const TicketList = () => {
  const tickets = useQuery({ queryKey: ['tickets'], queryFn: () => api.get<Ticket[]>('/support/tickets') });
  if (tickets.isPending) return <Spinner />;
  if (!tickets.data?.length) return <EmptyState title="No tickets yet" description="Your conversations with our team will show up here." />;
  return (
    <ul className="space-y-3">
      {tickets.data.map(ticket => (
        <li key={ticket.id}>
          <Link href={`/support/${ticket.id}`}>
            <Card className="flex items-center justify-between gap-4 transition hover:border-navy">
              <div>
                <p className="font-medium">{ticket.subject}</p>
                <p className="text-xs text-faint">Updated {formatDate(ticket.updatedAt)}</p>
              </div>
              <Badge value={ticket.status} />
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default function SupportPage() {
  return (
    <RequireAuth>
      <PageHeading eyebrow="We're here to help" title="Support" />
      <div className="grid gap-8 lg:grid-cols-2">
        <NewTicket />
        <div>
          <h2 className="mb-4 font-serif text-xl">Your tickets</h2>
          <TicketList />
        </div>
      </div>
    </RequireAuth>
  );
}
