'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, api } from '@/lib/api';
import type { Banner } from '@/lib/types';
import { Icon } from './Icon';
import { useAuth, useToast } from './Providers';
import { Alert, Button, Checkbox, cx, Field, Input } from './ui';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
type FieldName = 'name' | 'email' | 'password' | 'confirm' | 'terms';

const COPY: Record<Mode, { title: string; subtitle: string; cta: string; busy: string }> = {
  login: { title: 'Welcome back', subtitle: 'Sign in to see your orders, wishlist and saved addresses.', cta: 'Sign in', busy: 'Signing in' },
  register: { title: 'Create your account', subtitle: 'Save watches, check out faster and track every order.', cta: 'Create account', busy: 'Creating account' },
  forgot: { title: 'Reset your password', subtitle: 'Enter your account email and we’ll send you a link to choose a new password.', cta: 'Send reset link', busy: 'Sending' },
  reset: { title: 'Choose a new password', subtitle: 'Use at least 8 characters, with a number and a capital letter.', cta: 'Update password', busy: 'Updating' },
};

const FIELDS_BY_MODE: Record<Mode, FieldName[]> = {
  login: ['email', 'password'],
  register: ['name', 'email', 'password', 'terms'],
  forgot: ['email'],
  reset: ['password', 'confirm'],
};

const TEXT_FIELDS = {
  name: { label: 'Full name', type: 'text', autoComplete: 'name' },
  email: { label: 'Email', type: 'email', autoComplete: 'email' },
} as const;

const PASSWORD_LABELS: Record<Mode, { password: string; confirm: string }> = {
  login: { password: 'Password', confirm: '' },
  register: { password: 'Password', confirm: '' },
  forgot: { password: '', confirm: '' },
  reset: { password: 'New password', confirm: 'Confirm new password' },
};

const TABS = [
  { href: '/login', label: 'Sign in', mode: 'login' },
  { href: '/register', label: 'Create account', mode: 'register' },
] as const;

const EMAIL_PATTERN = /^\S+@\S+\.\S{2,}$/;
const strongPassword = (value: string) => value.length >= 8 && /\d/.test(value) && /[A-Z]/.test(value);

const EXPIRED_LINK = 'This reset link has expired or was already used.';

const requestPasswordReset = (email: string) => api.post('/auth/forgot-password', { email });
const submitNewPassword = (token: string, password: string) => api.post('/auth/reset-password', { token, password });

const PasswordInput = ({ id, name, label, autoComplete, error, aside }: { id: string; name: string; label: string; autoComplete: string; error?: string; aside?: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[13px] font-medium">
        <label htmlFor={id}>{label}</label>
        {aside}
      </div>
      <span className={cx('flex h-[46px] items-center rounded-card border bg-surface focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-tint', error ? 'border-danger' : 'border-line')}>
        <input id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} aria-invalid={Boolean(error)} className="h-[44px] min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none" />
        <button type="button" aria-pressed={visible} onClick={() => setVisible(!visible)} className="h-11 px-3 text-[13px] font-medium text-primary">
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
      {error && <span className="text-xs text-danger-ink">{error}</span>}
    </div>
  );
};

