'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddressBlock, OrderItems, OrderSteps, OrderTotals } from '@/components/OrderParts';
import { useToast } from '@/components/Providers';
import { RequireAuth } from '@/components/RequireAuth';
import { useStoreUi } from '@/components/StoreUi';
import { Alert, Badge, Button, EmptyState, LinkButton, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { awaitingPayment, canCancelOrder, usePayOrder } from '@/lib/orders';
import { useCartActions } from '@/lib/shop';
import type { Order } from '@/lib/types';

const panel = 'flex flex-col gap-2.5 rounded-card border border-line bg-surface p-[18px]';

const CancelPanel = ({ order, onCancelled }: { order: Order; onCancelled: (order: Order) => void }) => {
  const [asking, setAsking] = useState(false);
  const toast = useToast();
  const cancel = useMutation({
    mutationFn: () => api.post<Order>(`/orders/${order.id}/cancel`),
    onSuccess: updated => {
      onCancelled(updated);
      toast('success', 'Your order was cancelled.');
    },
    onError: (error: Error) => toast('error', error.message),
  });
  const note = order.paymentStatus === 'PAID' ? 'You’ll be refunded in 5 to 10 days.' : order.status === 'PENDING_PAYMENT' ? 'Nothing has been charged.' : 'Nothing is due.';

  return asking ? (
    <div className="flex flex-col gap-2.5 rounded-card border border-danger-border bg-danger-surface p-3.5 animate-rise">
      <p className="text-sm leading-normal text-danger-ink">
        Cancel #{order.id}? {note}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="h-10 flex-1" onClick={() => setAsking(false)}>
          Keep order
        </Button>
        <Button variant="dangerSolid" size="sm" className="h-10 flex-1" loading={cancel.isPending} onClick={() => cancel.mutate()}>
          Yes, cancel
        </Button>
      </div>
    </div>
  ) : (
    <Button variant="danger" onClick={() => setAsking(true)}>
      Cancel order
    </Button>
  );
};

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { openBag } = useStoreUi();
  const { add } = useCartActions();
  const pay = usePayOrder();
  const key = ['order', id];

  const order = useQuery({ queryKey: key, queryFn: () => api.get<Order>(`/orders/${id}`) });
  const update = (updated: Order) => queryClient.setQueryData(key, updated);
  const confirm = useMutation({
    mutationFn: () => api.post<Order>(`/orders/${id}/confirm-payment`),
    onSuccess: () => router.replace(`/checkout/result?order=${id}&status=paid`),
    onError: (error: Error) => toast('error', error.message),
  });

  const returnedFromStripe = searchParams.get('paid') === '1';
  useEffect(() => {
    if (returnedFromStripe) confirm.mutate();
  }, [returnedFromStripe]);

  const buyAgain = useMutation({
    mutationFn: async (data: Order) => {
      for (const item of data.items) {
        if (item.watchId) await add.mutateAsync({ watchId: item.watchId, quantity: item.quantity, productColor: item.productColor, strapType: item.strapType, strapColor: item.strapColor });
      }
    },
    onSuccess: openBag,
  });

  if (order.isPending || returnedFromStripe) return <Spinner />;
  if (order.isError) return <EmptyState icon="receipt" title="Order not found" description={order.error.message} action={<LinkButton href="/orders">Back to my orders</LinkButton>} />;

  const data = order.data;
  const cancelled = data.status === 'CANCELLED';
  const cancelEvent = data.events.find(event => event.status === 'CANCELLED');
  return (
    <div className="flex flex-col gap-5">
      <Link href="/orders" className="self-start text-sm font-medium text-primary">
        ← My orders
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[30px] leading-[1.05] font-medium md:text-4xl lg:text-[40px]">Order #{data.id}</h1>
          <span className="text-sm text-ink-secondary">
            Placed {formatDate(data.createdAt)} · {data.paymentMethod === 'COD' ? 'Cash on delivery' : 'Card'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['PARTLY_REFUNDED', 'REFUNDED'].includes(data.paymentStatus) && <Badge value={data.paymentStatus} tone="blue" label={data.paymentStatus === 'REFUNDED' ? 'Refunded' : 'Partly refunded'} className="h-7 px-3 text-[13px]" />}
          <Badge value={data.status} className="h-7 px-3 text-[13px]" />
        </div>
      </div>

      {awaitingPayment(data) && (
        <Alert
          tone="warning"
          action={
            <Button loading={pay.isPending} onClick={() => pay.mutate(data.id)}>
              Pay now · {formatMoney(data.total)}
            </Button>
          }
        >
          We’re holding this order for 24 hours. Your card hasn’t been charged.
        </Alert>
      )}
      {cancelled ? (
        <p className="rounded-card border border-dashed border-ink-muted bg-surface px-4 py-3.5 text-sm leading-normal text-ink-secondary">
          {cancelEvent?.note ?? 'Cancelled'} on {formatDate(cancelEvent?.createdAt ?? data.createdAt)}.{data.paymentStatus === 'PAID' ? ' Your payment will be refunded.' : ' You weren’t charged.'}
        </p>
      ) : (
        <OrderSteps order={data} />
      )}

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-0 rounded-card border border-line bg-surface [&>section]:border-0">
          <OrderItems order={data} />
          <div className="px-[18px] py-4">
            <OrderTotals order={data} />
            {data.refundedAmount ? <p className="mt-2 flex justify-between text-sm text-info-ink"><span>Refunded</span><span className="tabular-nums">−{formatMoney(data.refundedAmount)}</span></p> : null}
          </div>
        </div>
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <AddressBlock order={data} />
          <section className={panel}>
            <h2 className="text-[12px] font-semibold tracking-[0.1em] text-ink-secondary uppercase">Need something?</h2>
            <LinkButton href={`/support/new?order=${data.id}`} variant="secondary">
              Get help with this order
            </LinkButton>
            <Button variant="outline" loading={buyAgain.isPending} onClick={() => buyAgain.mutate(data)}>
              Buy again
            </Button>
            {canCancelOrder(data) && <CancelPanel order={data} onCancelled={update} />}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default function OrderPage() {
  return (
    <RequireAuth>
      <OrderDetail />
    </RequireAuth>
  );
}
