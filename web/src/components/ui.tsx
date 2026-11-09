'use client';

import Link from 'next/link';
import { useEffect, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import type { PageMeta } from '@/lib/api';
import { titleCase } from '@/lib/format';
import { Icon, type IconName } from './Icon';

export const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

const buttonStyles = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-dark disabled:bg-line disabled:text-ink-secondary',
  outline: 'border border-primary bg-surface text-primary hover:bg-primary-tint disabled:border-line disabled:bg-surface disabled:text-ink-muted',
  secondary: 'border border-line bg-surface text-ink hover:border-primary disabled:text-ink-muted',
  danger: 'border border-danger-border bg-surface text-danger-ink hover:bg-danger-surface disabled:text-ink-muted',
  dangerSolid: 'bg-danger text-on-primary hover:bg-danger-ink disabled:bg-line disabled:text-ink-secondary',
  ghost: 'text-ink-secondary hover:text-primary',
  link: 'text-primary hover:text-primary-hover',
} as const;

const buttonSizes = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[52px] px-6 text-[15px]',
  xl: 'h-14 px-6 text-base',
} as const;

type Variant = keyof typeof buttonStyles;
type Size = keyof typeof buttonSizes;
const buttonBase = 'inline-flex items-center justify-center gap-2 rounded-card font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed';

const buttonClass = (variant: Variant, size: Size, className?: string) => cx(buttonBase, buttonStyles[variant], variant === 'link' || variant === 'ghost' ? 'px-1 text-sm' : buttonSizes[size], className);

export const Spinner = () => (
  <div className="flex justify-center py-24" role="status" aria-label="Loading">
    <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary-tint border-t-primary" />
  </div>
);

export const Button = ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) => (
  <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
    {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />}
    {children}
  </button>
);

export const LinkButton = ({ href, variant = 'primary', size = 'md', className, children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) => (
  <Link href={href} className={buttonClass(variant, size, className)}>
    {children}
  </Link>
);

export const IconButton = ({ icon, label, className, count, ...props }: { icon: IconName; label: string; count?: number } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button aria-label={label} className={cx('relative grid h-11 w-11 place-items-center text-ink transition-colors hover:text-primary', className)} {...props}>
    <Icon name={icon} size={20} />
    {count ? <span className="absolute top-1.5 right-1 grid h-[17px] min-w-[17px] place-items-center rounded-pill bg-primary px-1 text-[10px] font-semibold text-on-primary">{count}</span> : null}
  </button>
);

const fieldStyles =
  'w-full rounded-card border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-ink-muted hover:border-ink-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-tint disabled:bg-page disabled:text-ink-muted aria-invalid:border-danger [[data-invalid]_&]:border-danger';

export const Field = ({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) => (
  <label className="flex flex-col gap-1.5" data-invalid={error ? '' : undefined}>
    <span className="text-[13px] font-medium text-ink">{label}</span>
    {children}
    {hint && !error && <span className="text-xs text-ink-secondary">{hint}</span>}
    {error && <span className="text-xs text-danger-ink">{error}</span>}
  </label>
);

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => <input className={cx(fieldStyles, 'h-[46px]', className)} {...props} />;
export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cx(fieldStyles, 'min-h-28 py-2.5 leading-normal', className)} {...props} />;
export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cx(fieldStyles, 'h-[46px] pr-8', className)} {...props} />;

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <div className={cx('rounded-card border border-line bg-surface p-5', className)} {...props} />;

export const Eyebrow = ({ children, tone = 'primary', className }: { children: ReactNode; tone?: 'primary' | 'muted'; className?: string }) => (
  <p className={cx('text-eyebrow font-semibold uppercase', tone === 'primary' ? 'text-primary' : 'text-ink-secondary', className)}>{children}</p>
);

