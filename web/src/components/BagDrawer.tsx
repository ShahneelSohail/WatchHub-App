'use client';

import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { cartCount, useCart, useCartActions } from '@/lib/shop';
import { exceedsStock, optionSummary, unitPrice, watchImage } from '@/lib/watch';
import { Icon } from './Icon';
import { useAuth } from './Providers';
import { useStoreUi } from './StoreUi';
import { cx, LinkButton, QuantityStepper } from './ui';

export const BagDrawer = () => {
  const { bagOpen, closeBag } = useStoreUi();
  const { user } = useAuth();
  const { data: cart } = useCart();
  const { setQuantity, remove } = useCartActions();
  const lines = cart ?? [];
  const count = cartCount(cart);
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const blocked = lines.some(line => line.watch.stock < 1 || exceedsStock(line));

  return (
    <>
      <div onClick={closeBag} className={cx('fixed inset-0 z-[62] bg-primary-dark transition-opacity duration-300', bagOpen ? 'opacity-60 md:opacity-45' : 'pointer-events-none opacity-0')} />
      <aside
        role="dialog"
        aria-label="Bag"
        aria-hidden={!bagOpen}
        inert={!bagOpen}
        className={cx('fixed inset-y-0 right-0 z-[63] flex w-[352px] max-w-full flex-col border-l border-line bg-surface transition-transform duration-[420ms] ease-out-soft md:w-[440px]', bagOpen ? 'translate-x-0' : 'translate-x-[104%]')}
      >
        <div className="flex items-center justify-between border-b border-line py-3 pr-2.5 pl-[22px] md:py-5 md:pr-4 md:pl-7">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-[26px] md:text-[28px]">Your bag</span>
            <span className="text-[13px] text-ink-secondary md:text-sm">{count === 1 ? '1 item' : `${count} items`}</span>
          </div>
          <button onClick={closeBag} aria-label="Close bag" className="grid h-11 w-11 place-items-center">
            <Icon name="close" size={20} />
          </button>
        </div>
        {lines.length > 0 ? (
          <>
            <p className="flex items-center gap-2 bg-success-surface px-[22px] py-3 text-xs text-success-ink md:px-7 md:text-[13px]">
              <Icon name="check" size={14} strokeWidth={2} className="text-success" />
              Free standard shipping on this order
            </p>
            <ul className="no-scrollbar flex-1 overflow-y-auto px-[22px] md:px-7">
              {lines.map(line => (
                <li key={line.id} className="grid grid-cols-[76px_1fr] gap-3.5 border-b border-line py-[18px] md:grid-cols-[88px_1fr] md:gap-4 md:py-5">
                  <img src={watchImage(line.watch, line.productColor)} alt="" className="h-[94px] w-[76px] rounded-card bg-line object-cover md:h-[108px] md:w-[88px]" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-secondary uppercase md:text-[11px]">{line.watch.brand.name}</p>
                    <Link href={`/watches/${line.watch.slug}`} onClick={closeBag} className="font-display text-[17px] leading-[1.15] md:text-[19px]">
                      {line.watch.name}
                    </Link>
                    <p className="text-xs text-ink-secondary md:text-[13px]">{optionSummary(line)}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <QuantityStepper size="sm" value={line.quantity} max={Math.max(line.watch.stock, 1)} onChange={quantity => setQuantity.mutate({ id: line.id, quantity })} label={`Quantity for ${line.watch.name}`} />
                      <span className="text-sm font-semibold tabular-nums md:text-[15px]">{formatMoney(unitPrice(line.watch) * line.quantity)}</span>
                    </div>
                    <button onClick={() => remove.mutate(line.id)} className="min-h-8 self-start text-xs text-ink-secondary underline underline-offset-[3px] md:text-[13px]">
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 border-t border-line bg-page px-[22px] pt-4 pb-7 md:px-7 md:pt-5">
              <div className="flex justify-between text-[15px] md:text-base">
                <span>Subtotal</span>
                <span className="font-semibold tabular-nums">{formatMoney(subtotal)}</span>
              </div>
              <p className="text-xs text-ink-secondary md:text-[13px]">Taxes calculated at checkout. Express shipping $25.</p>
              <LinkButton href={blocked ? '/cart' : '/checkout'} size="xl" className="h-[54px] text-[15px]">
                <Icon name="lock" size={15} strokeWidth={2} />
                {blocked ? 'Review bag' : 'Checkout'}
              </LinkButton>
              <button onClick={closeBag} className="h-11 text-sm font-medium text-primary">
                Continue shopping
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-primary-tint text-primary">
              <Icon name="bag" size={32} strokeWidth={1.4} />
            </span>
            <p className="font-display text-[26px]">Your bag is empty</p>
            <p className="max-w-[260px] text-[15px] leading-normal text-ink-secondary">{user ? 'Browse the catalogue and add a watch to see it here.' : 'Log in to see the watches you have added.'}</p>
            <LinkButton href={user ? '/watches' : '/login'} size="lg" className="mt-2">
              {user ? 'Shop all watches' : 'Log in'}
            </LinkButton>
          </div>
        )}
      </aside>
    </>
  );
};
