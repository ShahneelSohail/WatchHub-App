import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLineAvailability } from '@/lib/checkout';
import { formatMoney } from '@/lib/format';
import { cartCount, useCart, useCartActions } from '@/lib/shop';
import { colors, spacing } from '@/theme';
import { CartLineRow } from './CartLine';
import { Icon } from './Icon';
import { SideDrawer } from './Overlays';
import { Button, EmptyState, Text, TextButton } from './ui';

interface BagControls {
  open: () => void;
  close: () => void;
}

const BagContext = createContext<BagControls | null>(null);

export const useBag = (): BagControls => {
  const controls = useContext(BagContext);
  if (!controls) throw new Error('useBag must be used inside BagProvider');
  return controls;
};

const BagDrawer = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: lines = [] } = useCart();
  const { setQuantity, remove } = useCartActions();
  const availableFor = useLineAvailability();
  const count = cartCount(lines);
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  const go = (path: '/checkout' | '/shop') => {
    onClose();
    router.push(path);
  };

  return (
    <SideDrawer visible={visible} onClose={onClose} label="bag" title="Your bag" count={`${count} ${count === 1 ? 'item' : 'items'}`}>
      {lines.length > 0 ? (
        <>
          <View style={styles.perk}>
            <Icon name="check" size={14} color={colors.success} strokeWidth={2} />
            <Text variant="small" color={colors.success}>Free standard shipping on this order</Text>
          </View>
          <ScrollView style={styles.lines} contentContainerStyle={styles.linesContent}>
            {lines.map(line => (
              <CartLineRow key={line.id} compact line={line} available={availableFor(line)} onQuantity={quantity => setQuantity.mutate({ id: line.id, quantity })} onRemove={() => remove.mutate(line.id)} />
            ))}
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) + 14 }]}>
            <View style={styles.subtotal}>
              <Text variant="body" color={colors.ink}>Subtotal</Text>
              <Text variant="baseMedium" style={styles.tabular}>{formatMoney(subtotal)}</Text>
            </View>
            <Text variant="small">Taxes calculated at checkout. Express shipping $25.</Text>
            <Button label="Checkout" icon="lock" size="cta" onPress={() => go('/checkout')} />
            <TextButton label="Continue shopping" onPress={onClose} color={colors.ink} underline size={14} style={styles.continue} />
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <EmptyState bare icon="bag" ring={false} title="Your bag is empty" message="Browse the catalogue and add a watch to see it here." actions={<Button label="Shop all watches" size="lg" onPress={() => go('/shop')} />} />
        </View>
      )}
    </SideDrawer>
  );
};

export const BagProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const controls = useMemo(() => ({ open, close }), [open, close]);
  return (
    <BagContext.Provider value={controls}>
      {children}
      <BagDrawer visible={visible} onClose={close} />
    </BagContext.Provider>
  );
};

const styles = StyleSheet.create({
  perk: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 22, backgroundColor: colors.successSurface },
  lines: { flex: 1 },
  linesContent: { paddingHorizontal: 22 },
  footer: { gap: spacing.md, paddingTop: spacing.lg, paddingHorizontal: 22, borderTopWidth: 1, borderTopColor: colors.line },
  subtotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tabular: { fontSize: 15, fontVariant: ['tabular-nums'] },
  continue: { alignSelf: 'center', minHeight: 44 },
  empty: { flex: 1, justifyContent: 'center', padding: spacing.xl },
});