export const PageHeading = ({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
    <div className="flex flex-col gap-2">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="font-display text-[30px] leading-[1.05] font-medium md:text-4xl lg:text-[40px]">{title}</h1>
    </div>
    {action}
  </div>
);

export const SectionHeading = ({ eyebrow, title, href, linkLabel }: { eyebrow: string; title: string; href?: string; linkLabel?: string }) => (
  <div className="flex items-end justify-between gap-4">
    <div className="flex flex-col gap-2.5">
      <Eyebrow tone="muted">{eyebrow}</Eyebrow>
      <h2 className="font-display text-[30px] leading-[1.05] font-medium md:text-h2">{title}</h2>
    </div>
    {href && linkLabel && (
      <Link href={href} className="flex h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover">
        {linkLabel}
        <Icon name="arrowRight" size={16} />
      </Link>
    )}
  </div>
);

const pillTones = {
  neutral: 'border-line bg-surface text-ink-secondary',
  gray: 'border-line bg-page text-ink',
  pending: 'border-dashed border-ink-muted bg-surface text-ink-secondary',
  tint: 'border-primary-tint bg-primary-tint text-primary',
  shipped: 'border-primary-hover bg-primary-hover text-on-primary',
  done: 'border-primary bg-primary text-on-primary',
  green: 'border-success-border bg-success-surface text-success-ink',
  amber: 'border-warning-border bg-warning-surface text-warning-ink',
  red: 'border-danger-border bg-danger-surface text-danger-ink',
  blue: 'border-info-border bg-info-surface text-info-ink',
} as const;

const dotTones: Record<keyof typeof pillTones, string> = {
  neutral: 'bg-line',
  gray: 'bg-ink-secondary',
  pending: 'bg-ink-muted',
  tint: 'bg-primary-hover',
  shipped: 'bg-on-primary',
  done: 'bg-on-primary',
  green: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-danger',
  blue: 'bg-info',
};

const badgeTones: Record<string, keyof typeof pillTones> = {
  PENDING_PAYMENT: 'pending',
  PENDING: 'gray',
  CONFIRMED: 'tint',
  SHIPPED: 'shipped',
  DELIVERED: 'done',
  CANCELLED: 'neutral',
  PAID: 'green',
  UNPAID: 'amber',
  OPEN: 'amber',
  IN_PROGRESS: 'blue',
  RESOLVED: 'green',
  CLOSED: 'neutral',
  PUBLISHED: 'green',
  DRAFT: 'neutral',
  APPROVED: 'green',
  HIDDEN: 'neutral',
  URGENT: 'red',
  HIGH: 'amber',
  MEDIUM: 'blue',
  LOW: 'neutral',
};

export const Badge = ({ value, label, tone, className }: { value: string; label?: string; tone?: keyof typeof pillTones; className?: string }) => {
  const resolved = tone ?? badgeTones[value] ?? 'neutral';
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 rounded-pill border px-2.5 text-xs font-semibold whitespace-nowrap', pillTones[resolved], value === 'CANCELLED' && 'line-through', className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', dotTones[resolved])} />
      {label ?? titleCase(value)}
    </span>
  );
};

const alertTones = {
  success: { box: 'border-success-border bg-success-surface text-success-ink', icon: 'check' },
  warning: { box: 'border-warning-border bg-warning-surface text-warning-ink', icon: 'clock' },
  danger: { box: 'border-danger-border bg-danger-surface text-danger-ink', icon: 'alert' },
  info: { box: 'border-info-border bg-info-surface text-info-ink', icon: 'alert' },
  brand: { box: 'border-primary-tint bg-primary-tint text-primary', icon: 'sparkle' },
} as const satisfies Record<string, { box: string; icon: IconName }>;

export const Alert = ({ tone = 'info', children, action, className }: { tone?: keyof typeof alertTones; children: ReactNode; action?: ReactNode; className?: string }) => (
  <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex flex-wrap items-center gap-3 rounded-card border px-3.5 py-3 text-sm animate-rise', alertTones[tone].box, className)}>
    <Icon name={alertTones[tone].icon} size={18} className="shrink-0" />
    <span className="min-w-[200px] flex-1 leading-snug">{children}</span>
    {action}
  </div>
);

export const ErrorState = ({ message }: { message: string }) => <Alert tone="danger">{message}</Alert>;

export const EmptyState = ({ title, description, action, icon, dashed }: { title: string; description?: string; action?: ReactNode; icon?: IconName; dashed?: boolean }) => (
  <div className={cx('flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-16 text-center animate-rise', dashed ? 'border border-dashed border-line' : 'border border-line')}>
    {icon && (
      <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-primary-tint text-primary">
        <Icon name={icon} size={30} strokeWidth={1.4} />
      </span>
    )}
    <p className="font-display text-[28px] leading-tight">{title}</p>
    {description && <p className="max-w-sm text-[15px] leading-normal text-ink-secondary">{description}</p>}
    {action && <div className="mt-2 flex flex-wrap justify-center gap-2.5">{action}</div>}
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cx('animate-pulse-soft bg-line', className)} />;

