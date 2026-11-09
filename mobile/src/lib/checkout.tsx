import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import { useAuth } from './auth';
import { useCart } from './shop';
import type { Address, AddressInput, CartLine, Quote, ShippingMethod, StockLine } from './types';

export interface CheckoutOptions {
  cardPayments: boolean;
  shippingCosts: Record<ShippingMethod, number>;
}

interface CheckoutValue {
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
  shippingMethod: ShippingMethod;
  setShippingMethod: (method: ShippingMethod) => void;
}

const CheckoutContext = createContext<CheckoutValue | null>(null);

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('STANDARD');
  const value = useMemo(() => ({ couponCode, setCouponCode, shippingMethod, setShippingMethod }), [couponCode, shippingMethod]);
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
};

export const useCheckoutState = (): CheckoutValue => {
  const value = useContext(CheckoutContext);
  if (!value) throw new Error('useCheckoutState must be used inside CheckoutProvider');
  return value;
};

const ADDRESSES_KEY = ['addresses'];

export const useCheckoutOptions = () => useQuery({ queryKey: ['checkout-options'], queryFn: () => api.get<CheckoutOptions>('/checkout/options') });

export const useAddresses = () => {
  const { user } = useAuth();
  return useQuery({ queryKey: ADDRESSES_KEY, queryFn: () => api.get<Address[]>('/addresses'), enabled: Boolean(user) });
};

export const useQuote = () => {
  const { couponCode, shippingMethod } = useCheckoutState();
  const cart = useCart();
  return useQuery({
    queryKey: ['quote', shippingMethod, couponCode, cart.data?.map(line => `${line.id}:${line.quantity}`).join(',')],
    queryFn: () => api.post<Quote>('/checkout/quote', { shippingMethod, couponCode: couponCode ?? undefined }),
    enabled: Boolean(cart.data?.length),
    retry: false,
  });
};

export const useApplyCoupon = () => {
  const { shippingMethod, setCouponCode } = useCheckoutState();
  return useMutation({
    mutationFn: (code: string) => api.post<Quote>('/checkout/quote', { shippingMethod, couponCode: code }),
    onSuccess: totals => setCouponCode(totals.couponCode),
  });
};

export const useAddressActions = () => {
  const queryClient = useQueryClient();
  const store = (addresses: Address[]) => queryClient.setQueryData(ADDRESSES_KEY, addresses);
  const create = useMutation({ mutationFn: (input: AddressInput) => api.post<Address[]>('/addresses', input), onSuccess: store });
  const update = useMutation({ mutationFn: ({ id, input }: { id: number; input: AddressInput }) => api.put<Address[]>(`/addresses/${id}`, input), onSuccess: store });
  const remove = useMutation({ mutationFn: (id: number) => api.delete<Address[]>(`/addresses/${id}`), onSuccess: store });
  return { create, update, remove };
};

export const useStockCheck = () => {
  const cart = useCart();
  return useQuery({
    queryKey: ['stock-check', cart.data?.map(line => `${line.id}:${line.quantity}`).join(',')],
    queryFn: () => api.get<{ ok: boolean; lines: StockLine[] }>('/checkout/stock'),
    enabled: Boolean(cart.data?.length),
  });
};

export const useLineAvailability = () => {
  const { data } = useStockCheck();
  return (line: CartLine): number => data?.lines.find(entry => entry.cartItemId === line.id)?.available ?? line.watch.stock;
};
