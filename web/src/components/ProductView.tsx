'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactElement, type TouchEvent } from 'react';
import { api } from '@/lib/api';
import { useCartActions, useLoginRedirect, useWishlistToggle } from '@/lib/shop';
import { formatMoney } from '@/lib/format';
import { STRAP_COLORS, STRAP_DETAILS, STRAP_LABELS, stockLine, unitPrice } from '@/lib/watch';
import type { StrapType, Watch } from '@/lib/types';
import { Icon, type IconName } from './Icon';
import { useAuth, useToast } from './Providers';
import { useStoreUi } from './StoreUi';
import { PriceTag, WatchBadge } from './WatchCard';
import { Alert, Button, cx, Eyebrow, Input, QuantityStepper, Stars } from './ui';

const SWIPE_PX = 40;
const STRAP_ICONS: Record<StrapType, ReactElement> = {
  BELT: (
    <svg width="44" height="22" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="1" y="6" width="42" height="10" rx="2" />
      <path d="M4 8.5h36M4 13.5h36" strokeDasharray="2 2" opacity=".6" />
      <circle cx="31" cy="11" r="1.2" />
      <circle cx="35" cy="11" r="1.2" />
    </svg>
  ),
  CHAIN: (
    <svg width="44" height="22" viewBox="0 0 44 22" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {[1, 10, 19, 28].map(x => (
        <rect key={x} x={x} y="5" width="8" height="12" rx="1.5" />
      ))}
      <rect x="37" y="5" width="6" height="12" rx="1.5" />
    </svg>
  ),
};

const Lightbox = ({ images, index, onIndex, onClose, name }: { images: string[]; index: number; onIndex: (index: number) => void; onClose: () => void; name: string }) => {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const step = (direction: number) => {
    setZoom(null);
    onIndex((index + direction + images.length) % images.length);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div role="dialog" aria-modal="true" aria-label="Gallery" className="fixed inset-0 z-[75] bg-surface animate-fade">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4 md:px-8">
        <span className="text-sm text-ink-secondary">
          {index + 1} / {images.length}
        </span>
        <button onClick={onClose} aria-label="Close gallery" className="grid h-12 w-12 place-items-center rounded-full bg-page">
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className="absolute inset-x-0 top-20 bottom-28 flex items-center justify-center overflow-hidden">
        <img
          src={images[index]}
          alt={name}
          onClick={event => {
            const box = event.currentTarget.getBoundingClientRect();
            setZoom(zoom ? null : { x: ((event.clientX - box.left) / box.width) * 100, y: ((event.clientY - box.top) / box.height) * 100 });
          }}
          style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          className={cx('max-h-full max-w-[90%] object-contain transition-transform duration-300', zoom ? 'cursor-zoom-out' : 'cursor-zoom-in')}
        />
      </div>
      <div className="absolute inset-x-0 bottom-8 flex justify-center gap-4">
        {[
          { label: 'Previous image', icon: 'chevronLeft' as const, direction: -1 },
          { label: 'Next image', icon: 'chevronRight' as const, direction: 1 },
        ].map(control => (
          <button key={control.label} onClick={() => step(control.direction)} aria-label={control.label} className="grid h-14 w-14 place-items-center rounded-full border border-line bg-surface hover:border-primary">
            <Icon name={control.icon} size={20} />
          </button>
        ))}
      </div>
    </div>
  );
};

