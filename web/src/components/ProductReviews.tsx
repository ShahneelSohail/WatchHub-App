'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useLoginRedirect } from '@/lib/shop';
import type { Review, Watch } from '@/lib/types';
import { Icon } from './Icon';
import { useAuth, useToast } from './Providers';
import { Button, ErrorState, Field, Spinner, Stars, Textarea } from './ui';

const ReviewForm = ({ watchId, onClose }: { watchId: number; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const submit = useMutation({
    mutationFn: () => api.post<Review>(`/watches/${watchId}/reviews`, { rating, comment }),
    onSuccess: () => {
      toast('success', 'Thanks for your review.');
      queryClient.invalidateQueries({ queryKey: ['reviews', watchId] });
      queryClient.invalidateQueries({ queryKey: ['watch'] });
      onClose();
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (rating) submit.mutate();
  };

  return (
    <form onSubmit={onSubmit} className="mb-4 flex flex-col gap-3.5 rounded-card border border-primary bg-surface p-6 animate-rise">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Your rating</span>
        <button type="button" onClick={onClose} className="text-[13px] text-ink-secondary">
          Cancel
        </button>
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map(value => (
          <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} onClick={() => setRating(value)} className="grid h-10 w-10 place-items-center">
            <Icon name="star" size={26} strokeWidth={1.4} fill={value <= rating ? 'var(--color-primary)' : 'none'} className={value <= rating ? 'text-primary' : 'text-ink-secondary'} />
          </button>
        ))}
      </div>
      <Field label="Your review">
        <Textarea value={comment} onChange={event => setComment(event.target.value)} required minLength={5} rows={4} placeholder="What did you think of this watch?" />
      </Field>
      {submit.isError && <ErrorState message={submit.error.message} />}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-ink-secondary">Only customers who received this watch can review it.</span>
        <Button type="submit" loading={submit.isPending} disabled={!rating}>
          Post review
        </Button>
      </div>
    </form>
  );
};

export const ProductReviews = ({ watch }: { watch: Watch }) => {
  const { user } = useAuth();
  const redirectToLogin = useLoginRedirect();
  const [writing, setWriting] = useState(false);
  const reviews = useQuery({ queryKey: ['reviews', watch.id], queryFn: () => api.get<Review[]>(`/watches/${watch.id}/reviews?pageSize=20`) });
  const list = reviews.data ?? [];
  const distribution = [5, 4, 3, 2, 1].map(star => ({ star, percent: list.length ? Math.round((list.filter(review => review.rating === star).length / list.length) * 100) : 0 }));

  return (
    <section id="reviews" className="grid scroll-mt-28 gap-8 pt-14 md:pt-[88px] lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-14">
      <div className="flex flex-col gap-[18px] rounded-card border border-line bg-surface p-6 lg:p-7">
        <h2 className="font-display text-[32px] font-medium">Customer reviews</h2>
        <div className="flex items-center gap-3.5">
          <span className="font-display text-[56px] leading-none">{watch.rating.average?.toFixed(1) ?? '–'}</span>
          <span className="flex flex-col gap-1">
            <Stars value={watch.rating.average} />
            <span className="text-[13px] text-ink-secondary">{watch.rating.count === 1 ? '1 review' : `${watch.rating.count} reviews`}</span>
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {distribution.map(row => (
            <div key={row.star} className="grid grid-cols-[12px_1fr_34px] items-center gap-2.5 text-xs text-ink-secondary tabular-nums">
              <span>{row.star}</span>
              <span className="relative h-1.5 overflow-hidden rounded-full bg-primary-tint">
                <span className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${row.percent}%` }} />
              </span>
              <span className="text-right">{row.percent}%</span>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={() => (user ? setWriting(true) : redirectToLogin())}>
          Write a review
        </Button>
      </div>
      <div className="flex flex-col">
        {writing && <ReviewForm watchId={watch.id} onClose={() => setWriting(false)} />}
        {reviews.isPending ? (
          <Spinner />
        ) : list.length === 0 ? (
          <p className="rounded-card border border-dashed border-line bg-surface p-8 text-center text-[15px] text-ink-secondary">No reviews yet. Customers who have received this watch can leave the first one.</p>
        ) : (
          list.map(review => (
            <article key={review.id} className="flex flex-col gap-2 border-b border-line py-6 first:pt-0">
              <div className="flex items-center justify-between">
                <Stars value={review.rating} />
                <span className="text-xs text-ink-secondary">{formatDate(review.createdAt)}</span>
              </div>
              <p className="max-w-[680px] text-[15px] leading-relaxed text-ink-secondary">{review.comment}</p>
              <p className="text-[13px] text-ink-secondary">{review.user.name} · Verified buyer</p>
              {review.adminReply && (
                <div className="mt-1.5 flex max-w-[680px] flex-col gap-1 rounded-card bg-primary-tint px-4 py-3.5">
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-primary uppercase">WatchHub replied</span>
                  <span className="text-sm leading-normal">{review.adminReply}</span>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
};
