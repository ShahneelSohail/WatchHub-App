'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { TopbarAction } from '@/components/admin/chrome';
import { Button, EmptyBlock, FormField, Segmented, Switch, TextField } from '@/components/admin/controls';
import { useAction } from '@/components/admin/data';
import { FormModal } from '@/components/admin/overlays';
import { Pill } from '@/components/admin/pills';
import { DataTable, type Column } from '@/components/admin/table';
import type { AdminCoupon } from '@/components/admin/types';
import { shortDate } from '@/components/admin/utils';
import { useToast } from '@/components/Providers';
import { api } from '@/lib/api';
import { formatWholeMoney } from '@/lib/format';

interface CouponForm {
  code: string;
  type: AdminCoupon['type'];
  value: string;
  minAmount: string;
  usageLimit: string;
  expires: string;
}

type CouponErrors = Partial<Record<'code' | 'value' | 'usageLimit', string>>;

const CODE_PATTERN = /^[A-Z0-9]{4,16}$/;
const MAX_PERCENT = 90;
const EXPIRED_MESSAGE = 'Expired coupons can’t be reactivated. Create a new one.';
const TYPE_OPTIONS: { value: AdminCoupon['type']; label: string }[] = [
  { value: 'PERCENTAGE', label: 'Percent' },
  { value: 'FIXED', label: 'Fixed $' },
];

const emptyForm = (): CouponForm => ({ code: '', type: 'PERCENTAGE', value: '', minAmount: '', usageLimit: '', expires: '' });

const formFrom = (coupon: AdminCoupon): CouponForm => ({
  code: coupon.code,
  type: coupon.type,
  value: String(coupon.value),
  minAmount: coupon.minAmount ? String(coupon.minAmount) : '',
  usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
  expires: coupon.expiresAt?.slice(0, 10) ?? '',
});

const payloadFor = (coupon: AdminCoupon | null, form: CouponForm, isActive = coupon?.isActive ?? true) => ({
  code: form.code.trim().toUpperCase(),
  type: form.type,
  value: Number(form.value),
  minAmount: form.minAmount ? Number(form.minAmount) : null,
  usageLimit: Number(form.usageLimit),
  expiresAt: form.expires ? new Date(`${form.expires}T23:59:59`).toISOString() : null,
  startsAt: coupon?.startsAt ?? null,
  limitPerUser: coupon?.limitPerUser ?? null,
  isActive,
});

const numeric = (value: string) => value.replace(/[^\d.]/g, '');

interface CouponModalProps {
  coupon: AdminCoupon | null;
  coupons: AdminCoupon[];
  onClose: () => void;
  onDelete: (coupon: AdminCoupon) => void;
}

const CouponModal = ({ coupon, coupons, onClose, onDelete }: CouponModalProps) => {
  const [form, setForm] = useState(() => (coupon ? formFrom(coupon) : emptyForm()));
  const [errors, setErrors] = useState<CouponErrors>({});
  const save = useAction((payload: ReturnType<typeof payloadFor>) => (coupon ? api.put(`/admin/coupons/${coupon.id}`, payload) : api.post('/admin/coupons', payload)), {
    success: `${form.code.trim().toUpperCase()} ${coupon ? 'saved' : 'created'}`,
    onSuccess: onClose,
  });

  const edit = (patch: Partial<CouponForm>, clears: (keyof CouponErrors)[] = []) => {
    setForm(current => ({ ...current, ...patch }));
    setErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => !clears.includes(key as keyof CouponErrors))));
  };

  const submit = () => {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const found: CouponErrors = {
      code: !CODE_PATTERN.test(code) ? 'Use 4 to 16 letters or numbers' : coupons.some(other => other.code === code && other.id !== coupon?.id) ? `${code} already exists` : undefined,
      value: !(value > 0) ? 'Enter a discount value' : form.type === 'PERCENTAGE' && value > MAX_PERCENT ? `Percent discounts are capped at ${MAX_PERCENT}%` : undefined,
      usageLimit: !(Number(form.usageLimit) > 0) ? 'Enter how many times it can be used' : undefined,
    };
    const failures = Object.fromEntries(Object.entries(found).filter(([, message]) => message));
    setErrors(failures);
    if (Object.keys(failures).length === 0) save.mutate(payloadFor(coupon, form));
  };

  return (
    <FormModal
      title={coupon ? `Edit ${coupon.code}` : 'New coupon'}
      sub="Customers enter the code at checkout."
      cta={coupon ? 'Save coupon' : 'Create coupon'}
      busy={save.isPending}
      onSubmit={submit}
      onClose={onClose}
      extra={
        coupon && (
          <Button variant="danger" size="lg" onClick={() => onDelete(coupon)}>
            Delete
          </Button>
        )
      }
    >
      <TextField
        label="Code"
        placeholder="WINTER25"
        value={form.code}
        error={errors.code}
        className="[&_input]:font-bold [&_input]:tracking-[0.06em] [&_input]:text-link [&_input]:uppercase"
        onChange={event => edit({ code: event.target.value }, ['code'])}
      />
      <div className="grid grid-cols-[auto_1fr] items-start gap-3">
        <FormField label="Type">
          <Segmented label="Discount type" options={TYPE_OPTIONS} value={form.type} onChange={type => edit({ type })} height="h-[42px]" />
        </FormField>
        <TextField label="Value" inputMode="decimal" placeholder={form.type === 'PERCENTAGE' ? '15' : '50'} value={form.value} error={errors.value} onChange={event => edit({ value: numeric(event.target.value) }, ['value'])} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <TextField label="Min order $" inputMode="decimal" placeholder="None" value={form.minAmount} onChange={event => edit({ minAmount: numeric(event.target.value) })} />
        <TextField label="Usage limit" inputMode="numeric" placeholder="100" value={form.usageLimit} error={errors.usageLimit} onChange={event => edit({ usageLimit: numeric(event.target.value) }, ['usageLimit'])} />
        <TextField label="Expires" type="date" value={form.expires} onChange={event => edit({ expires: event.target.value })} />
      </div>
    </FormModal>
  );
};

