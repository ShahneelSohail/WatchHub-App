'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { uploadImages } from '@/lib/uploads';
import { useToast } from '../Providers';
import { cx } from '../ui';
import { usePageMeta } from './chrome';
import { Alert, Button, FormField, IconButton, MoneyField, Panel, SelectInput, SelectField, Skeleton, Switch, TextArea, TextField, TextInput } from './controls';
import { useAction } from './data';
import { Icon } from './icons';
import { FormModal } from './overlays';
import { Tag, productTags } from './pills';
import type { AdminWatch } from './types';

interface Variant {
  key: string;
  name: string;
  hex: string;
  image: string | null;
  stock: string;
}

interface SpecRow {
  key: string;
  label: string;
  value: string;
}

interface FormState {
  name: string;
  sku: string;
  brandId: string;
  categoryId: string;
  description: string;
  images: string[];
  variants: Variant[];
  specs: SpecRow[];
  price: string;
  salePrice: string;
  threshold: string;
  status: 'PUBLISHED' | 'DRAFT';
  isFeatured: boolean;
  isNew: boolean;
  isLimitedEdition: boolean;
  hasBeltOption: boolean;
  hasChainOption: boolean;
}

type ErrorKey = 'name' | 'sku' | 'description' | 'price' | 'salePrice' | 'images' | 'variants';
type Errors = Partial<Record<ErrorKey, string>>;
type SaveState = 'idle' | 'saved';

interface Taxonomy {
  id: number;
  name: string;
}

const MAX_COLOURS = 8;
const SAVED_FLASH_MS = 1600;
const DEFAULT_SPEC_LABELS = ['Movement', 'Case', 'Water resistance'];

const FLAGS: { id: string; label: string; hint: string; read: (form: FormState) => boolean; write: (on: boolean) => Partial<FormState> }[] = [
  { id: 'visible', label: 'Visible in store', hint: 'Shown in listings and search', read: form => form.status === 'PUBLISHED', write: on => ({ status: on ? 'PUBLISHED' : 'DRAFT' }) },
  { id: 'featured', label: 'Featured on home', hint: 'Appears in Featured watches', read: form => form.isFeatured, write: on => ({ isFeatured: on }) },
  { id: 'new', label: 'New badge', hint: 'Shows the New tag in the store', read: form => form.isNew, write: on => ({ isNew: on }) },
  { id: 'limited', label: 'Limited edition', hint: 'Adds the Limited tag and edition note', read: form => form.isLimitedEdition, write: on => ({ isLimitedEdition: on }) },
  { id: 'belt', label: 'Belt strap option', hint: 'Customers can add a leather belt strap', read: form => form.hasBeltOption, write: on => ({ hasBeltOption: on }) },
  { id: 'chain', label: 'Chain strap option', hint: 'Customers can add a chain strap', read: form => form.hasChainOption, write: on => ({ hasChainOption: on }) },
];

let rowCounter = 0;
const nextKey = () => `row-${(rowCounter += 1)}`;

const toSpecRows = (specifications: Record<string, string>): SpecRow[] => Object.entries(specifications).map(([label, value]) => ({ key: nextKey(), label, value }));

const initialState = (watch: AdminWatch | null, brands: Taxonomy[], categories: Taxonomy[]): FormState => ({
  name: watch?.name ?? '',
  sku: watch?.sku ?? '',
  brandId: String(watch?.brand.id ?? brands[0]?.id ?? ''),
  categoryId: String(watch?.category.id ?? categories[0]?.id ?? ''),
  description: watch?.description ?? '',
  images: watch?.images ?? [],
  variants: (watch?.colors ?? []).map((color, index) => ({
    key: nextKey(),
    name: color.name,
    hex: color.hex,
    image: color.image,
    stock: String(watch?.trackColorStock ? color.stock : index === 0 ? watch?.stock : 0),
  })),
  specs: watch ? toSpecRows(watch.specifications) : DEFAULT_SPEC_LABELS.map(label => ({ key: nextKey(), label, value: '' })),
  price: watch ? String(watch.price) : '',
  salePrice: watch?.salePrice ? String(watch.salePrice) : '',
  threshold: String(watch?.lowStockThreshold ?? 5),
  status: watch?.status ?? 'DRAFT',
  isFeatured: watch?.isFeatured ?? false,
  isNew: watch?.isNew ?? true,
  isLimitedEdition: watch?.isLimitedEdition ?? false,
  hasBeltOption: watch?.hasBeltOption ?? false,
  hasChainOption: watch?.hasChainOption ?? false,
});

