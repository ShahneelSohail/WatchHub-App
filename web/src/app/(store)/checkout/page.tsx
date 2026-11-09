'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { AddressForm } from '@/components/AddressForm';
import { CouponBox, SummaryCard, SummaryRows, useQuote } from '@/components/CheckoutParts';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/components/Providers';
import { RequireAuth } from '@/components/RequireAuth';
import { useStoreUi } from '@/components/StoreUi';
import { Alert, Button, cx, EmptyState, LinkButton, OptionCard, Spinner } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useCart, useCartActions } from '@/lib/shop';
import type { Address, Order, PaymentMethod, ShippingMethod } from '@/lib/types';
import { COD_LIMIT, isSoldOut, optionSummary, unitPrice, watchImage } from '@/lib/watch';

interface StockLine {
  cartItemId: number;
  name: string;
  available: number;
  soldOut: boolean;
  insufficient: boolean;
}

interface StockCheck {
  ok: boolean;
  lines: StockLine[];
}

interface CheckoutOptions {
  cardPayments: boolean;
  codLimit?: number;
  shippingCosts: Record<ShippingMethod, number>;
}

const SHIPPING_OPTIONS: { method: ShippingMethod; title: string; detail: string }[] = [
  { method: 'STANDARD', title: 'Standard', detail: '4 to 6 working days · DHL or Royal Mail' },
  { method: 'EXPRESS', title: 'Express', detail: '1 to 2 working days · DHL Express' },
];

const CARD_MARKS = ['VISA', 'MC', 'AMEX'];
const STEPS = ['Bag', 'Details', 'Payment', 'Done'];
const CURRENT_STEP = 1;

const Stepper = () => (
  <ol className="flex flex-wrap items-center gap-2 text-[13px]">
    {STEPS.map((label, index) => (
      <li key={label} className={cx('flex items-center gap-2', index <= CURRENT_STEP ? 'text-ink' : 'text-ink-secondary', index === CURRENT_STEP && 'font-semibold')} aria-current={index === CURRENT_STEP ? 'step' : undefined}>
        <span className={cx('grid h-[22px] w-[22px] place-items-center rounded-full border-[1.5px] text-[11px] font-bold', index < CURRENT_STEP ? 'border-primary bg-primary text-on-primary' : index === CURRENT_STEP ? 'border-primary bg-surface text-primary' : 'border-line bg-surface text-ink-muted')}>
          {index < CURRENT_STEP ? <Icon name="check" size={12} strokeWidth={3} /> : index + 1}
        </span>
        {label}
        {index < STEPS.length - 1 && <span className="text-ink-muted">›</span>}
      </li>
    ))}
  </ol>
);

