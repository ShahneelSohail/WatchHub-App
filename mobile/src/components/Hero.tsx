import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { routeForLink } from '@/lib/links';
import { useReducedMotion } from '@/lib/motion';
import type { Banner } from '@/lib/types';
import { colors, fonts, layout, motion, radius } from '@/theme';
import { VerticalGradient } from './Gradient';
import { Icon } from './Icon';
import { Photo } from './Photo';
import { Eyebrow, Text } from './ui';

const START_SCALE = 1.06;

const HeroSlide = ({ banner, index, active }: { banner: Banner; index: number; active: boolean }) => {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(active ? 1 : START_SCALE)).current;
  const href = routeForLink(banner.link);

  useEffect(() => {
    const duration = reducedMotion ? 1 : motion.heroFadeMs;
    Animated.timing(opacity, { toValue: active ? 1 : 0, duration, useNativeDriver: true }).start();
    if (!active) return scale.setValue(START_SCALE);
    scale.setValue(START_SCALE);
    Animated.timing(scale, { toValue: 1, duration: reducedMotion ? 1 : motion.heroDriftMs, easing: motion.ease, useNativeDriver: true }).start();
  }, [active, reducedMotion, opacity, scale]);

  return (
    <Animated.View pointerEvents={active ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { opacity }]}>
      <Pressable accessibilityRole="link" accessibilityLabel={banner.title ?? 'Featured watch'} onPress={() => href && router.push(href)} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
          <Photo path={banner.imageUrl} style={[StyleSheet.absoluteFill, styles.square]} />
        </Animated.View>
        <VerticalGradient
          id={`hero-${index}`}
          stops={[
            { offset: '0', color: colors.primaryDark, opacity: 0.35 },
            { offset: '0.3', color: colors.primaryDark, opacity: 0 },
            { offset: '0.58', color: colors.primaryDark, opacity: 0.45 },
            { offset: '1', color: colors.primaryDark },
          ]}
        />
        <View style={styles.copy}>
          <Eyebrow color={colors.tint}>{banner.eyebrow ?? `Nº 0${index + 1}`}</Eyebrow>
          <Text variant="hero" color={colors.onPrimary}>{banner.title}</Text>
          {banner.subtitle ? <Text variant="body" color={colors.tint} style={styles.subtitle}>{banner.subtitle}</Text> : null}
          <View style={styles.cta}>
            <Text variant="strong" color={colors.primary} style={styles.ctaLabel}>Discover</Text>
            <Icon name="arrowRight" size={16} color={colors.primary} strokeWidth={1.8} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const ProgressBar = ({ state, running, onPress, label }: { state: 'done' | 'active' | 'idle'; running: boolean; onPress: () => void; label: string }) => {
  const reducedMotion = useReducedMotion();
  const fill = useRef(new Animated.Value(state === 'done' ? 1 : 0)).current;

  useEffect(() => {
    fill.setValue(state === 'done' ? 1 : 0);
    if (state !== 'active') return;
    if (!running || reducedMotion) return fill.setValue(1);
    const animation = Animated.timing(fill, { toValue: 1, duration: motion.heroIntervalMs, easing: (value: number) => value, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [state, running, reducedMotion, fill]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.barHit}>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </Pressable>
  );
};

export const Hero = ({ banners }: { banners: Banner[] }) => {
  const reducedMotion = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const total = banners.length;

  useEffect(() => {
    if (reducedMotion || total < 2) return;
    const timer = setTimeout(() => setCurrent(index => (index + 1) % total), motion.heroIntervalMs);
    return () => clearTimeout(timer);
  }, [current, reducedMotion, total]);

  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    <View style={styles.hero}>
      {banners.map((banner, index) => (
        <HeroSlide key={banner.id} banner={banner} index={index} active={index === current} />
      ))}
      <View style={styles.controls}>
        <Text variant="meta" color={colors.onPrimary} style={styles.count}>{pad(current + 1)}</Text>
        {banners.map((banner, index) => (
          <ProgressBar key={banner.id} state={index < current ? 'done' : index === current ? 'active' : 'idle'} running={total > 1} label={`Show banner ${index + 1}`} onPress={() => setCurrent(index)} />
        ))}
        <Text variant="meta" color={colors.tint} style={[styles.count, styles.countEnd]}>{pad(total)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { height: layout.heroHeight, overflow: 'hidden', backgroundColor: colors.primaryDark },
  square: { borderRadius: 0 },
  copy: { position: 'absolute', left: 24, right: 24, bottom: 84, gap: 12 },
  subtitle: { maxWidth: 300, color: colors.tint },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, marginTop: 6, paddingHorizontal: 22, backgroundColor: colors.surface, borderRadius: radius.base },
  ctaLabel: { letterSpacing: 0.28, fontFamily: fonts.sansSemibold },
  controls: { position: 'absolute', left: 24, right: 24, bottom: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { width: 22 },
  countEnd: { textAlign: 'right' },
  barHit: { flex: 1, height: 28, justifyContent: 'center' },
  barTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.28)', overflow: 'hidden' },
  barFill: { height: 2, backgroundColor: colors.surface },
});
