'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { useAuth, useToast } from '@/components/Providers';
import { RequireAuth } from '@/components/RequireAuth';
import { Badge, Button, EmptyState, LinkButton, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatMoney, titleCase } from '@/lib/format';
import type { Order } from '@/lib/types';
import { optionSummary } from '@/lib/watch';

type Outcome = 'paid' | 'pending' | 'cancelled' | 'cod';

interface Tone {
  icon: IconName;
  iconBox: string;
  eyebrow: string;
  eyebrowColor: string;
}

const TONES: Record<Outcome, Tone> = {
  paid: { icon: 'check', iconBox: 'bg-success-surface text-success', eyebrow: 'Payment received', eyebrowColor: 'text-success-ink' },
  pending: { icon: 'clock', iconBox: 'bg-warning-surface text-warning', eyebrow: 'Waiting for payment', eyebrowColor: 'text-warning-ink' },
  cancelled: { icon: 'close', iconBox: 'bg-page text-ink-secondary', eyebrow: 'Payment cancelled', eyebrowColor: 'text-ink-secondary' },
  cod: { icon: 'check', iconBox: 'bg-primary-tint text-primary', eyebrow: 'Order placed', eyebrowColor: 'text-primary' },
};

const ESTIMATES = { STANDARD: 'Expected in 4 to 6 working days', EXPRESS: 'Expected in 1 to 2 working days' };

const isOutcome = (value: string | null): value is Outcome => value === 'paid' || value === 'pending' || value === 'cancelled' || value === 'cod';

