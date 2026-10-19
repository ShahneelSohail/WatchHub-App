'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useToast, useAuth } from '@/components/Providers';
import { api } from './api';
import type { CartLine, StrapType, Watch } from './types';

const CART_KEY = ['cart'];
const WISHLIST_KEY = ['wishlist'];

export const useCart = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: CART_KEY, queryFn: () => api.get<CartLine[]>('/cart'), enabled: Boolean(user) });
};

export interface CartOptions {
  strapType: StrapType | null;
  strapColor: string | null;
  productColor: string | null;
}

export const useCartActions = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const onSuccess = (lines: CartLine[]) => queryClient.setQueryData(CART_KEY, lines);
  const onError = (error: Error) => toast('error', error.message);

  const add = useMutation({
    mutationFn: (input: { watchId: number; quantity: number } & CartOptions) => api.post<CartLine[]>('/cart', input),
    onSuccess: lines => {
      onSuccess(lines);
      toast('success', 'Added to your cart.');
    },
    onError,
  });
  const setQuantity = useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => api.patch<CartLine[]>(`/cart/${id}`, { quantity }),
    onSuccess,
    onError,
  });
  const remove = useMutation({ mutationFn: (id: number) => api.delete<CartLine[]>(`/cart/${id}`), onSuccess, onError });
  return { add, setQuantity, remove };
};

export const useWishlist = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: WISHLIST_KEY, queryFn: () => api.get<Watch[]>('/wishlist'), enabled: Boolean(user) });
};

export const useWishlistToggle = () => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: wishlist } = useWishlist();

  const mutation = useMutation({
    mutationFn: ({ watchId, saved }: { watchId: number; saved: boolean }) => (saved ? api.delete<Watch[]>(`/wishlist/${watchId}`) : api.put<Watch[]>(`/wishlist/${watchId}`)),
    onSuccess: items => queryClient.setQueryData(WISHLIST_KEY, items),
    onError: (error: Error) => toast('error', error.message),
  });

  const isSaved = (watchId: number) => Boolean(wishlist?.some(watch => watch.id === watchId));
  const toggle = (watchId: number) => {
    if (!user) return router.push('/login?next=/wishlist');
    mutation.mutate({ watchId, saved: isSaved(watchId) });
  };
  return { isSaved, toggle };
};
