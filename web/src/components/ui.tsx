import Link from 'next/link';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { PageMeta } from '@/lib/api';
import { titleCase } from '@/lib/format';

export const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

const buttonStyles = {
  primary: 'bg-navy text-white hover:bg-navy-light',
  gold: 'bg-gold text-white hover:bg-[#a37722]',
  secondary: 'border border-line bg-ivory text-ink hover:border-navy hover:text-navy',
  danger: 'bg-red-700 text-white hover:bg-red-800',
  ghost: 'text-muted hover:text-navy',
} as const;

type Variant = keyof typeof buttonStyles;
const buttonBase = 'inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';

export const Button = ({ variant = 'primary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) => (
  <button className={cx(buttonBase, buttonStyles[variant], className)} {...props} />
);

export const LinkButton = ({ href, variant = 'primary', className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) => (
  <Link href={href} className={cx(buttonBase, buttonStyles[variant], className)}>
    {children}
  </Link>
);

const fieldStyles = 'w-full rounded-xl border border-line bg-ivory px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10';

export const Field = ({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) => (
  <label className="block space-y-1.5">
    <span className="text-sm font-medium text-muted">{label}</span>
    {children}
    {hint && <span className="block text-xs text-faint">{hint}</span>}
    {error && <span className="block text-xs text-red-700">{error}</span>}
  </label>
);

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => <input className={cx(fieldStyles, className)} {...props} />;
export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cx(fieldStyles, 'min-h-28', className)} {...props} />;
export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cx(fieldStyles, className)} {...props} />;

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <div className={cx('rounded-2xl border border-line bg-ivory p-5', className)} {...props} />;

export const PageHeading = ({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && <p className="mb-1 text-sm font-medium tracking-wide text-gold uppercase">{eyebrow}</p>}
      <h1 className="font-serif text-3xl font-semibold md:text-4xl">{title}</h1>
    </div>
    {action}
  </div>
);

const badgeStyles: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-sky-100 text-sky-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-stone-200 text-stone-600',
  PAID: 'bg-emerald-100 text-emerald-800',
  UNPAID: 'bg-amber-100 text-amber-800',
  OPEN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-stone-200 text-stone-600',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  DRAFT: 'bg-stone-200 text-stone-600',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  HIDDEN: 'bg-stone-200 text-stone-600',
  URGENT: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  LOW: 'bg-stone-200 text-stone-600',
};

export const Badge = ({ value, label }: { value: string; label?: string }) => (
  <span className={cx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', badgeStyles[value] ?? 'bg-stone-200 text-stone-600')}>{label ?? titleCase(value)}</span>
);

export const Spinner = () => (
  <div className="flex justify-center py-16" role="status" aria-label="Loading">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-navy" />
  </div>
);

export const EmptyState = ({ title, description, action }: { title: string; description?: string; action?: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
    <p className="font-serif text-xl">{title}</p>
    {description && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

export const ErrorState = ({ message }: { message: string }) => (
  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
    {message}
  </p>
);

export const Pagination = ({ meta, onChange }: { meta: PageMeta; onChange: (page: number) => void }) =>
  meta.totalPages <= 1 ? null : (
    <nav className="mt-8 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
      <Button variant="secondary" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
        Previous
      </Button>
      <span className="text-muted">
        Page {meta.page} of {meta.totalPages}
      </span>
      <Button variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onChange(meta.page + 1)}>
        Next
      </Button>
    </nav>
  );

export const Stars = ({ value, size = 'text-base' }: { value: number | null; size?: string }) => (
  <span className={cx('inline-flex text-gold', size)} role="img" aria-label={value === null ? 'No ratings yet' : `${value} out of 5`}>
    {[1, 2, 3, 4, 5].map(star => (
      <span key={star} className={value !== null && star <= Math.round(value) ? '' : 'text-line'}>
        ★
      </span>
    ))}
  </span>
);

export const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-16" role="dialog" aria-modal="true" aria-label={title}>
    <div className="w-full max-w-xl rounded-2xl border border-line bg-cream p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold">{title}</h2>
        <button onClick={onClose} className="text-2xl leading-none text-muted hover:text-ink" aria-label="Close">
          ×
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const DataTable = ({ headers, children }: { headers: string[]; children: ReactNode }) => (
  <div className="overflow-x-auto rounded-2xl border border-line bg-ivory">
    <table className="w-full text-left text-sm">
      <thead className="border-b border-line bg-sand text-xs tracking-wide text-muted uppercase">
        <tr>
          {headers.map(header => (
            <th key={header} className="px-4 py-3 font-medium whitespace-nowrap">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line [&_td]:px-4 [&_td]:py-3">{children}</tbody>
    </table>
  </div>
);
