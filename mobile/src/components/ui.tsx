import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps as RNTextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from '@/lib/motion';
import { bareInput, colors, fonts, layout, motion, radius, spacing, textVariants, type StatusStyle, type TextVariant } from '@/theme';
import { Icon, type IconName } from './Icon';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  children?: ReactNode;
}

export const Text = ({ variant = 'base', color, align, style, ...rest }: TextProps) => (
  <RNText style={[textVariants[variant], color ? { color } : null, align ? { textAlign: align } : null, style]} {...rest} />
);

type ButtonVariant = 'primary' | 'outline' | 'neutral' | 'danger' | 'dangerSolid' | 'white';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'cta';

const BUTTON_HEIGHTS: Record<ButtonSize, number> = { sm: 36, md: layout.buttonDefault, lg: 48, xl: layout.buttonLarge, cta: layout.buttonPrimary };

const BUTTON_COLORS: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  outline: { bg: colors.surface, fg: colors.primary, border: colors.primary },
  neutral: { bg: colors.surface, fg: colors.ink, border: colors.line },
  danger: { bg: colors.surface, fg: colors.dangerInk, border: colors.dangerLine },
  dangerSolid: { bg: colors.danger, fg: colors.onPrimary, border: colors.danger },
  white: { bg: colors.surface, fg: colors.primary, border: colors.surface },
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Button = ({ label, onPress, variant = 'primary', size = 'md', icon, loading, disabled, fill, style }: ButtonProps) => {
  const palette = disabled ? { bg: colors.line, fg: colors.secondary, border: colors.line } : BUTTON_COLORS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { height: BUTTON_HEIGHTS[size], backgroundColor: pressed && variant === 'primary' ? colors.primaryHover : palette.bg, borderColor: palette.border },
        fill && styles.fill,
        style,
      ]}
    >
      {loading ? <Spinner color={palette.fg} size={18} /> : icon && <Icon name={icon} size={16} color={palette.fg} strokeWidth={2} />}
      <RNText style={[styles.buttonLabel, { color: palette.fg, fontSize: size === 'cta' || size === 'xl' ? 15 : 14 }]}>{label}</RNText>
    </Pressable>
  );
};

export const TextButton = ({ label, onPress, color = colors.primary, underline, weight = 'sansMedium', size = 13, style }: { label: string; onPress: () => void; color?: string; underline?: boolean; weight?: 'sansMedium' | 'sansSemibold' | 'sans'; size?: number; style?: StyleProp<ViewStyle> }) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={[styles.textButton, style]}>
    <RNText style={{ fontFamily: fonts[weight], fontSize: size, color, textDecorationLine: underline ? 'underline' : 'none' }}>{label}</RNText>
  </Pressable>
);

export const IconButton = ({ icon, label, onPress, color = colors.ink, size = 20, fill, style, children }: { icon: IconName; label: string; onPress: () => void; color?: string; size?: number; fill?: string; style?: StyleProp<ViewStyle>; children?: ReactNode }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}>
    <Icon name={icon} size={size} color={color} fill={fill} />
    {children}
  </Pressable>
);

export const CountBadge = ({ count, color = colors.primary, style }: { count: number; color?: string; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.countBadge, { backgroundColor: color }, style]}>
    <RNText style={styles.countBadgeLabel}>{count > 99 ? '99+' : count}</RNText>
  </View>
);

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
  right?: ReactNode;
  height?: number;
  leading?: ReactNode;
}

