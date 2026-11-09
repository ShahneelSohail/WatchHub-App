import type { ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, shadows, spacing } from '@/theme';
import { useOverlay } from './Motion';
import { IconButton, Text } from './ui';

const SCRIM_OPACITY = 0.6;
const DRAWER_WIDTH = 352;

interface OverlayProps {
  visible: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

const Scrim = ({ opacity, onPress, label }: { opacity: Animated.Value; onPress: () => void; label: string }) => (
  <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [0, SCRIM_OPACITY] }) }]}>
    <Pressable accessibilityLabel={`Close ${label}`} style={StyleSheet.absoluteFill} onPress={onPress} />
  </Animated.View>
);

export const BottomSheet = ({ visible, onClose, label, title, footer, children }: OverlayProps & { title: string; footer?: ReactNode }) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { mounted, slide, scrim } = useOverlay(visible);
  if (!mounted) return null;
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Scrim opacity={scrim} onPress={onClose} label={label} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none" style={styles.sheetHost}>
        <Animated.View accessibilityViewIsModal style={[styles.sheet, { maxHeight: height * 0.86, transform: [{ translateY }] }]}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text variant="title">{title}</Text>
            <IconButton icon="close" label="Close" onPress={onClose} />
          </View>
          <View style={styles.sheetBody}>{children}</View>
          {footer && <View style={[styles.sheetFooter, { paddingBottom: Math.max(insets.bottom, spacing.lg) + 14 }]}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const SideDrawer = ({ visible, onClose, label, title, count, children }: OverlayProps & { title: string; count: string; }) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { mounted, slide, scrim } = useOverlay(visible);
  if (!mounted) return null;
  const drawerWidth = Math.min(DRAWER_WIDTH, width - 38);
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [drawerWidth + 4, 0] });
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Scrim opacity={scrim} onPress={onClose} label={label} />
      <View pointerEvents="box-none" style={styles.drawerHost}>
        <Animated.View accessibilityViewIsModal style={[styles.drawer, { width: drawerWidth, paddingTop: insets.top, transform: [{ translateX }] }]}>
          <View style={styles.drawerHeader}>
            <View style={styles.drawerTitle}>
              <Text variant="title" style={styles.drawerTitleText}>{title}</Text>
              <Text variant="small" style={styles.drawerCount}>{count}</Text>
            </View>
            <IconButton icon="close" label={`Close ${label}`} onPress={onClose} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetHost: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, ...shadows.soft },
  grabber: { alignSelf: 'center', width: 36, height: 4, marginTop: 10, borderRadius: 2, backgroundColor: colors.line },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingLeft: layout.gutter, paddingRight: spacing.md },
  sheetBody: { flexShrink: 1 },
  sheetFooter: { flexDirection: 'row', gap: 10, paddingTop: spacing.md, paddingHorizontal: layout.gutter, borderTopWidth: 1, borderTopColor: colors.line },
  drawerHost: { flex: 1, alignItems: 'flex-end' },
  drawer: { flex: 1, backgroundColor: colors.surface, borderLeftWidth: 1, borderLeftColor: colors.line, ...shadows.soft },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, paddingLeft: 22, paddingRight: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  drawerTitle: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  drawerTitleText: { fontSize: 26 },
  drawerCount: { fontSize: 13 },
});
