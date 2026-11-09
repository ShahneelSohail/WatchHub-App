'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, withQuery } from '@/lib/api';
import type { AdminReview, Ticket } from '@/lib/types';
import { useToast } from '../Providers';
import type { NavKey } from './nav';
import type { AdminWatch, Analytics, AnalyticsRange, WatchSummary } from './types';

const FETCH_ALL_PAGE_SIZE = 60;

const fetchAll = async <T,>(path: string): Promise<T[]> => {
  const first = await api.page<T>(withQuery(path, { page: 1, pageSize: FETCH_ALL_PAGE_SIZE }));
  const rest = await Promise.all(Array.from({ length: first.meta.totalPages - 1 }, (_, index) => api.page<T>(withQuery(path, { page: index + 2, pageSize: FETCH_ALL_PAGE_SIZE }))));
  return [...first.items, ...rest.flatMap(page => page.items)];
};

export const useAllWatches = () => useQuery({ queryKey: ['admin', 'watches', 'all'], queryFn: () => fetchAll<AdminWatch>('/admin/watches') });
export const useAllReviews = () => useQuery({ queryKey: ['admin', 'reviews', 'all'], queryFn: () => fetchAll<AdminReview>('/admin/reviews') });

interface ActionOptions<V, R> {
  success?: string | ((result: R, variables: V) => string);
  onSuccess?: (result: R, variables: V) => void;
}

export const useAction = <V, R = unknown>(run: (variables: V) => Promise<R>, { success, onSuccess }: ActionOptions<V, R> = {}) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: run,
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      if (success) toast('success', typeof success === 'function' ? success(result, variables) : success);
      onSuccess?.(result, variables);
    },
    onError: (error: Error) => toast('error', error.message),
  });
};

export const useAnalytics = (range: AnalyticsRange) =>
  useQuery({ queryKey: ['admin', 'analytics', range], queryFn: () => api.get<Analytics>(`/admin/analytics?range=${range}`), placeholderData: keepPreviousData });

export const useWatchSummary = (q = '') => useQuery({ queryKey: ['admin', 'watches', 'summary', q], queryFn: () => api.get<WatchSummary>(withQuery('/admin/watches/summary', { q })), placeholderData: keepPreviousData });

export const useNavCounts = (): Partial<Record<NavKey, number>> => {
  const statusCounts = useAnalytics('7d').data?.statusCounts;
  const stock = useWatchSummary().data;
  const reviews = useAllReviews().data;
  const openTickets = useQuery({ queryKey: ['admin', 'tickets', 'open-count'], queryFn: () => api.page<Ticket>('/admin/tickets?status=OPEN&pageSize=1') }).data;

  return {
    orders: statusCounts?.filter(entry => entry.status === 'PENDING' || entry.status === 'PENDING_PAYMENT').reduce((sum, entry) => sum + entry.count, 0),
    inventory: stock && stock.lowStock + stock.soldOut,
    reviews: reviews?.filter(review => review.status === 'APPROVED' && !review.adminReply).length,
    tickets: openTickets?.meta.total,
  };
};
