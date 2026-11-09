import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useUnreadCount } from '@/lib/notifications';
import { cartCount, useCart } from '@/lib/shop';
import { colors, fonts, layout } from '@/theme';
import { useBag } from './Bag';
import { Icon, type IconName } from './Icon';
import { CountBadge, IconButton } from './ui';

export const BagButton = () => {
  const { open } = useBag();
  const count = cartCount(useCart().data);
  return (
    <IconButton icon="bag" label="Bag" onPress={open}>
      {count > 0 && <CountBadge count={count} />}
    </IconButton>
  );
};

const AccountButton = () => {
  const router = useRouter();
  const { user } = useAuth();
  const unread = useUnreadCount();
  return (
    <IconButton icon="user" label="Account" onPress={() => router.push(user ? '/account' : '/login')}>
      {unread > 0 && <CountBadge count={unread} color={colors.danger} />}
    </IconButton>
  );
};

export const AppHeader = ({ back, trailing }: { back?: boolean; trailing?: React.ReactNode }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <View style={styles.side}>
          {back ? (
            <IconButton icon="back" label="Go back" size={22} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          ) : (
            <IconButton icon="search" label="Search" onPress={() => router.navigate('/search')} />
          )}
        </View>
        <Pressable accessibilityRole="link" accessibilityLabel="WatchHub home" onPress={() => router.navigate('/')} style={styles.logo}>
          <Icon name="logo" size={18} color={colors.primary} strokeWidth={1.4} />
          <RNText style={styles.logoText}>WatchHub</RNText>
        </Pressable>
        <View style={[styles.side, styles.sideEnd]}>
          {trailing ?? <AccountButton />}
          <BagButton />
        </View>
      </View>
    </View>
  );
};

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'shop', label: 'Watches', icon: 'watch' },
  { name: 'search', label: 'Search', icon: 'search' },
  { name: 'wishlist', label: 'Saved', icon: 'heart' },
  { name: 'cart', label: 'Bag', icon: 'bag' },
];

export const TabBar = ({ state, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {TABS.map(({ name, label, icon }) => {
        const active = activeName === name;
        const color = active ? colors.primary : colors.secondary;
        return (
          <Pressable key={name} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={() => navigation.navigate(name)} style={styles.tab}>
            <Icon name={icon} size={22} color={color} strokeWidth={1.6} />
            <RNText style={[styles.tabLabel, { color }]}>{label}</RNText>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  header: { backgroundColor: colors.glass, borderBottomWidth: 1, borderBottomColor: colors.line },
  bar: { height: layout.headerHeight, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  side: { width: 88, flexDirection: 'row' },
  sideEnd: { justifyContent: 'flex-end' },
  logo: { flex: 1, minHeight: layout.touch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoText: { fontFamily: fonts.serif, fontSize: 21, letterSpacing: 0.21, color: colors.ink },
  tabBar: { flexDirection: 'row', paddingTop: 6, paddingHorizontal: 8, backgroundColor: colors.glass, borderTopWidth: 1, borderTopColor: colors.line },
  tab: { flex: 1, minHeight: layout.touch, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabLabel: { fontFamily: fonts.sans, fontSize: 10, letterSpacing: 0.4 },
});
