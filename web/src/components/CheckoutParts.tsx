'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import type { CartLine, ShippingMethod, Totals } from '@/lib/types';
import { Button, cx, Input } from './ui';
import { useStoreUi } from './StoreUi';

export interface QuoteTotals extends Totals {
  codAvailable?: boolean;
  codLimit?: number;
  codReason?: string | null;
}

export const useQuote = (shippingMethod: ShippingMethod, cart: CartLine[] | undefined) => {
  const { couponCode, setCouponCode } = useStoreUi();
  const signature = cart?.map(line => `${line.id}:${line.quantity}`).join(',') ?? '';
  const quote = useQuery({
    queryKey: ['quote', shippingMethod, couponCode, signature],
    queryFn: () => api.post<QuoteTotals>('/checkout/quote', { shippingMethod, couponCode: couponCode ?? undefined }),
    enabled: Boolean(cart?.length),
    retry: false,
  });
  const failed = quote.isError;
  useEffect(() => {
    if (failed && couponCode) setCouponCode(null);
  }, [failed, couponCode, setCouponCode]);
  return quote;
};

export const CouponBox = ({ shippingMethod }: { shippingMethod: ShippingMethod }) => {
  const { couponCode, setCouponCode } = useStoreUi();
  const [input, setInput] = useState('');
  const apply = useMutation({
    mutationFn: (code: string) => api.post<Totals>('/checkout/quote', { shippingMethod, couponCode: code }),
    onSuccess: (totals, code) => {
      setCouponCode(totals.couponCode ?? code);
      setInput('');
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const code = input.trim().toUpperCase();
    if (code) apply.mutate(code);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium">Coupon code</span>
      {couponCode ? (
        <div className="flex h-11 items-center justify-between rounded-card border border-dashed border-primary bg-primary-tint py-0 pr-1.5 pl-3 animate-rise">
          <span className="text-sm font-bold tracking-[0.06em] text-primary">{couponCode}</span>
          <button type="button" onClick={() => { setCouponCode(null); apply.reset(); }} className="h-[34px] px-2.5 text-[13px] font-medium text-primary underline">
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={input}
            onChange={event => {
              setInput(event.target.value);
              apply.reset();
            }}
            placeholder="e.g. WELCOME10"
            aria-label="Coupon code"
            aria-invalid={apply.isError}
            className="h-11 min-w-0 flex-1 text-sm tracking-[0.04em] uppercase placeholder:tracking-normal placeholder:normal-case"
          />
          <Button type="submit" variant="outline" loading={apply.isPending}>
            Apply
          </Button>
        </form>
      )}
      {apply.isError && <span className="text-xs text-danger-ink">{apply.error.message}</span>}
      {couponCode && apply.isSuccess && <span className="text-xs text-success-ink">{couponCode} applied.</span>}
    </div>
  );
};

export const SummaryRows = ({ totals, shippingLabel }: { totals: Totals; shippingLabel: string }) => {
  const rows: { label: string; value: string; className?: string }[] = [
    { label: 'Subtotal', value: formatMoney(totals.subtotal) },
    ...(totals.discount > 0 ? [{ label: `Discount · ${totals.couponCode}`, value: `−${formatMoney(totals.discount)}`, className: 'text-success-ink' }] : []),
    { label: shippingLabel, value: totals.shippingCost ? formatMoney(totals.shippingCost) : 'Free' },
  ];
  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-3.5 text-sm">
      {rows.map(row => (
        <div key={row.label} className="flex justify-between gap-3">
          <span className="text-ink-secondary">{row.label}</span>
          <span className={cx('tabular-nums', row.className)}>{row.value}</span>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-base font-semibold">Total</span>
        <span className="text-2xl font-semibold tabular-nums">{formatMoney(totals.total)}</span>
      </div>
    </div>
  );
};

export const SummaryCard = ({ children, className }: { children: ReactNode; className?: string }) => (
  <aside className={cx('flex min-w-0 flex-col gap-4 rounded-card border border-line bg-surface p-[22px] lg:sticky lg:top-[84px]', className)}>{children}</aside>
);
