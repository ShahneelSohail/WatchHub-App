'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { AddressBlock, OrderItems, OrderTimeline, OrderTotals } from '@/components/OrderParts';
import { useToast } from '@/components/Providers';
import { RequireAuth } from '@/components/RequireAuth';
import { Badge, Button, Card, EmptyState, ErrorState, LinkButton, PageHeading, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, titleCase } from '@/lib/format';
import type { Order } from '@/lib/types';

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const key = ['order', id];

  const order = useQuery({ queryKey: key, queryFn: () => api.get<Order>(`/orders/${id}`) });
  const update = (updated: Order) => queryClient.setQueryData(key, updated);
  const onError = (error: Error) => toast('error', error.message);

  const confirm = useMutation({ mutationFn: () => api.post<Order>(`/orders/${id}/confirm-payment`), onSuccess: update, onError });
  const cancel = useMutation({
    mutationFn: () => api.post<Order>(`/orders/${id}/cancel`),
    onSuccess: updated => {
      update(updated);
      toast('success', 'Your order was cancelled.');
    },
    onError,
  });
  const pay = useMutation({ mutationFn: () => api.post<{ checkoutUrl: string }>(`/orders/${id}/pay`), onSuccess: ({ checkoutUrl }) => window.location.assign(checkoutUrl), onError });

  const returnedFromStripe = searchParams.get('paid') === '1';
  useEffect(() => {
    if (returnedFromStripe) confirm.mutate();
  }, [returnedFromStripe]);

  if (order.isPending) return <Spinner />;
  if (order.isError) return <EmptyState title="Order not found" description={order.error.message} action={<LinkButton href="/orders">Back to my orders</LinkButton>} />;

  const data = order.data;
  const canCancel = data.status === 'PENDING_PAYMENT' || (['PENDING', 'CONFIRMED'].includes(data.status) && data.paymentStatus === 'UNPAID');
  return (
    <>
      <PageHeading
        eyebrow={`Placed ${formatDate(data.createdAt)}`}
        title={`Order #${data.id}`}
        action={
          <div className="flex items-center gap-2">
            <Badge value={data.status} />
            <Badge value={data.paymentStatus} />
            <span className="text-sm text-muted">{titleCase(data.paymentMethod === 'COD' ? 'cash on delivery' : 'card')}</span>
          </div>
        }
      />
      {searchParams.get('placed') === '1' && <p className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Thank you! Your order has been placed.</p>}
      {returnedFromStripe && data.paymentStatus === 'PAID' && <p className="mb-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Payment received. Your order is confirmed.</p>}
      {data.status === 'PENDING_PAYMENT' && <div className="mb-6"><ErrorState message="This order is waiting for payment. Complete it to reserve your watch." /></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <OrderItems order={data} />
          <AddressBlock order={data} />
        </div>
        <div className="space-y-6">
          <Card>
            <OrderTotals order={data} />
            {data.status === 'PENDING_PAYMENT' && (
              <Button className="mt-5 w-full" onClick={() => pay.mutate()} disabled={pay.isPending}>
                Pay now
              </Button>
            )}
            {canCancel && (
              <Button variant="secondary" className="mt-3 w-full" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                Cancel order
              </Button>
            )}
          </Card>
          <OrderTimeline order={data} />
        </div>
      </div>
    </>
  );
};

export default function OrderPage() {
  return (
    <RequireAuth>
      <OrderDetail />
    </RequireAuth>
  );
}
