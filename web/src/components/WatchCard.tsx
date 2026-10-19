'use client';

import Link from 'next/link';
import { formatMoney } from '@/lib/format';
import { useWishlistToggle } from '@/lib/shop';
import type { Watch } from '@/lib/types';
import { Stars } from './ui';

export const PriceTag = ({ watch, className = '' }: { watch: Pick<Watch, 'price' | 'salePrice'>; className?: string }) => (
  <span className={className}>
    <span className="font-semibold">{formatMoney(watch.salePrice ?? watch.price)}</span>
    {watch.salePrice !== null && <span className="ml-2 text-sm text-faint line-through">{formatMoney(watch.price)}</span>}
  </span>
);

export const WatchCard = ({ watch }: { watch: Watch }) => {
  const { isSaved, toggle } = useWishlistToggle();
  const saved = isSaved(watch.id);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-ivory transition hover:-translate-y-1 hover:shadow-lg">
      <button
        onClick={() => toggle(watch.id)}
        aria-label={saved ? `Remove ${watch.name} from wishlist` : `Save ${watch.name} to wishlist`}
        aria-pressed={saved}
        className={`absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ivory/90 text-lg shadow transition hover:scale-110 ${saved ? 'text-rose' : 'text-faint'}`}
      >
        {saved ? '♥' : '♡'}
      </button>
      <Link href={`/watches/${watch.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square bg-gradient-to-b from-sand to-ivory p-6">
          <img src={watch.images[0]} alt={watch.name} className="h-full w-full object-contain transition duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 text-xs font-medium">
            {watch.discountPercent !== null && <span className="rounded-full bg-rose px-2.5 py-1 text-white">-{watch.discountPercent}%</span>}
            {watch.isLimitedEdition && <span className="rounded-full bg-navy px-2.5 py-1 text-white">Limited</span>}
            {watch.stock === 0 && <span className="rounded-full bg-stone-700 px-2.5 py-1 text-white">Sold out</span>}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <p className="text-xs tracking-wide text-gold uppercase">{watch.brand.name}</p>
          <h3 className="font-serif text-lg leading-snug">{watch.name}</h3>
          <div className="flex items-center gap-2 text-xs text-faint">
            <Stars value={watch.rating.average} size="text-sm" />
            {watch.rating.count > 0 && <span>({watch.rating.count})</span>}
          </div>
          <div className="mt-auto space-y-2 pt-2">
            <PriceTag watch={watch} className="block" />
            <span className="flex gap-1" aria-label="Available colours">
              {watch.colors.map(color => (
                <span key={color.name} title={color.name} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
              ))}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
};

export const WatchGrid = ({ watches }: { watches: Watch[] }) => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
    {watches.map(watch => (
      <WatchCard key={watch.id} watch={watch} />
    ))}
  </div>
);