const Gallery = ({ watch, index, onIndex }: { watch: Watch; index: number; onIndex: (index: number) => void }) => {
  const [lightbox, setLightbox] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = watch.images.length;
  const onTouchEnd = (event: TouchEvent) => {
    const delta = event.changedTouches[0]!.clientX - (touchStart.current ?? 0);
    if (touchStart.current !== null && Math.abs(delta) > SWIPE_PX) onIndex((index + (delta < 0 ? 1 : -1) + count) % count);
    touchStart.current = null;
  };

  const thumbs = (className: string, size: string) => (
    <div className={className}>
      {watch.images.map((image, position) => (
        <button key={image} onClick={() => onIndex(position)} aria-label={`Show image ${position + 1}`} aria-current={position === index} className={cx('overflow-hidden rounded-card border-[1.5px] bg-line transition-colors', size, position === index ? 'border-primary' : 'border-line')}>
          <img src={image} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="-mx-4 md:mx-0 lg:grid lg:grid-cols-[84px_minmax(0,1fr)] lg:gap-4">
      {thumbs('hidden flex-col gap-3 lg:flex', 'h-[104px] w-[84px]')}
      <div className="relative">
        <button onClick={() => setLightbox(true)} onTouchStart={event => (touchStart.current = event.touches[0]!.clientX)} onTouchEnd={onTouchEnd} aria-label="Open gallery" className="relative block h-[500px] w-full cursor-zoom-in overflow-hidden bg-line md:aspect-[4/5] md:h-auto md:rounded-card">
          {watch.images.map((image, position) => (
            <img key={image} src={image} alt={position === index ? watch.name : ''} className={cx('absolute inset-0 h-full w-full object-cover transition-opacity duration-[450ms]', position === index ? 'opacity-100' : 'opacity-0')} />
          ))}
        </button>
        <span className="pointer-events-none absolute top-3.5 left-5 md:top-4 md:left-4">
          <WatchBadge watch={watch} large />
        </span>
        <span className="pointer-events-none absolute top-3.5 right-5 inline-flex h-[26px] items-center gap-1.5 rounded-card bg-surface/90 px-2.5 text-[11px] font-semibold md:hidden">
          <Icon name="expand" size={12} strokeWidth={2} />
          Tap to zoom
        </span>
        <span className="pointer-events-none absolute right-4 bottom-4 hidden h-8 items-center gap-1.5 rounded-card bg-surface/95 px-3 text-xs font-medium lg:inline-flex">
          <Icon name="expand" size={13} strokeWidth={2} />
          Click to zoom
        </span>
        {thumbs('absolute bottom-4 left-5 flex gap-2 md:static md:mt-3 md:left-auto lg:hidden', 'h-[52px] w-[52px]')}
      </div>
      {lightbox && <Lightbox images={watch.images} index={index} onIndex={onIndex} onClose={() => setLightbox(false)} name={watch.name} />}
    </div>
  );
};

const PERKS: { icon: IconName; text: string }[] = [
  { icon: 'truck', text: 'Free shipping, 2–4 days' },
  { icon: 'shield', text: 'Two-year warranty' },
  { icon: 'rotate', text: '30-day returns' },
];

const NotifyMe = ({ watch, defaultEmail }: { watch: Watch; defaultEmail: string }) => {
  const toast = useToast();
  const [email, setEmail] = useState(defaultEmail);
  const notify = useMutation({
    mutationFn: () => api.post(`/watches/${watch.id}/notify`, { email }),
    onError: (error: Error) => toast('error', error.message),
  });

  if (notify.isSuccess) return <Alert tone="success">We’ll email {email} when {watch.name} is back in stock.</Alert>;
  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        notify.mutate();
      }}
      className="flex gap-2.5"
    >
      <Input type="email" required value={email} onChange={event => setEmail(event.target.value)} aria-label="Email for restock alert" placeholder="you@example.com" className="h-12" />
      <Button type="submit" size="lg" loading={notify.isPending}>
        Notify me
      </Button>
    </form>
  );
};

const optionLabel = 'flex gap-2 text-sm';