const digits = (value: string) => value.replace(/\D/g, '');
const decimal = (value: string) => value.replace(/[^\d.]/g, '');

const validate = (form: FormState): Errors => {
  const price = Number(form.price);
  const sale = Number(form.salePrice);
  const entries: [ErrorKey, string | false][] = [
    ['name', !form.name.trim() && 'Enter a product name'],
    ['sku', !form.sku.trim() && 'Enter a reference'],
    ['description', !form.description.trim() && 'Enter a description'],
    ['price', !(price > 0) && 'Enter a price'],
    ['salePrice', sale > 0 && price > 0 && sale >= price && 'Sale price must be lower than the price'],
    ['images', form.images.length === 0 && 'Add at least one image'],
    ['variants', form.variants.length === 0 && 'Add at least one colour'],
  ];
  return Object.fromEntries(entries.filter((entry): entry is [ErrorKey, string] => Boolean(entry[1])));
};

const toPayload = (form: FormState) => ({
  sku: form.sku.trim().toUpperCase(),
  name: form.name.trim(),
  description: form.description.trim(),
  brandId: Number(form.brandId),
  categoryId: Number(form.categoryId),
  price: Number(form.price),
  salePrice: Number(form.salePrice) > 0 ? Number(form.salePrice) : null,
  lowStockThreshold: Number(form.threshold) || 0,
  images: form.images,
  specifications: Object.fromEntries(form.specs.filter(spec => spec.label.trim()).map(spec => [spec.label.trim(), spec.value.trim()])),
  colors: form.variants.map(variant => ({ name: variant.name.trim(), hex: variant.hex, image: variant.image, stock: Number(variant.stock) || 0 })),
  hasBeltOption: form.hasBeltOption,
  hasChainOption: form.hasChainOption,
  status: form.status,
  isFeatured: form.isFeatured,
  isLimitedEdition: form.isLimitedEdition,
  isNew: form.isNew,
});

const Section = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <section className="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const moveItem = <T,>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
};

interface ImagesProps {
  images: string[];
  error?: string;
  onChange: (images: string[]) => void;
}

const ImagesSection = ({ images, error, onChange }: ImagesProps) => {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const upload = useMutation({
    mutationFn: (files: File[]) => uploadImages(files),
    onSuccess: urls => {
      onChange([...images, ...urls]);
      toast('success', urls.length === 1 ? 'Image uploaded' : `${urls.length} images uploaded`);
    },
    onError: (failure: Error) => toast('error', failure.message),
  });

  const move = (from: number, to: number) => to >= 0 && to < images.length && from !== to && onChange(moveItem(images, from, to));

  return (
    <Section title="Images" action={<span className="text-[13px] text-ink-secondary">Drag to reorder. The first image is the main photo.</span>}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(136px,1fr))] gap-3">
        {images.map((url, index) => (
          <div
            key={url}
            draggable
            onDragStart={event => {
              event.dataTransfer.effectAllowed = 'move';
              setDragging(index);
            }}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault();
              if (dragging !== null) move(dragging, index);
              setDragging(null);
            }}
            onDragEnd={() => setDragging(null)}
            className={cx('relative aspect-square cursor-grab overflow-hidden rounded-card border-[1.5px] bg-line transition-opacity', dragging === index ? 'border-primary opacity-45' : 'border-line')}
          >
            <img src={url} alt={`Product image ${index + 1}`} draggable={false} className="absolute inset-0 size-full object-cover" />
            <span className={cx('absolute top-2 left-2 inline-flex h-[22px] items-center rounded-card px-[7px] text-[11px] font-semibold', index === 0 ? 'bg-primary text-on-primary' : 'bg-white/95 text-gray-900')}>{index === 0 ? 'Main' : index + 1}</span>
            <span className="absolute right-1.5 bottom-1.5 left-1.5 flex justify-between gap-1">
              <span className="flex gap-1">
                <IconButton icon="arrowLeft" label="Move left" size={30} className="bg-white/95 text-gray-900" disabled={index === 0} onClick={() => move(index, index - 1)} />
                <IconButton icon="arrowRight" label="Move right" size={30} className="bg-white/95 text-gray-900" disabled={index === images.length - 1} onClick={() => move(index, index + 1)} />
              </span>
              <IconButton icon="close" label="Remove image" size={30} className="bg-white/95 text-danger-ink hover:text-danger-ink" onClick={() => onChange(images.filter((_, position) => position !== index))} />
            </span>
          </div>
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
          className={cx('flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border-[1.5px] border-dashed bg-page text-link transition-colors hover:border-primary hover:bg-primary-tint disabled:opacity-60', error ? 'border-danger' : 'border-ink-muted')}
        >
          <Icon name="upload" size={22} strokeWidth={1.6} />
          <span className="text-[13px] font-semibold">{upload.isPending ? 'Uploading' : 'Upload'}</span>
          <span className="text-[11px] text-ink-secondary">PNG or JPG, 2000 px</span>
        </button>
        <input
          ref={input}
          type="file"
          multiple
          hidden
          aria-label="Upload images"
          accept="image/png,image/jpeg,image/webp"
          onChange={event => {
            if (event.target.files?.length) upload.mutate(Array.from(event.target.files));
            event.target.value = '';
          }}
        />
      </div>
      {error && <span className="text-xs text-danger-ink">{error}</span>}
    </Section>
  );
};

