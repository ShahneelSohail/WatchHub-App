import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBag } from '@/components/Bag';
import { AppHeader } from '@/components/Chrome';
import { Gallery } from '@/components/Gallery';
import { Icon, type IconName } from '@/components/Icon';
import { AddToBagButton, ColourPicker, RelatedRail, ReviewsSection, SpecList, StrapPicker, type AddPhase } from '@/components/ProductParts';
import { Alert, Eyebrow, Loading, Stepper, Stars, Text } from '@/components/ui';
import { useWatch, useWatches } from '@/lib/catalog';
import { formatMoney, formatWholeMoney } from '@/lib/format';
import { useNotifyMe } from '@/lib/notify';
import { useCartActions, useRequireAuth, useWishlistToggle } from '@/lib/shop';
import type { StrapType } from '@/lib/types';
import { availableStraps, isSoldOut, priceColor, stockOf, stockStatus, unitPrice } from '@/lib/watch';
import { colors, layout, motion, radius, spacing } from '@/theme';

const MAX_QUANTITY = 10;
const RELATED_COUNT = 5;

const ASSURANCES: { icon: IconName; text: string }[] = [
  { icon: 'truck', text: 'Free shipping, 2–4 days' },
  { icon: 'shield', text: 'Two-year warranty' },
  { icon: 'rotate', text: '30-day returns' },
];

