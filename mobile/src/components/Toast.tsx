import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '@/lib/motion';
import { colors, layout, motion, radius, shadows, spacing } from '@/theme';
import { Text } from './ui';

type ToastKind = 'success' | 'error';
type ShowToast = (kind: ToastKind, message: string) => void;

const RISE = 12;
const CLEARANCE = 16;

const ToastContext = createContext<ShowToast | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const animate = useCallback(
    (toValue: number, onDone?: () => void) => Animated.timing(progress, { toValue, duration: reducedMotion ? 1 : motion.fadeMs, easing: motion.ease, useNativeDriver: true }).start(onDone),
    [progress, reducedMotion]
  );

  const show = useCallback<ShowToast>(
    (kind, message) => {
      clearTimeout(timer.current);
      setToast({ kind, message });
      animate(1);
      timer.current = setTimeout(() => animate(0, () => setToast(null)), motion.toastMs);
    },
    [animate]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] });

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.wrap, { bottom: insets.bottom + layout.tabBarHeight + CLEARANCE, opacity: progress, transform: [{ translateY }] }]}>
          <View style={[styles.toast, { backgroundColor: toast.kind === 'error' ? colors.danger : colors.primary }]}>
            <Text variant="baseMedium" color={colors.onPrimary}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ShowToast => {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside ToastProvider');
  return show;
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 100, alignItems: 'center' },
  toast: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.base, ...shadows.soft },
});