interface VariantsProps {
  variants: Variant[];
  images: string[];
  error?: string;
  notice: boolean;
  onChange: (variants: Variant[]) => void;
}

const VARIANT_GRID = 'grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1.4fr)_92px_36px] items-center gap-3';

const VariantsSection = ({ variants, images, error, notice, onChange }: VariantsProps) => {
  const update = (key: string, patch: Partial<Variant>) => onChange(variants.map(variant => (variant.key === key ? { ...variant, ...patch } : variant)));
  return (
    <Section
      title="Colour variants"
      action={
        <Button variant="outline" size="sm" className="h-[34px] px-3 text-[13px]" disabled={variants.length >= MAX_COLOURS} onClick={() => onChange([...variants, { key: nextKey(), name: 'New colour', hex: '#9ca3af', image: images[0] ?? null, stock: '0' }])}>
          + Add colour
        </Button>
      }
    >
      {notice && <Alert tone="blue">Stock was tracked for the whole product. It is placed on the first colour; split it across the colours below.</Alert>}
      <div className={cx(VARIANT_GRID, 'text-xs font-semibold tracking-[0.06em] text-ink-secondary uppercase')}>
        <span />
        <span>Name</span>
        <span>Linked image</span>
        <span>Stock</span>
        <span />
      </div>
      {variants.map((variant, index) => (
        <div key={variant.key} className={cx(VARIANT_GRID, 'border-t border-line py-2')}>
          <label className="relative size-10 cursor-pointer overflow-hidden rounded-pill shadow-[0_0_0_1px_var(--color-line)]" style={{ backgroundColor: variant.hex }}>
            <input type="color" value={variant.hex} onChange={event => update(variant.key, { hex: event.target.value })} aria-label={`Swatch colour ${index + 1}`} className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
          <TextInput value={variant.name} onChange={event => update(variant.key, { name: event.target.value })} aria-label={`Colour name ${index + 1}`} className="h-10 min-w-0 text-sm" />
          <span className="flex flex-wrap gap-1.5">
            {images.map((url, position) => (
              <button
                key={url}
                type="button"
                aria-label={`Link image ${position + 1} to ${variant.name}`}
                aria-pressed={variant.image === url}
                onClick={() => update(variant.key, { image: url })}
                className={cx('size-10 cursor-pointer overflow-hidden rounded-card bg-line p-0', variant.image === url ? 'border-2 border-primary' : 'border border-line')}
              >
                <img src={url} alt="" className="block size-full object-cover" />
              </button>
            ))}
            {images.length === 0 && <span className="text-xs text-ink-muted">Upload an image first</span>}
          </span>
          <TextInput value={variant.stock} onChange={event => update(variant.key, { stock: digits(event.target.value) })} inputMode="numeric" aria-label={`Stock for ${variant.name}`} className="h-10 min-w-0 text-right text-sm tabular-nums" />
          <IconButton icon="trash" label={`Remove ${variant.name}`} size={36} iconSize={16} tone="danger" onClick={() => onChange(variants.filter(candidate => candidate.key !== variant.key))} />
        </div>
      ))}
      {error && <span className="text-xs text-danger-ink">{error}</span>}
    </Section>
  );
};

