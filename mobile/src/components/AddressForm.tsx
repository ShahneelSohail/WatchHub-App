import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAddressActions } from '@/lib/checkout';
import type { Address, AddressInput } from '@/lib/types';
import { colors, radius, spacing } from '@/theme';
import { Button, FormError, Input, Text } from './ui';

type FieldKey = 'recipient' | 'addressLine' | 'city' | 'state' | 'zip' | 'country' | 'phone';

const FIELDS: { key: FieldKey; label: string; hint?: string; half?: boolean; required: string }[] = [
  { key: 'recipient', label: 'Full name', required: 'Enter your full name' },
  { key: 'addressLine', label: 'Address', hint: 'Street and number', required: 'Enter your street address' },
  { key: 'city', label: 'City', half: true, required: 'Enter a city' },
  { key: 'state', label: 'State or region', half: true, required: 'Enter a state or region' },
  { key: 'zip', label: 'Postcode', half: true, required: 'Enter a postcode' },
  { key: 'country', label: 'Country', half: true, required: 'Enter a country' },
  { key: 'phone', label: 'Phone', hint: 'For the courier', required: 'Enter a phone number for the courier' },
];

const MIN_PHONE_DIGITS = 7;

const validate = (values: Record<FieldKey, string>): Partial<Record<FieldKey, string>> =>
  Object.fromEntries(
    FIELDS.filter(({ key }) => (key === 'phone' ? values.phone.replace(/\D/g, '').length < MIN_PHONE_DIGITS : !values[key].trim())).map(({ key, required }) => [key, required])
  );

const toValues = (address?: Address): Record<FieldKey, string> => ({
  recipient: address?.recipient ?? '',
  addressLine: address?.addressLine ?? '',
  city: address?.city ?? '',
  state: address?.state ?? '',
  zip: address?.zip ?? '',
  country: address?.country ?? '',
  phone: address?.phone ?? '',
});

interface AddressFormProps {
  address?: Address;
  title: string;
  submitLabel: string;
  onSaved: (addresses: Address[]) => void;
  onCancel?: () => void;
}

export const AddressForm = ({ address, title, submitLabel, onSaved, onCancel }: AddressFormProps) => {
  const { create, update } = useAddressActions();
  const [values, setValues] = useState(() => toValues(address));
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const mutation = address ? update : create;

  const submit = () => {
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setFailure(null);
    const input: AddressInput = { ...values, phone: values.phone.trim() || null, isDefault: address?.isDefault ?? false };
    const options = { onSuccess: onSaved, onError: (error: Error) => setFailure(error.message) };
    if (address) update.mutate({ id: address.id, input }, options);
    else create.mutate(input, options);
  };

  return (
    <View style={styles.form}>
      <Text variant="strong" style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {FIELDS.map(({ key, label, hint, half }) => (
          <View key={key} style={half ? styles.half : styles.full}>
            <Input
              label={label}
              placeholder={hint}
              value={values[key]}
              error={errors[key]}
              keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
              autoCapitalize={key === 'zip' ? 'characters' : 'words'}
              onChangeText={value => {
                setValues(current => ({ ...current, [key]: value }));
                setErrors(current => ({ ...current, [key]: undefined }));
              }}
            />
          </View>
        ))}
      </View>
      <FormError message={failure} />
      <View style={styles.actions}>
        {onCancel && <Button label="Cancel" variant="neutral" onPress={onCancel} />}
        <Button label={submitLabel} loading={mutation.isPending} onPress={submit} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  form: { gap: 14, padding: 22, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.base },
  title: { fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  full: { width: '100%' },
  half: { width: '47%', flexGrow: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
