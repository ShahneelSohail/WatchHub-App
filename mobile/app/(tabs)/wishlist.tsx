import { useRouter } from 'expo-router';
import { PageHeading, TabPage, TabRequireAuth } from '@/components/Page';
import { Button, EmptyState, Loading } from '@/components/ui';
import { TileGrid } from '@/components/WatchCard';
import { useNotifyMe } from '@/lib/notify';
import { useQuickAdd, useWishlist } from '@/lib/shop';

function WishlistContent() {
  const router = useRouter();
  const quickAdd = useQuickAdd();
  const notifyMe = useNotifyMe();
  const { data, isPending, refetch, isRefetching } = useWishlist();
  const watches = data ?? [];

  return (
    <TabPage refreshing={isRefetching} onRefresh={refetch}>
      <PageHeading title="Wishlist" aside={data ? `${watches.length} ${watches.length === 1 ? 'watch' : 'watches'}` : undefined} />
      {isPending ? (
        <Loading />
      ) : watches.length > 0 ? (
        <TileGrid
          watches={watches}
          renderAction={watch =>
            watch.stock === 0 ? (
              <Button label={notifyMe.isNotified(watch.id) ? 'We’ll email you' : 'Notify me'} variant="outline" fill disabled={notifyMe.isNotified(watch.id)} onPress={() => notifyMe.request(watch)} />
            ) : (
              <Button label="Add to bag" fill onPress={() => quickAdd(watch)} />
            )
          }
        />
      ) : (
        <EmptyState
          icon="heart"
          title="Nothing saved yet"
          message="Tap the heart on any watch to keep it here. We’ll tell you when a saved watch drops in price or comes back in stock."
          actions={<Button label="Browse watches" size="lg" onPress={() => router.navigate('/shop')} />}
        />
      )}
    </TabPage>
  );
}

export default function WishlistScreen() {
  return (
    <TabRequireAuth>
      <WishlistContent />
    </TabRequireAuth>
  );
}
