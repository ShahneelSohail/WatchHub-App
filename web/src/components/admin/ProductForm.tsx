'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { uploadImages } from '@/lib/uploads';
import { useToast } from '../Providers';
import { Button, Card, ErrorState, Field, Input, Select, Spinner, Textarea } from '../ui';
import type { Brand, Category, Watch } from '@/lib/types';

interface FormState {
  sku: string;
  name: string;
  description: string;
  brandId: string;
  categoryId: string;
  price: string;
  salePrice: string;
  stock: string;
  images: string[];
  specifications: { key: string; value: string }[];
  colors: { name: string; hex: string; image: string }[];
  hasBeltOption: boolean;
  hasChainOption: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  isFeatured: boolean;
  isLimitedEdition: boolean;
}

const EMPTY: FormState = {
  sku: '',
  name: '',
  description: '',
  brandId: '',
  categoryId: '',
  price: '',
  salePrice: '',
  stock: '0',
  images: [],
  specifications: [],
  colors: [],
  hasBeltOption: false,
  hasChainOption: false,
  status: 'PUBLISHED',
  isFeatured: false,
  isLimitedEdition: false,
};

const toFormState = (watch: Watch): FormState => ({
  sku: watch.sku,
  name: watch.name,
  description: watch.description,
  brandId: String(watch.brand.id),
  categoryId: String(watch.category.id),
  price: String(watch.price),
  salePrice: watch.salePrice === null ? '' : String(watch.salePrice),
  stock: String(watch.stock),
  images: watch.images,
  specifications: Object.entries(watch.specifications).map(([key, value]) => ({ key, value })),
  colors: watch.colors.map(color => ({ name: color.name, hex: color.hex, image: color.image ?? '' })),
  hasBeltOption: watch.hasBeltOption,
  hasChainOption: watch.hasChainOption,
  status: watch.status,
  isFeatured: watch.isFeatured,
  isLimitedEdition: watch.isLimitedEdition,
});

const toPayload = ({ specifications, colors, ...form }: FormState) => ({
  ...form,
  specifications: Object.fromEntries(specifications.filter(entry => entry.key.trim()).map(entry => [entry.key, entry.value])),
  colors: colors.filter(color => color.name.trim()).map(color => ({ ...color, image: color.image || null })),
});

const CheckboxField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="flex items-center gap-2 text-sm text-muted">
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 accent-navy" />
    {label}
  </label>
);

