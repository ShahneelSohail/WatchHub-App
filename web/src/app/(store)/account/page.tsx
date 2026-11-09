'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent, type JSX } from 'react';
import { AddressForm } from '@/components/AddressForm';
import { Icon } from '@/components/Icon';
import { useAuth, useToast } from '@/components/Providers';
import { RequireAuth } from '@/components/RequireAuth';
import { Alert, Button, ErrorState, Field, Input, Spinner, Tabs, cx } from '@/components/ui';
import { api } from '@/lib/api';
import type { Address, User } from '@/lib/types';

const TAB_ITEMS = [
  { value: 'profile', label: 'Profile' },
  { value: 'password', label: 'Password' },
  { value: 'addresses', label: 'Addresses' },
] as const;

type TabValue = (typeof TAB_ITEMS)[number]['value'];

const section = 'flex flex-col gap-4 rounded-card border border-line bg-surface p-5 md:p-6 animate-fade';

const PROFILE_FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', autoComplete: 'name', required: true },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', required: false },
] as const;

const ProfileTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [dirty, setDirty] = useState(false);
  const save = useMutation({
    mutationFn: (body: object) => api.patch<User>('/auth/me', body),
    onSuccess: updated => {
      queryClient.setQueryData(['me'], updated);
      setDirty(false);
      toast('success', 'Profile saved');
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  };

  return (
    <form onSubmit={submit} onChange={() => setDirty(true)} className={section}>
      <div className="grid gap-3.5 sm:grid-cols-2">
        {PROFILE_FIELDS.map(field => (
          <Field key={field.name} label={field.label}>
            <Input name={field.name} type={field.type} autoComplete={field.autoComplete} defaultValue={user?.[field.name] ?? ''} required={field.required} />
          </Field>
        ))}
      </div>
      {save.isError && <ErrorState message={save.error.message} />}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {dirty && <span className="text-[13px] text-warning-ink">Unsaved changes</span>}
        {save.isSuccess && !dirty && <span className="text-[13px] text-success-ink">Your details are up to date</span>}
        <Button type="submit" loading={save.isPending} className="min-w-[140px]">
          Save changes
        </Button>
      </div>
    </form>
  );
};

const PASSWORD_RULES = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'A number', test: (value: string) => /\d/.test(value) },
  { label: 'A capital letter', test: (value: string) => /[A-Z]/.test(value) },
];

const STRENGTH_COLORS = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-primary-hover', 'bg-success'];

const PASSWORD_FIELDS = [
  { name: 'current', label: 'Current password', autoComplete: 'current-password' },
  { name: 'next', label: 'New password', autoComplete: 'new-password' },
  { name: 'confirm', label: 'Confirm new password', autoComplete: 'new-password' },
] as const;

const EMPTY_PASSWORDS = { current: '', next: '', confirm: '' };

