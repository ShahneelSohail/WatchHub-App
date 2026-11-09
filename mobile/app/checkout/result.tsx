import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Page, RequireAuth } from '@/components/Page';
import { Photo } from '@/components/Photo';
import { Button, Card, Divider, Loading, Spinner, StatusPill, Text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { expectedDelivery, formatMoney, optionSummary, orderNumber } from '@/lib/format';
import { useReducedMotion } from '@/lib/motion';
import { useCardPayment, useOrder, useOrderActions } from '@/lib/orders';
import { colors, fonts, motion, orderStatusStyles, spacing } from '@/theme';

type ResultStatus = 'redirect' | 'paid' | 'pending' | 'cancelled' | 'cod';

interface Outcome {
  eyebrow: string;
  eyebrowColor: string;
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  title: string;
  body: string;
}

const outcomes = (firstName: string, email: string, total: string): Record<Exclude<ResultStatus, 'redirect'>, Outcome> => ({
  paid: { eyebrow: 'Payment received', eyebrowColor: colors.successInk, icon: 'check', iconColor: colors.success, iconBackground: colors.successSurface, title: `Thank you, ${firstName}. Your order is confirmed.`, body: `We’ve emailed a receipt to ${email}. We’ll let you know when your watch ships.` },
  pending: { eyebrow: 'Waiting for payment', eyebrowColor: colors.warningInk, icon: 'clock', iconColor: colors.warning, iconBackground: colors.warningSurface, title: 'Your order is waiting for payment', body: 'Your card wasn’t charged yet. We’ll hold your watch for 24 hours. Pay now to keep it, or switch to cash on delivery.' },
  cancelled: { eyebrow: 'Payment cancelled', eyebrowColor: colors.secondary, icon: 'close', iconColor: colors.secondary, iconBackground: colors.page, title: 'You haven’t been charged', body: 'The payment was cancelled before it finished. Your bag is saved, so you can try again or choose cash on delivery.' },
  cod: { eyebrow: 'Order placed', eyebrowColor: colors.primary, icon: 'check', iconColor: colors.primary, iconBackground: colors.tint, title: `Pay ${total} when it arrives`, body: `Your order is placed. Have the exact amount ready for the courier. We’ve emailed the details to ${email}.` },
});

const PopIcon = ({ icon, color, background }: { icon: IconName; color: string; background: string }) => {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.6)).current;
  useEffect(() => {
    if (reducedMotion) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.08, duration: motion.riseMs * 0.6, easing: motion.ease, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: motion.riseMs * 0.4, easing: motion.ease, useNativeDriver: true }),
    ]).start();
  }, [scale, reducedMotion]);
  return (
    <Animated.View style={[styles.icon, { backgroundColor: background, transform: [{ scale }] }]}>
      <Icon name={icon} size={34} color={color} strokeWidth={2} />
    </Animated.View>
  );
};

