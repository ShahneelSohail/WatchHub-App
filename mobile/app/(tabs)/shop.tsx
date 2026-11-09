import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { BottomSheet } from '@/components/Overlays';
import { TabPage } from '@/components/Page';
import { Popover } from '@/components/Popover';
import { Button, CheckRow, CountBadge, EmptyState, Eyebrow, Input, Pill, Skeleton, Switch, Text, TextButton } from '@/components/ui';
import { WatchGrid } from '@/components/WatchCard';
import { SORT_OPTIONS, useBrands, useCategories, useWatches, type SortKey, type WatchFilters } from '@/lib/catalog';
import { formatWholeMoney } from '@/lib/format';
import { colors, fonts, layout, radius, spacing } from '@/theme';

const PAGE_SIZE = 8;
const SKELETON_CARDS = [1, 2, 3, 4];

interface FilterState {
  categoryId?: number;
  brandId?: number;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
}

const NO_FILTERS: FilterState = { minPrice: '', maxPrice: '', inStock: false };

const toId = (value: string | string[] | undefined): number | undefined => {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const FilterGroup = ({ legend, children }: { legend: string; children: React.ReactNode }) => (
  <View style={styles.group}>
    <Eyebrow>{legend}</Eyebrow>
    {children}
  </View>
);

export default function ShopScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; brandId?: string }>();
  const categories = useCategories();
  const brands = useBrands();
  const [filters, setFilters] = useState<FilterState>({ ...NO_FILTERS, categoryId: toId(params.categoryId), brandId: toId(params.brandId) });
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setFilters({ ...NO_FILTERS, categoryId: toId(params.categoryId), brandId: toId(params.brandId) });
    setPage(1);
  }, [params.categoryId, params.brandId]);

  const query: WatchFilters = { ...filters, sort, page, pageSize: PAGE_SIZE };
  const result = useWatches(query);
  const total = result.data?.meta.total ?? 0;
  const totalPages = result.data?.meta.totalPages ?? 1;

  const update = (patch: Partial<FilterState>) => {
    setFilters(current => ({ ...current, ...patch }));
    setPage(1);
  };
  const clearAll = () => update({ ...NO_FILTERS, categoryId: undefined, brandId: undefined });

  const chips = [
    filters.categoryId && { label: categories.data?.find(category => category.id === filters.categoryId)?.name ?? 'Category', remove: () => update({ categoryId: undefined }) },
    filters.brandId && { label: brands.data?.find(brand => brand.id === filters.brandId)?.name ?? 'Brand', remove: () => update({ brandId: undefined }) },
    (filters.minPrice || filters.maxPrice) && {
      label: `${filters.minPrice ? formatWholeMoney(Number(filters.minPrice)) : '$0'}–${filters.maxPrice ? formatWholeMoney(Number(filters.maxPrice)) : 'any'}`,
      remove: () => update({ minPrice: '', maxPrice: '' }),
    },
    filters.inStock && { label: 'In stock', remove: () => update({ inStock: false }) },
  ].filter((chip): chip is { label: string; remove: () => void } => Boolean(chip));

  const countLabel = `${total} ${total === 1 ? 'watch' : 'watches'}`;

  return (
    <>
      <TabPage stickyHeaderIndices={[1]} contentStyle={styles.page}>
        <View style={styles.heading}>
          <Eyebrow>Catalogue</Eyebrow>
          <View style={styles.titleRow}>
            <Text variant="display" style={styles.title}>All watches</Text>
            <Text variant="small" style={styles.count}>{countLabel}</Text>
          </View>
        </View>

        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Filter" onPress={() => setSheetOpen(true)} style={[styles.toolButton, styles.filterButton]}>
            <Icon name="sliders" size={16} />
            <RNText style={styles.toolLabel}>Filter</RNText>
            {chips.length > 0 && <CountBadge count={chips.length} style={styles.filterCount} />}
          </Pressable>
          <Popover
            width={220}
            style={styles.sortAnchor}
            trigger={open => (
              <Pressable accessibilityRole="button" accessibilityLabel="Sort" accessibilityHint="Opens sort options" onPress={open} style={[styles.toolButton, styles.sortButton]}>
                <RNText numberOfLines={1} style={[styles.toolLabel, styles.flex]}>{SORT_OPTIONS.find(option => option.key === sort)?.label}</RNText>
                <Icon name="down" size={14} strokeWidth={1.8} />
              </Pressable>
            )}
          >
            {close =>
              SORT_OPTIONS.map(({ key, label }) => (
                <Pressable
                  key={key}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: sort === key }}
                  onPress={() => {
                    setSort(key);
                    setPage(1);
                    close();
                  }}
                  style={styles.sortOption}
                >
                  <RNText style={[styles.sortLabel, sort === key && { color: colors.primary }]}>{label}</RNText>
                  {sort === key && <Icon name="check" size={14} color={colors.primary} strokeWidth={2} />}
                </Pressable>
              ))
            }
          </Popover>
        </View>

        <View style={styles.body}>
          {chips.length > 0 && (
            <View style={styles.chips}>
              {chips.map(chip => (
                <Pill key={chip.label} label={chip.label} size={32} onRemove={chip.remove} />
              ))}
              <TextButton label="Clear all" onPress={clearAll} underline style={styles.clearAll} />
            </View>
          )}

          {result.isPending ? (
            <View style={styles.skeletonGrid}>
              {SKELETON_CARDS.map(card => (
                <View key={card} style={styles.skeletonCard}>
                  <Skeleton width="100%" height={170} />
                  <Skeleton width="40%" height={9} />
                  <Skeleton width="85%" height={14} />
                  <Skeleton width="50%" height={12} />
                </View>
              ))}
            </View>
          ) : result.data && total > 0 ? (
            <WatchGrid watches={result.data.items} />
          ) : (
            <View style={styles.noResults}>
              <EmptyState icon="watch" ring={false} bare title="No watches match" message="Try removing a filter or widening the price range." actions={<Button label="Clear all filters" onPress={clearAll} />} />
            </View>
          )}

          {totalPages > 1 && (
            <View style={styles.pages}>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(number => (
                <Pressable
                  key={number}
                  accessibilityRole="button"
                  accessibilityLabel={`Page ${number}`}
                  accessibilityState={{ selected: number === page }}
                  onPress={() => setPage(number)}
                  style={[styles.pageButton, number === page && styles.pageButtonActive]}
                >
                  <RNText style={[styles.pageLabel, number === page && { color: colors.onPrimary }]}>{number}</RNText>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </TabPage>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        label="filters"
        title="Filter"
        footer={
          <>
            <Button label="Clear" variant="neutral" size="xl" onPress={clearAll} />
            <Button label={`Show ${countLabel}`} size="xl" onPress={() => setSheetOpen(false)} style={styles.flex} />
          </>
        }
      >
        <SheetBody filters={filters} onChange={update} />
      </BottomSheet>
    </>
  );
}

const SheetBody = ({ filters, onChange }: { filters: FilterState; onChange: (patch: Partial<FilterState>) => void }) => {
  const categories = useCategories();
  const brands = useBrands();
  return (
    <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
      <FilterGroup legend="Category">
        {categories.data?.map(category => (
          <CheckRow key={category.id} label={category.name} count={category.watchCount} checked={filters.categoryId === category.id} onPress={() => onChange({ categoryId: filters.categoryId === category.id ? undefined : category.id })} />
        ))}
      </FilterGroup>
      <FilterGroup legend="Brand">
        {brands.data?.map(brand => (
          <CheckRow key={brand.id} label={brand.name} count={brand.watchCount} checked={filters.brandId === brand.id} onPress={() => onChange({ brandId: filters.brandId === brand.id ? undefined : brand.id })} />
        ))}
      </FilterGroup>
      <FilterGroup legend="Price, USD">
        <View style={styles.priceRow}>
          <View style={styles.flex}>
            <Input label="Min" height={44} keyboardType="number-pad" placeholder="0" value={filters.minPrice} onChangeText={value => onChange({ minPrice: digitsOnly(value) })} />
          </View>
          <View style={styles.flex}>
            <Input label="Max" height={44} keyboardType="number-pad" placeholder="Any" value={filters.maxPrice} onChangeText={value => onChange({ maxPrice: digitsOnly(value) })} />
          </View>
        </View>
      </FilterGroup>
      <View style={styles.stockRow}>
        <Text variant="body" color={colors.ink}>In stock only</Text>
        <Switch label="In stock only" value={filters.inStock} onChange={inStock => onChange({ inStock })} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  page: { gap: 0, paddingHorizontal: 0, paddingTop: 0 },
  flex: { flex: 1 },
  heading: { gap: 6, paddingTop: layout.gutter, paddingHorizontal: layout.gutter },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 36, lineHeight: 36 },
  count: { fontSize: 13 },
  toolbar: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingVertical: 10, paddingHorizontal: layout.gutter, backgroundColor: colors.page, borderBottomWidth: 1, borderBottomColor: colors.line },
  toolButton: { height: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  filterButton: { flex: 1, justifyContent: 'center' },
  filterCount: { position: 'relative', top: 0, right: 0, minWidth: 18, height: 18 },
  sortAnchor: { flex: 1.3 },
  sortButton: { paddingHorizontal: 14 },
  toolLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  sortOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  sortLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  body: { gap: layout.gutter, paddingTop: 12, paddingHorizontal: layout.gutter },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  clearAll: { minHeight: 32, paddingHorizontal: 6 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, columnGap: 12, paddingTop: 8 },
  skeletonCard: { width: '48%', gap: 10 },
  noResults: { marginVertical: spacing.xl, padding: 40, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, borderRadius: radius.base },
  pages: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  pageButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.base, backgroundColor: colors.surface },
  pageButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pageLabel: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink, fontVariant: ['tabular-nums'] },
  sheetContent: { gap: 24, paddingHorizontal: layout.gutter, paddingBottom: spacing.lg },
  group: { gap: 2 },
  priceRow: { flexDirection: 'row', gap: 10 },
  stockRow: { minHeight: layout.touch, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
