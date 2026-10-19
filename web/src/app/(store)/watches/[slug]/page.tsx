'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth, useToast } from '@/components/Providers';
import { Button, Card, EmptyState, ErrorState, Field, LinkButton, Select, Spinner, Stars, Textarea } from '@/components/ui';
import { PriceTag } from '@/components/WatchCard';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useCartActions, useWishlistToggle } from '@/lib/shop';
import type { Review, StrapType, Watch } from '@/lib/types';

const STRAP_COLORS = [
  { name: 'Black', hex: '#1c1c1e' },
  { name: 'Brown', hex: '#6b4428' },
  { name: 'Navy', hex: '#1b2a4a' },
  { name: 'Tan', hex: '#c8a27a' },
];

const swatchClass = (selected: boolean) => `h-8 w-8 rounded-full border-2 transition ${selected ? 'border-navy ring-2 ring-navy/20' : 'border-black/10'}`;

const ReviewForm = ({ watchId }: { watchId: number }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const submit = useMutation({
    mutationFn: () => api.post<Review>(`/watches/${watchId}/reviews`, { rating, comment }),
    onSuccess: () => {
      setComment('');
      toast('success', 'Thanks for your review.');
      queryClient.invalidateQueries({ queryKey: ['reviews', watchId] });
      queryClient.invalidateQueries({ queryKey: ['watch'] });
    },
  });

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        submit.mutate();
      }}
      className="space-y-4"
    >
      <h3 className="font-serif text-lg">Write a review</h3>
      <Field label="Rating">
        <Select value={rating} onChange={event => setRating(Number(event.target.value))}>
          {[5, 4, 3, 2, 1].map(value => (
            <option key={value} value={value}>
              {value} {value === 1 ? 'star' : 'stars'}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Your review">
        <Textarea value={comment} onChange={event => setComment(event.target.value)} required minLength={5} placeholder="What did you think of this watch?" />
      </Field>
      {submit.isError && <ErrorState message={submit.error.message} />}
      <Button type="submit" disabled={submit.isPending}>
        {submit.isPending ? 'Posting…' : 'Post review'}
      </Button>
    </form>
  );
};

const Reviews = ({ watch }: { watch: Watch }) => {
  const { user } = useAuth();
  const reviews = useQuery({ queryKey: ['reviews', watch.id], queryFn: () => api.get<Review[]>(`/watches/${watch.id}/reviews?pageSize=20`) });

  return (
    <section className="mt-16 grid gap-10 md:grid-cols-[2fr_1fr]">
      <div>
        <h2 className="mb-6 font-serif text-2xl font-semibold">Customer reviews</h2>
        {reviews.isPending ? (
          <Spinner />
        ) : reviews.data?.length === 0 ? (
          <EmptyState title="No reviews yet" description="Customers who have received this watch can leave the first one." />
        ) : (
          <ul className="space-y-4">
            {reviews.data?.map(review => (
              <li key={review.id}>
                <Card>
                  <div className="flex items-center justify-between">
                    <Stars value={review.rating} />
                    <span className="text-xs text-faint">{formatDate(review.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed">{review.comment}</p>
                  <p className="mt-3 text-xs font-medium text-muted">{review.user.name} · Verified purchase</p>
                  {review.adminReply && (
                    <p className="mt-3 rounded-xl bg-sand px-4 py-3 text-sm text-muted">
                      <span className="font-medium text-ink">WatchHub replied:</span> {review.adminReply}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Card className="self-start">
        {user ? <ReviewForm watchId={watch.id} /> : <p className="text-sm text-muted"><Link href={`/login?next=/watches/${watch.slug}`} className="font-medium text-navy hover:underline">Log in</Link> to review a watch you have received.</p>}
      </Card>
    </section>
  );
};

const Purchase = ({ watch }: { watch: Watch }) => {
  const { user } = useAuth();
  const router = useRouter();
  const { add } = useCartActions();
  const { isSaved, toggle } = useWishlistToggle();
  const [colorName, setColorName] = useState(watch.colors[0]?.name ?? null);
  const [strapType, setStrapType] = useState<StrapType | null>(null);
  const [strapColor, setStrapColor] = useState(STRAP_COLORS[0]!.name);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const selectedColor = watch.colors.find(color => color.name === colorName);
  const mainImage = selectedColor?.image ?? watch.images[imageIndex] ?? watch.images[0];
  const strapOptions = [
    { type: null, label: 'Original strap' },
    ...(watch.hasBeltOption ? [{ type: 'BELT' as const, label: 'Leather belt' }] : []),
    ...(watch.hasChainOption ? [{ type: 'CHAIN' as const, label: 'Metal chain' }] : []),
  ];

  const addToCart = () => {
    if (!user) return router.push(`/login?next=/watches/${watch.slug}`);
    add.mutate({ watchId: watch.id, quantity, productColor: colorName, strapType, strapColor: strapType ? strapColor : null });
  };

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div>
        <div className="aspect-square rounded-3xl bg-gradient-to-b from-sand to-ivory p-8">
          <img src={mainImage} alt={watch.name} className="h-full w-full object-contain" />
        </div>
        <div className="mt-4 flex gap-3">
          {watch.images.map((image, index) => (
            <button
              key={image}
              aria-label={`Show image ${index + 1}`}
              onClick={() => {
                setImageIndex(index);
                setColorName(watch.colors.find(color => color.image === image)?.name ?? colorName);
              }}
              className={`h-20 w-20 rounded-xl border bg-ivory p-2 ${image === mainImage ? 'border-navy' : 'border-line'}`}
            >
              <img src={image} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium tracking-wide text-gold uppercase">
          {watch.brand.name} · {watch.category.name}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold">{watch.name}</h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted">
          <Stars value={watch.rating.average} />
          <span>{watch.rating.count > 0 ? `${watch.rating.average} (${watch.rating.count} reviews)` : 'No reviews yet'}</span>
        </div>
        <PriceTag watch={watch} className="mt-5 block text-3xl" />
        {watch.discountPercent !== null && <p className="mt-1 text-sm font-medium text-rose">You save {watch.discountPercent}%</p>}
        <p className="mt-5 leading-relaxed text-muted">{watch.description}</p>

        {watch.colors.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-medium">Colour: <span className="text-muted">{colorName}</span></p>
            <div className="flex gap-3">
              {watch.colors.map(color => (
                <button key={color.name} title={color.name} aria-label={color.name} aria-pressed={color.name === colorName} onClick={() => setColorName(color.name)} className={swatchClass(color.name === colorName)} style={{ backgroundColor: color.hex }} />
              ))}
            </div>
          </div>
        )}

        {strapOptions.length > 1 && (
          <div className="mt-6 space-y-3">
            <Field label="Strap">
              <Select value={strapType ?? ''} onChange={event => setStrapType((event.target.value || null) as StrapType | null)}>
                {strapOptions.map(option => (
                  <option key={option.label} value={option.type ?? ''}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            {strapType && (
              <div className="flex gap-3">
                {STRAP_COLORS.map(color => (
                  <button key={color.name} title={color.name} aria-label={`${color.name} strap`} aria-pressed={color.name === strapColor} onClick={() => setStrapColor(color.name)} className={swatchClass(color.name === strapColor)} style={{ backgroundColor: color.hex }} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {watch.stock > 0 ? (
            <>
              <div className="w-24">
                <Select value={quantity} onChange={event => setQuantity(Number(event.target.value))} aria-label="Quantity">
                  {Array.from({ length: Math.min(watch.stock, 10) }, (_, index) => index + 1).map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={addToCart} disabled={add.isPending} className="flex-1 py-3">
                Add to cart
              </Button>
            </>
          ) : (
            <Button disabled className="flex-1 py-3">
              Sold out
            </Button>
          )}
          <Button variant="secondary" onClick={() => toggle(watch.id)} aria-pressed={isSaved(watch.id)} className="py-3">
            {isSaved(watch.id) ? '♥ Saved' : '♡ Save'}
          </Button>
        </div>
        {watch.stock > 0 && watch.stock <= 5 && <p className="mt-3 text-sm font-medium text-rose">Only {watch.stock} left in stock</p>}

        <dl className="mt-10 divide-y divide-line rounded-2xl border border-line bg-ivory text-sm">
          {Object.entries(watch.specifications).map(([name, value]) => (
            <div key={name} className="flex justify-between gap-4 px-5 py-3">
              <dt className="text-muted">{name}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default function WatchDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const watch = useQuery({ queryKey: ['watch', slug], queryFn: () => api.get<Watch>(`/watches/${slug}`) });

  if (watch.isPending) return <Spinner />;
  if (watch.isError) return <EmptyState title="Watch not found" description={watch.error.message} action={<LinkButton href="/watches">Back to the collection</LinkButton>} />;
  return (
    <>
      <Purchase key={watch.data.id} watch={watch.data} />
      <Reviews watch={watch.data} />
    </>
  );
}
