import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Footer } from '@/components/Footer';
import { VerticalGradient } from '@/components/Gradient';
import { Hero } from '@/components/Hero';
import { Icon, type IconName } from '@/components/Icon';
import { Photo } from '@/components/Photo';
import { TabPage } from '@/components/Page';
import { Alert, Button, Eyebrow, Input, Skeleton, Text, TextButton } from '@/components/ui';
import { WatchGrid } from '@/components/WatchCard';
import { useBanners, useBrands, useCategories, useCategoryCovers, useNewsletter, useWatches } from '@/lib/catalog';
import { colors, fonts, layout, radius, spacing } from '@/theme';

const PERKS: { icon: IconName; title: string; detail: string }[] = [
  { icon: 'truck', title: 'Free shipping', detail: 'On every order' },
  { icon: 'shield', title: '2-year warranty', detail: 'International' },
  { icon: 'lock', title: 'Secure checkout', detail: 'Card or cash on delivery' },
  { icon: 'rotate', title: '30-day returns', detail: 'Free collection' },
];

const FEATURED_COUNT = 4;

const SectionHead = ({ eyebrow, title, onViewAll }: { eyebrow: string; title: string; onViewAll?: () => void }) => (
  <View style={styles.sectionHead}>
    <View style={styles.sectionTitles}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Text variant="h2" style={styles.sectionTitle}>{title}</Text>
    </View>
    {onViewAll && <TextButton label="View all" onPress={onViewAll} size={13} weight="sans" style={styles.viewAll} />}
  </View>
);

const pad = (value: number) => String(value).padStart(2, '0');

const EMAIL_PATTERN = /^\S+@\S+\.\S{2,}$/;