function ResultContent() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ order: string; status: ResultStatus; url?: string }>();
  const orderId = Number(params.order);
  const { data: order } = useOrder(orderId);
  const { collect, startPayment } = useCardPayment();
  const { switchToCod } = useOrderActions();
  const [status, setStatus] = useState<ResultStatus>(params.status);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (status !== 'redirect') return;
    let active = true;
    const run = async () => {
      const outcome = attempt === 0 && params.url ? await collect(orderId, params.url).catch(() => 'pending' as const) : await startPayment(orderId);
      if (active) setStatus(outcome ?? 'pending');
    };
    void run();
    return () => {
      active = false;
    };
    // Deliberately keyed on the attempt only: the payment browser must open once per attempt.
  }, [attempt]);

  const retry = () => {
    setStatus('redirect');
    setAttempt(count => count + 1);
  };

  if (!order) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  const total = formatMoney(order.total);

  if (status === 'redirect') {
    return (
      <Page>
        <Card style={styles.card}>
          <View style={styles.ring}>
            <Spinner size={28} />
          </View>
          <Text variant="title" align="center">Taking you to secure payment</Text>
          <Text variant="body" align="center" style={styles.body}>Stripe handles your card details. Please don’t close this screen. You’ll come back here once the payment is done.</Text>
          <View style={styles.secure}>
            <Icon name="lock" size={14} color={colors.secondary} strokeWidth={2} />
            <Text variant="label" color={colors.secondary}>{`Order ${orderNumber(order.id)} · ${total}`}</Text>
          </View>
        </Card>
      </Page>
    );
  }

  const outcome = outcomes(user?.name.split(' ')[0] ?? '', user?.email ?? '', total)[status];
  const payLine = status === 'paid' ? 'Paid by card' : status === 'pending' ? 'Card · not charged' : status === 'cancelled' ? 'Card · cancelled' : `Cash on delivery · ${total}`;
  const actions =
    status === 'pending' || status === 'cancelled' ? (
      <>
        <Button label={status === 'pending' ? `Pay now · ${total}` : 'Try again'} size="lg" onPress={retry} />
        {status === 'pending' ? (
          <Button label="Pay on delivery instead" variant="outline" size="lg" loading={switchToCod.isPending} onPress={() => switchToCod.mutate(order.id, { onSuccess: () => setStatus('cod') })} />
        ) : (
          <Button label="Back to bag" variant="outline" size="lg" onPress={() => router.replace('/cart')} />
        )}
      </>
    ) : (
      <>
        <Button label="View order" size="lg" onPress={() => router.replace({ pathname: '/orders/[id]', params: { id: String(order.id) } })} />
        <Button label="Continue shopping" variant="outline" size="lg" onPress={() => router.replace('/shop')} />
      </>
    );

  return (
    <Page>
      <Card style={styles.card}>
        <PopIcon icon={outcome.icon} color={outcome.iconColor} background={outcome.iconBackground} />
        <Text variant="eyebrow" color={outcome.eyebrowColor} style={styles.eyebrow}>{outcome.eyebrow}</Text>
        <Text variant="h1" align="center">{outcome.title}</Text>
        <Text variant="body" align="center" style={styles.body}>{outcome.body}</Text>
        <View style={styles.actions}>{actions}</View>
      </Card>

      <Card>
        <View style={styles.orderHead}>
          <Text variant="strong" style={styles.orderTitle}>{`Order ${orderNumber(order.id)}`}</Text>
          <StatusPill status={orderStatusStyles[order.status]} />
        </View>
        {order.items.map(item => (
          <View key={item.id} style={styles.item}>
            <Photo path={item.image} style={styles.thumb} />
            <View style={styles.itemText}>
              <Text variant="baseMedium">{item.name}</Text>
              <Text variant="small">{optionSummary(item)}</Text>
            </View>
            <Text variant="base" style={styles.tabular}>{formatMoney(item.unitPrice * item.quantity)}</Text>
          </View>
        ))}
        <Divider />
        <View style={styles.facts}>
          {[
            ['Total', total],
            ['Payment', payLine],
            ['Delivery', expectedDelivery(order)],
          ].map(([label, value]) => (
            <View key={label} style={styles.fact}>
              <Text variant="small">{label}</Text>
              <Text variant="base" style={label === 'Total' ? styles.factStrong : undefined}>{value}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Page>
  );
}

export default function PaymentResultScreen() {
  return (
    <RequireAuth>
      <ResultContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 12, paddingTop: 40, paddingBottom: 32, paddingHorizontal: 28 },
  icon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 36 },
  ring: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 3, borderColor: colors.tint, borderTopColor: colors.primary },
  eyebrow: { fontSize: 12 },
  body: { maxWidth: 440 },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 10 },
  orderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  orderTitle: { fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  thumb: { width: 56, height: 56 },
  itemText: { flex: 1, gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
  facts: { gap: 16, padding: 20 },
  fact: { gap: 4 },
  factStrong: { fontFamily: fonts.sansSemibold },
});
