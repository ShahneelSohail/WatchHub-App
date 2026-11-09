import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { imageUrl } from '@/lib/config';
import { colors, radius } from '@/theme';

interface PhotoProps {
  path: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
  contain?: boolean;
  label?: string;
}

export const Photo = ({ path, style, opacity = 1, contain, label }: PhotoProps) => {
  const uri = imageUrl(path);
  return (
    <View style={[styles.frame, style]}>
      {uri && <Image accessibilityLabel={label} source={{ uri }} resizeMode={contain ? 'contain' : 'cover'} style={[StyleSheet.absoluteFill, { opacity }]} />}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.line, borderRadius: radius.base, overflow: 'hidden' },
});