const pageWindow = (page: number, total: number): (number | 'gap')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const near = [1, page - 1, page, page + 1, total].filter((value, index, all) => value >= 1 && value <= total && all.indexOf(value) === index).sort((a, b) => a - b);
  return near.flatMap((value, index) => (index > 0 && value - near[index - 1]! > 1 ? ['gap' as const, value] : [value]));
};

const pageButton = 'grid h-11 w-11 place-items-center rounded-card border text-sm tabular-nums transition-colors';

export const Pagination = ({ meta, onChange }: { meta: PageMeta; onChange: (page: number) => void }) =>
  meta.totalPages <= 1 ? null : (
    <nav className="flex justify-center gap-2 pt-6" aria-label="Pagination">
      <button aria-label="Previous page" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)} className={cx(pageButton, 'border-line bg-surface hover:border-primary disabled:opacity-40 disabled:hover:border-line')}>
        <Icon name="chevronLeft" size={16} />
      </button>
      {pageWindow(meta.page, meta.totalPages).map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="grid h-11 w-6 place-items-center text-ink-muted">
            …
          </span>
        ) : (
          <button key={entry} aria-label={`Page ${entry}`} aria-current={entry === meta.page ? 'page' : undefined} onClick={() => onChange(entry)} className={cx(pageButton, entry === meta.page ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface hover:border-primary')}>
            {entry}
          </button>
        )
      )}
      <button aria-label="Next page" disabled={meta.page >= meta.totalPages} onClick={() => onChange(meta.page + 1)} className={cx(pageButton, 'border-line bg-surface hover:border-primary disabled:opacity-40 disabled:hover:border-line')}>
        <Icon name="chevronRight" size={16} />
      </button>
    </nav>
  );

export const Stars = ({ value, size = 'text-sm' }: { value: number | null; size?: string }) => (
  <span className={cx('inline-flex gap-0.5 text-primary', size)} role="img" aria-label={value === null ? 'No ratings yet' : `${value} out of 5`}>
    {[1, 2, 3, 4, 5].map(star => (
      <Icon key={star} name="star" size={14} strokeWidth={1.5} fill={value !== null && star <= Math.round(value) ? 'currentColor' : 'none'} className="h-[1em] w-[1em]" />
    ))}
  </span>
);

export const Chip = ({ label, count, selected, onClick, onRemove }: { label: string; count?: number; selected?: boolean; onClick?: () => void; onRemove?: () => void }) => (
  <button
    type="button"
    onClick={onRemove ?? onClick}
    aria-pressed={onClick ? selected : undefined}
    aria-label={onRemove ? `Remove filter ${label}` : undefined}
    className={cx(
      'inline-flex h-9 items-center gap-1.5 rounded-pill border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
      onRemove ? 'h-8 border-primary-tint bg-primary-tint pr-2.5 text-primary hover:border-primary' : selected ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-ink hover:border-primary'
    )}
  >
    {label}
    {count !== undefined && <span className="opacity-70">{count}</span>}
    {onRemove && <Icon name="close" size={12} strokeWidth={2} />}
  </button>
);

export const Checkbox = ({ checked, onChange, label, count }: { checked: boolean; onChange: (checked: boolean) => void; label: string; count?: number }) => (
  <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-11 w-full items-center gap-3 text-left text-[15px] lg:min-h-10 lg:text-sm">
    <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-card border-[1.5px] transition-colors lg:h-[18px] lg:w-[18px]', checked ? 'border-primary bg-primary' : 'border-ink-muted bg-surface')}>
      <Icon name="check" size={12} strokeWidth={3} className={cx('text-on-primary', !checked && 'opacity-0')} />
    </span>
    <span className="flex-1">{label}</span>
    {count !== undefined && <span className="text-xs text-ink-secondary tabular-nums">{count}</span>}
  </button>
);

