import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { imageUrl } from '@/lib/config';
import { useReducedMotion } from '@/lib/motion';
import { watchBadge, watchImage } from '@/lib/watch';
import type { Watch } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';
import { Icon } from './Icon';
import { Photo } from './Photo';
import { Badge, Text } from './ui';

const GALLERY_HEIGHT = 500;
const THUMB = 52;

const CrossfadeImage = ({ path, active, contain }: { path: string | null; active: boolean; contain?: boolean }) => {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: active ? 1 : 0, duration: reducedMotion ? 1 : 450, useNativeDriver: true }).start();
  }, [active, opacity, reducedMotion]);
  const uri = imageUrl(path);
  if (!uri) return null;
  return <Animated.Image accessibilityLabel="Watch photo" source={{ uri }} resizeMode={contain ? 'contain' : 'cover'} style={[StyleSheet.absoluteFill, { opacity }]} />;
};

interface GalleryProps {
  watch: Watch;
  selected: number;
  onSelect: (index: number) => void;
}

export const Gallery = ({ watch, selected, onSelect }: GalleryProps) => {
  const [zoomed, setZoomed] = useState(false);
  const badge = watchBadge(watch);
  const count = watch.colors.length;
  return (
    <View style={styles.gallery}>
      <Pressable accessibilityRole="button" accessibilityLabel="Open gallery" onPress={() => setZoomed(true)} style={StyleSheet.absoluteFill}>
        {watch.colors.map((color, index) => (
          <CrossfadeImage key={color.name} path={watchImage(watch, index)} active={index === selected} />
        ))}
      </Pressable>
      {badge && (
        <View pointerEvents="none" style={styles.badge}>
          <Badge badge={badge} />
        </View>
      )}
      <View pointerEvents="none" style={styles.zoomHint}>
        <Icon name="expand" size={12} strokeWidth={2} />
        <Text variant="meta" color={colors.ink}>Tap to zoom</Text>
      </View>
      {count > 1 && (
        <View style={styles.thumbs}>
          {watch.colors.map((color, index) => (
            <Pressable key={color.name} accessibilityRole="button" accessibilityLabel={color.name} onPress={() => onSelect(index)} style={[styles.thumb, { borderColor: index === selected ? colors.primary : colors.line }]}>
              <Photo path={watchImage(watch, index)} style={styles.thumbImage} />
            </Pressable>
          ))}
        </View>
      )}
      <Lightbox watch={watch} visible={zoomed} index={selected} onIndex={onSelect} onClose={() => setZoomed(false)} />
    </View>
  );
};

const Lightbox = ({ watch, visible, index, onIndex, onClose }: { watch: Watch; visible: boolean; index: number; onIndex: (index: number) => void; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const total = watch.colors.length;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View accessibilityViewIsModal style={styles.lightbox}>
        <View style={styles.lightboxImage}>
          {watch.colors.map((color, imageIndex) => (
            <CrossfadeImage key={color.name} contain path={watchImage(watch, imageIndex)} active={imageIndex === index} />
          ))}
        </View>
        <View style={[styles.lightboxTop, { top: insets.top + 5 }]}>
          <Text variant="meta" style={styles.lightboxCount}>{`${index + 1} / ${total}`}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close gallery" onPress={onClose} style={styles.lightboxClose}>
            <Icon name="close" size={22} />
          </Pressable>
        </View>
        {total > 1 && (
          <View style={[styles.lightboxNav, { bottom: insets.bottom + 44 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous image" onPress={() => onIndex((index + total - 1) % total)} style={styles.navButton}>
              <Icon name="back" size={20} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next image" onPress={() => onIndex((index + 1) % total)} style={styles.navButton}>
              <Icon name="forward" size={20} />
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gallery: { height: GALLERY_HEIGHT, backgroundColor: colors.line, overflow: 'hidden' },
  badge: { position: 'absolute', top: 14, left: 20 },
  zoomHint: { position: 'absolute', top: 14, right: 20, height: 26, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, backgroundColor: colors.glassLight, borderRadius: radius.base },
  thumbs: { position: 'absolute', left: 20, bottom: 16, flexDirection: 'row', gap: 8 },
  thumb: { width: THUMB, height: THUMB, borderWidth: 1.5, borderRadius: radius.base, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%', borderRadius: 0 },
  lightbox: { flex: 1, backgroundColor: colors.surface, justifyContent: 'center' },
  lightboxImage: { height: '70%' },
  lightboxTop: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 20, paddingRight: 10 },
  lightboxCount: { fontFamily: fonts.sansSemibold, fontSize: 12 },
  lightboxClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  lightboxNav: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 16 },
  navButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.round, backgroundColor: colors.glassLight },
});