export default function AdminCouponsPage() {
  const toast = useToast();
  const coupons = useQuery({ queryKey: ['admin', 'coupons'], queryFn: () => api.get<AdminCoupon[]>('/admin/coupons') });
  const [editing, setEditing] = useState<AdminCoupon | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);

  const toggle = useAction((coupon: AdminCoupon) => api.put(`/admin/coupons/${coupon.id}`, payloadFor(coupon, formFrom(coupon), !coupon.isActive)), {
    success: (_, coupon) => `${coupon.code} ${coupon.isActive ? 'paused' : 'activated'}`,
  });
  const remove = useAction((coupon: AdminCoupon) => api.delete(`/admin/coupons/${coupon.id}`), {
    success: (_, coupon) => `${coupon.code} deleted`,
    onSuccess: () => {
      setDeleting(null);
      setEditing(null);
    },
  });

  const columns: Column<AdminCoupon>[] = [
    {
      id: 'code',
      header: 'Code',
      track: 'minmax(0,1fr)',
      sortValue: coupon => coupon.code,
      cell: coupon => <span className="inline-flex h-7 items-center rounded-card border border-dashed border-primary px-2.5 text-[13px] font-bold tracking-[0.06em] text-link">{coupon.code}</span>,
    },
    { id: 'discount', header: 'Discount', track: '120px', cell: coupon => <span className="font-semibold">{coupon.type === 'PERCENTAGE' ? `${coupon.value}% off` : `${formatWholeMoney(coupon.value)} off`}</span> },
    { id: 'conditions', header: 'Conditions', track: 'minmax(0,1fr)', cell: coupon => <span className="text-ink-secondary">{coupon.minAmount ? `Orders over ${formatWholeMoney(coupon.minAmount)}` : 'No minimum'}</span> },
    {
      id: 'usage',
      header: 'Usage',
      track: 'minmax(0,1.2fr)',
      sortValue: coupon => coupon.usageCount,
      cell: coupon => (
        <span className="flex items-center gap-2.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-primary-tint">
            <span className="block h-full bg-primary" style={{ width: `${coupon.usageLimit ? Math.min(100, (coupon.usageCount / coupon.usageLimit) * 100) : 0}%` }} />
          </span>
          <span className="text-xs whitespace-nowrap text-ink-secondary tabular-nums">{coupon.usageLimit ? `${coupon.usageCount} / ${coupon.usageLimit}` : `${coupon.usageCount} used`}</span>
        </span>
      ),
    },
    { id: 'expires', header: 'Expires', track: '120px', cell: coupon => <span className="text-ink-secondary">{coupon.expiresAt ? shortDate(coupon.expiresAt) : 'Never'}</span> },
    {
      id: 'status',
      header: 'Status',
      track: '110px',
      cell: coupon => (
        <Pill tone={coupon.isExpired || !coupon.isActive ? 'neutral' : 'confirmed'} dot dashed={!coupon.isExpired && !coupon.isActive}>
          {coupon.isExpired ? 'Expired' : coupon.isActive ? 'Active' : 'Paused'}
        </Pill>
      ),
    },
    {
      id: 'toggle',
      header: 'On',
      track: '64px',
      align: 'right',
      cell: coupon => (
        <span className="flex justify-end" onClick={event => event.stopPropagation()}>
          <Switch
            label={`Active ${coupon.code}`}
            checked={coupon.isActive && !coupon.isExpired}
            disabled={toggle.isPending}
            title={coupon.isExpired ? EXPIRED_MESSAGE : undefined}
            onChange={() => (coupon.isExpired ? toast('error', EXPIRED_MESSAGE) : toggle.mutate(coupon))}
          />
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <TopbarAction>
        <Button variant="primary" onClick={() => setEditing('new')}>
          + New coupon
        </Button>
      </TopbarAction>
      <DataTable
        label="Coupons"
        noun="coupon"
        columns={columns}
        rows={coupons.data ?? []}
        rowKey={coupon => coupon.id}
        minWidth={980}
        loading={coupons.isPending}
        onRowClick={setEditing}
        empty={<EmptyBlock title="No coupons yet" description="Create one to offer a discount at checkout." />}
      />
      {editing && <CouponModal coupon={editing === 'new' ? null : editing} coupons={coupons.data ?? []} onClose={() => setEditing(null)} onDelete={setDeleting} />}
      {deleting && <FormModal title={`Delete ${deleting.code}?`} sub="Past orders keep the discount they received." cta="Delete coupon" tone="danger" busy={remove.isPending} onSubmit={() => remove.mutate(deleting)} onClose={() => setDeleting(null)} />}
    </div>
  );
}