export default function WatchScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { open: openBag } = useBag();
  const requireAuth = useRequireAuth();
  const { add } = useCartActions();
  const notifyMe = useNotifyMe();
  const { isSaved, toggle } = useWishlistToggle();
  const { data: watch, isPending, isError } = useWatch(slug);
  const related = useWatches({ categoryId: watch?.category.id, pageSize: RELATED_COUNT + 1 }, Boolean(watch));

  const scroll = useRef<ScrollView>(null);
  const reviewsAt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [colorIndex, setColorIndex] = useState(0);
  const [strap, setStrap] = useState<StrapType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [phase, setPhase] = useState<AddPhase>('idle');

  useEffect(() => {
    setColorIndex(0);
    setQuantity(1);
    setPhase('idle');
  }, [slug]);

  useEffect(() => {
    if (watch) setStrap(availableStraps(watch).find(option => option.type === 'CHAIN')?.type ?? availableStraps(watch)[0]?.type ?? null);
  }, [watch]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  if (isPending) {
    return (
      <View style={styles.root}>
        <AppHeader back />
        <Loading />
      </View>
    );
  }

  if (isError || !watch) {
    return (
      <View style={styles.root}>
        <AppHeader back />
        <View style={styles.body}>
          <Alert tone="danger" icon="alert">We could not find that watch. It may no longer be in our catalogue.</Alert>
        </View>
      </View>
    );
  }

  const soldOut = isSoldOut(watch, colorIndex);
  const stock = stockStatus(watch, colorIndex);
  const maxQuantity = Math.min(stockOf(watch, colorIndex), MAX_QUANTITY);
  const price = unitPrice(watch);
  const saving = watch.salePrice ? watch.price - watch.salePrice : 0;
  const reviewCount = watch.rating.count;

  const addToBag = () =>
    requireAuth(() => {
      if (soldOut) return notifyMe.request(watch);
      const started = Date.now();
      setPhase('loading');
      add.mutate(
        { watchId: watch.id, quantity, strapType: strap, strapColor: null, productColor: watch.colors[colorIndex]?.name ?? null },
        {
          onSuccess: () => {
            const elapsed = Date.now() - started;
            timers.current.push(
              setTimeout(() => setPhase('added'), Math.max(0, motion.addSpinMs - elapsed)),
              setTimeout(openBag, Math.max(0, motion.addOpenMs - elapsed)),
              setTimeout(() => setPhase('idle'), Math.max(0, motion.addResetMs - elapsed))
            );
          },
          onError: () => setPhase('idle'),
        }
      );
    });

  return (
    <View style={styles.root}>
      <AppHeader
        back
        trailing={
          <Pressable accessibilityRole="button" accessibilityLabel={isSaved(watch.id) ? 'Remove from wishlist' : 'Save to wishlist'} onPress={() => toggle(watch)} style={styles.headerHeart}>
              <Icon name="heart" size={20} color={isSaved(watch.id) ? colors.danger : colors.ink} fill={isSaved(watch.id) ? colors.danger : 'none'} />
          </Pressable>
        }
      />
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: layout.buyBarHeight + insets.bottom + spacing.xl }}>
        <Gallery watch={watch} selected={colorIndex} onSelect={setColorIndex} />

        <View style={styles.section}>
          <View style={styles.metaRow}>
            <Eyebrow color={colors.primary}>{`${watch.brand.name} · ${watch.category.name}`}</Eyebrow>
            <Text variant="meta">{`Ref. ${watch.sku}`}</Text>
          </View>
          <Text variant="display" style={styles.name}>{watch.name}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Jump to reviews" onPress={() => scroll.current?.scrollTo({ y: reviewsAt.current, animated: true })} style={styles.ratingRow}>
            <Stars value={Math.round(watch.rating.average ?? 0)} />
            <Text variant="label" color={colors.secondary}>{watch.rating.average?.toFixed(1) ?? '–'}</Text>
            <Text variant="label" color={colors.secondary}>·</Text>
            <Text variant="label" color={colors.secondary} style={styles.underline}>{`${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`}</Text>
          </Pressable>
          <View style={styles.priceRow}>
            <Text variant="price" color={priceColor(watch)} style={styles.price}>{formatWholeMoney(price)}</Text>
            {watch.salePrice ? (
              <>
                <Text variant="body" style={styles.was}>{formatWholeMoney(watch.price)}</Text>
                <Text variant="label" color={colors.danger}>{`You save ${formatMoney(saving)}`}</Text>
              </>
            ) : null}
          </View>
          <View style={styles.stockRow}>
            <View style={[styles.stockDot, { backgroundColor: stock.color }]} />
            <Text variant="label" color={stock.color}>{soldOut ? 'Sold out. Tap Notify me and we’ll email you on restock' : stock.text}</Text>
          </View>
          {watch.isLimitedEdition && (
            <View style={styles.limited}>
              <Icon name="limited" size={18} color={colors.primary} strokeWidth={1.5} />
              <Text variant="label" style={styles.limitedText}>Limited edition. Each case is individually numbered and ships with a signed certificate.</Text>
            </View>
          )}
        </View>

        <View style={[styles.section, styles.options]}>
          <ColourPicker watch={watch} selected={colorIndex} onSelect={setColorIndex} />
          <StrapPicker watch={watch} selected={strap} onSelect={setStrap} />
          {!soldOut && (
            <View style={styles.quantityRow}>
              <Text variant="label" color={colors.secondary}>Quantity</Text>
              <Stepper value={quantity} max={maxQuantity} onChange={setQuantity} />
            </View>
          )}
        </View>

        <View style={[styles.section, styles.assurances]}>
          {ASSURANCES.map(({ icon, text }) => (
            <View key={text} style={styles.assurance}>
              <Icon name={icon} size={18} color={colors.primary} strokeWidth={1.5} />
              <Text variant="small" style={styles.assuranceText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, styles.about]}>
          <Eyebrow>About this watch</Eyebrow>
          <Text variant="lede">{watch.description}</Text>
        </View>

        <View style={[styles.section, styles.specs]}>
          <Eyebrow>Specifications</Eyebrow>
          <SpecList watch={watch} />
        </View>

        <View style={[styles.section, styles.reviewsBlock]} onLayout={event => (reviewsAt.current = event.nativeEvent.layout.y)}>
          <ReviewsSection watch={watch} />
        </View>

        {related.data && related.data.items.some(item => item.id !== watch.id) && (
          <View style={styles.relatedBlock}>
            <Text variant="h2" style={styles.relatedTitle}>You may also like</Text>
            <RelatedRail watches={related.data.items.filter(item => item.id !== watch.id).slice(0, RELATED_COUNT)} onOpen={item => router.push({ pathname: '/watch/[slug]', params: { slug: item.slug } })} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.buyBar, { paddingBottom: Math.max(insets.bottom, spacing.md) + 14 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={isSaved(watch.id) ? 'Remove from wishlist' : 'Save to wishlist'} onPress={() => toggle(watch)} style={styles.buyHeart}>
          <Icon name="heart" size={20} color={isSaved(watch.id) ? colors.danger : colors.ink} fill={isSaved(watch.id) ? colors.danger : 'none'} />
        </Pressable>
        <AddToBagButton phase={phase} soldOut={soldOut} notified={notifyMe.isNotified(watch.id)} price={formatMoney(price * quantity)} onPress={addToBag} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
  body: { padding: layout.gutter },
  headerHeart: { width: layout.touch, height: layout.touch, alignItems: 'center', justifyContent: 'center' },
  section: { paddingTop: layout.gutter, paddingHorizontal: layout.gutter, gap: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { lineHeight: 37 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  underline: { textDecorationLine: 'underline' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  price: { fontSize: 28, lineHeight: 34, letterSpacing: -0.28 },
  was: { fontSize: 16, textDecorationLine: 'line-through' },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stockDot: { width: 7, height: 7, borderRadius: 4 },
  limited: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.tint, borderRadius: radius.base },
  limitedText: { flex: 1, lineHeight: 19 },
  options: { paddingTop: 28, gap: 22 },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assurances: { flexDirection: 'row', gap: 8, paddingTop: 24 },
  assurance: { flex: 1, gap: 6, padding: 12, backgroundColor: colors.surface, borderRadius: radius.base },
  assuranceText: { lineHeight: 16 },
  about: { paddingTop: 36 },
  specs: { paddingTop: 32, gap: 8 },
  reviewsBlock: { paddingTop: 40 },
  relatedBlock: { paddingTop: 44, gap: 18 },
  relatedTitle: { paddingHorizontal: layout.gutter },
  buyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingTop: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.glass, borderTopWidth: 1, borderTopColor: colors.line },
  buyHeart: { width: layout.buttonPrimary, height: layout.buttonPrimary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
});
