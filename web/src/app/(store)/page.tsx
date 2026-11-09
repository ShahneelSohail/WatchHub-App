'use client';

import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import { HomeHero } from '@/components/HomeHero';
import { Icon, type IconName } from '@/components/Icon';
import { useToast } from '@/components/Providers';
import { Button, cx, Eyebrow, Input, SectionHeading, Skeleton, Stars } from '@/components/ui';
import { WatchCardSkeleton, WatchGrid } from '@/components/WatchCard';
import { api } from '@/lib/api';
import type { Banner, Brand, Category, Review, Watch } from '@/lib/types';

const PERKS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'truck', title: 'Free shipping', text: 'On every order' },
  { icon: 'shield', title: '2-year warranty', text: 'International' },
  { icon: 'lock', title: 'Secure checkout', text: 'Card or cash on delivery' },
  { icon: 'rotate', title: '30-day returns', text: 'Free collection' },
];

const Section = ({ children, className }: { children: ReactNode; className?: string }) => <section className={cx('wrap flex flex-col gap-5 pt-12 md:gap-7 md:pt-[88px]', className)}>{children}</section>;

const CategoryTile = ({ category, index, image }: { category: Category; index: number; image?: string }) => (
  <Link href={`/watches?categoryId=${category.id}`} className="group relative h-[228px] w-[168px] shrink-0 snap-start overflow-hidden rounded-card bg-primary-dark text-on-primary md:h-[340px] md:w-auto">
    {image && <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.04]" />}
    <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,20,66,0)_35%,rgba(13,20,66,.92))]" />
    <span className="absolute top-3 left-3 text-[11px] font-semibold md:top-4 md:left-4 md:text-xs">{String(index + 1).padStart(2, '0')}</span>
    <span className="absolute inset-x-3.5 bottom-3.5 flex flex-col gap-0.5 md:inset-x-[18px] md:bottom-[18px] md:gap-1">
      <span className="font-display text-[22px] md:text-[28px]">{category.name}</span>
      <span className="text-xs text-primary-tint md:text-[13px]">{category.watchCount === 1 ? '1 watch' : `${category.watchCount ?? 0} watches`}</span>
    </span>
  </Link>
);

const Newsletter = () => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const subscribe = useMutation({ mutationFn: () => api.post('/newsletter', { email }), onError: (error: Error) => toast('error', error.message) });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (/^\S+@\S+\.\S+$/.test(email)) subscribe.mutate();
    else toast('error', 'Enter a valid email address');
  };

  return (
    <section className="wrap pt-12 pb-16 md:pt-[72px] md:pb-24">
      <div className="grid items-center gap-4 rounded-card border border-line bg-surface p-[22px] md:grid-cols-2 md:gap-12 md:border-0 md:bg-primary-tint md:px-14 md:py-12">
        <div className="flex flex-col gap-2.5">
          <h2 className="font-display text-[26px] leading-[1.1] font-medium md:text-[34px] md:text-primary">Early access to limited releases</h2>
          <p className="text-sm leading-normal text-ink-secondary md:text-[15px]">One email a month. New references, restocks and private sales.</p>
        </div>
        {subscribe.isSuccess ? (
          <p role="status" className="flex items-center gap-2.5 rounded-card border border-success-border bg-success-surface p-4 text-[15px] text-success-ink">
            <Icon name="check" size={18} strokeWidth={2} className="text-success" />
            You’re on the list. Check your inbox to confirm.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2.5 md:flex-row" noValidate>
            <Input type="email" value={email} onChange={event => setEmail(event.target.value)} aria-label="Email address" placeholder="you@example.com" className="h-12 md:h-[52px] md:flex-1" />
            <Button type="submit" size="lg" loading={subscribe.isPending}>
              Subscribe
            </Button>
          </form>
        )}
      </div>
    </section>
  );
};

