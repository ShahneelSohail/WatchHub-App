import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextStyle } from 'react-native';
import { Icon } from '@/components/Icon';
import { TabPage } from '@/components/Page';
import { Button, EmptyState, Eyebrow, Loading, Pill, Text } from '@/components/ui';
import { TileGrid } from '@/components/WatchCard';
import { useBrands, useCategories, useWatches } from '@/lib/catalog';
import { useDebounced } from '@/lib/hooks';
import { rememberSearch, useRecentSearches } from '@/lib/recent';
import { useNotifyMe } from '@/lib/notify';
import { useQuickAdd } from '@/lib/shop';
import { bareInput, colors, fonts, radius, spacing } from '@/theme';

const SEARCH_RESULTS = 60;
const SUGGESTION_COUNT = 5;

export default function SearchScreen() {
  const router = useRouter();
  const quickAdd = useQuickAdd();
  const notifyMe = useNotifyMe();
  const params = useLocalSearchParams<{ q?: string }>();
  const categories = useCategories();
  const brands = useBrands();
  const recent = useRecentSearches();
  const [input, setInput] = useState(params.q ?? '');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const q = useDebounced(input.trim());
  const results = useWatches({ q, pageSize: SEARCH_RESULTS }, q.length > 0);

  useEffect(() => {
    if (params.q) setInput(params.q);
  }, [params.q]);

  const items = results.data?.items ?? [];
  const visible = categoryId === null ? items : items.filter(watch => watch.category.id === categoryId);
  const categoryCounts = (categories.data ?? []).map(category => ({ category, count: items.filter(watch => watch.category.id === category.id).length })).filter(entry => entry.count > 0);
  const suggestions = [...(brands.data ?? []).map(brand => brand.name), ...(categories.data ?? []).map(category => category.name)].slice(0, SUGGESTION_COUNT);

  const search = (term: string) => {
    setInput(term);
    setCategoryId(null);
  };

  return (
    <TabPage>
      <View style={styles.field}>
        <Icon name="search" size={20} color={colors.primary} strokeWidth={1.8} />
        <TextInput
          accessibilityLabel="Search watches"
          value={input}
          onChangeText={search}
          onSubmitEditing={() => rememberSearch(input)}
          returnKeyType="search"
          placeholder="Watch, brand or reference"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {input.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => search('')} style={styles.clear}>
            <Icon name="close" size={14} color={colors.secondary} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {q.length === 0 ? (
        <View style={styles.idle}>
          {recent.length > 0 && (
            <View style={styles.block}>
              <Eyebrow>Recent</Eyebrow>
              <View style={styles.pills}>
                {recent.map(term => (
                  <Pill key={term} label={term} onPress={() => search(term)} />
                ))}
              </View>
            </View>
          )}
          <View style={styles.categoryList}>
            <Eyebrow>Categories</Eyebrow>
            {categories.data?.map(category => (
              <Pressable key={category.id} accessibilityRole="link" onPress={() => router.navigate({ pathname: '/shop', params: { categoryId: String(category.id) } })} style={styles.categoryRow}>
                <Text variant="title" style={styles.categoryName}>{category.name}</Text>
                <Icon name="forward" size={16} color={colors.secondary} strokeWidth={1.6} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : results.isPending ? (
        <Loading />
      ) : items.length > 0 ? (
        <>
          <View style={styles.titleRow}>
            <Text variant="h1" style={styles.title}>{`Results for “${q}”`}</Text>
            <Text variant="small" style={styles.count}>{`${visible.length} ${visible.length === 1 ? 'watch' : 'watches'}`}</Text>
          </View>
          <View style={styles.pills}>
            <Pill label="All" count={items.length} selected={categoryId === null} onPress={() => setCategoryId(null)} />
            {categoryCounts.map(({ category, count }) => (
              <Pill key={category.id} label={category.name} count={count} selected={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
            ))}
          </View>
          <TileGrid
            watches={visible}
            renderAction={watch =>
              watch.stock === 0 ? (
                <Button label={notifyMe.isNotified(watch.id) ? 'We’ll email you' : 'Notify me'} variant="outline" fill disabled={notifyMe.isNotified(watch.id)} onPress={() => notifyMe.request(watch)} />
              ) : (
                <Button label="Add to bag" fill onPress={() => quickAdd(watch)} />
              )
            }
          />
        </>
      ) : (
        <EmptyState
          icon="searchEmpty"
          ring={false}
          title={`No watches match “${q}”`}
          message="Check the spelling, try a brand name, or search one of these:"
          actions={
            <View style={[styles.pills, styles.suggestions]}>
              {suggestions.map(term => (
                <Pressable key={term} accessibilityRole="button" onPress={() => search(term)} style={styles.suggestion}>
                  <Text variant="baseMedium" color={colors.primary}>{term}</Text>
                </Pressable>
              ))}
            </View>
          }
        />
      )}
    </TabPage>
  );
}

const inputStyle: TextStyle = { flex: 1, minWidth: 0, height: 52, fontFamily: fonts.sans, fontSize: 17, color: colors.ink };

const styles = StyleSheet.create({
  field: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.base, boxShadow: `0 0 0 3px ${colors.tint}` },
  input: { ...inputStyle, ...bareInput },
  clear: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.page, borderRadius: radius.round },
  idle: { gap: 26 },
  block: { gap: 10 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryList: { gap: 6 },
  categoryRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line },
  categoryName: { fontSize: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  title: { fontSize: 30, lineHeight: 33, flexShrink: 1 },
  count: { fontSize: 14 },
  suggestions: { justifyContent: 'center' },
  suggestion: { height: 38, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.round },
});
