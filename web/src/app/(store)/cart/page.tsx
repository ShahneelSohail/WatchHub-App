'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { CouponBox, SummaryCard, SummaryRows, useQuote } from '@/components/CheckoutParts';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Providers';
import { RequireAuth } from '@/components/RequireAuth';
import { Alert, Button, cx, EmptyState, LinkButton, QuantityStepper, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { cartCount, useCart, useCartActions } from '@/lib/shop';
import type { CartLine, Watch } from '@/lib/types';
import { optionSummary, unitPrice, watchImage } from '@/lib/watch';

const CartRow = ({ line, index }: { line: CartLine; index: number }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { setQuantity, remove } = useCartActions();
  const { watch } = line;
  const sold = line.soldOut;
  const save = useMutation({
    mutationFn: async () => {
      await api.put<Watch[]>(`/wishlist/${watch.id}`);
      return api.delete<CartLine[]>(`/cart/${line.id}`);
    },
    onSuccess: lines => {
      queryClient.setQueryData(['cart'], lines);
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast('success', `${watch.name} moved to your wishlist`);
    },
    onError: (error: Error) => toast('error', error.message),
  });
  const onSale = watch.salePrice !== null && !sold;

  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 border-b border-line p-[18px] animate-rise" style={{ animationDelay: `${index * 60}ms` }}>
      <Link href={`/watches/${watch.slug}`} className={cx('h-[108px] w-[88px] overflow-hidden rounded-card bg-line', sold && 'opacity-50')}>
        <img src={watchImage(watch, line.productColor)} alt={watch.name} className="h-full w-full object-cover" />
      </Link>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className={cx('flex min-w-0 flex-col gap-[3px]', sold && 'opacity-50')}>
            <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-secondary uppercase">{watch.brand.name}</span>
            <Link href={`/watches/${watch.slug}`} className="font-display text-[19px] leading-[1.15]">
              {watch.name}
            </Link>
            <span className="text-[13px] text-ink-secondary">{optionSummary(line)}</span>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5 tabular-nums">
            <span className={cx('text-base font-semibold', sold ? 'text-ink-muted' : onSale && 'text-danger')}>{formatMoney(unitPrice(watch) * line.quantity)}</span>
            {onSale && <span className="text-xs text-ink-muted line-through">{formatMoney(watch.price * line.quantity)}</span>}
          </div>
        </div>
        {sold && <span className="inline-flex h-6 items-center self-start rounded-card border border-danger-border bg-danger-surface px-2 text-xs font-semibold text-danger-ink">Sold out</span>}
        {!sold && line.available <= 5 && <span className="text-xs font-medium text-warning-ink">{line.quantity > line.available ? `Only ${line.available} in stock, reduce the quantity` : `Only ${line.available} left`}</span>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 pt-1.5">
          <div className={cx(sold && 'pointer-events-none opacity-50')}>
            <QuantityStepper value={line.quantity} max={Math.max(line.available, 1)} onChange={quantity => setQuantity.mutate({ id: line.id, quantity })} label={`Quantity for ${watch.name}`} />
          </div>
          <div className="flex gap-4">
            <Button variant="link" className="min-h-9 text-[13px] font-medium" onClick={() => save.mutate()} disabled={save.isPending}>
              Save for later
            </Button>
            <Button variant="ghost" className="min-h-9 text-[13px] font-normal underline underline-offset-[3px]" onClick={() => remove.mutate(line.id)}>
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CartContent = () => {
  const { data: cart, isPending } = useCart();
  const { remove } = useCartActions();
  const quote = useQuote('STANDARD', cart);

  if (isPending) return <Spinner />;
  if (!cart || cart.length === 0) {
    return (
      <EmptyState
        icon="bag"
        title="Your bag is empty"
        description="Watches you add will appear here. Your wishlist is saved on your account."
        action={
          <>
            <LinkButton href="/watches" size="lg">
              Shop all watches
            </LinkButton>
            <LinkButton href="/wishlist" variant="outline" size="lg">
              View wishlist
            </LinkButton>
          </>
        }
      />
    );
  }

  const soldLines = cart.filter(line => line.soldOut);
  const overLines = cart.filter(line => !line.soldOut && line.quantity > line.available);
  const blocked = soldLines.length > 0 || overLines.length > 0;
  const subtotal = cart.reduce((sum, line) => sum + line.lineTotal, 0);
  const totals = quote.data ?? { subtotal, shippingCost: 0, discount: 0, total: subtotal, couponCode: null };

  return (
    <div className="flex flex-col gap-5">
      {soldLines.length > 0 && (
        <Alert
          tone="danger"
          action={
            <Button variant="danger" size="sm" onClick={() => soldLines.forEach(line => remove.mutate(line.id))}>
              Remove it
            </Button>
          }
        >
          {soldLines.map(line => line.watch.name).join(', ')} sold out while it was in your bag. Remove it to check out.
        </Alert>
      )}
      {overLines.length > 0 && <Alert tone="warning">{overLines.map(line => line.watch.name).join(', ')}: only {overLines[0]!.available} left in stock. Reduce the quantity to check out.</Alert>}
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[1_1_560px] flex-col rounded-card border border-line bg-surface">
          {cart.map((line, index) => (
            <CartRow key={line.id} line={line} index={index} />
          ))}
          <div className="flex items-center gap-2.5 bg-success-surface px-[18px] py-3.5 text-[13px] text-success-ink">
            <Icon name="truck" size={16} />
            Standard shipping is free on every order.
          </div>
        </div>
        <SummaryCard className="flex-[1_1_340px]">
          <h2 className="text-base font-semibold">Order summary</h2>
          <CouponBox shippingMethod="STANDARD" />
          <SummaryRows totals={totals} shippingLabel="Standard shipping" />
          {blocked ? (
            <Button size="xl" disabled className="w-full">
              <Icon name="lock" size={15} strokeWidth={2} />
              Checkout
            </Button>
          ) : (
            <LinkButton href="/checkout" size="xl" className="w-full">
              <Icon name="lock" size={15} strokeWidth={2} />
              Checkout
            </LinkButton>
          )}
          <p className="text-center text-xs leading-normal text-ink-secondary">Pay by card through Stripe, or cash on delivery for orders under $3,000.</p>
        </SummaryCard>
      </div>
    </div>
  );
};

const CartHeading = () => {
  const { data: cart } = useCart();
  const count = cartCount(cart);
  return (
    <div className="mb-5 flex flex-wrap items-baseline gap-3">
      <h1 className="font-display text-[30px] leading-[1.05] font-medium md:text-4xl lg:text-[40px]">Your bag</h1>
      {count > 0 && <span className="text-[15px] text-ink-secondary">{count === 1 ? '1 watch' : `${count} watches`}</span>}
    </div>
  );
};

export default function CartPage() {
  return (
    <RequireAuth>
      <CartHeading />
      <CartContent />
    </RequireAuth>
  );
}
