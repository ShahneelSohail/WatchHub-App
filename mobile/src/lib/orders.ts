import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useToast } from '@/components/Toast';
import { api, withQuery } from './api';
import { useAuth } from './auth';
import type { Order } from './types';

const ORDERS_PAGE_SIZE = 50;

export const ordersKey = ['orders'];
export const orderKey = (id: number) => ['order', id];

export const useOrders = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: ordersKey, queryFn: () => api.page<Order>(withQuery('/orders', { pageSize: ORDERS_PAGE_SIZE })), enabled: Boolean(user) });
};

export const useOrder = (id: number) => useQuery({ queryKey: orderKey(id), queryFn: () => api.get<Order>(`/orders/${id}`) });

export const useOrderActions = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const store = (order: Order) => {
    queryClient.setQueryData(orderKey(order.id), order);
    queryClient.invalidateQueries({ queryKey: ordersKey });
  };
  const onError = (error: Error) => toast('error', error.message);

  const cancel = useMutation({ mutationFn: (id: number) => api.post<Order>(`/orders/${id}/cancel`), onSuccess: store, onError });
  const switchToCod = useMutation({ mutationFn: (id: number) => api.post<Order>(`/orders/${id}/switch-to-cod`), onSuccess: store, onError });
  const confirmPayment = useMutation({ mutationFn: (id: number) => api.post<Order>(`/orders/${id}/confirm-payment`), onSuccess: store, onError });
  return { cancel, switchToCod, confirmPayment };
};

export type PaymentOutcome = 'paid' | 'pending' | 'cancelled';

const redirectStatus = (url: string): string | null => /[?&]status=([a-z]+)/.exec(url)?.[1] ?? null;

export const useCardPayment = () => {
  const { confirmPayment } = useOrderActions();
  const toast = useToast();

  const collect = async (orderId: number, checkoutUrl: string): Promise<PaymentOutcome> => {
    const session = await WebBrowser.openAuthSessionAsync(checkoutUrl, `watchhub://orders/${orderId}`);
    const cancelled = session.type !== 'success' || redirectStatus(session.url) === 'cancelled';
    const order = await confirmPayment.mutateAsync(orderId);
    if (order.paymentStatus === 'PAID') return 'paid';
    return cancelled ? 'cancelled' : 'pending';
  };

  const startPayment = async (orderId: number): Promise<PaymentOutcome | null> => {
    try {
      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>(`/orders/${orderId}/pay`, { platform: 'mobile' });
      return await collect(orderId, checkoutUrl);
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Payment could not be started.');
      return null;
    }
  };

  return { collect, startPayment };
};
