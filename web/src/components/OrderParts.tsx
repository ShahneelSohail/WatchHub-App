import { formatDateTime, formatMoney, titleCase } from '@/lib/format';
import { optionSummary } from '@/lib/watch';
import type { Order, OrderStatus } from '@/lib/types';
import { Icon } from './Icon';
import { cx } from './ui';

const STEPS: { label: string; status: OrderStatus }[] = [
  { label: 'Placed', status: 'PENDING' },
  { label: 'Confirmed', status: 'CONFIRMED' },
  { label: 'Shipped', status: 'SHIPPED' },
  { label: 'Delivered', status: 'DELIVERED' },
];

const STEP_INDEX: Record<OrderStatus, number> = { PENDING_PAYMENT: 0, PENDING: 0, CONFIRMED: 1, SHIPPED: 2, DELIVERED: 3, CANCELLED: 0 };

const panel = 'rounded-card border border-line bg-surface';
const panelTitle = 'text-[12px] font-semibold tracking-[0.1em] text-ink-secondary uppercase';

export const OrderItems = ({ order }: { order: Order }) => (
  <section className={panel}>
    <h2 className="border-b border-line px-[18px] py-4 text-base font-semibold">Items</h2>
    <ul className="divide-y divide-line">
      {order.items.map(item => (
        <li key={item.id} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3.5 px-[18px] py-3.5">
          {item.image ? <img src={item.image} alt={item.name} className="h-[72px] w-[72px] rounded-card bg-line object-cover" /> : <span className="h-[72px] w-[72px] rounded-card bg-line" />}
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-display text-lg leading-[1.15]">{item.name}</p>
            <p className="text-[13px] text-ink-secondary">{[optionSummary(item), `Qty ${item.quantity}`].filter(Boolean).join(' · ')}</p>
          </div>
          <p className="text-[15px] font-medium tabular-nums">{formatMoney(item.quantity * item.unitPrice)}</p>
        </li>
      ))}
    </ul>
  </section>
);

export const OrderTotals = ({ order }: { order: Order }) => {
  const rows = [
    { label: 'Subtotal', value: formatMoney(order.subtotal) },
    { label: `${titleCase(order.shippingMethod)} shipping`, value: order.shippingCost ? formatMoney(order.shippingCost) : 'Free' },
    ...(order.discount > 0 ? [{ label: `Discount${order.couponCode ? ` · ${order.couponCode}` : ''}`, value: `−${formatMoney(order.discount)}`, tone: 'text-success-ink' }] : []),
  ];
  return (
    <dl className="flex flex-col gap-2 text-sm">
      {rows.map(row => (
        <div key={row.label} className={cx('flex justify-between gap-3', 'tone' in row && row.tone)}>
          <dt className={'tone' in row ? '' : 'text-ink-secondary'}>{row.label}</dt>
          <dd className="tabular-nums">{row.value}</dd>
        </div>
      ))}
      <div className="flex justify-between border-t border-line pt-2.5 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatMoney(order.total)}</dd>
      </div>
    </dl>
  );
};

export const OrderTimeline = ({ order }: { order: Order }) => (
  <section className={cx(panel, 'p-[18px]')}>
    <h2 className="mb-4 text-base font-semibold">Progress</h2>
    <ol className="flex flex-col gap-4 border-l border-line pl-5">
      {order.events.map((event, index) => (
        <li key={event.id} className="relative text-sm">
          <span className={cx('absolute top-1 -left-[25px] h-2.5 w-2.5 rounded-full', index === order.events.length - 1 ? 'bg-primary' : 'bg-ink-muted')} />
          <p className="font-medium">{titleCase(event.status)}</p>
          {event.note && <p className="text-ink-secondary">{event.note}</p>}
          <p className="text-xs text-ink-muted">{formatDateTime(event.createdAt)}</p>
        </li>
      ))}
    </ol>
    {order.trackingNumber && (
      <p className="mt-5 rounded-card bg-page px-4 py-3 text-sm">
        <span className="text-ink-secondary">{order.courierName ?? 'Courier'} tracking:</span> <span className="font-medium">{order.trackingNumber}</span>
      </p>
    )}
  </section>
);

export const OrderSteps = ({ order }: { order: Order }) => {
  const current = STEP_INDEX[order.status];
  const delivered = order.status === 'DELIVERED';
  const stepTime = (index: number) => {
    const event = index === 0 ? order.events[0] : order.events.find(entry => entry.status === STEPS[index]!.status);
    return event ? formatDateTime(event.createdAt) : index === 1 && order.status === 'PENDING_PAYMENT' ? 'After payment' : '';
  };
  return (
    <section className={cx(panel, 'flex flex-col gap-4.5 p-5 md:p-[22px]')}>
      <ol className="grid grid-cols-4">
        {STEPS.map((step, index) => {
          const done = index < current || (index === current && (index === 0 || delivered));
          const active = !done && index === current;
          return (
            <li key={step.label} className="flex flex-col gap-2.5 animate-rise" style={{ animationDelay: `${index * 80}ms` }}>
              <div className="flex items-center">
                <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full border-[1.5px] text-xs font-bold', done ? 'border-primary bg-primary text-on-primary' : active ? 'border-primary bg-surface text-primary' : 'border-line bg-surface text-ink-muted')}>
                  {done ? <Icon name="check" size={13} strokeWidth={3} /> : index + 1}
                </span>
                {index < STEPS.length - 1 && <span className={cx('mx-1.5 h-0.5 flex-1', index < current ? 'bg-primary' : 'bg-line')} />}
              </div>
              <div className="flex flex-col gap-0.5 pr-1.5">
                <span className={cx('text-[13px]', done || active ? 'text-ink' : 'text-ink-secondary', active && 'font-semibold')}>{step.label}</span>
                <span className="text-xs text-ink-secondary">{stepTime(index)}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {order.trackingNumber && (
        <div className="flex items-center gap-3.5 rounded-card bg-primary-tint px-4 py-3.5 text-primary">
          <Icon name="truck" size={20} strokeWidth={1.6} />
          <p className="text-sm font-semibold">
            {order.courierName ?? 'Courier'} · {order.trackingNumber}
          </p>
        </div>
      )}
    </section>
  );
};

export const AddressBlock = ({ order }: { order: Order }) => {
  const { recipient, addressLine, city, state, zip, country, phone } = order.shippingAddress;
  return (
    <section className={cx(panel, 'flex flex-col gap-1.5 p-[18px]')}>
      <h2 className={panelTitle}>Delivering to</h2>
      <address className="text-sm leading-[1.55] not-italic">
        <span className="font-medium">{recipient}</span>
        <br />
        {addressLine}
        <br />
        {city}, {state} {zip}
        <br />
        {country}
        {phone && (
          <>
            <br />
            <span className="text-ink-secondary">{phone}</span>
          </>
        )}
      </address>
    </section>
  );
};

export const orderSummaryLine = (order: Order): string => {
  const [first, ...rest] = order.items;
  return first ? (rest.length ? `${first.name} and ${rest.length} more` : first.name) : '';
};