export const AuthForm = ({ mode }: { mode: Mode }) => {
  const { login, register } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const next = params.get('next');
  const token = params.get('token') ?? '';
  const ids = { password: useId(), confirm: useId() };
  const [errors, setErrors] = useState<Partial<Record<FieldName | 'form', string>>>({});
  const [terms, setTerms] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[mode];
  const banners = useQuery({ queryKey: ['banners'], queryFn: () => api.get<Banner[]>('/banners') });
  const resend = useMutation({ mutationFn: requestPasswordReset, onSuccess: () => toast('success', 'A new link is on its way'), onError: (error: Error) => toast('error', error.message) });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<FieldName, string>;
    const found: Partial<Record<FieldName, string>> = {};
    const fields = FIELDS_BY_MODE[mode];
    if (fields.includes('name') && !values.name.trim()) found.name = 'Enter your name';
    if (fields.includes('email') && !EMAIL_PATTERN.test(values.email.trim())) found.email = 'Enter a valid email address';
    if (fields.includes('password') && mode === 'login' && !values.password) found.password = 'Enter your password';
    if (fields.includes('password') && mode !== 'login' && !strongPassword(values.password)) found.password = 'Use 8+ characters with a number and a capital letter';
    if (mode === 'reset' && values.confirm !== values.password) found.confirm = 'Passwords don’t match';
    if (mode === 'register' && !terms) found.terms = 'Please accept the terms to continue';
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(values.email.trim());
        setSentTo(values.email.trim());
      } else if (mode === 'reset') {
        await submitNewPassword(token, values.password);
        toast('success', 'Password updated. Sign in with your new password.');
        router.replace('/login');
      } else {
        const user = mode === 'login' ? await login({ email: values.email.trim(), password: values.password }) : await register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
        router.replace(next?.startsWith('/') ? next : user.role === 'ADMIN' ? '/admin' : '/');
      }
    } catch (failure) {
      setErrors({ form: failure instanceof ApiError && failure.code === 'RESET_TOKEN_INVALID' ? EXPIRED_LINK : failure instanceof Error ? failure.message : 'Something went wrong.' });
    } finally {
      setSubmitting(false);
    }
  };

  const banner = banners.data?.[0];
  const textFields = FIELDS_BY_MODE[mode].filter((field): field is keyof typeof TEXT_FIELDS => field in TEXT_FIELDS);
  const passwordLabels = PASSWORD_LABELS[mode];

  return (
    <div className="flex justify-center">
      <div className="flex w-full max-w-[520px] flex-wrap overflow-hidden rounded-card border border-line bg-surface lg:max-w-[1040px] lg:flex-nowrap">
        <div className="relative hidden min-h-[600px] flex-1 bg-primary-dark lg:block">
          {banner && <img src={banner.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-primary-dark" />
          <div className="absolute inset-x-9 bottom-9 flex flex-col gap-2.5 text-on-primary">
            <span className="text-xs font-semibold tracking-[0.16em] text-primary-tint uppercase">Members</span>
            <span className="font-display text-[34px] leading-[1.1]">Track orders, save watches and hear about limited releases first.</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[18px] px-5 py-6 md:px-11 md:py-12">
          {(mode === 'login' || mode === 'register') && (
            <div role="tablist" className="flex border-b border-line">
              {TABS.map(tab => (
                <Link key={tab.mode} href={next ? `${tab.href}?next=${encodeURIComponent(next)}` : tab.href} role="tab" aria-selected={tab.mode === mode} className={cx('-mb-px flex h-12 flex-1 items-center justify-center border-b-2 text-[15px]', tab.mode === mode ? 'border-primary font-semibold text-primary' : 'border-transparent font-medium text-ink-secondary hover:text-ink')}>
                  {tab.label}
                </Link>
              ))}
            </div>
          )}
          {sentTo ? (
            <div className="flex flex-col items-center gap-3.5 py-4 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-tint text-primary animate-pop">
                <Icon name="mail" size={28} strokeWidth={1.6} />
              </span>
              <h1 className="font-display text-[30px] leading-[1.1] font-medium">Check your inbox</h1>
              <p className="text-sm leading-normal text-ink-secondary">We’ve sent a reset link to {sentTo}. The link expires in 30 minutes. Check your spam folder if it doesn’t arrive.</p>
              <Link href="/login" className="inline-flex h-[46px] items-center rounded-card bg-primary px-[22px] text-sm font-semibold text-on-primary hover:bg-primary-hover">
                Back to sign in
              </Link>
              <Button variant="link" size="sm" onClick={() => resend.mutate(sentTo)} loading={resend.isPending}>
                Resend link
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <h1 className="font-display text-[30px] leading-[1.1] font-medium">{copy.title}</h1>
                <p className="text-sm leading-normal text-ink-secondary">{copy.subtitle}</p>
              </div>
              {errors.form && (
                <Alert tone="danger" action={errors.form === EXPIRED_LINK && <Link href="/forgot-password" className="font-semibold underline">Request a new link</Link>}>
                  {errors.form}
                </Alert>
              )}
              <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
                {textFields.map(field => (
                  <Field key={field} label={TEXT_FIELDS[field].label} error={errors[field]}>
                    <Input name={field} type={TEXT_FIELDS[field].type} autoComplete={TEXT_FIELDS[field].autoComplete} aria-invalid={Boolean(errors[field])} className="h-12" />
                  </Field>
                ))}
                {passwordLabels.password && (
                  <PasswordInput
                    id={ids.password}
                    name="password"
                    label={passwordLabels.password}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    error={errors.password}
                    aside={mode === 'login' && <Link href="/forgot-password" className="font-medium text-primary">Forgot password?</Link>}
                  />
                )}
                {passwordLabels.confirm && <PasswordInput id={ids.confirm} name="confirm" label={passwordLabels.confirm} autoComplete="new-password" error={errors.confirm} />}
                {mode === 'register' && (
                  <>
                    <p className="-mt-1 text-xs text-ink-secondary">At least 8 characters, with a number and a capital letter.</p>
                    <Checkbox checked={terms} onChange={setTerms} label="I agree to the terms of sale and privacy policy" />
                    {errors.terms && <span className="-mt-2 text-xs text-danger-ink">{errors.terms}</span>}
                  </>
                )}
                <Button type="submit" size="lg" loading={submitting}>
                  {submitting ? copy.busy : copy.cta}
                </Button>
                {mode === 'forgot' && (
                  <Link href="/login" className="flex h-9 items-center justify-center text-sm font-medium text-primary">
                    ← Back to sign in
                  </Link>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
