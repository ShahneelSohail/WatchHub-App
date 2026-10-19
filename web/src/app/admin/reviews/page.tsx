'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useToast } from '@/components/Providers';
import { Badge, Button, Card, EmptyState, Input, PageHeading, Pagination, Select, Spinner, Stars } from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { AdminReview } from '@/lib/types';

const ReviewCard = ({ review, onChange }: { review: AdminReview; onChange: () => void }) => {
  const toast = useToast();
  const [reply, setReply] = useState(review.adminReply ?? '');
  const patch = useMutation({
    mutationFn: (body: object) => api.patch(`/admin/reviews/${review.id}`, body),
    onSuccess: () => {
      onChange();
      toast('success', 'Review updated.');
    },
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/reviews/${review.id}`),
    onSuccess: () => {
      onChange();
      toast('success', 'Review deleted.');
    },
  });

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Stars value={review.rating} />
          <Badge value={review.status} />
        </div>
        <span className="text-xs text-faint">{formatDate(review.createdAt)}</span>
      </div>
      <p className="text-sm">{review.comment}</p>
      <p className="text-xs text-muted">
        {review.user.name} ({review.user.email}) on{' '}
        <Link href={`/watches/${review.watch.slug}`} className="text-navy hover:underline">
          {review.watch.name}
        </Link>
      </p>
      <div className="flex gap-2">
        <Input value={reply} onChange={event => setReply(event.target.value)} placeholder="Reply publicly as WatchHub" aria-label="Reply" />
        <Button variant="secondary" onClick={() => patch.mutate({ adminReply: reply })} disabled={patch.isPending}>
          Save reply
        </Button>
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" className="px-0 py-0" onClick={() => patch.mutate({ status: review.status === 'APPROVED' ? 'HIDDEN' : 'APPROVED' })}>
          {review.status === 'APPROVED' ? 'Hide from store' : 'Show in store'}
        </Button>
        <Button variant="ghost" className="px-0 py-0 hover:text-red-700" onClick={() => window.confirm('Delete this review permanently?') && remove.mutate()}>
          Delete
        </Button>
      </div>
    </Card>
  );
};

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const reviews = useQuery({ queryKey: ['admin', 'reviews', status, page], queryFn: () => api.page<AdminReview>(withQuery('/admin/reviews', { status, page, pageSize: 10 })), placeholderData: previous => previous });

  return (
    <>
      <PageHeading eyebrow="Moderation" title="Reviews" />
      <Select
        value={status}
        onChange={event => {
          setStatus(event.target.value);
          setPage(1);
        }}
        aria-label="Filter by status"
        className="mb-4 max-w-44"
      >
        <option value="">All reviews</option>
        <option value="APPROVED">Visible</option>
        <option value="HIDDEN">Hidden</option>
      </Select>
      {reviews.isPending ? (
        <Spinner />
      ) : reviews.data?.items.length === 0 ? (
        <EmptyState title="No reviews yet" />
      ) : (
        <>
          <div className="space-y-4">
            {reviews.data?.items.map(review => (
              <ReviewCard key={`${review.id}-${review.status}-${review.adminReply}`} review={review} onChange={() => queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] })} />
            ))}
          </div>
          {reviews.data && <Pagination meta={reviews.data.meta} onChange={setPage} />}
        </>
      )}
    </>
  );
}