const SpecsSection = ({ specs, onChange }: { specs: SpecRow[]; onChange: (specs: SpecRow[]) => void }) => {
  const update = (key: string, patch: Partial<SpecRow>) => onChange(specs.map(spec => (spec.key === key ? { ...spec, ...patch } : spec)));
  return (
    <Section
      title="Specifications"
      action={
        <Button variant="outline" size="sm" className="h-[34px] px-3 text-[13px]" onClick={() => onChange([...specs, { key: nextKey(), label: '', value: '' }])}>
          + Add row
        </Button>
      }
    >
      {specs.map((spec, index) => (
        <div key={spec.key} className="grid grid-cols-[200px_minmax(0,1fr)_36px] items-center gap-2.5">
          <TextInput value={spec.label} onChange={event => update(spec.key, { label: event.target.value })} placeholder="Label" aria-label={`Specification label ${index + 1}`} className="h-10 bg-page text-sm font-medium focus:bg-surface" />
          <TextInput value={spec.value} onChange={event => update(spec.key, { value: event.target.value })} placeholder="Value" aria-label={`Specification value ${index + 1}`} className="h-10 text-sm" />
          <IconButton icon="close" label="Remove row" size={36} iconSize={16} tone="danger" onClick={() => onChange(specs.filter(candidate => candidate.key !== spec.key))} />
        </div>
      ))}
    </Section>
  );
};

const StorePreview = ({ form, brandName }: { form: FormState; brandName: string }) => {
  const price = Number(form.price) || 0;
  const sale = Number(form.salePrice) || 0;
  const onSale = sale > 0 && sale < price;
  const tag = productTags({ price, salePrice: onSale ? sale : null, isLimitedEdition: form.isLimitedEdition, isNew: form.isNew, isFeatured: false })[0];
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="relative aspect-[4/3] bg-line">
        {form.images[0] && <img src={form.images[0]} alt="" className="absolute inset-0 size-full object-cover" />}
        {tag && (
          <span className="absolute top-3 left-3">
            <Tag kind={tag.kind} large>
              {tag.label}
            </Tag>
          </span>
        )}
        <span className="absolute top-3 right-3 inline-flex h-[22px] items-center rounded-card bg-white/95 px-2 text-[11px] font-semibold text-gray-500">Store preview</span>
      </div>
      <div className="flex flex-col gap-1 px-[18px] py-4">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-secondary uppercase">{brandName}</span>
        <span className="font-display text-[21px]">{form.name || 'Product name'}</span>
        <span className="flex items-baseline gap-2">
          <span className={cx('text-base font-semibold', onSale && 'text-danger')}>{price ? formatMoney(onSale ? sale : price) : '$0'}</span>
          {onSale && <span className="text-[13px] text-ink-muted line-through">{formatMoney(price)}</span>}
        </span>
      </div>
    </section>
  );
};

interface EditorFormProps {
  watch: AdminWatch | null;
  brands: Taxonomy[];
  categories: Taxonomy[];
}

