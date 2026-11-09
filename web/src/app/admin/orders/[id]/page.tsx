'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { usePageMeta } from '@/components/admin/chrome';
import { Alert, Button, Panel, Skeleton, TextArea, type ButtonVariant } from '@/components/admin/controls';
import { useAction } from '@/components/admin/data';
import { Icon } from '@/components/admin/icons';
import { FLOW } from '@/components/admin/OrderBits';
import { CancelModal, RefundModal, ShipModal } from '@/components/admin/OrderModals';
import { ORDER_STATUS_LABELS, OrderStatusPill, PaymentPill, paymentLabel } from '@/components/admin/pills';
import type { AdminOrder } from '@/components/admin/types';
import { initials, shortDate } from '@/components/admin/utils';
import { cx } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';

type ModalKind = 'ship' | 'cancel' | 'refund';

const CANCELLABLE: OrderStatus[] = ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED'];
const SHIPPING_LABELS = { STANDARD: 'Standard shipping', EXPRESS: 'Express shipping' } as const;
const SHIPPING_DURATIONS = { STANDARD: '4 to 6 days', EXPRESS: '1 to 2 days' } as const;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <span className="text-ink-secondary">{label}</span>
    <span>{children}</span>
  </>
);

const Stepper = ({ order }: { order: AdminOrder }) => {
  const steps = order.paymentMethod === 'STRIPE' ? FLOW : FLOW.slice(1);
  const currentIndex = steps.indexOf(order.status);
  return (
    <div className="grid rounded-card border border-line bg-surface px-6 py-5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => {
        const done = index < currentIndex || (index === currentIndex && order.status === 'DELIVERED');
        const current = index === currentIndex && !done;
        return (
          <div key={step} className="flex animate-rise flex-col gap-2.5" style={{ animationDelay: `${index * 80}ms` }}>
            <div className="flex items-center">
              <span className={cx('grid size-[26px] flex-none place-items-center rounded-pill border-[1.5px] text-xs font-bold', done ? 'border-primary bg-primary text-on-primary' : current ? 'border-primary bg-surface text-primary-hover' : 'border-line bg-surface text-ink-muted')}>
                {done ? <Icon name="check" size={13} strokeWidth={3} /> : index + 1}
              </span>
              <span className={cx('mx-2 h-0.5 flex-1', index < currentIndex ? 'bg-primary' : 'bg-line', index === steps.length - 1 && 'opacity-0')} />
            </div>
            <span className={cx('text-[13px]', index <= currentIndex ? 'text-ink' : 'text-ink-secondary', current && 'font-semibold')}>{ORDER_STATUS_LABELS[step]}</span>
          </div>
        );
      })}
    </div>
  );
};

const Timeline = ({ order }: { order: AdminOrder }) => {
  const events = [...order.events].reverse();
  return (
    <Panel title="Timeline">
      {events.map((event, index) => (
        <div key={event.id} className="grid animate-rise grid-cols-[20px_minmax(0,1fr)] gap-3" style={{ animationDelay: `${index * 60}ms` }}>
          <div className="flex flex-col items-center">
            <span className={cx('mt-[5px] size-2.5 flex-none rounded-pill', index === 0 ? 'bg-primary' : 'bg-ink-muted')} />
            <span className={cx('w-px flex-1 bg-line', index === events.length - 1 && 'opacity-0')} />
          </div>
          <div className="flex flex-col gap-0.5 pb-[18px]">
            <span className="text-sm font-medium">{event.note ? `${ORDER_STATUS_LABELS[event.status]} · ${event.note}` : ORDER_STATUS_LABELS[event.status]}</span>
            <span className="text-xs text-ink-secondary">
              {formatDateTime(event.createdAt)} · {event.actor ?? 'System'}
            </span>
          </div>
        </div>
      ))}
    </Panel>
  );
};

