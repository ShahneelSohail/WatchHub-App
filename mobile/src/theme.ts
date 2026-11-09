import { Easing, Platform, type TextStyle } from 'react-native';

export const colors = {
  page: '#F5F5F5',
  surface: '#FFFFFF',
  line: '#E5E7EB',
  lineStrong: '#D1D5DB',
  ink: '#111827',
  secondary: '#6B7280',
  muted: '#9CA3AF',
  primary: '#1A237E',
  primaryHover: '#3949AB',
  primaryDark: '#0D1442',
  tint: '#E8EAF6',
  onPrimary: '#FFFFFF',
  danger: '#DC2626',
  dangerInk: '#B91C1C',
  dangerSurface: '#FEF2F2',
  dangerLine: '#FECACA',
  success: '#16A34A',
  successInk: '#166534',
  successSurface: '#F0FDF4',
  successLine: '#BBF7D0',
  warning: '#D97706',
  warningInk: '#B45309',
  warningSurface: '#FFFBEB',
  warningLine: '#FDE68A',
  warningStrong: '#FCD34D',
  info: '#2563EB',
  infoInk: '#1D4ED8',
  infoSurface: '#EFF6FF',
  infoLine: '#BFDBFE',
  scrim: '#0D1442',
  glass: 'rgba(255,255,255,0.96)',
  glassLight: 'rgba(255,255,255,0.92)',
} as const;

export const bareInput = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as unknown as TextStyle;

export const radius = { base: 2, sheet: 20, round: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const layout = {
  touch: 44,
  headerHeight: 52,
  tabBarHeight: 60,
  buyBarHeight: 98,
  gutter: 20,
  heroHeight: 600,
  inputHeight: 46,
  buttonLarge: 52,
  buttonPrimary: 56,
  buttonDefault: 44,
} as const;

export const fonts = {
  serif: 'PlayfairDisplay_400Regular',
  serifMedium: 'PlayfairDisplay_500Medium',
  serifSemibold: 'PlayfairDisplay_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;

export const textVariants = {
  hero: { fontFamily: fonts.serif, fontSize: 46, lineHeight: 46, letterSpacing: -0.46, color: colors.ink },
  display: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 37, color: colors.ink },
  h1: { fontFamily: fonts.serifMedium, fontSize: 30, lineHeight: 32, color: colors.ink },
  h2: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 32, color: colors.ink },
  title: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 28, color: colors.ink },
  cardTitle: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 20, color: colors.ink },
  lede: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 29, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, color: colors.secondary },
  base: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.ink },
  baseMedium: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 21, color: colors.ink },
  strong: { fontFamily: fonts.sansSemibold, fontSize: 14, lineHeight: 21, color: colors.ink },
  label: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18, color: colors.ink },
  small: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.secondary },
  eyebrow: { fontFamily: fonts.sansSemibold, fontSize: 11, lineHeight: 16, letterSpacing: 1.76, textTransform: 'uppercase', color: colors.secondary },
  brand: { fontFamily: fonts.sansSemibold, fontSize: 10, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.secondary },
  meta: { fontFamily: fonts.sansSemibold, fontSize: 11, lineHeight: 16, color: colors.secondary },
  price: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;

export const motion = {
  ease: Easing.bezier(0.2, 0.8, 0.2, 1),
  riseEase: Easing.bezier(0.2, 0.7, 0.2, 1),
  sheetMs: 420,
  scrimMs: 300,
  fadeMs: 250,
  riseMs: 500,
  riseStaggerMs: 60,
  heroFadeMs: 900,
  heroDriftMs: 6500,
  heroIntervalMs: 6000,
  toastMs: 2600,
  addSpinMs: 700,
  addOpenMs: 1300,
  addResetMs: 2000,
} as const;

export const shadows = {
  soft: { shadowColor: colors.primaryDark, shadowOpacity: 0.14, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
} as const;

interface StatusStyle {
  label: string;
  fg: string;
  bg: string;
  border: string;
  dot: string;
  dashed?: boolean;
  strike?: boolean;
}

export const orderStatusStyles = {
  PENDING_PAYMENT: { label: 'Pending payment', fg: colors.secondary, bg: colors.surface, border: colors.muted, dot: colors.muted, dashed: true },
  PENDING: { label: 'Pending', fg: colors.ink, bg: colors.page, border: colors.line, dot: colors.secondary },
  CONFIRMED: { label: 'Confirmed', fg: colors.primary, bg: colors.tint, border: colors.tint, dot: colors.primaryHover },
  SHIPPED: { label: 'Shipped', fg: colors.onPrimary, bg: colors.primaryHover, border: colors.primaryHover, dot: colors.onPrimary },
  DELIVERED: { label: 'Delivered', fg: colors.onPrimary, bg: colors.primary, border: colors.primary, dot: colors.onPrimary },
  CANCELLED: { label: 'Cancelled', fg: colors.secondary, bg: colors.surface, border: colors.line, dot: colors.line, strike: true },
} as const satisfies Record<string, StatusStyle>;

export const ticketStatusStyles = {
  OPEN: { label: 'Open', fg: colors.ink, bg: colors.page, border: colors.line, dot: colors.secondary },
  PENDING: { label: 'Awaiting you', fg: colors.primary, bg: colors.tint, border: colors.tint, dot: colors.primaryHover },
  IN_PROGRESS: { label: 'In progress', fg: colors.infoInk, bg: colors.infoSurface, border: colors.infoLine, dot: colors.info },
  RESOLVED: { label: 'Resolved', fg: colors.successInk, bg: colors.successSurface, border: colors.successLine, dot: colors.success },
  CLOSED: { label: 'Closed', fg: colors.successInk, bg: colors.successSurface, border: colors.successLine, dot: colors.success },
} as const satisfies Record<string, StatusStyle>;

export type { StatusStyle };