export const Input = ({ label, error, right, leading, height = layout.inputHeight, multiline, ...rest }: InputProps) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      {label && <Text variant="label">{label}</Text>}
      <View style={[styles.input, multiline ? styles.inputMultiline : { height }, focused && styles.inputFocused, error ? styles.inputError : null]}>
        {leading}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.inputText, bareInput, multiline ? styles.inputTextMultiline : { height: height - 2 }]}
          {...rest}
        />
        {right}
      </View>
      {error ? (
        <Text variant="small" color={colors.dangerInk} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export const Pill = ({ label, count, selected, onPress, onRemove, size = 36 }: { label: string; count?: number; selected?: boolean; onPress?: () => void; onRemove?: () => void; size?: number }) => (
  <Pressable
    accessibilityRole={onRemove ? 'button' : 'radio'}
    accessibilityLabel={onRemove ? `Remove filter ${label}` : label}
    accessibilityState={{ selected }}
    onPress={onRemove ?? onPress}
    style={[styles.pill, { height: size }, selected && styles.pillSelected, onRemove && styles.pillRemovable]}
  >
    <RNText style={[styles.pillLabel, selected && { color: colors.onPrimary }]}>{label}</RNText>
    {count !== undefined && <RNText style={[styles.pillCount, selected && { color: colors.onPrimary }]}>{count}</RNText>}
    {onRemove && <Icon name="close" size={12} strokeWidth={2} />}
  </Pressable>
);

export interface BadgeStyle {
  text: string;
  fg: string;
  bg: string;
  border: string;
}

export const Badge = ({ badge, small }: { badge: BadgeStyle; small?: boolean }) => (
  <View style={[styles.badge, small && styles.badgeSmall, { backgroundColor: badge.bg, borderColor: badge.border }]}>
    <RNText style={[styles.badgeLabel, small && styles.badgeLabelSmall, { color: badge.fg }]}>{badge.text}</RNText>
  </View>
);

export const StatusPill = ({ status, size = 'md' }: { status: StatusStyle; size?: 'sm' | 'md' | 'lg' }) => {
  const height = size === 'lg' ? 28 : size === 'md' ? 26 : 22;
  return (
    <View style={[styles.statusPill, { height, backgroundColor: status.bg, borderColor: status.border, borderStyle: status.dashed ? 'dashed' : 'solid' }]}>
      <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
      <RNText style={[styles.statusLabel, { color: status.fg, fontSize: size === 'lg' ? 13 : size === 'md' ? 12 : 11, textDecorationLine: status.strike ? 'line-through' : 'none' }]}>{status.label}</RNText>
    </View>
  );
};

type AlertTone = 'success' | 'warning' | 'danger' | 'info';

const ALERT_TONES: Record<AlertTone, { fg: string; bg: string; border: string }> = {
  success: { fg: colors.successInk, bg: colors.successSurface, border: colors.successLine },
  warning: { fg: colors.warningInk, bg: colors.warningSurface, border: colors.warningLine },
  danger: { fg: colors.dangerInk, bg: colors.dangerSurface, border: colors.dangerLine },
  info: { fg: colors.infoInk, bg: colors.infoSurface, border: colors.infoLine },
};

export const Alert = ({ tone, children, icon, action }: { tone: AlertTone; children: ReactNode; icon?: IconName; action?: ReactNode }) => {
  const { fg, bg, border } = ALERT_TONES[tone];
  return (
    <View accessibilityRole="alert" style={[styles.alert, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.alertRow}>
        {icon && <Icon name={icon} size={18} color={fg} strokeWidth={1.8} />}
        <RNText style={[styles.alertText, { color: fg }]}>{children}</RNText>
      </View>
      {action}
    </View>
  );
};

export const Switch = ({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) => {
  const reducedMotion = useReducedMotion();
  const position = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(position, { toValue: value ? 1 : 0, duration: reducedMotion ? 1 : 200, easing: motion.ease, useNativeDriver: true }).start();
  }, [value, position, reducedMotion]);
  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={() => onChange(!value)} hitSlop={9} style={[styles.switchTrack, { backgroundColor: value ? colors.primary : colors.lineStrong }]}>
      <Animated.View style={[styles.switchKnob, { transform: [{ translateX }] }]} />
    </Pressable>
  );
};

export const Checkbox = ({ checked, invalid }: { checked: boolean; invalid?: boolean }) => (
  <View style={[styles.checkbox, { borderColor: invalid ? colors.danger : checked ? colors.primary : colors.muted, backgroundColor: checked ? colors.primary : 'transparent' }]}>
    {checked && <Icon name="check" size={12} color={colors.onPrimary} strokeWidth={3} />}
  </View>
);

export const CheckRow = ({ label, count, checked, onPress, role = 'checkbox' }: { label: string; count?: number; checked: boolean; onPress: () => void; role?: 'checkbox' | 'radio' }) => (
  <Pressable accessibilityRole={role} accessibilityState={{ checked }} onPress={onPress} style={styles.checkRow}>
    <Checkbox checked={checked} />
    <RNText style={styles.checkRowLabel}>{label}</RNText>
    {count !== undefined && <RNText style={styles.checkRowCount}>{count}</RNText>}
  </Pressable>
);

export const OptionCard = ({ selected, disabled, onPress, title, detail, value, trailing }: { selected: boolean; disabled?: boolean; onPress: () => void; title: string; detail?: string; value?: string; trailing?: ReactNode }) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ selected, disabled }}
    onPress={onPress}
    style={[styles.option, selected && styles.optionSelected, disabled && styles.optionDisabled]}
  >
    <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.muted }]}>
      <View style={[styles.radioDot, { backgroundColor: selected ? colors.primary : 'transparent' }]} />
    </View>
    <View style={styles.flex}>
      <Text variant="strong" style={styles.optionTitle}>{title}</Text>
      {detail && <Text variant="small" style={styles.optionDetail}>{detail}</Text>}
    </View>
    {value && <Text variant="strong" style={styles.optionTitle}>{value}</Text>}
    {trailing}
  </Pressable>
);

