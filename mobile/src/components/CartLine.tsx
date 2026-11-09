import { StyleSheet, View } from 'react-native';
import { formatMoney, optionSummary } from '@/lib/format';
import { priceColor, watchImage } from '@/lib/watch';
import type { CartLine as CartLineData } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';
import { Photo } from './Photo';
import { Stepper, Text, TextButton } from './ui';

const lineImage = (line: CartLineData) => {
  const index = line.watch.colors.findIndex(color => color.name === line.productColor);
  return watchImage(line.watch, Math.max(index, 0));
};

interface CartLineProps {
  line: CartLineData;
  available: number;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onSave?: () => void;
  compact?: boolean;
}

export const CartLineRow = ({ line, available, onQuantity, onRemove, onSave, compact }: CartLineProps) => {
  const { watch } = line;
  const soldOut = available === 0;
  const meta = optionSummary(line);
  const imageSize = compact ? { width: 76, height: 94 } : { width: 88, height: 108 };
  return (
    <View style={[styles.line, compact ? styles.lineCompact : styles.linePadded]}>
      <Photo path={lineImage(line)} opacity={soldOut ? 0.5 : 1} label={watch.name} style={imageSize} />
      <View style={styles.info}>
        <View style={styles.head}>
          <View style={[styles.titles, soldOut && styles.dim]}>
            <Text variant="brand">{watch.brand.name}</Text>
            <Text variant="cardTitle" style={compact ? undefined : styles.name}>{watch.name}</Text>
            {meta ? <Text variant="small" style={compact ? undefined : styles.meta}>{meta}</Text> : null}
          </View>
          {!compact && (
            <View style={styles.prices}>
              <Text variant="strong" color={soldOut ? colors.muted : priceColor(watch)} style={styles.price}>{formatMoney(line.lineTotal)}</Text>
              {watch.salePrice && !soldOut ? <Text variant="small" color={colors.muted} style={styles.was}>{formatMoney(watch.price * line.quantity)}</Text> : null}
            </View>
          )}
        </View>
        {soldOut && (
          <View style={styles.soldOut}>
            <Text variant="small" color={colors.dangerInk} style={styles.soldOutLabel}>Sold out</Text>
          </View>
        )}
        {!soldOut && available <= watch.lowStockThreshold && <Text variant="small" color={colors.warningInk} style={styles.low}>Only {available} left</Text>}
        <View style={styles.foot}>
          <Stepper value={line.quantity} max={Math.min(available, 10)} size={compact ? 36 : 40} disabled={soldOut} onChange={onQuantity} />
          {compact ? (
            <Text variant="strong" style={styles.price}>{formatMoney(line.lineTotal)}</Text>
          ) : (
            <View style={styles.actions}>
              {onSave && <TextButton label="Save for later" onPress={onSave} weight="sansMedium" />}
              <TextButton label="Remove" onPress={onRemove} underline color={colors.secondary} />
            </View>
          )}
        </View>
        {compact && <TextButton label="Remove" onPress={onRemove} underline color={colors.secondary} style={styles.removeCompact} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  line: { flexDirection: 'row', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  linePadded: { padding: 18 },
  lineCompact: { paddingVertical: 18 },
  info: { flex: 1, minWidth: 0, gap: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  titles: { flex: 1, gap: 3 },
  dim: { opacity: 0.5 },
  name: { fontSize: 19, lineHeight: 22 },
  meta: { fontSize: 13 },
  prices: { alignItems: 'flex-end', gap: 2 },
  price: { fontVariant: ['tabular-nums'] },
  was: { textDecorationLine: 'line-through' },
  soldOut: { alignSelf: 'flex-start', height: 24, paddingHorizontal: 9, justifyContent: 'center', backgroundColor: colors.dangerSurface, borderWidth: 1, borderColor: colors.dangerLine, borderRadius: radius.base },
  soldOutLabel: { fontFamily: fonts.sansSemibold },
  low: { fontFamily: fonts.sansMedium },
  removeCompact: { alignSelf: 'flex-start', minHeight: 32 },
  actions: { flexDirection: 'row', gap: 16 },
  foot: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto', paddingTop: 6 },
});
