'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AddressForm } from '@/components/AddressForm';
import { RequireAuth } from '@/components/RequireAuth';
import { Button, Card, EmptyState, ErrorState, Input, LinkButton, PageHeading, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useCart } from '@/lib/shop';
import type { Address, Order, PaymentMethod, ShippingMethod, Totals } from '@/lib/types';

interface CheckoutOptions {
  cardPayments: boolean;
  shippingCosts: Record<ShippingMethod, number>;
}

const SHIPPING_LABELS: Record<ShippingMethod, { title: string; eta: string }> = {
  STANDARD: { title: 'Standard shipping', eta: '4 to 6 business days' },
  EXPRESS: { title: 'Express shipping', eta: '1 to 2 business days' },
};

const OptionCard = ({ selected, onSelect, title, detail, value }: { selected: boolean; onSelect: () => void; title: string; detail: string; value?: string }) => (
  <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${selected ? 'border-navy bg-navy/5' : 'border-line bg-ivory hover:border-navy/40'}`}>
    <span>
      <span className="block font-medium">{title}</span>
      <span className="block text-sm text-muted">{detail}</span>
    </span>
    {value && <span className="font-medium">{value}</span>}
  </button>
);

const Step = ({ number, title, children }: { number: number; title: string; children: React.ReactNode }) => (
  <Card>
    <h2 className="mb-4 flex items-center gap-3 font-serif text-xl">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-sm text-white">{number}</span>
      {title}
    </h2>
    {children}
  </Card>
);

const CheckoutContent = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: cart, isPending: cartPending } = useCart();
  const options = useQuery({ queryKey: ['checkout-options'], queryFn: () => api.get<CheckoutOptions>('/checkout/options') });
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<Address[]>('/addresses') });

  const [addressId, setAddressId] = useState<number | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState<string | null>(null);

  const quote = useQuery({
    queryKey: ['quote', shippingMethod, couponCode],
    queryFn: () => api.post<Totals>('/checkout/quote', { shippingMethod, couponCode: couponCode ?? undefined }),
    enabled: Boolean(cart?.length),
    retry: false,
  });

  const place = useMutation({
    mutationFn: () => api.post<{ order: Order; checkoutUrl: string | null }>('/checkout', { addressId: selectedAddressId, shippingMethod, paymentMethod: selectedPayment, couponCode: couponCode ?? undefined }),
    onSuccess: ({ order, checkoutUrl }) => {
      queryClient.setQueryData(['cart'], []);
      if (checkoutUrl) window.location.assign(checkoutUrl);
      else router.push(`/orders/${order.id}?placed=1`);
    },
  });

  const selectedAddressId = addressId ?? addresses.data?.find(address => address.isDefault)?.id ?? addresses.data?.[0]?.id ?? null;
  const selectedPayment = paymentMethod ?? (options.data?.cardPayments ? 'STRIPE' : 'COD');

  if (cartPending || addresses.isPending || options.isPending) return <Spinner />;
  if (!cart?.length && !place.isSuccess) return <EmptyState title="Your cart is empty" action={<LinkButton href="/watches">Shop watches</LinkButton>} />;

  const showAddressForm = addingAddress || addresses.data?.length === 0;
  const saveAddress = async (address: Omit<Address, 'id'>) => {
    const saved = await api.post<Address[]>('/addresses', address);
    queryClient.setQueryData(['addresses'], saved);
    setAddressId(saved.find(entry => entry.addressLine === address.addressLine)?.id ?? null);
    setAddingAddress(false);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <Step number={1} title="Delivery address">
          {showAddressForm ? (
            <AddressForm submitLabel="Save and use this address" onSubmit={saveAddress} onCancel={addresses.data?.length ? () => setAddingAddress(false) : undefined} />
          ) : (
            <div className="space-y-3" role="radiogroup" aria-label="Delivery address">
              {addresses.data?.map(address => (
                <OptionCard
                  key={address.id}
                  selected={address.id === selectedAddressId}
                  onSelect={() => setAddressId(address.id)}
                  title={address.recipient}
                  detail={`${address.addressLine}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`}
                />
              ))}
              <Button variant="ghost" onClick={() => setAddingAddress(true)}>
                + Add a new address
              </Button>
            </div>
          )}
        </Step>

        <Step number={2} title="Shipping method">
          <div className="space-y-3" role="radiogroup" aria-label="Shipping method">
            {(Object.keys(SHIPPING_LABELS) as ShippingMethod[]).map(method => (
              <OptionCard
                key={method}
                selected={shippingMethod === method}
                onSelect={() => setShippingMethod(method)}
                title={SHIPPING_LABELS[method].title}
                detail={SHIPPING_LABELS[method].eta}
                value={options.data?.shippingCosts[method] ? formatMoney(options.data.shippingCosts[method]) : 'Free'}
              />
            ))}
          </div>
        </Step>

        <Step number={3} title="Payment">
          <div className="space-y-3" role="radiogroup" aria-label="Payment method">
            {options.data?.cardPayments && <OptionCard selected={selectedPayment === 'STRIPE'} onSelect={() => setPaymentMethod('STRIPE')} title="Credit or debit card" detail="Pay securely on Stripe Checkout (test mode)" />}
            <OptionCard selected={selectedPayment === 'COD'} onSelect={() => setPaymentMethod('COD')} title="Cash on delivery" detail="Pay when your watch arrives" />
          </div>
        </Step>
      </div>

      <Card className="self-start lg:sticky lg:top-24">
        <h2 className="font-serif text-xl">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {cart?.map(line => (
            <li key={line.id} className="flex justify-between gap-3">
              <span>
                {line.watch.name} <span className="text-muted">× {line.quantity}</span>
              </span>
              <span>{formatMoney(line.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <form
          onSubmit={event => {
            event.preventDefault();
            setCouponCode(couponInput.trim() || null);
          }}
          className="mt-5 flex gap-2"
        >
          <Input value={couponInput} onChange={event => setCouponInput(event.target.value)} placeholder="Coupon code" aria-label="Coupon code" />
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
        {quote.isError && <div className="mt-3"><ErrorState message={quote.error.message} /></div>}

        {quote.data && (
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd>{formatMoney(quote.data.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd>{quote.data.shippingCost ? formatMoney(quote.data.shippingCost) : 'Free'}</dd>
            </div>
            {quote.data.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Discount ({quote.data.couponCode})</dt>
                <dd>-{formatMoney(quote.data.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(quote.data.total)}</dd>
            </div>
          </dl>
        )}

        {place.isError && <div className="mt-4"><ErrorState message={place.error.message} /></div>}
        <Button className="mt-5 w-full py-3" disabled={!selectedAddressId || quote.isError || !quote.data || place.isPending} onClick={() => place.mutate()}>
          {place.isPending ? 'Placing order…' : selectedPayment === 'STRIPE' ? 'Pay with card' : 'Place order'}
        </Button>
      </Card>
    </div>
  );
};

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <PageHeading eyebrow="Almost there" title="Checkout" />
      <CheckoutContent />
    </RequireAuth>
  );
}
