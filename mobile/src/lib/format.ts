const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const wholeCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const formatMoney = (value: number): string => currency.format(value);

export const formatWholeMoney = (value: number): string => wholeCurrency.format(value);

export const formatDate = (value: string): string => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatRelative = (value: string): string => {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return `Today, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export const orderNumber = (id: number): string => `#WH-${id}`;

export const addressSummary = (address: { recipient: string; addressLine: string; city: string; state: string; zip: string; country: string }): string =>
  `${address.recipient}, ${address.addressLine}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`;

const STRAP_LABELS = { BELT: 'Leather belt', CHAIN: 'Metal chain' } as const;

export const optionSummary = ({ productColor, strapType, strapColor }: { productColor: string | null; strapType: 'BELT' | 'CHAIN' | null; strapColor: string | null }): string =>
  [productColor, strapType && `${STRAP_LABELS[strapType]}${strapColor ? ` (${strapColor})` : ''}`].filter(Boolean).join(' · ');

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

const DELIVERY_DAYS = { STANDARD: 6, EXPRESS: 2 } as const;

export const expectedDelivery = (order: { createdAt: string; shippingMethod: 'STANDARD' | 'EXPRESS' }): string => {
  const date = new Date(order.createdAt);
  date.setDate(date.getDate() + DELIVERY_DAYS[order.shippingMethod]);
  return `Expected ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
};
