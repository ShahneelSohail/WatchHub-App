'use client';

import { useState, type FormEvent } from 'react';
import type { Address } from '@/lib/types';
import { Button, Checkbox, ErrorState, Field, Input, Select } from './ui';

type AddressInput = Omit<Address, 'id'>;

const COUNTRIES = ['United Kingdom', 'France', 'Germany', 'Italy', 'Sweden', 'United States', 'Canada', 'Japan', 'United Arab Emirates'];

const fields = [
  { name: 'label', label: 'Label (optional, e.g. Home)', autoComplete: 'off', optional: true, wide: true },
  { name: 'recipient', label: 'Full name', autoComplete: 'name', wide: true },
  { name: 'addressLine', label: 'Address', autoComplete: 'street-address', wide: true },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'state', label: 'State / region', autoComplete: 'address-level1' },
  { name: 'zip', label: 'Postcode', autoComplete: 'postal-code' },
  { name: 'country', label: 'Country', autoComplete: 'country-name', select: true },
  { name: 'phone', label: 'Phone (optional)', autoComplete: 'tel', optional: true, wide: true },
] as const;

export const AddressForm = ({ initial, submitLabel, onSubmit, onCancel }: { initial?: Address; submitLabel: string; onSubmit: (address: AddressInput) => Promise<unknown>; onCancel?: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const countries = initial && !COUNTRIES.includes(initial.country) ? [initial.country, ...COUNTRIES] : COUNTRIES;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ ...(values as Omit<AddressInput, 'isDefault' | 'phone' | 'label'>), label: values.label || null, phone: values.phone || null, isDefault });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3.5 sm:grid-cols-2">
      {fields.map(field => (
        <div key={field.name} className={'wide' in field ? 'sm:col-span-2' : undefined}>
          <Field label={field.label}>
            {'select' in field ? (
              <Select name={field.name} defaultValue={initial?.country ?? countries[0]} autoComplete={field.autoComplete}>
                {countries.map(country => (
                  <option key={country}>{country}</option>
                ))}
              </Select>
            ) : (
              <Input name={field.name} defaultValue={initial?.[field.name] ?? ''} autoComplete={field.autoComplete} required={!('optional' in field)} />
            )}
          </Field>
        </div>
      ))}
      <div className="sm:col-span-2">
        <Checkbox checked={isDefault} onChange={setIsDefault} label="Use as my default address" />
      </div>
      {error && (
        <div className="sm:col-span-2">
          <ErrorState message={error} />
        </div>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};