const PasswordTab = () => {
  const [values, setValues] = useState(EMPTY_PASSWORDS);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY_PASSWORDS, string>>>({});
  const change = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword: values.current, newPassword: values.next }),
    onSuccess: () => setValues(EMPTY_PASSWORDS),
    onError: (error: Error) => setErrors({ current: error.message }),
  });

  const score = PASSWORD_RULES.filter(rule => rule.test(values.next)).length + (values.next.length >= 12 ? 1 : 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = {
      ...(values.current ? {} : { current: 'Enter your current password' }),
      ...(values.next.length >= 8 ? {} : { next: 'Use at least 8 characters' }),
      ...(values.confirm && values.confirm === values.next ? {} : { confirm: 'Passwords don’t match' }),
    };
    setErrors(found);
    if (Object.keys(found).length === 0) change.mutate();
  };

  return (
    <form onSubmit={submit} className={cx(section, 'max-w-[520px]')}>
      {change.isSuccess && <Alert tone="success">Password updated.</Alert>}
      {PASSWORD_FIELDS.map(field => (
        <Field key={field.name} label={field.label} error={errors[field.name]}>
          <Input
            type="password"
            autoComplete={field.autoComplete}
            value={values[field.name]}
            onChange={event => {
              setValues({ ...values, [field.name]: event.target.value });
              setErrors({ ...errors, [field.name]: undefined });
              change.reset();
            }}
          />
        </Field>
      ))}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map(bar => (
            <span key={bar} className={cx('h-1 rounded-full transition-colors', values.next && bar < Math.max(score, 1) ? STRENGTH_COLORS[score] : 'bg-line')} />
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5">
          {PASSWORD_RULES.map(rule => {
            const ok = rule.test(values.next);
            return (
              <li key={rule.label} className={cx('flex items-center gap-1.5 text-xs', ok ? 'text-success-ink' : 'text-ink-secondary')}>
                <Icon name={ok ? 'check' : 'minus'} size={12} strokeWidth={3} />
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>
      <Button type="submit" loading={change.isPending} className="self-start">
        Update password
      </Button>
      <Link href="/forgot-password" className="min-h-8 self-start text-[13px] text-primary">
        Forgot your current password?
      </Link>
    </form>
  );
};

const AddressesTab = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<Address[]>('/addresses') });
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const store = (saved: Address[]) => queryClient.setQueryData(['addresses'], saved);
  const remove = useMutation({
    mutationFn: (id: number) => api.delete<Address[]>(`/addresses/${id}`),
    onSuccess: saved => {
      store(saved);
      toast('success', 'Address deleted');
    },
  });
  const makeDefault = useMutation({
    mutationFn: ({ id, ...rest }: Address) => api.put<Address[]>(`/addresses/${id}`, { ...rest, isDefault: true }),
    onSuccess: saved => {
      store(saved);
      toast('success', 'Default address updated');
    },
  });

  if (addresses.isPending) return <Spinner />;
  return (
    <div className="flex flex-col gap-3.5 animate-fade">
      <div className="grid gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]">
        {addresses.data?.map(address => (
          <div key={address.id} className={cx('flex flex-col gap-2.5 rounded-card border-[1.5px] bg-surface p-[18px]', editing !== 'new' && editing?.id === address.id ? 'border-primary' : 'border-line')}>
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold">{address.label ?? address.recipient}</span>
              {address.isDefault && <span className="inline-flex h-[22px] items-center rounded-pill bg-primary-tint px-2 text-[11px] font-semibold text-primary">Default</span>}
            </div>
            <span className="text-sm leading-[1.55]">
              {address.label ? `${address.recipient}, ` : ""}{address.addressLine}, {address.city}, {address.state} {address.zip}, {address.country}
            </span>
            {address.phone && <span className="text-[13px] text-ink-secondary">{address.phone}</span>}
            <div className="mt-auto flex flex-wrap gap-4 border-t border-line pt-1.5">
              <button onClick={() => setEditing(address)} className="min-h-9 text-[13px] font-semibold text-primary">
                Edit
              </button>
              {!address.isDefault && (
                <>
                  <button onClick={() => makeDefault.mutate(address)} className="min-h-9 text-[13px] font-medium text-primary">
                    Make default
                  </button>
                  <button onClick={() => remove.mutate(address.id)} className="min-h-9 text-[13px] font-medium text-danger-ink">
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {!editing && (
          <button onClick={() => setEditing('new')} className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-ink-muted bg-page text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-tint">
            <span className="text-[22px] leading-none">+</span>
            Add an address
          </button>
        )}
      </div>
      {editing && (
        <section className="flex flex-col gap-3.5 rounded-card border-[1.5px] border-primary bg-surface p-[22px] animate-rise">
          <h2 className="text-base font-semibold">{editing === 'new' ? 'New address' : 'Edit address'}</h2>
          <AddressForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? undefined : editing}
            submitLabel="Save address"
            onCancel={() => setEditing(null)}
            onSubmit={async address => {
              store(editing === 'new' ? await api.post<Address[]>('/addresses', address) : await api.put<Address[]>(`/addresses/${editing.id}`, address));
              setEditing(null);
              toast('success', 'Address saved');
            }}
          />
        </section>
      )}
    </div>
  );
};

const TAB_CONTENT: Record<TabValue, () => JSX.Element> = { profile: ProfileTab, password: PasswordTab, addresses: AddressesTab };

const AccountContent = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get('tab');
  const tab = TAB_ITEMS.find(item => item.value === requested)?.value ?? 'profile';
  const Content = TAB_CONTENT[tab];
  const initials = (user?.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('');
  const since = user ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="flex max-w-[820px] flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-[60px] w-[60px] place-items-center rounded-full bg-primary text-xl font-bold text-on-primary">{initials}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-display text-[30px] leading-[1.05] font-medium md:text-4xl lg:text-[40px]">{user?.name}</h1>
          <span className="text-sm text-ink-secondary">Member since {since}</span>
        </div>
        <Button variant="secondary" onClick={() => logout().then(() => router.push('/'))}>
          Sign out
        </Button>
      </div>
      <Tabs items={[...TAB_ITEMS]} value={tab} onChange={value => router.replace(`/account?tab=${value}`, { scroll: false })} />
      <Content />
    </div>
  );
};

export default function AccountPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<Spinner />}>
        <AccountContent />
      </Suspense>
    </RequireAuth>
  );
}