export const Stepper = ({ value, max, onChange, size = 44, disabled }: { value: number; max: number; onChange: (value: number) => void; size?: number; disabled?: boolean }) => (
  <View style={[styles.stepper, { height: size }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" disabled={disabled || value <= 1} onPress={() => onChange(value - 1)} style={[styles.stepperButton, { width: size, height: size - 2, opacity: disabled || value <= 1 ? 0.35 : 1 }]}>
      <Icon name="minus" size={16} />
    </Pressable>
    <RNText accessibilityLabel={`Quantity ${value}`} style={styles.stepperValue}>{value}</RNText>
    <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" disabled={disabled} onPress={() => onChange(Math.min(max, value + 1))} style={[styles.stepperButton, { width: size, height: size - 2, opacity: disabled || value >= max ? 0.35 : 1 }]}>
      <Icon name="plus" size={16} />
    </Pressable>
  </View>
);

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[styles.divider, style]} />;

export const Spinner = ({ color = colors.primary, size = 24 }: { color?: string; size?: number }) => <ActivityIndicator color={color} size={size > 20 ? 'large' : 'small'} />;

export const Loading = () => (
  <View style={styles.loading}>
    <Spinner />
  </View>
);

export const Skeleton = ({ width, height, style }: { width: ViewStyle['width']; height: number; style?: StyleProp<ViewStyle> }) => {
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    if (reducedMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion]);
  return <Animated.View style={[{ width, height, backgroundColor: colors.line, opacity: pulse }, style]} />;
};

export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[styles.card, style]}>{children}</View>;

export const Eyebrow = ({ children, color }: { children: ReactNode; color?: string }) => <Text variant="eyebrow" color={color}>{children}</Text>;

export const EmptyState = ({ icon, title, message, actions, ring = true, bare }: { icon: IconName; title: string; message?: string; actions?: ReactNode; ring?: boolean; bare?: boolean }) => (
  <View style={[styles.empty, bare && styles.emptyBare]}>
    {ring ? (
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={30} color={colors.primary} strokeWidth={1.4} />
      </View>
    ) : (
      <Icon name={icon} size={44} color={colors.muted} strokeWidth={1.2} />
    )}
    <Text variant="title" align="center">{title}</Text>
    {message && <Text variant="body" align="center" style={styles.emptyMessage}>{message}</Text>}
    {actions && <View style={styles.emptyActions}>{actions}</View>}
  </View>
);

export const Row = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <View style={styles.row}>
    <Text variant="base" color={colors.secondary}>{label}</Text>
    <Text variant="base" color={color} style={styles.tabular}>{value}</Text>
  </View>
);

