import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, withQuery } from './api';
import type { Banner, Brand, Category, Faq, Review, Watch } from './types';

const CATALOG_STALE_MS = 5 * 60_000;
const STATIC = { staleTime: CATALOG_STALE_MS } as const;

export const useBrands = () => useQuery({ queryKey: ['brands'], queryFn: () => api.get<Brand[]>('/brands'), ...STATIC });

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories'), ...STATIC });

export const useBanners = () => useQuery({ queryKey: ['banners'], queryFn: () => api.get<Banner[]>('/banners'), ...STATIC });

export const useFaqs = () => useQuery({ queryKey: ['faqs'], queryFn: () => api.get<Faq[]>('/faqs'), ...STATIC });

export type SortKey = 'newest' | 'popular' | 'price_asc' | 'price_desc';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'popular', label: 'Most popular' },
  { key: 'price_asc', label: 'Price, low to high' },
  { key: 'price_desc', label: 'Price, high to low' },
];

export interface WatchFilters {
  q?: string;
  brandId?: number;
  categoryId?: number;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  featured?: boolean;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export const useWatches = (filters: WatchFilters, enabled = true) =>
  useQuery({
    queryKey: ['watches', filters],
    queryFn: () => api.page<Watch>(withQuery('/watches', { ...filters, inStock: filters.inStock ? 'true' : undefined, featured: filters.featured ? 'true' : undefined })),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useWatch = (slug: string) => useQuery({ queryKey: ['watch', slug], queryFn: () => api.get<Watch>(`/watches/${slug}`), retry: false });

const REVIEWS_PAGE_SIZE = 20;

export const useReviews = (watchId: number | undefined) =>
  useQuery({
    queryKey: ['reviews', watchId],
    queryFn: () => api.page<Review>(withQuery(`/watches/${watchId}/reviews`, { pageSize: REVIEWS_PAGE_SIZE })),
    enabled: watchId !== undefined,
  });

export const useSubmitReview = (watchId: number, slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; comment: string }) => api.post<Review>(`/watches/${watchId}/reviews`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', watchId] });
      queryClient.invalidateQueries({ queryKey: ['watch', slug] });
    },
  });
};

const CATALOGUE_SIZE = 60;

export const useCatalogue = () => useWatches({ pageSize: CATALOGUE_SIZE, sort: 'popular' });

export const useCategoryCovers = (): Map<number, string> => {
  const covers = new Map<number, string>();
  useCatalogue().data?.items.forEach(watch => {
    const image = watch.colors[0]?.image ?? watch.images[0];
    if (image && !covers.has(watch.category.id)) covers.set(watch.category.id, image);
  });
  return covers;
};

export const useWatchSlug = (watchId: number | null): string | undefined => useCatalogue().data?.items.find(watch => watch.id === watchId)?.slug;

export const useNewsletter = () => useMutation({ mutationFn: (email: string) => api.post<{ subscribed: boolean }>('/newsletter', { email }) });
