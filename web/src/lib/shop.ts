'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useToast, useAuth } from '@/components/Providers';
import { api } from './api';
import type { CartLine, StrapType, Watch } from './types';

const CART_KEY = ['cart'];
const WISHLIST_KEY = ['wishlist'];

export const useLoginRedirect = () => {
  const router = useRouter();
  const pathname = usePathname();
  return () => router.push(`/login?next=${encodeURIComponent(pathname)}`);
};

export const useCart = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: CART_KEY, queryFn: () => api.get<CartLine[]>('/cart'), enabled: Boolean(user) });
};

export const cartCount = (lines: CartLine[] | undefined): number => lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0;

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
    onSuccess,
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

export const useQuickAdd = () => {
  const { user } = useAuth();
  const toast = useToast();
  const redirectToLogin = useLoginRedirect();
  const { add } = useCartActions();

  return (watch: Watch) => {
    if (!user) return redirectToLogin();
    add.mutate({ watchId: watch.id, quantity: 1, productColor: watch.colors[0]?.name ?? null, strapType: null, strapColor: null }, { onSuccess: () => toast('success', `${watch.name} added to bag`) });
  };
};

export const useWishlist = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: WISHLIST_KEY, queryFn: () => api.get<Watch[]>('/wishlist'), enabled: Boolean(user) });
};

export const useWishlistToggle = () => {
  const { user } = useAuth();
  const redirectToLogin = useLoginRedirect();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: wishlist } = useWishlist();

  const mutation = useMutation({
    mutationFn: ({ watchId, saved }: { watchId: number; saved: boolean }) => (saved ? api.delete<Watch[]>(`/wishlist/${watchId}`) : api.put<Watch[]>(`/wishlist/${watchId}`)),
    onSuccess: (items, { saved }) => {
      queryClient.setQueryData(WISHLIST_KEY, items);
      toast('success', saved ? 'Removed from wishlist' : 'Saved to wishlist');
    },
    onError: (error: Error) => toast('error', error.message),
  });

  const isSaved = (watchId: number) => Boolean(wishlist?.some(watch => watch.id === watchId));
  const toggle = (watchId: number) => {
    if (!user) return redirectToLogin();
    mutation.mutate({ watchId, saved: isSaved(watchId) });
  };
  return { isSaved, toggle };
};
