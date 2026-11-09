'use client';

import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { useQuickAdd, useWishlistToggle } from '@/lib/shop';
import { watchBadge, type BadgeTone } from '@/lib/watch';
import type { Watch } from '@/lib/types';
import { Icon } from './Icon';
import { Button, cx, LinkButton, Skeleton } from './ui';

const badgeTones: Record<BadgeTone, string> = {
  soldOut: 'border-line bg-surface text-ink-secondary',
  sale: 'border-danger bg-danger text-on-primary',
  limited: 'border-primary bg-primary-tint text-primary',
  low: 'border-warning-edge bg-warning-surface text-warning-ink',
  new: 'border-primary-tint bg-surface text-primary',
};

export const WatchBadge = ({ watch, large }: { watch: Pick<Watch, 'stock' | 'discountPercent' | 'isLimitedEdition' | 'isNew' | 'lowStockThreshold'>; large?: boolean }) => {
  const badge = watchBadge(watch);
  if (!badge) return null;
  return (
    <span className={cx('inline-flex items-center rounded-card border font-semibold tracking-[0.06em] whitespace-nowrap uppercase', large ? 'h-[26px] px-2.5 text-[11px] md:h-7 md:px-3 md:text-xs' : 'h-[22px] px-2 text-[10px] md:h-6 md:px-2.5 md:text-[11px]', badgeTones[badge.tone])}>
      {badge.label}
    </span>
  );
};

export const PriceTag = ({ watch, className, saving }: { watch: Pick<Watch, 'price' | 'salePrice'>; className?: string; saving?: boolean }) => (
  <span className={cx('flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums', className)}>
    <span className={cx('font-semibold', watch.salePrice !== null && 'text-danger')}>{formatMoney(watch.salePrice ?? watch.price)}</span>
    {watch.salePrice !== null && <span className="text-[0.8em] font-normal text-ink-muted line-through">{formatMoney(watch.price)}</span>}
    {saving && watch.salePrice !== null && <span className="inline-flex h-6 items-center rounded-card bg-danger-surface px-2 text-xs font-semibold text-danger no-underline">You save {formatMoney(watch.price - watch.salePrice)}</span>}
  </span>
);

export const WishlistHeart = ({ watch, className }: { watch: Watch; className?: string }) => {
  const { isSaved, toggle } = useWishlistToggle();
  const saved = isSaved(watch.id);
  return (
    <button
      type="button"
      onClick={() => toggle(watch.id)}
      aria-label={saved ? `Remove ${watch.name} from wishlist` : `Save ${watch.name} to wishlist`}
      aria-pressed={saved}
      className={cx('pointer-events-auto grid h-11 w-11 place-items-center', className)}
    >
      <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-surface/90 md:h-10 md:w-10 md:bg-surface/95">
        <Icon name="heart" size={17} fill={saved ? 'var(--color-danger)' : 'none'} className={saved ? 'text-danger' : 'text-ink'} />
      </span>
    </button>
  );
};

export const WatchCard = ({ watch, index = 0 }: { watch: Watch; index?: number }) => {
  const quickAdd = useQuickAdd();
  const soldOut = watch.stock === 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card transition-colors animate-rise md:border md:border-line md:bg-surface md:hover:border-primary" style={{ animationDelay: `${(index % 6) * 60}ms` }}>
      <Link href={`/watches/${watch.slug}`} className="flex flex-1 flex-col gap-2.5 md:gap-0">
        <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-line md:rounded-none">
          <img src={watch.images[0]} alt={watch.name} loading="lazy" className={cx('absolute inset-0 h-full w-full object-cover', soldOut && 'opacity-55')} />
          <span className="absolute top-2 left-2 md:top-3 md:left-3">
            <WatchBadge watch={watch} />
          </span>
        </div>
        <div className="flex flex-col gap-1 md:gap-1.5 md:p-[18px] md:pb-0">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-secondary uppercase md:text-[11px]">{watch.brand.name}</p>
          <h3 className="font-display text-[17px] leading-[1.15] md:text-[21px]">{watch.name}</h3>
          <div className="mt-0.5 flex items-center justify-between gap-2 md:mt-1.5">
            <PriceTag watch={watch} className={cx('text-sm md:text-base', soldOut && 'text-ink-muted')} />
            <span className="flex gap-1 md:gap-[5px]" aria-label="Available colours">
              {watch.colors.map(color => (
                <span key={color.name} title={color.name} className="h-[9px] w-[9px] rounded-full ring-1 ring-line md:h-[11px] md:w-[11px]" style={{ backgroundColor: color.hex }} />
              ))}
            </span>
          </div>
        </div>
      </Link>
      <div className="hidden p-[18px] pt-2.5 md:block">
        {soldOut ? (
          <LinkButton href={`/watches/${watch.slug}`} variant="outline" className="w-full">
            Notify me
          </LinkButton>
        ) : (
          <Button variant="outline" className="w-full hover:bg-primary! hover:text-on-primary!" onClick={() => quickAdd(watch)}>
            Add to bag
          </Button>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/5]">
        <WishlistHeart watch={watch} className="absolute top-0.5 right-0.5 md:top-1 md:right-1" />
        {!soldOut && (
          <button type="button" onClick={() => quickAdd(watch)} aria-label={`Add ${watch.name} to bag`} className="pointer-events-auto absolute right-0.5 bottom-0.5 grid h-11 w-11 place-items-center md:hidden">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-primary text-on-primary">
              <Icon name="plus" size={14} strokeWidth={2} />
            </span>
          </button>
        )}
      </div>
    </article>
  );
};

export const WatchCardSkeleton = () => (
  <div className="flex flex-col gap-2.5 md:gap-0 md:overflow-hidden md:rounded-card md:border md:border-line md:bg-surface">
    <Skeleton className="aspect-[4/5]" />
    <div className="flex flex-col gap-2.5 md:p-[18px]">
      <Skeleton className="h-2.5 w-2/5" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3.5 w-[30%]" />
    </div>
  </div>
);

export const WatchGrid = ({ watches, wide }: { watches: Watch[]; wide?: boolean }) => (
  <div className={cx('grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-4 xl:gap-6', wide && 'xl:grid-cols-4')}>
    {watches.map((watch, index) => (
      <WatchCard key={watch.id} watch={watch} index={index} />
    ))}
  </div>
);