export const ProductForm = ({ watch }: { watch?: Watch }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(watch ? toFormState(watch) : EMPTY);
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api.get<Brand[]>('/brands') });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/categories') });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }));
  const upload = useMutation({ mutationFn: (files: FileList) => uploadImages(files), onSuccess: urls => set('images', [...form.images, ...urls]), onError: (error: Error) => toast('error', error.message) });
  const save = useMutation({
    mutationFn: () => (watch ? api.put<Watch>(`/admin/watches/${watch.id}`, toPayload(form)) : api.post<Watch>('/admin/watches', toPayload(form))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'watches'] });
      queryClient.invalidateQueries({ queryKey: ['watches'] });
      toast('success', 'Product saved.');
      router.push('/admin/products');
    },
  });

  if (brands.isPending || categories.isPending) return <Spinner />;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Card className="space-y-4">
          <h2 className="font-serif text-xl">Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={event => set('name', event.target.value)} required />
            </Field>
            <Field label="SKU">
              <Input value={form.sku} onChange={event => set('sku', event.target.value)} required />
            </Field>
            <Field label="Brand">
              <Select value={form.brandId} onChange={event => set('brandId', event.target.value)} required>
                <option value="">Choose a brand</option>
                {brands.data?.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.categoryId} onChange={event => set('categoryId', event.target.value)} required>
                <option value="">Choose a category</option>
                {categories.data?.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={form.description} onChange={event => set('description', event.target.value)} required />
          </Field>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-serif text-xl">Images</h2>
          <div className="flex flex-wrap gap-3">
            {form.images.map(image => (
              <div key={image} className="relative">
                <img src={image} alt="" className="h-24 w-24 rounded-xl border border-line bg-sand object-contain p-1" />
                <button type="button" aria-label="Remove image" onClick={() => set('images', form.images.filter(entry => entry !== image))} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-ink text-sm text-white">
                  ×
                </button>
              </div>
            ))}
          </div>
          <input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={event => event.target.files?.length && upload.mutate(event.target.files)} className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-sand file:px-4 file:py-2 file:text-sm file:font-medium" />
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Colour variants</h2>
            <Button type="button" variant="secondary" onClick={() => set('colors', [...form.colors, { name: '', hex: '#1a237e', image: '' }])}>
              Add colour
            </Button>
          </div>
          {form.colors.map((color, index) => (
            <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_5rem_1fr_auto]">
              <Field label="Name">
                <Input value={color.name} onChange={event => set('colors', form.colors.map((entry, position) => (position === index ? { ...entry, name: event.target.value } : entry)))} />
              </Field>
              <Field label="Colour">
                <Input type="color" value={color.hex} onChange={event => set('colors', form.colors.map((entry, position) => (position === index ? { ...entry, hex: event.target.value } : entry)))} className="h-[42px] p-1" />
              </Field>
              <Field label="Image">
                <Select value={color.image} onChange={event => set('colors', form.colors.map((entry, position) => (position === index ? { ...entry, image: event.target.value } : entry)))}>
                  <option value="">None</option>
                  {form.images.map((image, position) => (
                    <option key={image} value={image}>
                      Image {position + 1}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="button" variant="ghost" onClick={() => set('colors', form.colors.filter((_, position) => position !== index))}>
                Remove
              </Button>
            </div>
          ))}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Specifications</h2>
            <Button type="button" variant="secondary" onClick={() => set('specifications', [...form.specifications, { key: '', value: '' }])}>
              Add row
            </Button>
          </div>
          {form.specifications.map((entry, index) => (
            <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Name">
                <Input value={entry.key} onChange={event => set('specifications', form.specifications.map((row, position) => (position === index ? { ...row, key: event.target.value } : row)))} />
              </Field>
              <Field label="Value">
                <Input value={entry.value} onChange={event => set('specifications', form.specifications.map((row, position) => (position === index ? { ...row, value: event.target.value } : row)))} />
              </Field>
              <Button type="button" variant="ghost" onClick={() => set('specifications', form.specifications.filter((_, position) => position !== index))}>
                Remove
              </Button>
            </div>
          ))}
        </Card>
      </div>

      <div className="space-y-6 self-start xl:sticky xl:top-8">
        <Card className="space-y-4">
          <h2 className="font-serif text-xl">Pricing and stock</h2>
          <Field label="Price (USD)">
            <Input type="number" min={0} step="0.01" value={form.price} onChange={event => set('price', event.target.value)} required />
          </Field>
          <Field label="Sale price (optional)" hint="Must be lower than the price.">
            <Input type="number" min={0} step="0.01" value={form.salePrice} onChange={event => set('salePrice', event.target.value)} />
          </Field>
          <Field label="Units in stock">
            <Input type="number" min={0} step={1} value={form.stock} onChange={event => set('stock', event.target.value)} required />
          </Field>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-serif text-xl">Visibility</h2>
          <Field label="Status">
            <Select value={form.status} onChange={event => set('status', event.target.value as FormState['status'])}>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft (hidden from the store)</option>
            </Select>
          </Field>
          <CheckboxField label="Featured on the home page" checked={form.isFeatured} onChange={checked => set('isFeatured', checked)} />
          <CheckboxField label="Limited edition" checked={form.isLimitedEdition} onChange={checked => set('isLimitedEdition', checked)} />
          <CheckboxField label="Offer a leather belt strap" checked={form.hasBeltOption} onChange={checked => set('hasBeltOption', checked)} />
          <CheckboxField label="Offer a metal chain strap" checked={form.hasChainOption} onChange={checked => set('hasChainOption', checked)} />
        </Card>
        {save.isError && <ErrorState message={save.error.message} />}
        <div className="flex gap-3">
          <Button type="submit" disabled={save.isPending} className="flex-1">
            {save.isPending ? 'Saving…' : 'Save product'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/admin/products')}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
};