export const ProductView = ({ watch, reviewSummary }: { watch: Watch; reviewSummary: string }) => {
  const { user } = useAuth();
  const toast = useToast();
  const redirectToLogin = useLoginRedirect();
  const { openBag } = useStoreUi();
  const { add } = useCartActions();
  const { isSaved, toggle } = useWishlistToggle();
  const [colorName, setColorName] = useState(watch.colors[0]?.name ?? null);
  const [imageIndex, setImageIndex] = useState(Math.max(0, watch.images.indexOf(watch.colors[0]?.image ?? '')));
  const [strapType, setStrapType] = useState<StrapType | null>(null);
  const [strapColor, setStrapColor] = useState(STRAP_COLORS[0]!.name);
  const [quantity, setQuantity] = useState(1);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'added'>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const soldOut = watch.stock === 0;
  const stock = stockLine(watch.stock, watch.lowStockThreshold);
  const price = unitPrice(watch);
  const saved = isSaved(watch.id);
  const strapOptions: { type: StrapType | null; label: string; detail: string }[] = [
    { type: null, label: 'Original strap', detail: 'As shown' },
    ...(watch.hasBeltOption ? [{ type: 'BELT' as const, label: STRAP_LABELS.BELT, detail: STRAP_DETAILS.BELT }] : []),
    ...(watch.hasChainOption ? [{ type: 'CHAIN' as const, label: STRAP_LABELS.CHAIN, detail: STRAP_DETAILS.CHAIN }] : []),
  ];

  const pickColor = (name: string) => {
    setColorName(name);
    const position = watch.images.indexOf(watch.colors.find(color => color.name === name)?.image ?? '');
    if (position >= 0) setImageIndex(position);
  };
  const pickImage = (position: number) => {
    setImageIndex(position);
    setColorName(watch.colors.find(color => color.image === watch.images[position])?.name ?? colorName);
  };

  const later = (callback: () => void, ms: number) => timers.current.push(setTimeout(callback, ms));
  const addToBag = () => {
    if (soldOut) return setNotifyOpen(true);
    if (!user) return redirectToLogin();
    if (phase !== 'idle') return;
    setPhase('loading');
    const started = Date.now();
    add.mutate(
      { watchId: watch.id, quantity, productColor: colorName, strapType, strapColor: strapType ? strapColor : null },
      {
        onSuccess: () => {
          const wait = Math.max(0, 700 - (Date.now() - started));
          later(() => setPhase('added'), wait);
          setTimeout(openBag, wait + 600);
          later(() => setPhase('idle'), wait + 1300);
        },
        onError: () => setPhase('idle'),
      }
    );
  };

  const addButton = (className: string) => (
    <button
      onClick={addToBag}
      aria-label={soldOut ? 'Notify me when available' : 'Add to bag'}
      className={cx('flex items-center justify-center gap-2.5 rounded-card border font-semibold transition-colors duration-300', soldOut ? 'border-ink-muted bg-surface text-ink' : phase === 'added' ? 'border-transparent bg-success text-on-primary' : 'border-transparent bg-primary text-on-primary hover:bg-primary-hover', className)}
    >
      {phase === 'loading' ? (
        <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/35 border-t-white" />
      ) : (
        <>
          <span>{soldOut ? 'Notify me when available' : phase === 'added' ? 'Added to bag' : 'Add to bag'}</span>
          {!soldOut && phase === 'idle' && <span className="font-normal tabular-nums opacity-80">{formatMoney(price * quantity)}</span>}
        </>
      )}
    </button>
  );

  const wishButton = (className: string) => (
    <button onClick={() => toggle(watch.id)} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'} aria-pressed={saved} className={cx('grid place-items-center rounded-card border border-line bg-surface', className)}>
      <Icon name="heart" size={20} fill={saved ? 'var(--color-danger)' : 'none'} className={saved ? 'text-danger' : 'text-ink'} />
    </button>
  );

  return (
    <>
      <div className="mt-4 grid gap-6 md:mt-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-14">
        <Gallery watch={watch} index={imageIndex} onIndex={pickImage} />

        <div className="flex flex-col gap-5 lg:sticky lg:top-[108px] lg:gap-[22px]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Eyebrow>
                {watch.brand.name} · {watch.category.name}
              </Eyebrow>
              <span className="text-xs text-ink-secondary">Ref. {watch.sku}</span>
            </div>
            <h1 className="font-display text-4xl leading-[1.02] font-normal text-balance md:text-5xl md:leading-[1.04] md:font-medium">{watch.name}</h1>
            <div className="flex items-center gap-2 text-[13px] text-ink-secondary md:text-sm">
              <Stars value={watch.rating.average} />
              {watch.rating.average !== null && <span className="font-medium text-ink">{watch.rating.average.toFixed(1)}</span>}
              <span aria-hidden="true">·</span>
              <a href="#reviews" className="underline underline-offset-[3px]">
                {reviewSummary}
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:border-y lg:border-line lg:py-5">
            <PriceTag watch={watch} saving className="text-[28px] tracking-[-0.01em] lg:text-[34px] [&>span:first-child]:text-[1em] [&>span:nth-child(2)]:text-base lg:[&>span:nth-child(2)]:text-lg" />
            <p className={cx('flex items-center gap-2 text-[13px] font-medium md:text-sm', { success: 'text-success', warning: 'text-warning-ink', muted: 'text-ink-secondary' }[stock.tone])}>
              <span className={cx('h-2 w-2 rounded-full', { success: 'bg-success', warning: 'bg-warning', muted: 'bg-ink-muted' }[stock.tone])} />
              {stock.text}
            </p>
          </div>

          {watch.isLimitedEdition && (
            <Alert tone="brand" className="text-sm">
              Limited edition. Each case is individually numbered and ships with a signed certificate.
            </Alert>
          )}

          {watch.colors.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className={cx(optionLabel, 'justify-between lg:justify-start')}>
                <span className="text-ink-secondary">Colour</span>
                <span className="font-medium">{colorName}</span>
              </p>
              <div className="flex gap-3 md:gap-3">
                {watch.colors.map(color => (
                  <button key={color.name} onClick={() => pickColor(color.name)} aria-label={color.name} aria-pressed={color.name === colorName} className="grid h-11 w-11 place-items-center">
                    <span className={cx('h-8 w-8 rounded-full transition-shadow duration-200 md:h-[34px] md:w-[34px]', color.name === colorName ? 'shadow-[0_0_0_2px_var(--color-surface),0_0_0_3.5px_var(--color-primary)]' : 'shadow-[0_0_0_1px_var(--color-line)]')} style={{ backgroundColor: color.hex }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {strapOptions.length > 1 && (
            <div className="flex flex-col gap-3">
              <p className={cx(optionLabel, 'justify-between lg:justify-start')}>
                <span className="text-ink-secondary">Strap</span>
                <span className="font-medium">{strapOptions.find(option => option.type === strapType)?.label}</span>
              </p>
              <div className={cx('grid gap-2.5 lg:gap-3', strapOptions.length > 2 ? 'grid-cols-3' : 'grid-cols-2')} role="radiogroup" aria-label="Strap">
                {strapOptions.map(option => (
                  <button key={option.label} role="radio" aria-checked={option.type === strapType} onClick={() => setStrapType(option.type)} className={cx('flex min-h-24 flex-col items-start gap-2.5 rounded-card border-[1.5px] p-3.5 text-left transition-colors lg:min-h-[72px] lg:flex-row lg:items-center lg:gap-3.5 lg:px-4', option.type === strapType ? 'border-primary bg-primary-tint text-primary' : 'border-line bg-surface text-ink-secondary')}>
                    {option.type ? STRAP_ICONS[option.type] : <Icon name="watch" size={22} />}
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-ink">{option.label}</span>
                      <span className="text-xs text-ink-secondary">{option.detail}</span>
                    </span>
                  </button>
                ))}
              </div>
              {strapType && (
                <div className="flex gap-3" role="radiogroup" aria-label="Strap colour">
                  {STRAP_COLORS.map(color => (
                    <button key={color.name} role="radio" aria-checked={color.name === strapColor} onClick={() => setStrapColor(color.name)} aria-label={`${color.name} strap`} title={color.name} className="grid h-11 w-11 place-items-center">
                      <span className={cx('h-8 w-8 rounded-full', color.name === strapColor ? 'shadow-[0_0_0_2px_var(--color-surface),0_0_0_3.5px_var(--color-primary)]' : 'shadow-[0_0_0_1px_var(--color-line)]')} style={{ backgroundColor: color.hex }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!soldOut && (
            <div className="flex items-center justify-between md:hidden">
              <span className="text-[13px] text-ink-secondary">Quantity</span>
              <QuantityStepper value={quantity} max={watch.stock} onChange={setQuantity} />
            </div>
          )}

          <div className="hidden gap-3 md:flex">
            {!soldOut && <QuantityStepper value={quantity} max={watch.stock} onChange={setQuantity} size="lg" />}
            {addButton('h-14 flex-1 text-base')}
            {wishButton('h-14 w-14')}
          </div>

          {soldOut && notifyOpen && <NotifyMe watch={watch} defaultEmail={user?.email ?? ''} />}

          <div className="grid grid-cols-3 gap-2.5">
            {PERKS.map(perk => (
              <p key={perk.text} className="flex flex-col items-start gap-2 rounded-card border border-line bg-surface p-3 text-xs text-ink-secondary lg:flex-row lg:items-center lg:gap-2.5 lg:text-[13px]">
                <Icon name={perk.icon} size={18} strokeWidth={1.6} className="shrink-0 text-primary" />
                {perk.text}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        {wishButton('h-14 w-14 shrink-0')}
        {addButton('h-14 flex-1 text-[15px]')}
      </div>
    </>
  );
};