export const TotalRow = ({ label = 'Total', value }: { label?: string; value: string }) => (
  <View style={styles.totalRow}>
    <RNText style={styles.totalLabel}>{label}</RNText>
    <RNText style={styles.totalValue}>{value}</RNText>
  </View>
);

export const FormError = ({ message }: { message: string | null | undefined }) => (message ? <Alert tone="danger">{message}</Alert> : null);

export const Stars = ({ value, size = 13 }: { value: number; size?: number }) => (
  <View style={styles.stars}>
    {[1, 2, 3, 4, 5].map(index => (
      <Icon key={index} name="star" size={size} color={colors.primary} strokeWidth={1.5} fill={index <= value ? colors.primary : 'none'} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  fill: { alignSelf: 'stretch' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.7 },
  button: { borderWidth: 1, borderRadius: radius.base, paddingHorizontal: spacing.lg + 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  buttonLabel: { fontFamily: fonts.sansSemibold },
  textButton: { minHeight: 36, justifyContent: 'center' },
  iconButton: { width: layout.touch, height: layout.touch, alignItems: 'center', justifyContent: 'center' },
  countBadge: { position: 'absolute', top: 6, right: 4, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: radius.round, alignItems: 'center', justifyContent: 'center' },
  countBadgeLabel: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.onPrimary },
  field: { gap: 6 },
  input: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  inputMultiline: { minHeight: 96, alignItems: 'flex-start', paddingVertical: 4 },
  inputFocused: { borderColor: colors.primary, boxShadow: `0 0 0 3px ${colors.tint}` },
  inputError: { borderColor: colors.danger },
  inputText: { flex: 1, minWidth: 0, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, padding: 0 },
  inputTextMultiline: { minHeight: 88, paddingVertical: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.round, backgroundColor: colors.surface },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillRemovable: { backgroundColor: colors.tint, borderColor: colors.primary, paddingRight: 8, paddingLeft: 12 },
  pillLabel: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.ink },
  pillCount: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink, opacity: 0.7 },
  badge: { alignSelf: 'flex-start', height: 22, paddingHorizontal: 8, justifyContent: 'center', borderWidth: 1, borderRadius: radius.base },
  badgeSmall: { height: 20, paddingHorizontal: 7 },
  badgeLabel: { fontFamily: fonts.sansSemibold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  badgeLabelSmall: { fontSize: 9 },
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderRadius: radius.round },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontFamily: fonts.sansSemibold },
  alert: { gap: spacing.md, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderRadius: radius.base },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  alertText: { flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  switchTrack: { width: 44, height: 26, borderRadius: radius.round, padding: 3, justifyContent: 'center' },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderRadius: radius.base, alignItems: 'center', justifyContent: 'center' },
  checkRow: { minHeight: layout.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkRowLabel: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  checkRowCount: { fontFamily: fonts.sans, fontSize: 12, color: colors.secondary, fontVariant: ['tabular-nums'] },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: spacing.lg, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.base, backgroundColor: colors.surface },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.tint },
  optionDisabled: { opacity: 0.55 },
  optionTitle: { fontSize: 15 },
  optionDetail: { fontSize: 13, lineHeight: 19 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.line, borderRadius: radius.base, backgroundColor: colors.surface },
  stepperButton: { alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 28, textAlign: 'center', fontFamily: fonts.sans, fontSize: 14, color: colors.ink, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: colors.line },
  loading: { padding: spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  empty: { paddingVertical: 56, paddingHorizontal: spacing.xl, alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  emptyBare: { paddingVertical: 0, backgroundColor: 'transparent', borderWidth: 0 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  emptyMessage: { maxWidth: 320 },
  emptyActions: { gap: 10, alignItems: 'center', marginTop: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line },
  totalLabel: { fontFamily: fonts.sansSemibold, fontSize: 16, color: colors.ink },
  totalValue: { fontFamily: fonts.sansSemibold, fontSize: 24, color: colors.ink, fontVariant: ['tabular-nums'] },
  stars: { flexDirection: 'row', gap: 2 },
});
