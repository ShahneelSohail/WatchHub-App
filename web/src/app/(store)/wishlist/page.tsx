'use client';

import { RequireAuth } from '@/components/RequireAuth';
import { EmptyState, LinkButton, PageHeading, Spinner } from '@/components/ui';
import { WatchGrid } from '@/components/WatchCard';
import { useWishlist } from '@/lib/shop';

const WishlistContent = () => {
  const { data: watches, isPending } = useWishlist();
  if (isPending) return <Spinner />;
  if (!watches?.length) return <EmptyState title="Your wishlist is empty" description="Tap the heart on any watch to save it for later." action={<LinkButton href="/watches">Browse watches</LinkButton>} />;
  return <WatchGrid watches={watches} />;
};

export default function WishlistPage() {
  return (
    <RequireAuth>
      <PageHeading eyebrow="Saved for later" title="Wishlist" />
      <WishlistContent />
    </RequireAuth>
  );
}
