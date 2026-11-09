import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, withQuery } from './api';
import { useAuth } from './auth';
import type { Notification } from './types';

const NOTIFICATIONS_PAGE_SIZE = 50;
const NOTIFICATIONS_KEY = ['notifications'];

export const useNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => api.page<Notification>(withQuery('/notifications', { pageSize: NOTIFICATIONS_PAGE_SIZE })),
    enabled: Boolean(user),
  });
};

export const useUnreadCount = (): number => useNotifications().data?.meta.unread ?? 0;

export const useMarkRead = () => {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  const one = useMutation({ mutationFn: (id: number) => api.post(`/notifications/${id}/read`), onSuccess: refresh });
  const all = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refresh });
  return { one, all };
};
