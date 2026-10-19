'use client';

import { RequireAuth } from '@/components/RequireAuth';
import { Button, Card, EmptyState, LinkButton, PageHeading, Select, Spinner } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { useCart, useCartActions } from '@/lib/shop';

const optionSummary = (strapType: string | null, strapColor: string | null, productColor: string | null) =>
  [productColor, strapType && `${strapType === 'BELT' ? 'Leather belt' : 'Metal chain'}${strapColor ? ` (${strapColor})` : ''}`].filter(Boolean).join(' · ');

const CartContent = () => {
  const { data: cart, isPending } = useCart();
  const { setQuantity, remove } = useCartActions();

  if (isPending) return <Spinner />;
  if (!cart || cart.length === 0) return <EmptyState title="Your cart is empty" description="Browse the collection and add a watch you love." action={<LinkButton href="/watches">Shop watches</LinkButton>} />;

  const subtotal = cart.reduce((sum, line) => sum + line.lineTotal, 0);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <ul className="space-y-4">
        {cart.map(line => (
          <li key={line.id}>
            <Card className="flex gap-4">
              <img src={line.watch.colors.find(color => color.name === line.productColor)?.image ?? line.watch.images[0]} alt={line.watch.name} className="h-28 w-28 rounded-xl bg-sand object-contain p-2" />
              <div className="flex flex-1 flex-col">
                <p className="text-xs tracking-wide text-gold uppercase">{line.watch.brand.name}</p>
                <p className="font-serif text-lg">{line.watch.name}</p>
                <p className="text-sm text-muted">{optionSummary(line.strapType, line.strapColor, line.productColor)}</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-20">
                      <Select
                        value={line.quantity}
                        aria-label={`Quantity for ${line.watch.name}`}
                        className="py-1.5"
                        onChange={event => setQuantity.mutate({ id: line.id, quantity: Number(event.target.value) })}
                      >
                        {Array.from({ length: Math.min(Math.max(line.watch.stock, line.quantity), 10) }, (_, index) => index + 1).map(value => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button variant="ghost" onClick={() => remove.mutate(line.id)} className="px-2 py-1.5">
                      Remove
                    </Button>
                  </div>
                  <p className="font-semibold">{formatMoney(line.lineTotal)}</p>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="self-start">
        <h2 className="font-serif text-xl">Order summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd>{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Shipping</dt>
            <dd>Calculated at checkout</dd>
          </div>
        </dl>
        <LinkButton href="/checkout" className="mt-6 w-full py-3">
          Proceed to checkout
        </LinkButton>
      </Card>
    </div>
  );
};

export default function CartPage() {
  return (
    <RequireAuth>
      <PageHeading eyebrow="Your bag" title="Shopping cart" />
      <CartContent />
    </RequireAuth>
  );
}
