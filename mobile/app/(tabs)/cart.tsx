import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CartLineRow } from '@/components/CartLine';
import { Icon } from '@/components/Icon';
import { PageHeading, TabPage, TabRequireAuth } from '@/components/Page';
import { CouponBox, TotalsSummary } from '@/components/Summary';
import { Alert, Button, Card, EmptyState, Loading, Text } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useLineAvailability, useQuote } from '@/lib/checkout';
import { cartCount, useCart, useCartActions, useWishlist, useWishlistToggle } from '@/lib/shop';
import { colors, spacing } from '@/theme';

function CartContent() {
  const router = useRouter();
  const toast = useToast();
  const { data, isPending, refetch, isRefetching } = useCart();
  const { setQuantity, remove } = useCartActions();
  const wishlist = useWishlist();
  const { toggle, isSaved } = useWishlistToggle();
  const quote = useQuote();
  const availableFor = useLineAvailability();

  if (isPending) return <TabPage><Loading /></TabPage>;

  const lines = data ?? [];
  const count = cartCount(lines);
  const soldOut = lines.filter(line => availableFor(line) === 0);

  const saveForLater = (line: (typeof lines)[number]) => {
    if (!isSaved(line.watch.id) && wishlist.isSuccess) toggle(line.watch);
    remove.mutate(line.id, { onSuccess: () => toast('success', `${line.watch.name} moved to your wishlist`) });
  };

  return (
    <TabPage refreshing={isRefetching} onRefresh={refetch}>
      <PageHeading title="Your bag" aside={`${count} ${count === 1 ? 'watch' : 'watches'}`} />
      {lines.length > 0 ? (
        <>
          {soldOut.length > 0 && (
            <Alert
              tone="danger"
              icon="alert"
              action={<Button label="Remove it" variant="danger" size="sm" onPress={() => soldOut.forEach(line => remove.mutate(line.id))} style={styles.removeSold} />}
            >
              {`${soldOut.map(line => line.watch.name).join(', ')} sold out while it was in your bag. Remove it to check out.`}
            </Alert>
          )}
          <Card style={styles.lines}>
            {lines.map(line => (
              <CartLineRow
                key={line.id}
                line={line}
                available={availableFor(line)}
                onQuantity={quantity => setQuantity.mutate({ id: line.id, quantity })}
                onRemove={() => remove.mutate(line.id, { onSuccess: () => toast('success', `${line.watch.name} removed`) })}
                onSave={() => saveForLater(line)}
              />
            ))}
            <View style={styles.shipping}>
              <Icon name="truck" size={16} color={colors.success} strokeWidth={1.8} />
              <Text variant="label" color={colors.successInk} style={styles.shippingText}>Standard shipping is free on every order.</Text>
            </View>
          </Card>
          <Card style={styles.summary}>
            <Text variant="strong" style={styles.summaryTitle}>Order summary</Text>
            <CouponBox totals={quote.data} />
            <TotalsSummary totals={quote.data} />
            <Button label="Checkout" icon="lock" size="cta" disabled={soldOut.length > 0} onPress={() => router.push('/checkout')} />
            <Text variant="small" align="center">Pay by card through Stripe, or cash on delivery for orders under $3,000.</Text>
          </Card>
        </>
      ) : (
        <EmptyState
          icon="bag"
          title="Your bag is empty"
          message="Watches you add will appear here. Your wishlist is saved on your account."
          actions={
            <>
              <Button label="Shop all watches" size="lg" onPress={() => router.navigate('/shop')} />
              <Button label={`View wishlist · ${wishlist.data?.length ?? 0}`} variant="outline" size="lg" onPress={() => router.navigate('/wishlist')} />
            </>
          }
        />
      )}
    </TabPage>
  );
}

export default function CartScreen() {
  return (
    <TabRequireAuth>
      <CartContent />
    </TabRequireAuth>
  );
}

const styles = StyleSheet.create({
  removeSold: { alignSelf: 'flex-start' },
  lines: { overflow: 'hidden' },
  shipping: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 18, backgroundColor: colors.successSurface },
  shippingText: { flex: 1, fontSize: 13 },
  summary: { gap: spacing.lg, padding: 22 },
  summaryTitle: { fontSize: 16 },
});
