'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WatchGrid } from '@/components/WatchCard';
import { LinkButton, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Banner, Brand, Category, Watch } from '@/lib/types';

const ROTATE_MS = 6000;

const perks = [
  { title: 'Free shipping', text: 'Standard delivery on every order.' },
  { title: 'Two-year warranty', text: 'Covered against manufacturing defects.' },
  { title: 'Secure checkout', text: 'Card payments handled by Stripe.' },
  { title: '30-day returns', text: 'Changed your mind? Send it back.' },
];

const Hero = ({ banners }: { banners: Banner[] }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => setIndex(current => (current + 1) % banners.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [banners.length]);

  const banner = banners[index];
  if (!banner) return null;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-dark via-navy to-navy-light text-white">
      <div className="grid items-center gap-6 px-8 py-12 md:grid-cols-2 md:px-16 md:py-16">
        <div key={banner.id}>
          <p className="mb-3 text-sm font-medium tracking-[0.2em] text-gold-soft uppercase">New season</p>
          <h1 className="font-serif text-4xl leading-tight font-semibold md:text-6xl">{banner.title}</h1>
          <p className="mt-4 max-w-md text-lg text-white/75">{banner.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href={banner.link ?? '/watches'} variant="gold">
              Discover
            </LinkButton>
            <LinkButton href="/watches" variant="secondary" className="border-white/30 bg-transparent text-white hover:border-white hover:text-white">
              Shop all watches
            </LinkButton>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-6 rounded-full bg-gold-soft/15 blur-2xl" />
          <img src={banner.imageUrl} alt={banner.title ?? 'Featured watch'} className="relative h-full w-full object-contain drop-shadow-2xl" />
        </div>
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2" role="tablist" aria-label="Featured banners">
          {banners.map((item, position) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={position === index}
              aria-label={`Show banner ${position + 1}`}
              onClick={() => setIndex(position)}
              className={`h-2 rounded-full transition-all ${position === index ? 'w-8 bg-gold-soft' : 'w-2 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const SectionHeading = ({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) => (
  <div className="mb-6 flex items-end justify-between">
    <h2 className="font-serif text-2xl font-semibold md:text-3xl">{title}</h2>
    <Link href={href} className="text-sm font-medium text-navy hover:underline">
      {linkLabel} →
    </Link>
  </div>
);

export default function HomePage() {
  const banners = useQuery({ queryKey: ['banners'], queryFn: () => api.get<Banner[]>('/banners') });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') });
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api.get<Brand[]>('/brands') });
  const featured = useQuery({ queryKey: ['watches', 'featured'], queryFn: () => api.get<Watch[]>('/watches?featured=true&pageSize=8') });

  if (featured.isPending || banners.isPending) return <Spinner />;

  return (
    <div className="space-y-16">
      <Hero banners={banners.data ?? []} />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {perks.map(perk => (
          <div key={perk.title} className="rounded-2xl border border-line bg-ivory p-5">
            <p className="font-serif text-lg">{perk.title}</p>
            <p className="mt-1 text-sm text-muted">{perk.text}</p>
          </div>
        ))}
      </section>

      <section>
        <SectionHeading title="Shop by category" href="/watches" linkLabel="All watches" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {categories.data?.map(category => (
            <Link key={category.id} href={`/watches?categoryId=${category.id}`} className="group rounded-2xl border border-line bg-ivory p-5 transition hover:border-navy">
              <p className="font-serif text-xl group-hover:text-navy">{category.name}</p>
              <p className="mt-1 text-sm text-muted">{category.watchCount} watches</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading title="Featured watches" href="/watches?featured=true" linkLabel="View all" />
        <WatchGrid watches={featured.data ?? []} />
      </section>

      <section>
        <SectionHeading title="Our brands" href="/watches" linkLabel="Browse" />
        <div className="grid gap-4 md:grid-cols-4">
          {brands.data?.map(brand => (
            <Link key={brand.id} href={`/watches?brandId=${brand.id}`} className="rounded-2xl border border-line bg-sand p-6 transition hover:border-navy">
              <p className="font-serif text-2xl text-navy">{brand.name}</p>
              <p className="mt-2 text-sm text-muted">{brand.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
