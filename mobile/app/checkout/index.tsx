import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AddressForm } from '@/components/AddressForm';
import { Page, PageHeading, RequireAuth } from '@/components/Page';
import { Photo } from '@/components/Photo';
import { CouponBox, TotalsSummary } from '@/components/Summary';
import { Alert, Button, Card, EmptyState, FormError, Loading, OptionCard, Text, TextButton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAddresses, useCheckoutOptions, useCheckoutState, useLineAvailability, useQuote } from '@/lib/checkout';
import { formatMoney, optionSummary } from '@/lib/format';
import { ordersKey } from '@/lib/orders';
import { CART_KEY, useCart, useCartActions } from '@/lib/shop';
import type { Order, PaymentMethod, ShippingMethod } from '@/lib/types';
import { priceColor, watchImage } from '@/lib/watch';
import { colors, fonts, spacing } from '@/theme';

const STEPS = ['Bag', 'Details', 'Payment', 'Done'];

const SHIPPING: { method: ShippingMethod; title: string; detail: string }[] = [
  { method: 'STANDARD', title: 'Standard', detail: '4 to 6 working days · DHL or Royal Mail' },
  { method: 'EXPRESS', title: 'Express', detail: '1 to 2 working days · DHL Express' },
];

const CARD_BRANDS = ['VISA', 'MC', 'AMEX'];

const Steps = () => (
  <View style={styles.steps}>
    {STEPS.map((label, index) => {
      const done = index === 0;
      const current = index === 1;
      return (
        <View key={label} style={styles.step}>
          <View style={[styles.stepDot, { backgroundColor: done ? colors.primary : colors.surface, borderColor: index <= 1 ? colors.primary : colors.line }]}>
            <Text variant="meta" color={done ? colors.onPrimary : current ? colors.primary : colors.muted} style={styles.stepNumber}>{done ? '✓' : String(index + 1)}</Text>
          </View>
          <Text variant="label" color={index <= 1 ? colors.ink : colors.secondary} style={current ? styles.stepCurrent : undefined}>{label}</Text>
          {index < STEPS.length - 1 && <Text variant="label" color={colors.muted}>›</Text>}
        </View>
      );
    })}
  </View>
);