const ResultContent = () => {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const toast = useToast();
  const orderId = params.get('order');
  const requested = params.get('status');
  const status = isOutcome(requested) ? requested : 'pending';

  const order = useQuery({
    queryKey: ['order', orderId, status === 'paid'],
    queryFn: () => (status === 'paid' ? api.post<Order>(`/orders/${orderId}/confirm-payment`) : api.get<Order>(`/orders/${orderId}`)),
    enabled: Boolean(orderId),
  });
  const pay = useMutation({
    mutationFn: () => api.post<{ checkoutUrl: string }>(`/orders/${orderId}/pay`, { returnUrl: `${window.location.origin}/checkout/result?order={orderId}` }),
    onSuccess: ({ checkoutUrl }) => window.location.assign(checkoutUrl),
    onError: (error: Error) => toast('error', error.message),
  });

  const switchToCod = useMutation({
    mutationFn: () => api.post<Order>(`/orders/${orderId}/switch-to-cod`),
    onSuccess: updated => {
      queryClient.setQueryData(['order', orderId, status === 'paid'], updated);
      router.replace(`/checkout/result?order=${orderId}&status=cod`);
    },
    onError: (error: Error) => toast('error', error.message),
  });

  if (!orderId) return <EmptyState icon="receipt" title="No order to show" action={<LinkButton href="/orders">My orders</LinkButton>} />;
  if (order.isPending) return <Spinner />;
  if (order.isError) return <EmptyState icon="receipt" title="Order not found" description={order.error.message} action={<LinkButton href="/orders">My orders</LinkButton>} />;

  const data = order.data;
  const outcome: Outcome = status === 'paid' && data.paymentStatus !== 'PAID' ? 'pending' : status;
  const tone = TONES[outcome];
  const total = formatMoney(data.total);
  const awaitingPayment = data.status === 'PENDING_PAYMENT';
  const firstName = user?.name.split(' ')[0];

  if (pay.isPending || pay.isSuccess) {
    return (
      <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-3.5 rounded-card border border-line bg-surface px-7 py-14 text-center animate-fade">
        <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary-tint border-t-primary" />
        <h1 className="font-display text-[28px] leading-[1.15]">Taking you to secure payment</h1>
        <p className="max-w-[380px] text-[15px] leading-relaxed text-ink-secondary">Stripe handles your card details. Please don’t close this tab. You’ll come back here once the payment is done.</p>
      </div>
    );
  }

  const copy: Record<Outcome, { title: string; body: string }> = {
    paid: { title: `Thank you, ${firstName}. Your order is confirmed.`, body: 'We’ll let you know when your watch ships.' },
    pending: { title: 'Your order is waiting for payment', body: 'Your card wasn’t charged yet. We’ll hold your watch for 24 hours. Pay now to keep it.' },
    cancelled: { title: 'You haven’t been charged', body: 'The payment was cancelled before it finished. Your bag is saved, so you can try again.' },
    cod: { title: `Pay ${total} when it arrives`, body: 'Your order is placed. Have the exact amount ready for the courier.' },
  };
  const payAction = (label: string) =>
    awaitingPayment && (
      <Button size="lg" onClick={() => pay.mutate()}>
        {label}
      </Button>
    );
  const actions: Record<Outcome, ReactNode> = {
    paid: (
      <>
        <LinkButton href={`/orders/${data.id}`} size="lg">View order</LinkButton>
        <LinkButton href="/watches" variant="outline" size="lg">Continue shopping</LinkButton>
      </>
    ),
    pending: (
      <>
        {payAction(`Pay now · ${total}`)}
        {awaitingPayment && data.paymentMethod === 'STRIPE' && (
          <Button variant="outline" size="lg" loading={switchToCod.isPending} onClick={() => switchToCod.mutate()}>
            Pay on delivery instead
          </Button>
        )}
        <LinkButton href={`/orders/${data.id}`} variant="outline" size="lg">View order</LinkButton>
      </>
    ),
    cancelled: (
      <>
        {payAction('Try again')}
        <LinkButton href="/cart" variant="outline" size="lg">Back to bag</LinkButton>
      </>
    ),
    cod: (
      <>
        <LinkButton href={`/orders/${data.id}`} size="lg">View order</LinkButton>
        <LinkButton href="/watches" variant="outline" size="lg">Continue shopping</LinkButton>
      </>
    ),
  };
  const payLine = data.paymentMethod === 'COD' ? `Cash on delivery · ${total}` : data.paymentStatus === 'PAID' ? 'Paid by card' : 'Card · not charged';
  const summary = [
    { label: 'Total', value: total },
    { label: 'Payment', value: payLine },
    { label: 'Delivery', value: ESTIMATES[data.shippingMethod] },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-7 pt-10 pb-8 text-center">
        <span className={`grid h-[72px] w-[72px] place-items-center rounded-full animate-pop ${tone.iconBox}`}>
          <Icon name={tone.icon} size={34} strokeWidth={2} />
        </span>
        <p className={`text-xs font-semibold tracking-[0.14em] uppercase ${tone.eyebrowColor}`}>{tone.eyebrow}</p>
        <h1 className="font-display text-[30px] leading-[1.1] font-medium text-balance md:text-4xl">{copy[outcome].title}</h1>
        <p className="max-w-[440px] text-[15px] leading-relaxed text-ink-secondary">{copy[outcome].body}</p>
        <div className="mt-2.5 flex flex-wrap justify-center gap-2.5">{actions[outcome]}</div>
      </div>
      <div className="rounded-card border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <span className="text-[15px] font-semibold">Order #{data.id}</span>
          <Badge value={data.status} label={titleCase(data.status)} />
        </div>
        {data.items.map(item => (
          <div key={item.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-5 py-3">
            {item.image ? <img src={item.image} alt="" className="h-14 w-14 rounded-card bg-line object-cover" /> : <span className="h-14 w-14 rounded-card bg-line" />}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-xs text-ink-secondary">{[optionSummary(item), `Qty ${item.quantity}`].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="text-sm tabular-nums">{formatMoney(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
        <dl className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-3">
          {summary.map(row => (
            <div key={row.label} className="flex flex-col gap-1">
              <dt className="text-xs text-ink-secondary">{row.label}</dt>
              <dd className={row.label === 'Total' ? 'font-semibold tabular-nums' : undefined}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default function CheckoutResultPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<Spinner />}>
        <ResultContent />
      </Suspense>
    </RequireAuth>
  );
}
