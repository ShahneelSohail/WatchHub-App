import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatWholeMoney } from '@/lib/format';
import { useQuickAdd, useWishlistToggle } from '@/lib/shop';
import type { Watch } from '@/lib/types';
import { isSoldOut, priceColor, unitPrice, watchBadge, watchImage } from '@/lib/watch';
import { colors, radius } from '@/theme';
import { Icon } from './Icon';
import { Rise } from './Motion';
import { Photo } from './Photo';
import { Badge, Text } from './ui';

export const WishlistHeart = ({ watch, size = 30, glyph = 15 }: { watch: Watch; size?: number; glyph?: number }) => {
  const { isSaved, toggle } = useWishlistToggle();
  const saved = isSaved(watch.id);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Remove from wishlist' : 'Save to wishlist'} onPress={() => toggle(watch)} style={styles.corner}>
      <View style={[styles.circle, { width: size, height: size, backgroundColor: colors.glassLight }]}>
        <Icon name="heart" size={glyph} color={saved ? colors.danger : colors.ink} fill={saved ? colors.danger : 'none'} />
      </View>
    </Pressable>
  );
};

export const WatchCard = ({ watch, index }: { watch: Watch; index: number }) => {
  const router = useRouter();
  const quickAdd = useQuickAdd();
  const badge = watchBadge(watch);
  return (
    <Rise index={index} style={styles.card}>
      <Pressable accessibilityRole="link" accessibilityLabel={watch.name} onPress={() => router.push({ pathname: '/watch/[slug]', params: { slug: watch.slug } })} style={styles.card}>
        <View style={styles.imageWrap}>
          <Photo path={watchImage(watch)} opacity={isSoldOut(watch) ? 0.55 : 1} style={styles.image} />
          {badge && (
            <View style={styles.badge}>
              <Badge badge={badge} />
            </View>
          )}
          <View style={styles.heart}>
            <WishlistHeart watch={watch} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Quick add" onPress={() => quickAdd(watch)} style={[styles.corner, styles.quick]}>
            <View style={[styles.circle, styles.quickCircle]}>
              <Icon name="plus" size={14} color={colors.onPrimary} strokeWidth={2} />
            </View>
          </Pressable>
        </View>
        <View style={styles.info}>
          <Text variant="brand">{watch.brand.name}</Text>
          <Text variant="cardTitle">{watch.name}</Text>
          <View style={styles.priceRow}>
            <View style={styles.prices}>
              <Text variant="price" color={priceColor(watch)}>{formatWholeMoney(unitPrice(watch))}</Text>
              {watch.salePrice ? <Text variant="small" style={styles.was}>{formatWholeMoney(watch.price)}</Text> : null}
            </View>
            <View style={styles.swatches}>
              {watch.colors.map(color => (
                <View key={color.name} style={[styles.swatch, { backgroundColor: color.hex }]} />
              ))}
            </View>
          </View>
        </View>
      </Pressable>
    </Rise>
  );
};

export const WatchGrid = ({ watches }: { watches: Watch[] }) => {
  const rows = Array.from({ length: Math.ceil(watches.length / 2) }, (_, row) => watches.slice(row * 2, row * 2 + 2));
  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={row[0]?.id} style={styles.gridRow}>
          {row.map((watch, column) => (
            <WatchCard key={watch.id} watch={watch} index={rowIndex * 2 + column} />
          ))}
          {row.length === 1 && <View style={styles.card} />}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { gap: 24 },
  gridRow: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, gap: 10 },
  imageWrap: { aspectRatio: 4 / 5 },
  image: { ...StyleSheet.absoluteFillObject },
  badge: { position: 'absolute', top: 8, left: 8 },
  heart: { position: 'absolute', top: 2, right: 2 },
  corner: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.round },
  quick: { position: 'absolute', right: 2, bottom: 2 },
  quickCircle: { width: 30, height: 30, backgroundColor: colors.primary },
  info: { gap: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  prices: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  was: { textDecorationLine: 'line-through' },
  swatches: { flexDirection: 'row', gap: 4 },
  swatch: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: colors.line },
});

const TileCard = ({ watch, index, action }: { watch: Watch; index: number; action: ReactNode }) => {
  const router = useRouter();
  const badge = watchBadge(watch);
  return (
    <Rise index={index} style={tileStyles.tile}>
      <Pressable accessibilityRole="link" accessibilityLabel={watch.name} onPress={() => router.push({ pathname: '/watch/[slug]', params: { slug: watch.slug } })} style={tileStyles.imageWrap}>
        <Photo path={watchImage(watch)} opacity={isSoldOut(watch) ? 0.6 : 1} style={styles.image} />
        {badge && (
          <View style={tileStyles.badge}>
            <Badge badge={badge} />
          </View>
        )}
      </Pressable>
      <View style={tileStyles.heart}>
        <WishlistHeart watch={watch} size={44} glyph={18} />
      </View>
      <View style={tileStyles.body}>
        <Text variant="brand">{watch.brand.name}</Text>
        <Text variant="cardTitle" style={tileStyles.name}>{watch.name}</Text>
        <View style={styles.prices}>
          <Text variant="strong" color={priceColor(watch)}>{formatWholeMoney(unitPrice(watch))}</Text>
          {watch.salePrice ? <Text variant="small" color={colors.muted} style={styles.was}>{formatWholeMoney(watch.price)}</Text> : null}
        </View>
        <View style={tileStyles.action}>{action}</View>
      </View>
    </Rise>
  );
};

export const TileGrid = ({ watches, renderAction }: { watches: Watch[]; renderAction: (watch: Watch) => ReactNode }) => {
  const rows = Array.from({ length: Math.ceil(watches.length / 2) }, (_, row) => watches.slice(row * 2, row * 2 + 2));
  return (
    <View style={tileStyles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={row[0]?.id} style={tileStyles.row}>
          {row.map((watch, column) => (
            <TileCard key={watch.id} watch={watch} index={rowIndex * 2 + column} action={renderAction(watch)} />
          ))}
          {row.length === 1 && <View style={tileStyles.tile} />}
        </View>
      ))}
    </View>
  );
};

const tileStyles = StyleSheet.create({
  grid: { gap: 16 },
  row: { flexDirection: 'row', gap: 16 },
  tile: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base, overflow: 'hidden' },
  imageWrap: { aspectRatio: 4 / 5 },
  badge: { position: 'absolute', top: 10, left: 10 },
  heart: { position: 'absolute', top: 6, right: 6 },
  body: { flex: 1, gap: 4, padding: 14 },
  name: { fontSize: 18, lineHeight: 21 },
  action: { marginTop: 'auto', paddingTop: 12 },
});