export const Switch = ({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx('block h-[26px] w-11 shrink-0 rounded-full p-[3px] transition-colors', checked ? 'bg-primary' : 'bg-line-strong')}>
    <span className={cx('block h-5 w-5 rounded-full bg-surface shadow-sm transition-transform', checked && 'translate-x-[18px]')} />
  </button>
);

export const OptionCard = ({ selected, disabled, onSelect, title, detail, trailing }: { selected: boolean; disabled?: boolean; onSelect: () => void; title: string; detail?: ReactNode; trailing?: ReactNode }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-disabled={disabled}
    onClick={onSelect}
    className={cx(
      'flex w-full items-center gap-3.5 rounded-card border-[1.5px] p-4 text-left transition-colors',
      selected ? 'border-primary bg-primary-tint' : 'border-line bg-surface',
      disabled ? 'cursor-not-allowed opacity-55' : !selected && 'hover:border-ink-muted'
    )}
  >
    <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px]', selected ? 'border-primary' : 'border-ink-muted')}>
      <span className={cx('h-2.5 w-2.5 rounded-full', selected ? 'bg-primary' : 'bg-transparent')} />
    </span>
    <span className="flex flex-1 flex-col gap-0.5">
      <span className="text-[15px] font-semibold">{title}</span>
      {detail && <span className="text-[13px] leading-snug text-ink-secondary">{detail}</span>}
    </span>
    {trailing}
  </button>
);

export const QuantityStepper = ({ value, min = 1, max, onChange, size = 'md', label }: { value: number; min?: number; max: number; onChange: (value: number) => void; size?: 'sm' | 'md' | 'lg'; label?: string }) => {
  const box = { sm: 'h-9', md: 'h-11', lg: 'h-[54px]' }[size];
  const button = cx('w-9 text-lg transition-opacity disabled:opacity-35', { sm: 'h-9 w-9', md: 'h-11 w-11', lg: 'h-[54px] w-11' }[size]);
  return (
    <div className={cx('inline-flex items-center rounded-card border border-line bg-surface', box)} role="group" aria-label={label ?? 'Quantity'}>
      <button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(value - 1)} className={button}>
        −
      </button>
      <span className="w-7 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)} className={button}>
        +
      </button>
    </div>
  );
};

export const Breadcrumb = ({ items }: { items: { label: string; href?: string }[] }) => (
  <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[13px] text-ink-secondary">
    {items.map((item, index) => (
      <span key={item.label} className="flex items-center gap-2">
        {index > 0 && <span aria-hidden="true">/</span>}
        {item.href ? (
          <Link href={item.href} className="hover:text-primary">
            {item.label}
          </Link>
        ) : (
          <span className="text-ink" aria-current="page">
            {item.label}
          </span>
        )}
      </span>
    ))}
  </nav>
);

export const Tabs = <T extends string>({ items, value, onChange, className }: { items: { value: T; label: string }[]; value: T; onChange: (value: T) => void; className?: string }) => (
  <div role="tablist" className={cx('no-scrollbar flex overflow-x-auto border-b border-line', className)}>
    {items.map(item => (
      <button
        key={item.value}
        role="tab"
        aria-selected={item.value === value}
        onClick={() => onChange(item.value)}
        className={cx('-mb-px h-12 shrink-0 border-b-2 px-4.5 text-sm whitespace-nowrap transition-colors', item.value === value ? 'border-primary font-semibold text-primary' : 'border-transparent font-medium text-ink-secondary hover:text-ink')}
      >
        {item.label}
      </button>
    ))}
  </div>
);

export const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-primary-dark/45 p-4 pt-16 animate-fade" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div ref={panel} tabIndex={-1} className="w-full max-w-xl rounded-card border border-line bg-surface p-6 shadow-dialog outline-none animate-rise">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">{title}</h2>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center text-ink-secondary hover:text-ink" aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const DataTable = ({ headers, children }: { headers: string[]; children: ReactNode }) => (
  <div className="overflow-x-auto rounded-card border border-line bg-surface">
    <table className="w-full text-left text-sm">
      <thead className="border-b border-line bg-page text-xs tracking-[0.06em] text-ink-secondary uppercase">
        <tr>
          {headers.map(header => (
            <th key={header} className="px-4 py-3 font-semibold whitespace-nowrap">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line [&_td]:px-4 [&_td]:py-3">{children}</tbody>
    </table>
  </div>
);