const Section = ({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) => (
  <section className="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-[22px]">
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

const RedirectPanel = ({ orderId, total }: { orderId: number; total: number }) => (
  <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-3.5 rounded-card border border-line bg-surface px-7 py-14 text-center animate-fade">
    <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary-tint border-t-primary" />
    <h1 className="font-display text-[28px] leading-[1.15]">Taking you to secure payment</h1>
    <p className="max-w-[380px] text-[15px] leading-relaxed text-ink-secondary">Stripe handles your card details. Please don’t close this tab. You’ll come back here once the payment is done.</p>
    <p className="flex items-center gap-2 text-[13px] text-ink-secondary">
      <Icon name="lock" size={14} strokeWidth={2} />
      Order #{orderId} · {formatMoney(total)}
    </p>
  </div>
);

const fetchStock = () => api.get<StockCheck>('/checkout/stock');

const CheckoutContent = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { couponCode } = useStoreUi();
  const { data: cart, isPending: cartPending } = useCart();
  const { remove } = useCartActions();
  const options = useQuery({ queryKey: ['checkout-options'], queryFn: () => api.get<CheckoutOptions>('/checkout/options') });
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<Address[]>('/addresses') });

  const [addressId, setAddressId] = useState<number | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [redirect, setRedirect] = useState<{ orderId: number; total: number } | null>(null);

  const quote = useQuote(shippingMethod, cart);
  const stockQuery = useQuery({ queryKey: ['checkout-stock', cart?.map(line => `${line.id}:${line.quantity}`).join(',')], queryFn: fetchStock, enabled: Boolean(cart?.length) });
  const total = quote.data?.total ?? 0;
  const codLimit = quote.data?.codLimit ?? options.data?.codLimit ?? COD_LIMIT;
  const codAvailable = quote.data?.codAvailable ?? total < codLimit;
  const cardAvailable = Boolean(options.data?.cardPayments);
  const selectedAddressId = addressId ?? addresses.data?.find(address => address.isDefault)?.id ?? addresses.data?.[0]?.id ?? null;
  const preferred = paymentMethod ?? (cardAvailable ? 'STRIPE' : 'COD');
  const selectedPayment: PaymentMethod = preferred === 'COD' && !codAvailable && cardAvailable ? 'STRIPE' : preferred;

  const place = useMutation({
    mutationFn: async () => {
      const stock = await queryClient.fetchQuery({ queryKey: ['checkout-stock', 'submit'], queryFn: fetchStock, staleTime: 0 });
      if (!stock.ok) {
        queryClient.invalidateQueries({ queryKey: ['checkout-stock'] });
        throw new ApiError('Some watches in your bag are no longer available. Remove them to continue.', 409, 'OUT_OF_STOCK');
      }
      return api.post<{ order: Order; checkoutUrl: string | null }>('/checkout', {
        addressId: selectedAddressId,
        shippingMethod,
        paymentMethod: selectedPayment,
        couponCode: couponCode ?? undefined,
        returnUrl: `${window.location.origin}/checkout/result?order={orderId}`,
      });
    },
    onSuccess: ({ order, checkoutUrl }) => {
      queryClient.setQueryData(['cart'], []);
      if (checkoutUrl) {
        setRedirect({ orderId: order.id, total: order.total });
        window.location.assign(checkoutUrl);
      } else router.push(`/checkout/result?order=${order.id}&status=cod`);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['checkout-stock'] });
    },
  });

  if (redirect) return <RedirectPanel {...redirect} />;
  if (cartPending || addresses.isPending || options.isPending) return <Spinner />;
  if (place.isSuccess) return <Spinner />;
  if (!cart?.length) return <EmptyState icon="bag" title="Your bag is empty" description="Add a watch to your bag to check out." action={<LinkButton href="/watches" size="lg">Shop all watches</LinkButton>} />;

  const soldLines = stockQuery.data?.lines.filter(line => line.soldOut) ?? [];
  const overLines = stockQuery.data?.lines.filter(line => line.insufficient && !line.soldOut) ?? [];
  const blocked = soldLines.length > 0 || overLines.length > 0;
  const showAddressForm = addingAddress || addresses.data?.length === 0;
  const canPlace = Boolean(selectedAddressId) && Boolean(quote.data) && !blocked && !place.isPending;
  const saveAddress = async (address: Omit<Address, 'id'>) => {
    const saved = await api.post<Address[]>('/addresses', address);
    queryClient.setQueryData(['addresses'], saved);
    setAddressId(saved.find(entry => entry.addressLine === address.addressLine)?.id ?? null);
    setAddingAddress(false);
  };

  const payOptions = [
    ...(cardAvailable ? [{ method: 'STRIPE' as const, title: 'Card', detail: 'You’ll go to Stripe’s secure page to pay, then come straight back.', disabled: false, trailing: true }] : []),
    {
      method: 'COD' as const,
      title: 'Cash on delivery',
      detail: codAvailable ? 'Pay the courier in cash when your watch arrives.' : quote.data?.codReason ?? `Available for orders under ${formatMoney(codLimit)}. This order is ${formatMoney(total)}.`,
      disabled: !codAvailable,
      trailing: false,
    },
  ];
  const payLabel = selectedPayment === 'COD' ? `Place order · ${formatMoney(total)}` : `Pay ${formatMoney(total)} with card`;
  const note =
    selectedPayment === 'COD'
      ? `You’ll pay ${formatMoney(total)} in cash on delivery. By placing your order you agree to our terms and returns policy.`
      : 'Your card is charged by Stripe. WatchHub never sees your card number. By paying you agree to our terms and returns policy.';

  return (
    <div className="flex flex-col gap-5">
      <Stepper />
      <h1 className="font-display text-[30px] leading-[1.05] font-medium md:text-4xl lg:text-[40px]">Checkout</h1>
      {place.isError && <Alert tone="danger">{place.error.message}</Alert>}
      {soldLines.length > 0 && (
        <Alert
          tone="danger"
          action={
            <Button variant="danger" size="sm" onClick={() => soldLines.forEach(line => remove.mutate(line.cartItemId))}>
              Remove and continue
            </Button>
          }
        >
          {soldLines.map(line => line.name).join(', ')} sold out while you were checking out. Remove it to place your order; the rest of your bag is still reserved.
        </Alert>
      )}
      {overLines.length > 0 && (
        <Alert tone="warning">
          {overLines.map(line => `${line.name} (only ${line.available} left)`).join(', ')}. <Link href="/cart" className="font-semibold underline">Edit your bag</Link> to continue.
        </Alert>
      )}
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-4">
          <Section title="1. Contact" aside={<span className="text-[13px] text-ink-secondary">Signed in as {user?.name}</span>}>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">Email</span>
              <input readOnly value={user?.email ?? ''} className="h-[46px] rounded-card border border-line bg-page px-3 text-[15px] text-ink-secondary" />
            </label>
          </Section>

          <Section title="2. Shipping address">
            {showAddressForm ? (
              <AddressForm submitLabel="Save and use this address" onSubmit={saveAddress} onCancel={addresses.data?.length ? () => setAddingAddress(false) : undefined} />
            ) : (
              <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Shipping address">
                {addresses.data?.map(address => (
                  <OptionCard
                    key={address.id}
                    selected={address.id === selectedAddressId}
                    onSelect={() => setAddressId(address.id)}
                    title={address.recipient}
                    detail={`${address.addressLine}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`}
                  />
                ))}
                <Button variant="link" className="self-start" onClick={() => setAddingAddress(true)}>
                  + Add a new address
                </Button>
              </div>
            )}
          </Section>

          <Section title="3. Delivery">
            <div role="radiogroup" aria-label="Delivery" className="flex flex-col gap-2.5">
              {SHIPPING_OPTIONS.map(option => (
                <OptionCard
                  key={option.method}
                  selected={shippingMethod === option.method}
                  onSelect={() => setShippingMethod(option.method)}
                  title={option.title}
                  detail={option.detail}
                  trailing={<span className="text-[15px] font-semibold tabular-nums">{options.data?.shippingCosts[option.method] ? formatMoney(options.data.shippingCosts[option.method]) : 'Free'}</span>}
                />
              ))}
            </div>
          </Section>

          <Section title="4. Payment">
            <div role="radiogroup" aria-label="Payment" className="flex flex-col gap-2.5">
              {payOptions.map(option => (
                <OptionCard
                  key={option.method}
                  selected={selectedPayment === option.method}
                  disabled={option.disabled}
                  onSelect={() => !option.disabled && setPaymentMethod(option.method)}
                  title={option.title}
                  detail={option.detail}
                  trailing={
                    option.trailing && (
                      <span className="flex gap-1">
                        {CARD_MARKS.map(mark => (
                          <span key={mark} className="grid h-[22px] place-items-center rounded-card border border-line px-1.5 text-[10px] font-bold text-primary">
                            {mark}
                          </span>
                        ))}
                      </span>
                    )
                  }
                />
              ))}
            </div>
          </Section>
        </div>

        <SummaryCard className="flex-[1_1_340px]">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Your order</h2>
            <Link href="/cart" className="text-[13px] font-medium text-primary">
              Edit bag
            </Link>
          </div>
          <ul className="flex flex-col gap-3">
            {cart.map(line => (
              <li key={line.id} className={cx('grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3', isSoldOut(line) && 'opacity-50')}>
                <span className="relative h-14 w-14 rounded-card bg-line">
                  <img src={watchImage(line.watch, line.productColor)} alt="" className="h-14 w-14 rounded-card object-cover" />
                  <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink-secondary px-1 text-[11px] font-bold text-on-primary">{line.quantity}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{line.watch.name}</span>
                  <span className="text-xs text-ink-secondary">{optionSummary(line)}</span>
                </span>
                <span className={cx('text-sm tabular-nums', line.watch.salePrice !== null && 'text-danger')}>{formatMoney(unitPrice(line.watch) * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line pt-3.5">
            <CouponBox shippingMethod={shippingMethod} />
          </div>
          {quote.data && <SummaryRows totals={quote.data} shippingLabel={shippingMethod === 'EXPRESS' ? 'Express shipping' : 'Standard shipping'} />}
          <Button size="xl" className="w-full" disabled={!canPlace} loading={place.isPending} onClick={() => place.mutate()}>
            {place.isPending ? (selectedPayment === 'COD' ? 'Placing order' : 'Connecting to Stripe') : payLabel}
          </Button>
          <p className="text-xs leading-normal text-ink-secondary">{note}</p>
        </SummaryCard>
      </div>
    </div>
  );
};

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}
