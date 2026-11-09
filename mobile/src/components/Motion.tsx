import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '@/lib/motion';
import { motion } from '@/theme';

const RISE_OFFSET = 14;
const MAX_STAGGER_STEPS = 6;

export const Rise = ({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) => {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) return progress.setValue(1);
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.riseMs,
      delay: (index % MAX_STAGGER_STEPS) * motion.riseStaggerMs,
      easing: motion.riseEase,
      useNativeDriver: true,
    }).start();
  }, [index, progress, reducedMotion]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [RISE_OFFSET, 0] });
  return <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
};

export const useOverlay = (visible: boolean) => {
  const reducedMotion = useReducedMotion();
  const slide = useRef(new Animated.Value(0)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
    const target = visible ? 1 : 0;
    const run = (value: Animated.Value, duration: number) => Animated.timing(value, { toValue: target, duration: reducedMotion ? 1 : duration, easing: motion.ease, useNativeDriver: true });
    Animated.parallel([run(slide, motion.sheetMs), run(scrim, motion.scrimMs)]).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, reducedMotion, slide, scrim]);

  return { mounted, slide, scrim };
};
