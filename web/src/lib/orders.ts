'use client';

import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/Providers';
import { api } from './api';
import type { Order } from './types';

export const usePayOrder = () => {
  const toast = useToast();
  return useMutation({
    mutationFn: (id: number) => api.post<{ checkoutUrl: string }>(`/orders/${id}/pay`),
    onSuccess: ({ checkoutUrl }) => window.location.assign(checkoutUrl),
    onError: (error: Error) => toast('error', error.message),
  });
};

export const awaitingPayment = (order: Order): boolean => order.status === 'PENDING_PAYMENT' && order.paymentMethod === 'STRIPE';

export const canCancelOrder = (order: Order): boolean => order.status === 'PENDING_PAYMENT' || order.status === 'PENDING';