const Section = ({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) => (
  <Card style={styles.section}>
    <View style={styles.sectionHead}>
      <Text variant="strong" style={styles.sectionTitle}>{title}</Text>
      {aside ? <Text variant="small" style={styles.sectionAside}>{aside}</Text> : null}
    </View>
    {children}
  </Card>
);

function CheckoutContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const cart = useCart();
  const addresses = useAddresses();
  const options = useCheckoutOptions();
  const quote = useQuote();
  const availableFor = useLineAvailability();
  const { remove } = useCartActions();
  const { couponCode, shippingMethod, setShippingMethod } = useCheckoutState();
  const [addressId, setAddressId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const place = useMutation({
    mutationFn: (input: { addressId: number; paymentMethod: PaymentMethod }) =>
      api.post<{ order: Order; checkoutUrl: string | null }>('/checkout', { ...input, shippingMethod, couponCode: couponCode ?? undefined, platform: 'mobile' }),
    onSuccess: ({ order, checkoutUrl }) => {
      queryClient.setQueryData(CART_KEY, []);
      queryClient.invalidateQueries({ queryKey: ordersKey });
      router.replace({ pathname: '/checkout/result', params: { order: String(order.id), status: checkoutUrl ? 'redirect' : 'cod', ...(checkoutUrl ? { url: checkoutUrl } : {}) } });
    },
    onError: error => setFormError(error.message),
  });

  if (!cart.data || !addresses.data || !options.data) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  const lines = cart.data;
  const savedAddresses = addresses.data;
  const { cardPayments: cardAvailable, shippingCosts } = options.data;

  if (!lines.length) {
    return (
      <Page>
        <EmptyState icon="bag" title="Your bag is empty" actions={<Button label="Shop all watches" size="lg" onPress={() => router.replace('/shop')} />} />
      </Page>
    );
  }

  const soldOut = lines.filter(line => availableFor(line) === 0);
  const selectedAddress = savedAddresses.find(address => address.id === addressId) ?? savedAddresses.find(address => address.isDefault) ?? savedAddresses[0];
  const codAvailable = quote.data?.codAvailable ?? true;
  const selectedPayment: PaymentMethod = payment === 'COD' && !codAvailable ? 'STRIPE' : (payment ?? (cardAvailable ? 'STRIPE' : 'COD'));
  const total = quote.data ? formatMoney(quote.data.total) : '';
  const showForm = adding || savedAddresses.length === 0;

  const placeOrder = () => {
    setFormError(null);
    if (soldOut.length) return setFormError('Remove the sold-out watch to continue.');
    if (!selectedAddress) return setFormError('Add a delivery address to continue.');
    place.mutate({ addressId: selectedAddress.id, paymentMethod: selectedPayment });
  };

  return (
    <Page>
      <Steps />
      <PageHeading title="Checkout" />
      <FormError message={formError} />
      {soldOut.length > 0 && (
        <Alert tone="danger" action={<Button label="Remove and continue" variant="danger" size="sm" onPress={() => soldOut.forEach(line => remove.mutate(line.id))} style={styles.alertAction} />}>
          {`${soldOut.map(line => line.watch.name).join(', ')} sold out while you were checking out. Remove it to place your order; the rest of your bag is still reserved.`}
        </Alert>
      )}

      <Section title="1. Contact" aside={`Signed in as ${user?.name}`}>
        <Text variant="label">Email</Text>
        <Text variant="body" color={colors.ink} style={styles.contact}>{user?.email}</Text>
      </Section>

      <Section title="2. Shipping address">
        {savedAddresses.map(address => (
          <OptionCard
            key={address.id}
            selected={address.id === selectedAddress?.id}
            onPress={() => {
              setAddressId(address.id);
              setAdding(false);
            }}
            title={address.recipient}
            detail={`${address.addressLine}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`}
            value={address.isDefault ? 'Default' : undefined}
          />
        ))}
        {showForm ? (
          <AddressForm
            title="New address"
            submitLabel="Save and use"
            onCancel={savedAddresses.length ? () => setAdding(false) : undefined}
            onSaved={saved => {
              setAddressId(saved.reduce((latest, address) => Math.max(latest, address.id), 0));
              setAdding(false);
            }}
          />
        ) : (
          <Button label="Add an address" icon="plus" variant="outline" onPress={() => setAdding(true)} />
        )}
      </Section>

      <Section title="3. Delivery">
        {SHIPPING.map(({ method, title, detail }) => (
          <OptionCard key={method} selected={shippingMethod === method} onPress={() => setShippingMethod(method)} title={title} detail={detail} value={shippingCosts[method] ? formatMoney(shippingCosts[method]) : 'Free'} />
        ))}
      </Section>

      <Section title="4. Payment">
        <OptionCard
          selected={selectedPayment === 'STRIPE'}
          disabled={!cardAvailable}
          onPress={() => setPayment('STRIPE')}
          title="Card"
          detail={cardAvailable ? 'You’ll go to Stripe’s secure page to pay, then come straight back.' : 'Card payments are not available right now.'}
          trailing={
            <View style={styles.brands}>
              {CARD_BRANDS.map(brand => (
                <View key={brand} style={styles.brand}>
                  <Text variant="meta" color={brand === 'VISA' ? colors.primary : colors.ink} style={styles.brandLabel}>{brand}</Text>
                </View>
              ))}
            </View>
          }
        />
        <OptionCard
          selected={selectedPayment === 'COD'}
          disabled={!codAvailable}
          onPress={() => setPayment('COD')}
          title="Cash on delivery"
          detail={codAvailable ? 'Pay the courier in cash when your watch arrives.' : (quote.data?.codReason ?? 'Cash on delivery is not available for this order.')}
        />
      </Section>

      <Card style={styles.section}>
        <View style={styles.sectionHead}>
          <Text variant="strong" style={styles.sectionTitle}>Your order</Text>
          <TextButton label="Edit bag" onPress={() => router.replace('/cart')} />
        </View>
        {lines.map(line => (
          <View key={line.id} style={[styles.line, availableFor(line) === 0 && styles.dim]}>
            <View>
              <Photo path={watchImage(line.watch, Math.max(line.watch.colors.findIndex(color => color.name === line.productColor), 0))} style={styles.thumb} />
              <View style={styles.qty}>
                <Text variant="meta" color={colors.onPrimary} style={styles.qtyLabel}>{String(line.quantity)}</Text>
              </View>
            </View>
            <View style={styles.lineText}>
              <Text variant="baseMedium" numberOfLines={1}>{line.watch.name}</Text>
              <Text variant="small">{optionSummary(line)}</Text>
            </View>
            <Text variant="base" color={priceColor(line.watch)} style={styles.tabular}>{formatMoney(line.lineTotal)}</Text>
          </View>
        ))}
        <View style={styles.couponBlock}>
          <CouponBox totals={quote.data} />
        </View>
        {quote.isError ? <Alert tone="danger">{quote.error.message}</Alert> : <TotalsSummary totals={quote.data} />}
        <Button label={selectedPayment === 'COD' ? `Place order · ${total}` : `Pay ${total} with card`} size="cta" loading={place.isPending} disabled={soldOut.length > 0 || !quote.data} onPress={placeOrder} />
        <Text variant="small">
          {selectedPayment === 'COD'
            ? `You’ll pay ${total} in cash on delivery. By placing your order you agree to our terms and returns policy.`
            : 'Your card is charged by Stripe. WatchHub never sees your card number. By paying you agree to our terms and returns policy.'}
        </Text>
      </Card>
    </Page>
  );
}

export default function CheckoutScreen() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1.5 },
  stepNumber: { fontFamily: fonts.sansBold },
  stepCurrent: { fontFamily: fonts.sansSemibold },
  alertAction: { alignSelf: 'flex-start' },
  section: { gap: 14, padding: 22 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 16 },
  sectionAside: { fontSize: 13 },
  contact: { paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.page },
  brands: { flexDirection: 'row', gap: 4 },
  brand: { height: 22, paddingHorizontal: 6, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 2 },
  brandLabel: { fontFamily: fonts.sansBold, fontSize: 10 },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dim: { opacity: 0.5 },
  thumb: { width: 56, height: 56 },
  qty: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.secondary },
  qtyLabel: { fontFamily: fonts.sansBold },
  lineText: { flex: 1, minWidth: 0, gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
  couponBlock: { paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
});
