'use client';

import { useState, type FormEvent } from 'react';
import type { Address } from '@/lib/types';
import { Button, ErrorState, Field, Input } from './ui';

type AddressInput = Omit<Address, 'id'>;

const fields = [
  { name: 'recipient', label: 'Recipient name', autoComplete: 'name', wide: true },
  { name: 'addressLine', label: 'Address', autoComplete: 'street-address', wide: true },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'state', label: 'State / region', autoComplete: 'address-level1' },
  { name: 'zip', label: 'ZIP / postal code', autoComplete: 'postal-code' },
  { name: 'country', label: 'Country', autoComplete: 'country-name' },
  { name: 'phone', label: 'Phone (optional)', autoComplete: 'tel', optional: true, wide: true },
] as const;

export const AddressForm = ({ initial, submitLabel, onSubmit, onCancel }: { initial?: Address; submitLabel: string; onSubmit: (address: AddressInput) => Promise<unknown>; onCancel?: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form) as Record<string, string>;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ ...(values as Omit<AddressInput, 'isDefault' | 'phone'>), phone: values.phone || null, isDefault: form.get('isDefault') === 'on' });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {fields.map(field => (
        <div key={field.name} className={'wide' in field ? 'sm:col-span-2' : undefined}>
          <Field label={field.label}>
            <Input name={field.name} defaultValue={initial?.[field.name] ?? ''} autoComplete={field.autoComplete} required={!('optional' in field)} />
          </Field>
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2">
        <input type="checkbox" name="isDefault" defaultChecked={initial?.isDefault} className="h-4 w-4 accent-navy" />
        Use as my default address
      </label>
      {error && (
        <div className="sm:col-span-2">
          <ErrorState message={error} />
        </div>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};
