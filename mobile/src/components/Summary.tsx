import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextStyle } from 'react-native';
import { useApplyCoupon, useCheckoutState } from '@/lib/checkout';
import { formatMoney } from '@/lib/format';
import type { Totals } from '@/lib/types';
import { bareInput, colors, fonts, radius } from '@/theme';
import { Button, Row, Text, TextButton, TotalRow } from './ui';

export const CouponBox = ({ totals }: { totals: Totals | undefined }) => {
  const { couponCode, setCouponCode } = useCheckoutState();
  const apply = useApplyCoupon();
  const [input, setInput] = useState('');

  const submit = () => {
    const code = input.trim().toUpperCase();
    if (code) apply.mutate(code, { onSuccess: () => setInput('') });
  };

  const message = apply.isError ? { ok: false, text: apply.error.message } : couponCode && apply.isSuccess ? { ok: true, text: `${couponCode} applied. ${totals?.discount ? `${formatMoney(totals.discount)} off.` : ''}` } : null;

  return (
    <View style={styles.coupon}>
      <Text variant="label">Coupon code</Text>
      {couponCode ? (
        <View style={styles.applied}>
          <Text variant="strong" color={colors.primary} style={styles.appliedCode}>{couponCode}</Text>
          <TextButton label="Remove" underline onPress={() => { setCouponCode(null); apply.reset(); }} style={styles.removeCoupon} />
        </View>
      ) : (
        <View style={styles.couponRow}>
          <TextInput
            accessibilityLabel="Coupon code"
            value={input}
            onChangeText={value => { setInput(value); apply.reset(); }}
            placeholder="e.g. WELCOME10"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[styles.couponInput, bareInput, apply.isError && styles.couponInputError]}
          />
          <Button label="Apply" variant="outline" loading={apply.isPending} onPress={submit} />
        </View>
      )}
      {message && <Text variant="small" color={message.ok ? colors.successInk : colors.dangerInk}>{message.text}</Text>}
    </View>
  );
};

export const TotalsSummary = ({ totals }: { totals: Totals | undefined }) => {
  const { shippingMethod } = useCheckoutState();
  return (
    <View style={styles.rows}>
      <Row label="Subtotal" value={totals ? formatMoney(totals.subtotal) : '—'} />
      {totals && totals.discount > 0 && <Row label={`Discount · ${totals.couponCode}`} value={`−${formatMoney(totals.discount)}`} color={colors.successInk} />}
      <Row label={shippingMethod === 'EXPRESS' ? 'Express shipping' : 'Standard shipping'} value={totals ? (totals.shippingCost ? formatMoney(totals.shippingCost) : 'Free') : '—'} />
      <TotalRow value={totals ? formatMoney(totals.total) : '—'} />
    </View>
  );
};

const couponInput: TextStyle = { flex: 1, minWidth: 0, height: 44, paddingHorizontal: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base, fontFamily: fonts.sans, fontSize: 14, letterSpacing: 0.56, color: colors.ink };

const styles = StyleSheet.create({
  coupon: { gap: 8 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput,
  couponInputError: { borderColor: colors.danger },
  applied: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12, paddingRight: 6, backgroundColor: colors.tint, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.base },
  appliedCode: { fontFamily: fonts.sansBold, letterSpacing: 0.84 },
  removeCoupon: { minHeight: 34, paddingHorizontal: 10 },
  rows: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
});
