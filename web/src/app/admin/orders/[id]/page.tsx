'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AddressBlock, OrderItems, OrderTimeline, OrderTotals } from '@/components/OrderParts';
import { useToast } from '@/components/Providers';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeading, Spinner, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, titleCase } from '@/lib/format';
import type { AdminOrder, OrderStatus } from '@/lib/types';

const NEXT_STATUS: Partial<Record<OrderStatus, 'CONFIRMED' | 'SHIPPED' | 'DELIVERED'>> = { PENDING: 'CONFIRMED', CONFIRMED: 'SHIPPED', SHIPPED: 'DELIVERED' };

const FulfilmentCard = ({ order, onChange }: { order: AdminOrder; onChange: (order: AdminOrder) => void }) => {
  const toast = useToast();
  const next = NEXT_STATUS[order.status];
  const update = useMutation({
    mutationFn: (body: object) => api.patch<AdminOrder>(`/admin/orders/${order.id}/status`, body),
    onSuccess: updated => {
      onChange(updated);
      toast('success', `Order is now ${titleCase(updated.status).toLowerCase()}.`);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!next) return;
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    update.mutate({ status: next, ...values });
  };

  return (
    <Card className="space-y-4">
      <h2 className="font-serif text-xl">Fulfilment</h2>
      {order.status === 'PENDING_PAYMENT' && <p className="text-sm text-muted">Waiting for the customer to pay by card. The order moves forward automatically once Stripe confirms the payment.</p>}
      {next && (
        <form onSubmit={submit} className="space-y-3">
          {next === 'SHIPPED' && (
            <>
              <Field label="Courier">
                <Input name="courierName" placeholder="DHL Express" />
              </Field>
              <Field label="Tracking number">
                <Input name="trackingNumber" placeholder="WH-100500" />
              </Field>
            </>
          )}
          <Field label="Note for the customer (optional)">
            <Input name="note" />
          </Field>
          <Button type="submit" disabled={update.isPending} className="w-full">
            Mark as {titleCase(next).toLowerCase()}
          </Button>
        </form>
      )}
      {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
        <Button variant="danger" className="w-full" disabled={update.isPending} onClick={() => window.confirm('Cancel this order and return the stock?') && update.mutate({ status: 'CANCELLED' })}>
          Cancel order
        </Button>
      )}
      {update.isError && <ErrorState message={update.error.message} />}
    </Card>
  );
};

const NoteCard = ({ order, onChange }: { order: AdminOrder; onChange: (order: AdminOrder) => void }) => {
  const toast = useToast();
  const [note, setNote] = useState(order.adminNote ?? '');
  const save = useMutation({
    mutationFn: () => api.patch<AdminOrder>(`/admin/orders/${order.id}/note`, { adminNote: note }),
    onSuccess: updated => {
      onChange(updated);
      toast('success', 'Note saved.');
    },
  });
  return (
    <Card className="space-y-3">
      <h2 className="font-serif text-xl">Internal note</h2>
      <Textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Only visible to admins" aria-label="Internal note" />
      <Button variant="secondary" onClick={() => save.mutate()} disabled={save.isPending}>
        Save note
      </Button>
    </Card>
  );
};

export default function AdminOrderPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const key = ['admin', 'order', id];
  const order = useQuery({ queryKey: key, queryFn: () => api.get<AdminOrder>(`/admin/orders/${id}`) });
  const onChange = (updated: AdminOrder) => {
    queryClient.setQueryData(key, updated);
    queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
  };

  if (order.isPending) return <Spinner />;
  if (order.isError) return <EmptyState title="Order not found" description={order.error.message} />;
  const data = order.data;

  return (
    <>
      <PageHeading
        eyebrow={`Placed ${formatDate(data.createdAt)} by ${data.user.name} (${data.user.email})`}
        title={`Order #${data.id}`}
        action={
          <div className="flex items-center gap-2">
            <Badge value={data.status} />
            <Badge value={data.paymentStatus} />
            <span className="text-sm text-muted">{data.paymentMethod === 'COD' ? 'Cash on delivery' : 'Card'}</span>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <OrderItems order={data} />
          <Card>
            <OrderTotals order={data} />
          </Card>
          <AddressBlock order={data} />
        </div>
        <div className="space-y-6">
          <FulfilmentCard key={data.status} order={data} onChange={onChange} />
          <OrderTimeline order={data} />
          <NoteCard order={data} onChange={onChange} />
        </div>
      </div>
    </>
  );
}
