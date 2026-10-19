import { formatDateTime, formatMoney, titleCase } from '@/lib/format';
import type { Order } from '@/lib/types';
import { Card } from './ui';

const strapLabel = { BELT: 'Leather belt', CHAIN: 'Metal chain' } as const;

export const OrderItems = ({ order }: { order: Order }) => (
  <Card>
    <h2 className="mb-4 font-serif text-xl">Items</h2>
    <ul className="divide-y divide-line">
      {order.items.map(item => (
        <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          {item.image && (
            <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl bg-sand object-contain p-2" />
          )}
          <div className="flex-1 text-sm">
            <p className="font-serif text-base">{item.name}</p>
            <p className="text-muted">
              {[item.productColor, item.strapType && `${strapLabel[item.strapType]}${item.strapColor ? ` (${item.strapColor})` : ''}`].filter(Boolean).join(' · ')}
            </p>
            <p className="text-muted">
              {item.quantity} × {formatMoney(item.unitPrice)}
            </p>
          </div>
          <p className="text-sm font-semibold">{formatMoney(item.quantity * item.unitPrice)}</p>
        </li>
      ))}
    </ul>
  </Card>
);

export const OrderTotals = ({ order }: { order: Order }) => (
  <dl className="space-y-2 text-sm">
    <div className="flex justify-between">
      <dt className="text-muted">Subtotal</dt>
      <dd>{formatMoney(order.subtotal)}</dd>
    </div>
    <div className="flex justify-between">
      <dt className="text-muted">Shipping ({titleCase(order.shippingMethod)})</dt>
      <dd>{order.shippingCost ? formatMoney(order.shippingCost) : 'Free'}</dd>
    </div>
    {order.discount > 0 && (
      <div className="flex justify-between text-emerald-700">
        <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
        <dd>-{formatMoney(order.discount)}</dd>
      </div>
    )}
    <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
      <dt>Total</dt>
      <dd>{formatMoney(order.total)}</dd>
    </div>
  </dl>
);

export const OrderTimeline = ({ order }: { order: Order }) => (
  <Card>
    <h2 className="mb-4 font-serif text-xl">Progress</h2>
    <ol className="space-y-4 border-l border-line pl-5">
      {order.events.map(event => (
        <li key={event.id} className="relative text-sm">
          <span className="absolute -left-[1.55rem] top-1 h-2.5 w-2.5 rounded-full bg-navy" />
          <p className="font-medium">{titleCase(event.status)}</p>
          {event.note && <p className="text-muted">{event.note}</p>}
          <p className="text-xs text-faint">{formatDateTime(event.createdAt)}</p>
        </li>
      ))}
    </ol>
    {order.trackingNumber && (
      <p className="mt-5 rounded-xl bg-sand px-4 py-3 text-sm">
        <span className="text-muted">{order.courierName ?? 'Courier'} tracking:</span> <span className="font-medium">{order.trackingNumber}</span>
      </p>
    )}
  </Card>
);

export const AddressBlock = ({ order }: { order: Order }) => {
  const { recipient, addressLine, city, state, zip, country, phone } = order.shippingAddress;
  return (
    <Card>
      <h2 className="mb-3 font-serif text-xl">Delivery address</h2>
      <address className="text-sm leading-relaxed text-muted not-italic">
        <span className="font-medium text-ink">{recipient}</span>
        <br />
        {addressLine}
        <br />
        {city}, {state} {zip}
        <br />
        {country}
        {phone && (
          <>
            <br />
            {phone}
          </>
        )}
      </address>
    </Card>
  );
};