const NotesPanel = ({ order }: { order: AdminOrder }) => {
  const [draft, setDraft] = useState('');
  const save = useAction(() => api.post(`/admin/orders/${order.id}/notes`, { body: draft.trim() }), { success: 'Note added', onSuccess: () => setDraft('') });
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">Internal notes</h2>
        <span className="text-xs text-ink-secondary">Not visible to the customer</span>
      </div>
      {order.notes?.map(note => (
        <div key={note.id} className="flex flex-col gap-1 rounded-card border border-dashed border-pill-amber-bd bg-pill-amber-bg px-3 py-2.5">
          <span className="text-sm leading-normal">{note.body}</span>
          <span className="text-xs text-ink-secondary">
            {note.author.name} · {formatDateTime(note.createdAt)}
          </span>
        </div>
      ))}
      <TextArea rows={3} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Add a note for the team" aria-label="Add a note for the team" />
      <Button variant="outline" size="sm" className="h-9 self-end text-[13px]" disabled={!draft.trim() || save.isPending} onClick={() => save.mutate(undefined)}>
        Add note
      </Button>
    </section>
  );
};

export default function AdminOrderDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const [modal, setModal] = useState<ModalKind | null>(null);
  const order = useQuery({ queryKey: ['admin', 'orders', id], queryFn: () => api.get<AdminOrder>(`/admin/orders/${id}`) });
  const advance = useAction((status: 'CONFIRMED' | 'DELIVERED') => api.patch(`/admin/orders/${id}/status`, { status }), {
    success: (_, status) => `#${id} ${status === 'CONFIRMED' ? 'confirmed' : 'marked delivered'}`,
  });
  const remind = useAction(() => api.post(`/admin/orders/${id}/payment-reminder`), { success: order.data ? `Payment reminder sent to ${order.data.user.email}` : 'Payment reminder sent' });
  usePageMeta(order.data && `Order #${order.data.id}`, order.data ? `Orders / #${order.data.id}` : 'Orders');

  if (order.isError) return <Alert tone="red" role="alert">{order.error.message}</Alert>;
  if (!order.data)
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );

  const data = order.data;
  const cancelled = data.status === 'CANCELLED';
  const cancelEvent = [...data.events].reverse().find(event => event.status === 'CANCELLED');
  const address = data.shippingAddress;
  const refundable = (data.paymentStatus === 'PAID' || data.paymentStatus === 'PARTLY_REFUNDED') && data.total - data.refundedAmount > 0;
  const actions: { label: string; variant: ButtonVariant; run: () => void; }[] = [
    ...(refundable ? [{ label: 'Issue refund', variant: 'secondary' as const, run: () => setModal('refund') }] : []),
    ...(CANCELLABLE.includes(data.status) ? [{ label: 'Cancel order', variant: 'danger' as const, run: () => setModal('cancel') }] : []),
    ...(data.status === 'PENDING_PAYMENT' ? [{ label: 'Send payment reminder', variant: 'primary' as const, run: () => remind.mutate(undefined) }] : []),
    ...(data.status === 'PENDING' ? [{ label: 'Confirm order', variant: 'primary' as const, run: () => advance.mutate('CONFIRMED') }] : []),
    ...(data.status === 'CONFIRMED' ? [{ label: 'Ship order', variant: 'primary' as const, run: () => setModal('ship') }] : []),
    ...(data.status === 'SHIPPED' ? [{ label: 'Mark as delivered', variant: 'primary' as const, run: () => advance.mutate('DELIVERED') }] : []),
  ];
  const { label: paymentText } = paymentLabel({ method: data.paymentMethod, status: data.paymentStatus });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <Link href="/admin/orders" className="flex items-center gap-1.5 self-start text-[13px] font-medium text-link hover:underline">
            <Icon name="arrowLeft" size={14} />
            All orders
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-display text-[34px] leading-none">#{data.id}</span>
            <OrderStatusPill status={data.status} size="lg" />
            <PaymentPill method={data.paymentMethod} status={data.paymentStatus} size="lg" />
            <span className="text-[13px] text-ink-secondary">Placed {shortDate(data.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {actions.map(action => (
            <Button key={action.label} size="lg" variant={action.variant} disabled={advance.isPending || remind.isPending} onClick={action.run}>
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {cancelled ? (
        <Alert tone="neutral">This order was cancelled.{cancelEvent?.note ? ` Reason: ${cancelEvent.note}.` : ''}</Alert>
      ) : (
        <Stepper order={data} />
      )}

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-5 max-xl:grid-cols-1">
        <div className="flex flex-col gap-5">
          <Panel title="Items" flush>
            {data.items.map(item => (
              <div key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-line px-5 py-3.5">
                {item.image ? <img src={item.image} alt="" className="size-16 rounded-card bg-line object-cover" /> : <span className="size-16 rounded-card bg-line" />}
                <span className="flex min-w-0 flex-col gap-[3px]">
                  <span className="text-[15px] font-medium">{item.name}</span>
                  <span className="text-[13px] text-ink-secondary">{[item.productColor, item.strapType && `${item.strapType.toLowerCase()} strap`, item.strapColor].filter(Boolean).join(' · ') || 'Standard'}</span>
                </span>
                <span className="text-[13px] whitespace-nowrap text-ink-secondary tabular-nums">
                  {formatMoney(item.unitPrice)} × {item.quantity}
                </span>
                <span className="w-[90px] text-right text-sm font-medium tabular-nums">{formatMoney(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
            <div className="flex flex-col gap-2 p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Subtotal</span>
                <span className="tabular-nums">{formatMoney(data.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">{SHIPPING_LABELS[data.shippingMethod]}</span>
                <span className="tabular-nums">{data.shippingCost ? formatMoney(data.shippingCost) : 'Free'}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-secondary">Discount{data.couponCode ? ` (${data.couponCode})` : ''}</span>
                  <span className="tabular-nums">−{formatMoney(data.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2.5 text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(data.total)}</span>
              </div>
              {data.refundedAmount > 0 && (
                <>
                  <div className="flex justify-between text-pill-blue-fg">
                    <span>Refunded</span>
                    <span className="tabular-nums">−{formatMoney(data.refundedAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Net payment</span>
                    <span className="tabular-nums">{formatMoney(data.total - data.refundedAmount)}</span>
                  </div>
                </>
              )}
            </div>
          </Panel>
          <Timeline order={data} />
        </div>

        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-5">
            <h2 className="text-[15px] font-semibold">Customer</h2>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-pill bg-primary-tint text-sm font-bold text-link">{initials(data.user.name)}</span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">{data.user.name}</span>
                <span className="text-[13px] text-ink-secondary">{data.user.email}</span>
              </span>
            </div>
            <div className="flex flex-col gap-1 border-t border-line pt-3">
              <span className="text-xs font-semibold tracking-[0.06em] text-ink-secondary uppercase">Ship to</span>
              <span className="text-sm leading-normal">
                {address.recipient}
                <br />
                {address.addressLine}
                <br />
                {address.city}, {address.state} {address.zip}
                <br />
                {address.country}
                {address.phone && (
                  <>
                    <br />
                    {address.phone}
                  </>
                )}
              </span>
            </div>
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
            <h2 className="text-[15px] font-semibold">Shipping and payment</h2>
            <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <Row label="Method">
                {SHIPPING_LABELS[data.shippingMethod].replace(' shipping', '')}, {SHIPPING_DURATIONS[data.shippingMethod]}
              </Row>
              <Row label="Courier">{data.courierName ?? 'Not shipped yet'}</Row>
              <Row label="Tracking">{data.trackingNumber ? <span className="font-semibold text-link">{data.trackingNumber}</span> : <span className="text-ink-muted">Added when shipped</span>}</Row>
              <Row label="Payment">{data.paymentMethod === 'STRIPE' ? `Card, ${paymentText.toLowerCase()}` : `Cash on delivery, ${data.paymentStatus === 'PAID' ? 'collected' : 'to collect'}`}</Row>
            </div>
          </section>
          <NotesPanel order={data} />
        </div>
      </div>

      {modal === 'ship' && <ShipModal order={data} onClose={() => setModal(null)} />}
      {modal === 'refund' && <RefundModal order={data} onClose={() => setModal(null)} />}
      {modal === 'cancel' && <CancelModal order={data} onClose={() => setModal(null)} />}
    </div>
  );
}
