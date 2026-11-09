'use client';

import { RequireAuth } from '@/components/RequireAuth';
import { EmptyState, LinkButton, PageHeading, Spinner } from '@/components/ui';
import { WatchGrid } from '@/components/WatchCard';
import { useWishlist } from '@/lib/shop';

const WishlistContent = () => {
  const { data: watches, isPending } = useWishlist();
  if (isPending) return <Spinner />;
  if (!watches?.length)
    return (
      <EmptyState
        icon="heart"
        title="Nothing saved yet"
        description="Tap the heart on any watch to keep it here. We’ll tell you when a saved watch drops in price or comes back in stock."
        action={<LinkButton href="/watches" size="lg">Browse watches</LinkButton>}
      />
    );
  return <WatchGrid watches={watches} wide />;
};

export default function WishlistPage() {
  const { data: watches } = useWishlist();
  return (
    <RequireAuth>
      <PageHeading title="Wishlist" action={<span className="text-sm text-ink-secondary">{watches ? `${watches.length} ${watches.length === 1 ? 'watch' : 'watches'}` : ''}</span>} />
      <WishlistContent />
    </RequireAuth>
  );
}