const EditorForm = ({ watch, brands, categories }: EditorFormProps) => {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(() => initialState(watch, brands, categories));
  const [errors, setErrors] = useState<Errors>({});
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const stockNotice = Boolean(watch && !watch.trackColorStock && watch.colors.length > 0);

  usePageMeta(form.name || 'New product', `Products / ${watch ? 'Edit' : 'New'}`);

  const edit = (patch: Partial<FormState>, clears: ErrorKey[] = []) => {
    setForm(current => ({ ...current, ...patch }));
    setErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => !clears.includes(key as ErrorKey))));
    setDirty(true);
    setSaveState('idle');
  };

  const save = useAction((payload: ReturnType<typeof toPayload>) => (watch ? api.put<AdminWatch>(`/admin/watches/${watch.id}`, payload) : api.post<AdminWatch>('/admin/watches', payload)), {
    success: 'Product saved',
    onSuccess: saved => {
      setDirty(false);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), SAVED_FLASH_MS);
      if (!watch) router.replace(`/admin/products/${saved.id}`);
    },
  });
  const remove = useAction(() => api.delete(`/admin/watches/${watch?.id}`), { success: `${watch?.name} deleted`, onSuccess: () => router.push('/admin/products') });

  const submit = () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate(toPayload(form));
  };

  const discard = () => {
    if (!watch) return router.push('/admin/products');
    setForm(initialState(watch, brands, categories));
    setErrors({});
    setDirty(false);
    toast('success', 'Changes discarded');
  };

  const errorMessages = Object.values(errors);
  const stockTotal = form.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
  const price = Number(form.price) || 0;
  const sale = Number(form.salePrice) || 0;
  const saleInvalid = sale > 0 && price > 0 && sale >= price;
  const state = save.isPending ? { text: 'Saving', tone: 'bg-ink-muted' } : saveState === 'saved' ? { text: 'All changes saved', tone: 'bg-success' } : dirty ? { text: 'Unsaved changes', tone: 'bg-warning' } : { text: watch ? 'No unsaved changes' : 'New product, not saved yet', tone: 'bg-ink-muted' };
  const saleNote = saleInvalid
    ? 'Sale price must be lower than the price.'
    : sale > 0 && price > 0
      ? `Shows as −${Math.round((1 - sale / price) * 100)}%. Customers save ${formatMoney(price - sale)}.`
      : 'Leave the sale price empty for no sale.';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/admin/products" className="flex items-center gap-1.5 text-[13px] font-medium text-link hover:underline">
          <Icon name="arrowLeft" size={14} />
          Products
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-[13px] whitespace-nowrap text-ink-secondary" role="status">
            <span className={cx('size-[7px] rounded-pill', state.tone)} />
            {state.text}
          </span>
          <SelectInput aria-label="Status" value={form.status} onChange={event => edit({ status: event.target.value as FormState['status'] })} className="h-10 w-auto">
            <option value="PUBLISHED">Active</option>
            <option value="DRAFT">Draft</option>
          </SelectInput>
          <Button size="md" onClick={discard}>
            Discard
          </Button>
          <Button variant="primary" className={cx('min-w-[132px] px-[18px]', saveState === 'saved' && 'border-success bg-success hover:border-success hover:bg-success')} disabled={save.isPending} onClick={submit}>
            {save.isPending && <span className="size-4 animate-spin rounded-pill border-2 border-white/35 border-t-white" />}
            {saveState === 'saved' && <Icon name="check" size={14} strokeWidth={2.5} />}
            {save.isPending ? 'Saving' : saveState === 'saved' ? 'Saved' : watch ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </div>

      {errorMessages.length > 0 && (
        <Alert tone="red" role="alert">
          <span className="text-sm">
            Fix {errorMessages.length} {errorMessages.length === 1 ? 'field' : 'fields'} before saving: {errorMessages.join(', ')}.
          </span>
        </Alert>
      )}

      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-start gap-5 max-xl:grid-cols-1">
        <div className="flex flex-col gap-5">
          <Section title="Details">
            <TextField label="Name" placeholder="e.g. Tidewater 300 Diver" value={form.name} error={errors.name} onChange={event => edit({ name: event.target.value }, ['name'])} />
            <div className="grid grid-cols-3 gap-3">
              <SelectField label="Brand" value={form.brandId} onChange={event => edit({ brandId: event.target.value })} options={brands.map(brand => ({ value: brand.id, label: brand.name }))} />
              <SelectField label="Category" value={form.categoryId} onChange={event => edit({ categoryId: event.target.value })} options={categories.map(category => ({ value: category.id, label: category.name }))} />
              <TextField label="Reference" placeholder="KA-1480" className="[&_input]:uppercase" value={form.sku} error={errors.sku} onChange={event => edit({ sku: event.target.value }, ['sku'])} />
            </div>
            <FormField label="Description" error={errors.description}>
              <TextArea rows={4} value={form.description} aria-invalid={Boolean(errors.description)} onChange={event => edit({ description: event.target.value }, ['description'])} />
            </FormField>
          </Section>
          <ImagesSection images={form.images} error={errors.images} onChange={images => edit({ images, variants: form.variants.map(variant => (variant.image && !images.includes(variant.image) ? { ...variant, image: images[0] ?? null } : variant)) }, ['images'])} />
          <VariantsSection variants={form.variants} images={form.images} error={errors.variants} notice={stockNotice && !dirty} onChange={variants => edit({ variants }, ['variants'])} />
          <SpecsSection specs={form.specs} onChange={specs => edit({ specs })} />
        </div>

        <div className="sticky top-24 flex flex-col gap-5 max-xl:static">
          <StorePreview form={form} brandName={brands.find(brand => String(brand.id) === form.brandId)?.name ?? ''} />
          <Panel title="Pricing">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <MoneyField label="Price" aria-label="Price" value={form.price} invalid={Boolean(errors.price)} onChange={event => edit({ price: decimal(event.target.value) }, ['price'])} />
                <MoneyField label="Sale price" aria-label="Sale price" placeholder="Optional" value={form.salePrice} invalid={Boolean(errors.salePrice) || saleInvalid} onChange={event => edit({ salePrice: decimal(event.target.value) }, ['salePrice'])} />
              </div>
              <span className={cx('text-xs leading-normal', saleInvalid || errors.price ? 'text-danger-ink' : 'text-ink-secondary')}>{errors.price && !saleInvalid ? 'Enter a price.' : saleNote}</span>
            </div>
          </Panel>
          <Panel title="Stock">
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-secondary">Total across colours</span>
                <span className="text-[22px] font-semibold tabular-nums">{stockTotal}</span>
              </div>
              <label className="flex items-center justify-between gap-3 text-sm">
                Low-stock alert at
                <TextInput value={form.threshold} onChange={event => edit({ threshold: digits(event.target.value) })} inputMode="numeric" className="h-[38px] w-[72px] px-2.5 text-right" />
              </label>
            </div>
          </Panel>
          <section className="flex flex-col rounded-card border border-line bg-surface px-5 py-2">
            {FLAGS.map((flag, index) => (
              <div key={flag.id} className={cx('flex items-center justify-between gap-3 py-3', index < FLAGS.length - 1 && 'border-b border-line')}>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{flag.label}</span>
                  <span className="text-xs text-ink-secondary">{flag.hint}</span>
                </span>
                <Switch label={flag.label} checked={flag.read(form)} onChange={on => edit(flag.write(on))} />
              </div>
            ))}
          </section>
          {watch && (
            <Button variant="danger" size="lg" onClick={() => setConfirmDelete(true)}>
              Delete product
            </Button>
          )}
        </div>
      </div>

      {confirmDelete && watch && (
        <FormModal title={`Delete ${watch.name}?`} sub="The product, its images and colour variants are removed. Past orders keep their snapshot." cta="Delete product" tone="danger" busy={remove.isPending} onSubmit={() => remove.mutate(undefined)} onClose={() => setConfirmDelete(false)} />
      )}
    </div>
  );
};

export const ProductEditor = ({ id }: { id?: number }) => {
  const watch = useQuery({ queryKey: ['admin', 'watches', id], queryFn: () => api.get<AdminWatch>(`/admin/watches/${id}`), enabled: id !== undefined });
  const brands = useQuery({ queryKey: ['admin', 'brands'], queryFn: () => api.get<Taxonomy[]>('/admin/brands') });
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: () => api.get<Taxonomy[]>('/admin/categories') });

  const failure = watch.error ?? brands.error ?? categories.error;
  if (failure)
    return (
      <Alert tone="red" role="alert">
        {failure.message}
      </Alert>
    );
  if ((id !== undefined && !watch.data) || !brands.data || !categories.data)
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    );
  return <EditorForm key={watch.data?.id ?? 'new'} watch={watch.data ?? null} brands={brands.data} categories={categories.data} />;
};
