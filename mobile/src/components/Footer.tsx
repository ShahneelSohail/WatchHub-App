import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, layout, spacing } from '@/theme';
import { Text, TextButton } from './ui';

const LINKS: { label: string; href: Href }[] = [
  { label: 'FAQ', href: '/faq' },
  { label: 'Support', href: '/support' },
  { label: 'My orders', href: '/orders' },
  { label: 'Notifications', href: '/notifications' },
  { label: 'Account', href: '/account' },
  { label: 'Wishlist', href: '/wishlist' },
];

export const Footer = () => {
  const router = useRouter();
  return (
    <View style={styles.footer}>
      <Text variant="h2" color={colors.onPrimary} style={styles.logo}>WatchHub</Text>
      <View style={styles.links}>
        {LINKS.map(({ label, href }) => (
          <TextButton key={label} label={label} color={colors.tint} size={14} weight="sans" onPress={() => router.push(href)} style={styles.link} />
        ))}
      </View>
      <Text variant="meta" color={colors.tint}>© 2026 WatchHub · Free shipping · Two-year warranty · 30-day returns</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: { marginTop: 56, gap: spacing.xl, paddingTop: 48, paddingHorizontal: 24, paddingBottom: 48, backgroundColor: colors.primaryDark },
  logo: { fontSize: 28 },
  links: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  link: { width: '50%', minHeight: layout.touch - 12 },
});
