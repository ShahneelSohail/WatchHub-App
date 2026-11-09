'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { orderSummaryLine } from '@/components/OrderParts';
import { RequireAuth } from '@/components/RequireAuth';
import { Button, ErrorState, Field, Input, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import type { Order, Ticket } from '@/lib/types';

const NewTicketForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState(useSearchParams().get('order') ?? '');
  const orders = useQuery({ queryKey: ['orders', 'options'], queryFn: () => api.page<Order>('/orders?pageSize=50') });
  const create = useMutation({
    mutationFn: (body: { subject: string; message: string; orderId?: number }) => api.post<Ticket>('/support/tickets', body),
    onSuccess: ticket => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      router.push(`/support?t=${ticket.id}`);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as { subject: string; message: string };
    create.mutate({ subject: values.subject, message: values.message, orderId: orderId ? Number(orderId) : undefined });
  };

  return (
    <form onSubmit={submit} className="flex max-w-[640px] flex-col gap-3.5 rounded-card border-[1.5px] border-primary bg-surface p-[22px] animate-rise">
      <h1 className="font-display text-[22px]">New ticket</h1>
      <Field label="Subject">
        <Input name="subject" required minLength={3} maxLength={150} placeholder="e.g. Strap doesn’t fit" />
      </Field>
      <Field label="Related order">
        <Select value={orderId} onChange={event => setOrderId(event.target.value)}>
          <option value="">Not about an order</option>
          {orders.data?.items.map(order => (
            <option key={order.id} value={order.id}>
              #{order.id} · {orderSummaryLine(order)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Message">
        <Textarea name="message" required minLength={10} rows={5} placeholder="Tell us what happened. Photos help with damage claims." />
      </Field>
      {create.isError && <ErrorState message={create.error.message} />}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.push('/support')}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending}>
          Send to support
        </Button>
      </div>
    </form>
  );
};

export default function NewTicketPage() {
  return (
    <RequireAuth>
      <Suspense>
        <NewTicketForm />
      </Suspense>
    </RequireAuth>
  );
}
