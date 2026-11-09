'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ProductReviews } from '@/components/ProductReviews';
import { ProductView } from '@/components/ProductView';
import { Breadcrumb, EmptyState, Eyebrow, LinkButton, Spinner } from '@/components/ui';
import { WatchGrid } from '@/components/WatchCard';
import { api, withQuery } from '@/lib/api';
import type { Watch } from '@/lib/types';

const Specifications = ({ watch }: { watch: Watch }) => {
  const rows = [['Reference', watch.sku], ...Object.entries(watch.specifications), ['Warranty', 'Two years, international']];
  return (
    <section className="grid gap-8 pt-14 md:pt-[88px] lg:grid-cols-2 lg:gap-14">
      <div className="flex flex-col gap-3.5">
        <Eyebrow tone="muted">About this watch</Eyebrow>
        <p className="font-display text-2xl leading-[1.4] text-pretty md:text-[28px]">{watch.description}</p>
      </div>
      <div>
        <Eyebrow tone="muted" className="mb-2">
          Specifications
        </Eyebrow>
        <dl className="rounded-card border border-line bg-surface">
          {rows.map(([name, value]) => (
            <div key={name} className="grid grid-cols-[130px_1fr] gap-4 border-b border-line px-5 py-3.5 text-sm last:border-b-0 md:grid-cols-[180px_1fr]">
              <dt className="text-ink-secondary">{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

const Related = ({ watch }: { watch: Watch }) => {
  const related = useQuery({ queryKey: ['watches', 'related', watch.category.id], queryFn: () => api.get<Watch[]>(withQuery('/watches', { categoryId: watch.category.id, pageSize: 5 })) });
  const items = (related.data ?? []).filter(entry => entry.id !== watch.id).slice(0, 4);
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-6 pt-14 md:pt-[88px]">
      <h2 className="font-display text-3xl font-medium md:text-4xl">You may also like</h2>
      <WatchGrid watches={items} wide />
    </section>
  );
};

export default function WatchDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const watch = useQuery({ queryKey: ['watch', slug], queryFn: () => api.get<Watch>(`/watches/${slug}`) });

  if (watch.isPending) return <Spinner />;
  if (watch.isError) {
    return (
      <div className="wrap py-10">
        <EmptyState title="Watch not found" description={watch.error.message} action={<LinkButton href="/watches">Back to the collection</LinkButton>} />
      </div>
    );
  }
  const data = watch.data;
  const reviewSummary = data.rating.count === 1 ? '1 review' : data.rating.count > 0 ? `${data.rating.count} reviews` : 'No reviews yet';
  return (
    <div className="wrap pt-4 pb-32 md:pt-8 md:pb-24">
      <div className="hidden md:block">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'All watches', href: '/watches' }, { label: data.name }]} />
      </div>
      <ProductView key={data.id} watch={data} reviewSummary={reviewSummary} />
      <Specifications watch={data} />
      <ProductReviews watch={data} />
      <Related watch={data} />
    </div>
  );
}
