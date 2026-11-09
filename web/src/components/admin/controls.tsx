import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cx } from '../ui';
import { Icon, type IconName } from './icons';

const BUTTON_VARIANTS = {
  primary: 'border-primary bg-primary text-on-primary hover:border-primary-hover hover:bg-primary-hover',
  secondary: 'border-line bg-surface text-ink hover:border-ink-muted',
  outline: 'border-primary bg-surface text-link hover:bg-primary-tint',
  soft: 'border-primary-tint bg-surface text-link hover:border-primary',
  danger: 'border-pill-red-bd bg-surface text-pill-red-fg hover:bg-pill-red-bg',
  destructive: 'border-danger bg-danger text-white hover:opacity-90',
  ghost: 'border-transparent bg-transparent text-link hover:underline',
} as const;

const BUTTON_SIZES = { sm: 'h-8 px-2.5 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-[42px] px-[18px] text-sm' } as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof BUTTON_SIZES;
}

export const buttonClass = (variant: ButtonVariant = 'secondary', size: keyof typeof BUTTON_SIZES = 'md', className?: string) =>
  cx(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-card border font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );

export const Button = ({ variant, size, className, type = 'button', ...props }: ButtonProps) => <button type={type} className={buttonClass(variant, size, className)} {...props} />;

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  label: string;
  size?: number;
  iconSize?: number;
  tone?: 'default' | 'danger';
  framed?: boolean;
}

export const IconButton = ({ icon, label, size = 32, iconSize = 15, tone = 'default', framed = false, className, type = 'button', ...props }: IconButtonProps) => (
  <button
    type={type}
    aria-label={label}
    title={props.title ?? label}
    style={{ width: size, height: size }}
    className={cx(
      'grid shrink-0 cursor-pointer place-items-center rounded-card transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40',
      framed ? (tone === 'danger' ? 'border border-pill-red-bd bg-surface text-pill-red-fg' : 'border border-line bg-surface text-ink hover:border-ink-muted') : tone === 'danger' ? 'text-ink-secondary hover:text-danger-ink' : 'text-ink-secondary hover:text-ink',
      className
    )}
    {...props}
  >
    <Icon name={icon} size={iconSize} />
  </button>
);

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
}

export const Checkbox = ({ checked, onChange, label, ariaLabel }: CheckboxProps) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    aria-label={label ? undefined : ariaLabel}
    onClick={event => {
      event.stopPropagation();
      onChange(!checked);
    }}
    className={cx('flex cursor-pointer items-center gap-2.5 text-left text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary', label ? '' : 'size-11 justify-center')}
  >
    <span className={cx('grid size-[18px] shrink-0 place-items-center rounded-card border-[1.5px] text-white', checked ? 'border-primary bg-primary' : 'border-ink-muted bg-surface')}>
      {checked && <Icon name="check" size={11} strokeWidth={3} />}
    </span>
    {label}
  </button>
);

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  title?: string;
}

export const Switch = ({ checked, onChange, label, disabled, title }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={title}
    disabled={disabled}
    onClick={event => {
      event.stopPropagation();
      onChange(!checked);
    }}
    className={cx('block h-6 w-[42px] shrink-0 cursor-pointer rounded-pill p-[3px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40', checked ? 'bg-primary' : 'bg-line-strong')}
  >
    <span className={cx('block size-[18px] rounded-pill bg-white shadow-sm transition-transform duration-200', checked ? 'translate-x-[18px]' : 'translate-x-0')} />
  </button>
);

export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  tabs: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  compact?: boolean;
}

export const Tabs = <T extends string>({ tabs, value, onChange, label, compact = false }: TabsProps<T>) => (
  <div role="tablist" aria-label={label} className="flex flex-wrap gap-1.5">
    {tabs.map(tab => (
      <button
        key={tab.value}
        type="button"
        role="tab"
        aria-selected={tab.value === value}
        onClick={() => onChange(tab.value)}
        className={cx(
          'flex cursor-pointer items-center gap-1.5 rounded-pill border font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          compact ? 'h-[30px] px-3 text-xs' : 'h-[34px] px-3.5 text-[13px]',
          tab.value === value ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-ink hover:border-ink-muted'
        )}
      >
        {tab.label}
        {tab.count !== undefined && <span className="tabular-nums opacity-70">{tab.count}</span>}
      </button>
    ))}
  </div>
);

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  height?: string;
}

