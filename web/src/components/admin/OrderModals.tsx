'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Alert, Checkbox, MoneyField, SelectField, TextField } from './controls';
import { useAction } from './data';
import { CANCEL_REASONS, COURIERS, REFUND_REASONS } from './OrderBits';
import { FormModal } from './overlays';
import type { AdminOrder } from './types';

const MIN_TRACKING_LENGTH = 6;
const selectOptions = (values: readonly string[]) => values.map(value => ({ value, label: value }));

interface OrderModalProps {
  order: AdminOrder;
  onClose: () => void;
}

export const ShipModal = ({ order, onClose }: OrderModalProps) => {
  const [courier, setCourier] = useState<string>(COURIERS[0]);
  const [tracking, setTracking] = useState('');
  const [error, setError] = useState('');
  const ship = useAction(() => api.patch(`/admin/orders/${order.id}/status`, { status: 'SHIPPED', courierName: courier, trackingNumber: tracking.trim() }), {
    success: `#${order.id} shipped with ${courier}`,
    onSuccess: onClose,
  });

  const submit = () => {
    if (tracking.trim().length < MIN_TRACKING_LENGTH) return setError('Enter the tracking number from the courier label');
    ship.mutate();
  };

  return (
    <FormModal title={`Ship #${order.id}`} sub="The order moves to Shipped and the timeline records the courier and tracking number." cta="Mark as shipped" busy={ship.isPending} onSubmit={submit} onClose={onClose}>
      <SelectField label="Courier" value={courier} onChange={event => setCourier(event.target.value)} options={selectOptions(COURIERS)} />
      <TextField
        label="Tracking number"
        placeholder="e.g. 4829 1034 772"
        value={tracking}
        error={error}
        onChange={event => {
          setTracking(event.target.value);
          setError('');
        }}
      />
      <p className="text-[13px] text-ink-secondary">The customer is notified in the app with the courier and tracking number.</p>
    </FormModal>
  );
};

export const CancelModal = ({ order, onClose }: OrderModalProps) => {
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0]);
  const [restock, setRestock] = useState(true);
  const cancel = useAction(() => api.patch(`/admin/orders/${order.id}/status`, { status: 'CANCELLED', note: reason, restock }), { success: `#${order.id} cancelled`, onSuccess: onClose });

  return (
    <FormModal title={`Cancel #${order.id}?`} sub="The customer is notified that the order was cancelled. This can’t be undone." cta="Cancel order" back="Keep order" tone="danger" busy={cancel.isPending} onSubmit={() => cancel.mutate()} onClose={onClose}>
      <SelectField label="Reason" value={reason} onChange={event => setReason(event.target.value)} options={selectOptions(CANCEL_REASONS)} />
      <Checkbox label="Return items to stock" checked={restock} onChange={setRestock} />
      {(order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTLY_REFUNDED') && <Alert tone="amber">This order is paid. Issue a refund after cancelling.</Alert>}
    </FormModal>
  );
};

export const RefundModal = ({ order, onClose }: OrderModalProps) => {
  const remaining = Math.round((order.total - order.refundedAmount) * 100) / 100;
  const [amount, setAmount] = useState(String(remaining));
  const [reason, setReason] = useState<string>(REFUND_REASONS[0]);
  const [error, setError] = useState('');
  const refund = useAction(() => api.post(`/admin/orders/${order.id}/refunds`, { amount: Number(amount), reason }), { success: `${formatMoney(Number(amount))} refunded on #${order.id}`, onSuccess: onClose });

  const submit = () => {
    const value = Number(amount);
    if (!(value > 0)) return setError('Enter an amount greater than $0');
    if (value > remaining) return setError(`The most you can refund is ${formatMoney(remaining)}`);
    refund.mutate(undefined);
  };

  return (
    <FormModal title={`Refund #${order.id}`} sub="Card refunds go back through Stripe. Cash-on-delivery refunds are paid by bank transfer." cta="Issue refund" busy={refund.isPending} onSubmit={submit} onClose={onClose}>
      <MoneyField
        label="Amount"
        aria-label="Amount"
        suffix={`of ${formatMoney(remaining)}`}
        value={amount}
        error={error}
        onChange={event => {
          setAmount(event.target.value.replace(/[^\d.]/g, ''));
          setError('');
        }}
      />
      <SelectField label="Reason" value={reason} onChange={event => setReason(event.target.value)} options={selectOptions(REFUND_REASONS)} />
      <p className="text-[13px] text-ink-secondary">Refund reaches the customer in 5 to 10 working days.</p>
    </FormModal>
  );
};
