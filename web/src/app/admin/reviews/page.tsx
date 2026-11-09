'use client';

import { useMemo, useState } from 'react';
import { useSearchTerm } from '@/components/admin/chrome';
import { Alert, Button, EmptyBlock, IconButton, Skeleton, Tabs, TextArea } from '@/components/admin/controls';
import { useAction, useAllReviews, useAllWatches } from '@/components/admin/data';
import { Icon } from '@/components/admin/icons';
import { FormModal } from '@/components/admin/overlays';
import { Pill } from '@/components/admin/pills';
import { TableFooter } from '@/components/admin/table';
import { matchesQuery, pluralize, shortDate } from '@/components/admin/utils';
import { cx } from '@/components/ui';
import { api } from '@/lib/api';
import type { AdminReview } from '@/lib/types';

type Filter = 'all' | 'reply' | 'visible' | 'hidden';

const PAGE_SIZE = 10;
const FILTERS: Record<Filter, { label: string; test: (review: AdminReview) => boolean }> = {
  all: { label: 'All', test: () => true },
  reply: { label: 'Needs reply', test: review => !review.adminReply && review.status === 'APPROVED' },
  visible: { label: 'Visible', test: review => review.status === 'APPROVED' },
  hidden: { label: 'Hidden', test: review => review.status === 'HIDDEN' },
};

const Stars = ({ value }: { value: number }) => (
  <span className="flex gap-0.5 text-link" role="img" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map(star => (
      <Icon key={star} name="reviews" size={14} strokeWidth={1.5} filled={star <= value} />
    ))}
  </span>
);

interface ReviewCardProps {
  review: AdminReview;
  image?: string;
  index: number;
  replying: boolean;
  onReply: () => void;
  onCancelReply: () => void;
  onDelete: () => void;
}

const ReviewCard = ({ review, image, index, replying, onReply, onCancelReply, onDelete }: ReviewCardProps) => {
  const [draft, setDraft] = useState(review.adminReply ?? '');
  const hidden = review.status === 'HIDDEN';
  const patch = useAction((body: { status: AdminReview['status'] } | { adminReply: string }) => api.patch(`/admin/reviews/${review.id}`, body), {
    success: (_, body) => ('adminReply' in body ? 'Reply published' : body.status === 'HIDDEN' ? 'Review hidden from the store' : 'Review visible on the product page'),
    onSuccess: (_, body) => 'adminReply' in body && onCancelReply(),
  });

  return (
    <article className="grid animate-rise grid-cols-[56px_minmax(0,1fr)_auto] gap-4 border-b border-line p-5" style={{ animationDelay: `${index * 30}ms` }}>
      {image ? <img src={image} alt="" className={cx('size-14 rounded-card bg-line object-cover', hidden && 'opacity-60')} /> : <span className="size-14 rounded-card bg-line" />}
      <div className={cx('flex min-w-0 flex-col gap-1.5', hidden && 'opacity-60')}>
        <div className="flex flex-wrap items-center gap-2.5">
          <Stars value={review.rating} />
          {hidden && (
            <Pill tone="neutral" size="sm" dashed>
              Hidden
            </Pill>
          )}
        </div>
        <p className="max-w-[760px] text-sm leading-[1.55] text-ink-secondary">{review.comment}</p>
        <span className="text-xs text-ink-secondary">
          {review.user.name} · {review.watch.name} · {shortDate(review.createdAt)}
        </span>
        {review.adminReply && !replying && (
          <div className="mt-1.5 flex max-w-[760px] flex-col gap-1 rounded-card bg-page px-3.5 py-3">
            <span className="text-[11px] font-semibold tracking-[0.1em] text-link uppercase">WatchHub replied</span>
            <span className="text-sm leading-normal">{review.adminReply}</span>
          </div>
        )}
        {replying && (
          <div className="mt-1.5 flex max-w-[760px] animate-rise flex-col gap-2">
            <TextArea rows={3} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a public reply" aria-label="Public reply" maxLength={500} />
            <div className="flex justify-end gap-2">
              <Button size="sm" className="h-[34px] text-[13px]" onClick={onCancelReply}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" className="h-[34px] text-[13px]" disabled={!draft.trim() || patch.isPending} onClick={() => patch.mutate({ adminReply: draft.trim() })}>
                Publish reply
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-start gap-1.5">
        <Button variant="soft" size="sm" onClick={onReply}>
          {review.adminReply ? 'Edit reply' : 'Reply'}
        </Button>
        <Button size="sm" disabled={patch.isPending} onClick={() => patch.mutate({ status: hidden ? 'APPROVED' : 'HIDDEN' })}>
          {hidden ? 'Show' : 'Hide'}
        </Button>
        <IconButton icon="trash" label="Delete review" framed tone="danger" onClick={onDelete} />
      </div>
    </article>
  );
};

export default function AdminReviewsPage() {
  const q = useSearchTerm();
  const reviews = useAllReviews();
  const watches = useAllWatches().data;
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [replyId, setReplyId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<AdminReview | null>(null);

  const remove = useAction((review: AdminReview) => api.delete(`/admin/reviews/${review.id}`), { success: 'Review deleted', onSuccess: () => setDeleting(null) });

  const base = useMemo(() => (reviews.data ?? []).filter(review => matchesQuery(q, review.comment, review.user.name, review.watch.name)), [reviews.data, q]);
  const filtered = base.filter(FILTERS[filter].test);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const imageOf = (watchId: number) => watches?.find(watch => watch.id === watchId)?.images[0];

  const choose = (next: Filter) => {
    setFilter(next);
    setPage(1);
    setReplyId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs label="Review filter" value={filter} onChange={choose} tabs={(Object.keys(FILTERS) as Filter[]).map(key => ({ value: key, label: FILTERS[key].label, count: reviews.data ? base.filter(FILTERS[key].test).length : undefined }))} />
      <div className="rounded-card border border-line bg-surface">
        {reviews.isError && (
          <div className="p-5">
            <Alert tone="red" role="alert">
              {reviews.error.message}
            </Alert>
          </div>
        )}
        {reviews.isPending && (
          <div className="flex flex-col gap-4 p-5">
            {[0, 1, 2].map(index => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        )}
        {visible.map((review, index) => (
          <ReviewCard
            key={review.id}
            review={review}
            image={imageOf(review.watch.id)}
            index={index}
            replying={replyId === review.id}
            onReply={() => setReplyId(review.id)}
            onCancelReply={() => setReplyId(null)}
            onDelete={() => setDeleting(review)}
          />
        ))}
        {reviews.data && filtered.length === 0 && <EmptyBlock title="Nothing here" description="Every review in this view is handled." />}
        {reviews.data && <TableFooter summary={pluralize(filtered.length, 'review')} page={current} totalPages={totalPages} onPage={setPage} />}
      </div>
      {deleting && (
        <FormModal title="Delete this review?" sub="The review is removed for good. Hide it instead if you may need it later." cta="Delete review" tone="danger" busy={remove.isPending} onSubmit={() => remove.mutate(deleting)} onClose={() => setDeleting(null)} />
      )}
    </div>
  );
}
