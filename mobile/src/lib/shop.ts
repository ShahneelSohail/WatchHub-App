import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useToast } from '@/components/Toast';
import { api } from './api';
import { useAuth } from './auth';
import type { CartLine, StrapType, Watch } from './types';

export const CART_KEY = ['cart'];
const WISHLIST_KEY = ['wishlist'];

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

export const useRequireAuth = () => {
  const { user } = useAuth();
  const router = useRouter();
  return (action: () => void) => (user ? action() : router.push('/login'));
};

export const defaultCartOptions = (watch: Watch): CartOptions => ({
  strapType: watch.hasChainOption ? 'CHAIN' : watch.hasBeltOption ? 'BELT' : null,
  strapColor: null,
  productColor: watch.colors[0]?.name ?? null,
});

export const useQuickAdd = () => {
  const { add } = useCartActions();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  return (watch: Watch) =>
    requireAuth(() => {
      if (watch.stock === 0) return toast('success', 'Sold out. Open the watch to get notified on restock.');
      add.mutate({ watchId: watch.id, quantity: 1, ...defaultCartOptions(watch) }, { onSuccess: () => toast('success', `${watch.name} added to bag`) });
    });
};

export const useWishlist = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: WISHLIST_KEY, queryFn: () => api.get<Watch[]>('/wishlist'), enabled: Boolean(user) });
};

export const useWishlistToggle = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const requireAuth = useRequireAuth();
  const { data: wishlist } = useWishlist();

  const mutation = useMutation({
    mutationFn: ({ watch, saved }: { watch: Watch; saved: boolean }) => (saved ? api.delete<Watch[]>(`/wishlist/${watch.id}`) : api.put<Watch[]>(`/wishlist/${watch.id}`)),
    onSuccess: (items, { saved }) => {
      queryClient.setQueryData(WISHLIST_KEY, items);
      toast('success', saved ? 'Removed from wishlist' : 'Saved to wishlist');
    },
    onError: (error: Error) => toast('error', error.message),
  });

  const isSaved = (watchId: number) => Boolean(wishlist?.some(watch => watch.id === watchId));
  const toggle = (watch: Watch) => requireAuth(() => mutation.mutate({ watch, saved: isSaved(watch.id) }));
  return { isSaved, toggle };
};
