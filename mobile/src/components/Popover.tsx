import { useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows } from '@/theme';

interface Anchor {
  y: number;
  right: number;
}

export const Popover = ({ trigger, width, style, children }: { trigger: (open: () => void) => ReactNode; width: number; style?: StyleProp<ViewStyle>; children: (close: () => void) => ReactNode }) => {
  const anchorRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const { width: windowWidth } = useWindowDimensions();

  const open = () =>
    anchorRef.current?.measureInWindow((x, y, anchorWidth, height) => setAnchor({ y: y + height + 6, right: windowWidth - (x + anchorWidth) }));
  const close = () => setAnchor(null);

  return (
    <View ref={anchorRef} collapsable={false} style={style}>
      {trigger(open)}
      <Modal transparent visible={Boolean(anchor)} animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable accessibilityLabel="Close menu" style={StyleSheet.absoluteFill} onPress={close} />
        {anchor && <View style={[styles.menu, { top: anchor.y, right: anchor.right, width }]}>{children(close)}</View>}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  menu: { position: 'absolute', padding: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base, ...shadows.soft },
});
