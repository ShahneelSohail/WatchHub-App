import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/Toast';
import { api } from './api';
import { useAuth } from './auth';
import { useRequireAuth } from './shop';
import type { Watch } from './types';

const NOTIFIED_KEY = ['notified'];

export const useNotifyMe = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const { data: notified = [] } = useQuery<number[]>({ queryKey: NOTIFIED_KEY, queryFn: () => [], staleTime: Infinity, gcTime: Infinity });

  const subscribe = useMutation({
    mutationFn: (watch: Watch) => api.post(`/watches/${watch.id}/notify`, { email: user?.email }),
    onSuccess: (_result, watch) => {
      queryClient.setQueryData<number[]>(NOTIFIED_KEY, ids => [...(ids ?? []), watch.id]);
      toast('success', `We’ll email you when ${watch.name} is back`);
    },
    onError: (error: Error) => toast('error', error.message),
  });

  return {
    isNotified: (watchId: number) => notified.includes(watchId),
    request: (watch: Watch) => requireAuth(() => subscribe.mutate(watch)),
    pending: subscribe.isPending,
  };
};