const Newsletter = () => {
  const subscribe = useNewsletter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!EMAIL_PATTERN.test(email.trim())) return setError('Enter a valid email address');
    setError(null);
    subscribe.mutate(email.trim());
  };

  return (
    <View style={styles.newsletter}>
      <Text variant="title" style={styles.newsletterTitle}>Early access to limited releases</Text>
      <Text variant="base" color={colors.secondary} style={styles.newsletterText}>One email a month. New references, restocks and private sales.</Text>
      {subscribe.isSuccess ? (
        <Alert tone="success" icon="check">You’re on the list. Check your inbox to confirm.</Alert>
      ) : (
        <View style={styles.newsletterForm}>
          <Input label="Email address" height={48} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} error={error ?? (subscribe.isError ? subscribe.error.message : null)} onChangeText={setEmail} />
          <Button label="Subscribe" size="lg" loading={subscribe.isPending} onPress={submit} />
        </View>
      )}
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const banners = useBanners();
  const categories = useCategories();
  const brands = useBrands();
  const covers = useCategoryCovers();
  const featured = useWatches({ featured: true, pageSize: FEATURED_COUNT });
  const showAll = () => router.navigate('/shop');

  return (
    <TabPage contentStyle={styles.page}>
      {banners.data?.length ? <Hero banners={banners.data} /> : <Skeleton width="100%" height={layout.heroHeight} />}

      <View style={styles.perks}>
        {PERKS.map(({ icon, title, detail }) => (
          <View key={title} style={styles.perk}>
            <Icon name={icon} size={20} color={colors.primary} strokeWidth={1.5} />
            <View style={styles.perkText}>
              <Text variant="label" style={styles.perkTitle}>{title}</Text>
              <Text variant="small" style={styles.perkDetail}>{detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHead eyebrow="Collections" title="Shop by category" onViewAll={showAll} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow} snapToInterval={180} decelerationRate="fast">
          {categories.data?.map((category, index) => (
            <Pressable
              key={category.id}
              accessibilityRole="link"
              accessibilityLabel={category.name}
              onPress={() => router.navigate({ pathname: '/shop', params: { categoryId: String(category.id) } })}
              style={styles.category}
            >
              <Photo path={category.imageUrl ?? covers.get(category.id)} style={[StyleSheet.absoluteFill, styles.square]} />
              <VerticalGradient id={`category-${category.id}`} stops={[{ offset: '0.35', color: colors.primaryDark, opacity: 0 }, { offset: '1', color: colors.primaryDark, opacity: 0.92 }]} />
              <Text variant="meta" color={colors.onPrimary} style={styles.categoryNumber}>{pad(index + 1)}</Text>
              <View style={styles.categoryText}>
                <Text variant="title" color={colors.onPrimary} style={styles.categoryName}>{category.name}</Text>
                <Text variant="small" color={colors.tint}>{`${category.watchCount ?? 0} watches`}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.section, styles.padded]}>
        <SectionHead eyebrow="Selected" title="Featured watches" onViewAll={showAll} />
        {featured.data ? <WatchGrid watches={featured.data.items} /> : <Skeleton width="100%" height={280} />}
      </View>

      {banners.data?.length ? (
        <View style={styles.craft}>
          <Photo path={banners.data[banners.data.length - 1]?.imageUrl} style={styles.craftImage} />
          <View style={styles.craftBody}>
            <Eyebrow color={colors.primary}>The WatchHub standard</Eyebrow>
            <Text variant="display" style={styles.craftTitle}>Every watch is inspected, regulated and boxed by hand.</Text>
            <Text variant="body">We test accuracy over five days in five positions before a watch leaves our workshop. If it drifts outside the maker’s tolerance, it doesn’t ship.</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.houses, styles.padded]}>
        <Eyebrow>Our houses</Eyebrow>
        {brands.data?.map((brand, index) => (
          <Pressable
            key={brand.id}
            accessibilityRole="link"
            accessibilityLabel={brand.name}
            onPress={() => router.navigate({ pathname: '/shop', params: { brandId: String(brand.id) } })}
            style={styles.house}
          >
            <Text variant="meta">{pad(index + 1)}</Text>
            <View style={styles.houseText}>
              <Text variant="title">{brand.name}</Text>
              <Text variant="small" style={styles.houseDetail}>{brand.description}</Text>
            </View>
            <Icon name="arrowUpRight" size={18} color={colors.primary} strokeWidth={1.6} />
          </Pressable>
        ))}
      </View>

      <Newsletter />
      <Footer />
    </TabPage>
  );
}

const styles = StyleSheet.create({
  page: { gap: 0, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  padded: { paddingHorizontal: 24 },
  perks: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  perk: { width: '50%', flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 18, paddingHorizontal: layout.gutter, borderBottomWidth: 1, borderBottomColor: colors.line },
  perkText: { flex: 1, gap: 2 },
  perkTitle: { fontFamily: fonts.sansMedium },
  perkDetail: { lineHeight: 17 },
  section: { paddingTop: 48, gap: layout.gutter },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24 },
  sectionTitles: { gap: 8 },
  sectionTitle: { fontSize: 30, lineHeight: 32 },
  viewAll: { minHeight: layout.touch },
  categoryRow: { gap: spacing.md, paddingHorizontal: 24 },
  category: { width: 168, height: 228, overflow: 'hidden', borderRadius: radius.base, backgroundColor: colors.line },
  square: { borderRadius: 0 },
  categoryNumber: { position: 'absolute', top: 12, left: 12 },
  categoryText: { position: 'absolute', left: 14, right: 14, bottom: 14, gap: 3 },
  categoryName: { fontSize: 22 },
  craft: { marginTop: 56, marginHorizontal: layout.gutter, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  craftImage: { height: 260, borderRadius: 0 },
  craftBody: { gap: 14, paddingTop: 24, paddingHorizontal: layout.gutter, paddingBottom: 28 },
  craftTitle: { fontSize: 32, lineHeight: 35 },
  newsletter: { marginTop: 48, marginHorizontal: 24, gap: 14, paddingVertical: 28, paddingHorizontal: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  newsletterTitle: { fontSize: 26, lineHeight: 29 },
  newsletterText: { lineHeight: 22 },
  newsletterForm: { gap: 10 },
  houses: { paddingTop: 56, gap: spacing.sm },
  house: { minHeight: layout.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 18, borderTopWidth: 1, borderTopColor: colors.line },
  houseText: { flex: 1, gap: 3 },
  houseDetail: { fontSize: 13 },
});
