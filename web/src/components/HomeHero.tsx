'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Banner } from '@/lib/types';
import { Icon } from './Icon';
import { cx } from './ui';

const ROTATE_MS = 6000;
const pad = (value: number) => String(value).padStart(2, '0');

export const HomeHero = ({ banners }: { banners: Banner[] }) => {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches), []);
  useEffect(() => {
    if (banners.length < 2 || reduced) return;
    const timer = setTimeout(() => setIndex(current => (current + 1) % banners.length), ROTATE_MS);
    return () => clearTimeout(timer);
  }, [banners.length, index, reduced]);

  if (banners.length === 0) return null;

  return (
    <section className="relative h-[600px] overflow-hidden bg-primary-dark md:h-[640px]" aria-roledescription="carousel" aria-label="Featured watches">
      {banners.map((banner, position) => {
        const active = position === index;
        return (
          <div key={banner.id} aria-hidden={!active} className={cx('absolute inset-0 transition-opacity duration-[900ms]', active ? 'opacity-100' : 'pointer-events-none opacity-0')}>
            <img src={banner.imageUrl} alt={banner.title ?? 'Featured watch'} className={cx('absolute inset-0 h-full w-full object-cover transition-transform duration-[6500ms] ease-out md:left-auto md:w-[62%]', active ? 'scale-100' : 'scale-[1.06]')} />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,20,66,.35)_0%,rgba(13,20,66,0)_30%,rgba(13,20,66,.45)_58%,var(--color-primary-dark)_100%)] md:bg-[linear-gradient(90deg,var(--color-primary-dark)_38%,rgba(13,20,66,.6)_52%,rgba(13,20,66,0)_75%)]" />
            <div className="wrap relative flex h-full flex-col justify-end gap-3 pb-24 md:justify-center md:gap-5 md:pb-0">
              <p className="text-eyebrow font-semibold uppercase text-primary-tint">Nº {pad(position + 1)} · {banner.eyebrow ?? 'New this season'}</p>
              <h2 className="max-w-[560px] font-display text-[46px] leading-none tracking-[-0.015em] text-balance text-on-primary md:text-display">{banner.title}</h2>
              <p className="max-w-[300px] text-[15px] leading-normal text-pretty text-primary-tint md:max-w-[440px] md:text-lg">{banner.subtitle}</p>
              <div className="mt-1.5 md:mt-2">
                <Link href={banner.watch ? `/watches/${banner.watch.slug}` : (banner.link ?? '/watches')} tabIndex={active ? 0 : -1} className="inline-flex h-12 items-center gap-2.5 rounded-card bg-surface px-[22px] text-sm font-semibold text-primary transition-colors hover:bg-primary-tint md:h-[52px] md:px-[26px] md:text-[15px]">
                  Discover
                  <Icon name="arrowRight" size={16} strokeWidth={1.8} />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
      <div className="absolute inset-x-0 bottom-7 md:bottom-9">
        <div className="wrap flex items-center gap-2 md:gap-2.5">
          <span className="w-[22px] text-[11px] font-semibold text-on-primary md:w-6 md:text-xs">{pad(index + 1)}</span>
          <div className="flex flex-1 gap-2 md:max-w-[360px] md:flex-none md:basis-[360px] md:gap-2.5">
            {banners.map((banner, position) => (
              <button key={banner.id} onClick={() => setIndex(position)} aria-label={`Show banner ${position + 1}`} aria-current={position === index} className="flex h-7 flex-1 items-center">
                <span className="relative block h-0.5 w-full overflow-hidden bg-white/30">
                  <span key={position === index ? `run-${index}` : 'idle'} className={cx('absolute inset-0 origin-left bg-surface', position < index ? 'scale-x-100' : 'scale-x-0', position === index && !reduced && 'animate-bar')} />
                </span>
              </button>
            ))}
          </div>
          <span className="w-[22px] text-right text-[11px] font-semibold text-primary-tint md:w-6 md:text-left md:text-xs">{pad(banners.length)}</span>
        </div>
      </div>
    </section>
  );
};