export default function HomePage() {
  const banners = useQuery({ queryKey: ['banners'], queryFn: () => api.get<Banner[]>('/banners') });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') });
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api.get<Brand[]>('/brands') });
  const featured = useQuery({ queryKey: ['watches', 'featured'], queryFn: () => api.get<Watch[]>('/watches?featured=true&pageSize=8') });
  const catalogue = useQuery({ queryKey: ['watches', 'catalogue'], queryFn: () => api.get<Watch[]>('/watches?pageSize=60') });

  const rated = (featured.data ?? []).filter(watch => watch.rating.count > 0);
  const quotes = useQueries({ queries: rated.slice(0, 2).map(watch => ({ queryKey: ['reviews', watch.id, 'top'], queryFn: () => api.get<Review[]>(`/watches/${watch.id}/reviews?pageSize=1`) })) });
  const reviews = quotes.flatMap(quote => quote.data ?? []);
  const reviewCount = rated.reduce((sum, watch) => sum + watch.rating.count, 0);
  const average = reviewCount ? rated.reduce((sum, watch) => sum + (watch.rating.average ?? 0) * watch.rating.count, 0) / reviewCount : null;
  const craftImage = featured.data?.[0]?.images[1] ?? featured.data?.[0]?.images[0];
  const categoryImage = (category: Category) => category.imageUrl ?? catalogue.data?.find(watch => watch.category.id === category.id)?.images[0];

  return (
    <div>
      {banners.isPending ? <Skeleton className="h-[600px] md:h-[640px]" /> : <HomeHero banners={banners.data ?? []} />}

      <section className="border-b border-line bg-surface">
        <div className="wrap grid grid-cols-2 md:grid-cols-4">
          {PERKS.map(perk => (
            <div key={perk.title} className="flex items-start gap-3 border-b border-line px-1 py-[18px] md:items-center md:gap-3.5 md:border-b-0 md:py-[26px]">
              <span className="grid shrink-0 place-items-center text-primary md:h-11 md:w-11 md:rounded-full md:bg-primary-tint">
                <Icon name={perk.icon} size={20} strokeWidth={1.6} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium md:text-sm md:font-semibold">{perk.title}</span>
                <span className="text-xs leading-snug text-ink-secondary md:text-[13px]">{perk.text}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <Section>
        <SectionHeading eyebrow="Collections" title="Shop by category" href="/watches" linkLabel="View all watches" />
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0">
          {categories.data?.map((category, index) => (
            <CategoryTile key={category.id} category={category} index={index} image={categoryImage(category)} />
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Selected" title="Featured watches" href="/watches?featured=true" linkLabel="View all" />
        {featured.isPending ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 xl:grid-cols-4 xl:gap-6">
            {Array.from({ length: 4 }, (_, index) => (
              <WatchCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <WatchGrid watches={featured.data?.slice(0, 4) ?? []} wide />
        )}
      </Section>

      {craftImage && (
        <section className="wrap pt-12 md:pt-[88px]">
          <div className="grid overflow-hidden rounded-card border border-line bg-surface md:grid-cols-[1.2fr_1fr]">
            <img src={craftImage} alt="A WatchHub watch on the workbench" loading="lazy" className="h-[260px] w-full bg-line object-cover md:h-full md:min-h-[440px]" />
            <div className="flex flex-col justify-center gap-3.5 px-5 pt-6 pb-7 md:gap-5 md:p-16">
              <Eyebrow>The WatchHub standard</Eyebrow>
              <h2 className="font-display text-[32px] leading-[1.08] font-medium text-balance md:text-[42px] md:leading-[1.1]">Every watch is inspected, regulated and boxed by hand.</h2>
              <p className="text-[15px] leading-relaxed text-pretty text-ink-secondary md:text-base">We test accuracy over five days in five positions before a watch leaves our workshop. If it drifts outside the maker’s tolerance, it doesn’t ship.</p>
            </div>
          </div>
        </section>
      )}

      <Section className="gap-2 md:gap-7">
        <Eyebrow tone="muted" className="mb-3 md:mb-0">
          Our houses
        </Eyebrow>
        <div className="grid border-t border-line md:grid-cols-4">
          {brands.data?.map((brand, index) => (
            <Link key={brand.id} href={`/watches?brandId=${brand.id}`} className="grid min-h-11 grid-cols-[28px_1fr_20px] items-center gap-3 border-b border-line py-[18px] hover:text-primary md:flex md:flex-col md:items-start md:gap-2.5 md:border-b-0 md:py-7 md:pr-6">
              <span className="text-[11px] font-semibold text-ink-secondary md:text-xs md:text-ink-muted">{String(index + 1).padStart(2, '0')}</span>
              <span className="flex flex-col gap-1">
                <span className="font-display text-2xl md:text-[32px]">{brand.name}</span>
                <span className="text-[13px] leading-normal text-ink-secondary md:text-sm">{brand.description}</span>
              </span>
              <Icon name="arrowUpRight" size={18} strokeWidth={1.6} className="text-primary md:hidden" />
            </Link>
          ))}
        </div>
      </Section>

      {reviews.length > 0 && (
        <section className="wrap flex flex-col gap-4 pt-12 md:grid md:grid-cols-2 md:gap-6 md:pt-[72px]">
          {average !== null && (
            <Eyebrow tone="muted" className="md:hidden">
              {average.toFixed(1)} average from {reviewCount} reviews
            </Eyebrow>
          )}
          {reviews.map(review => (
            <figure key={review.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface px-5 py-[22px] md:gap-4 md:p-9">
              <Stars value={review.rating} />
              <blockquote className="font-display text-xl leading-[1.3] md:text-2xl md:leading-[1.35]">“{review.comment}”</blockquote>
              <figcaption className="text-xs text-ink-secondary md:text-[13px]">{review.user.name} · Verified buyer</figcaption>
            </figure>
          ))}
        </section>
      )}

      <Newsletter />
    </div>
  );
}