export const Segmented = <T extends string>({ options, value, onChange, label, height = 'h-8' }: SegmentedProps<T>) => (
  <div role="radiogroup" aria-label={label} className="flex self-start overflow-hidden rounded-card border border-line">
    {options.map(option => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={option.value === value}
        onClick={() => onChange(option.value)}
        className={cx('cursor-pointer px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary', height, option.value === value ? 'bg-primary text-on-primary' : 'bg-surface text-ink hover:bg-page')}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const fieldClass =
  'w-full rounded-card border border-line bg-surface text-sm text-ink outline-none transition-colors placeholder:text-ink-muted hover:border-ink-muted focus:border-primary focus:ring-[3px] focus:ring-primary-tint aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-60';

export const TextInput = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => <input className={cx(fieldClass, 'h-[42px] px-3', className)} {...props} />;
export const SelectInput = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cx(fieldClass, 'h-[42px] cursor-pointer px-2.5', className)} {...props} />;
export const TextArea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cx(fieldClass, 'px-3 py-2.5 leading-normal', className)} {...props} />;

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}

export const FormField = ({ label, error, hint, aside, className, children }: FormFieldProps) => (
  <label className={cx('flex min-w-0 flex-col gap-1.5', className)}>
    <span className="flex justify-between text-[13px] font-medium text-ink">
      <span>{label}</span>
      {aside && <span className="font-normal text-ink-secondary">{aside}</span>}
    </span>
    {children}
    {hint && !error && <span className="text-xs text-ink-secondary">{hint}</span>}
    {error && <span className="text-xs text-danger-ink">{error}</span>}
  </label>
);

type FieldExtras = Omit<FormFieldProps, 'children'>;
const splitField = <P extends FieldExtras>({ label, error, hint, aside, className, ...rest }: P) => ({ field: { label, error, hint, aside, className }, rest });

export const TextField = (props: FieldExtras & InputHTMLAttributes<HTMLInputElement>) => {
  const { field, rest } = splitField(props);
  return (
    <FormField {...field}>
      <TextInput aria-invalid={Boolean(field.error)} {...rest} />
    </FormField>
  );
};

export const SelectField = ({ options, ...props }: FieldExtras & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string | number; label: string }[] }) => {
  const { field, rest } = splitField(props);
  return (
    <FormField {...field}>
      <SelectInput aria-invalid={Boolean(field.error)} {...rest}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectInput>
    </FormField>
  );
};

export const TextAreaField = (props: FieldExtras & TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const { field, rest } = splitField(props);
  return (
    <FormField {...field}>
      <TextArea aria-invalid={Boolean(field.error)} {...rest} />
    </FormField>
  );
};

export const MoneyField = ({ suffix, invalid, ...props }: FieldExtras & InputHTMLAttributes<HTMLInputElement> & { suffix?: string; invalid?: boolean }) => {
  const { field, rest } = splitField(props);
  const failed = Boolean(field.error) || Boolean(invalid);
  return (
    <FormField {...field}>
      <span className={cx('flex h-[42px] items-center gap-1.5 rounded-card border bg-surface px-3 transition-colors focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-tint', failed ? 'border-danger' : 'border-line hover:border-ink-muted')}>
        <span className="text-ink-secondary">$</span>
        <input inputMode="decimal" aria-invalid={failed} className="min-w-0 flex-1 bg-transparent text-[15px] tabular-nums outline-none placeholder:text-ink-muted" {...rest} />
        {suffix && <span className="text-xs text-ink-secondary">{suffix}</span>}
      </span>
    </FormField>
  );
};

const ALERT_TONES = {
  red: 'border-pill-red-bd bg-pill-red-bg text-pill-red-fg',
  amber: 'border-pill-amber-bd bg-pill-amber-bg text-pill-amber-fg',
  blue: 'border-pill-blue-bd bg-pill-blue-bg text-pill-blue-fg',
  green: 'border-pill-green-bd bg-pill-green-bg text-pill-green-fg',
  neutral: 'border-dashed border-ink-muted bg-surface text-ink-secondary',
} as const;

export const Alert = ({ tone, children, role }: { tone: keyof typeof ALERT_TONES; children: ReactNode; role?: 'alert' | 'status' }) => (
  <div role={role} className={cx('animate-rise rounded-card border px-3 py-2.5 text-[13px] leading-normal', ALERT_TONES[tone])}>
    {children}
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => <span className={cx('block animate-pulse-soft rounded-card bg-line', className)} />;

export const Panel = ({ title, subtitle, action, children, className, flush = false }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) => (
  <section className={cx('rounded-card border border-line bg-surface', className)}>
    {title && (
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {subtitle && <span className="text-xs text-ink-secondary">{subtitle}</span>}
        </div>
        {action}
      </div>
    )}
    <div className={flush ? undefined : 'p-5'}>{children}</div>
  </section>
);

export const EmptyBlock = ({ title, description, icon }: { title: string; description?: string; icon?: IconName }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
    {icon && <Icon name={icon} size={40} strokeWidth={1.3} className="text-ink-muted" />}
    <span className="text-[15px] font-semibold">{title}</span>
    {description && <span className="text-sm text-ink-secondary">{description}</span>}
  </div>
);
