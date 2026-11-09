import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Rise } from '@/components/Motion';
import { Page, RequireAuth } from '@/components/Page';
import { Photo } from '@/components/Photo';
import { Alert, Button, Card, EmptyState, Loading, Row, StatusPill, Text, TextButton, TotalRow } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useWatchSlug } from '@/lib/catalog';
import { addressSummary, expectedDelivery, formatDate, formatDateTime, formatMoney, optionSummary, orderNumber } from '@/lib/format';
import { useOrder, useOrderActions } from '@/lib/orders';
import { useCartActions } from '@/lib/shop';
import type { Order, OrderItem, OrderStatus } from '@/lib/types';
import { colors, fonts, orderStatusStyles, spacing } from '@/theme';

const TIMELINE: { label: string; statuses: OrderStatus[] }[] = [
  { label: 'Placed', statuses: ['PENDING_PAYMENT', 'PENDING'] },
  { label: 'Confirmed', statuses: ['CONFIRMED'] },
  { label: 'Shipped', statuses: ['SHIPPED'] },
  { label: 'Delivered', statuses: ['DELIVERED'] },
];

const STAGE: Record<OrderStatus, number> = { PENDING_PAYMENT: 0, PENDING: 0, CONFIRMED: 1, SHIPPED: 2, DELIVERED: 3, CANCELLED: 0 };

const CANCELLABLE: OrderStatus[] = ['PENDING_PAYMENT', 'PENDING'];

const paymentLine = (order: Order): string => {
  if (order.paymentMethod === 'COD') return 'Cash on delivery';
  return order.paymentStatus === 'PAID' ? 'Card · paid' : 'Card';
};

const Timeline = ({ order }: { order: Order }) => {
  const stage = STAGE[order.status];
  return (
    <View style={styles.timeline}>
      {TIMELINE.map(({ label, statuses }, index) => {
        const reached = order.events.find(event => statuses.includes(event.status));
        const done = index < stage || (index === stage && (index === 0 || order.status === 'DELIVERED'));
        const current = !done && index === stage;
        const at = reached ? formatDateTime(reached.createdAt) : order.status === 'PENDING_PAYMENT' && index === 1 ? 'After payment' : '';
        return (
          <Rise key={label} index={index} style={styles.stage}>
            <View style={styles.stageTrack}>
              <View style={[styles.stageDot, { backgroundColor: done ? colors.primary : colors.surface, borderColor: done || current ? colors.primary : colors.line }]}>
                {done ? <Icon name="check" size={13} color={colors.onPrimary} strokeWidth={3} /> : <Text variant="meta" color={current ? colors.primary : colors.muted} style={styles.stageNumber}>{String(index + 1)}</Text>}
              </View>
              {index < TIMELINE.length - 1 && <View style={[styles.stageLine, { backgroundColor: index < stage ? colors.primary : colors.line }]} />}
            </View>
            <View style={styles.stageText}>
              <Text variant="label" color={done || current ? colors.ink : colors.secondary} style={current ? styles.stageCurrent : undefined}>{label}</Text>
              <Text variant="small">{at}</Text>
            </View>
          </Rise>
        );
      })}
    </View>
  );
};

const ItemRow = ({ item, canReview }: { item: OrderItem; canReview: boolean }) => {
  const router = useRouter();
  const slug = useWatchSlug(item.watchId);
  const meta = [optionSummary(item), `Qty ${item.quantity}`].filter(Boolean).join(' · ');
  return (
    <View style={styles.item}>
      <Photo path={item.image} style={styles.itemImage} />
      <View style={styles.itemText}>
        <Text variant="cardTitle" style={styles.itemName}>{item.name}</Text>
        <Text variant="small" style={styles.itemMeta}>{meta}</Text>
        {canReview && slug && <TextButton label="Write a review" onPress={() => router.push({ pathname: '/watch/[slug]', params: { slug } })} />}
      </View>
      <Text variant="baseMedium" style={styles.itemPrice}>{formatMoney(item.unitPrice * item.quantity)}</Text>
    </View>
  );
};

function OrderContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const orderId = Number(id);
  const { data: order, isPending, isError, refetch, isRefetching } = useOrder(orderId);
  const { cancel } = useOrderActions();
  const { add } = useCartActions();
  const [asking, setAsking] = useState(false);

  if (isPending) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  if (isError || !order) {
    return (
      <Page>
        <EmptyState icon="receipt" title="We couldn’t find that order" actions={<Button label="My orders" size="lg" onPress={() => router.replace('/orders')} />} />
      </Page>
    );
  }

  const cancelled = order.status === 'CANCELLED';
  const delivered = order.status === 'DELIVERED';
  const canCancel = CANCELLABLE.includes(order.status);
  const cancelledAt = order.events.find(event => event.status === 'CANCELLED');
  const cancelNote = order.paymentStatus === 'PAID' ? 'You’ll be refunded in 5 to 10 days.' : order.status === 'PENDING_PAYMENT' ? 'Nothing has been charged.' : 'Nothing is due.';

  const buyAgain = async () => {
    const available = order.items.filter(item => item.watchId !== null);
    await Promise.all(available.map(item => add.mutateAsync({ watchId: item.watchId as number, quantity: item.quantity, strapType: item.strapType, strapColor: item.strapColor, productColor: item.productColor }).catch(() => undefined)));
    toast('success', 'Added to your bag');
    router.navigate('/cart');
  };

  return (
    <Page refreshing={isRefetching} onRefresh={refetch}>
      <TextButton label="← My orders" onPress={() => router.replace('/orders')} size={14} style={styles.back} />
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text variant="h1" style={styles.title}>{`Order ${orderNumber(order.id)}`}</Text>
          <Text variant="body" style={styles.placed}>{`Placed ${formatDate(order.createdAt)} · ${paymentLine(order)}`}</Text>
        </View>
        <StatusPill status={orderStatusStyles[order.status]} size="lg" />
      </View>

      {order.status === 'PENDING_PAYMENT' && order.paymentMethod === 'STRIPE' && (
        <View style={styles.holdBanner}>
          <View style={styles.holdText}>
            <Icon name="clock" size={20} color={colors.warning} strokeWidth={1.8} />
            <Text variant="base" color={colors.warningInk} style={styles.holdCopy}>We’re holding this order for 24 hours. Your card hasn’t been charged.</Text>
          </View>
          <Button label={`Pay now · ${formatMoney(order.total)}`} onPress={() => router.push({ pathname: '/checkout/result', params: { order: String(order.id), status: 'redirect' } })} />
        </View>
      )}

      {cancelled ? (
        <View style={styles.cancelled}>
          <Text variant="base" color={colors.secondary}>{`Cancelled ${cancelledAt ? formatDate(cancelledAt.createdAt) : ''}${cancelledAt?.note ? `. ${cancelledAt.note}.` : '.'}`}</Text>
        </View>
      ) : (
        <Card style={styles.progress}>
          <Timeline order={order} />
          {order.trackingNumber ? (
            <View style={styles.tracking}>
              <Icon name="truck" size={20} color={colors.primary} strokeWidth={1.6} />
              <View style={styles.trackingText}>
                <Text variant="strong" color={colors.primary}>{`${order.courierName ?? 'Courier'} · ${order.trackingNumber}`}</Text>
                <Text variant="label" color={colors.primary}>{delivered ? 'Delivered' : expectedDelivery(order)}</Text>
              </View>
            </View>
          ) : (
            <Text variant="base" color={colors.secondary}>{order.status === 'PENDING_PAYMENT' ? 'Ships after payment' : expectedDelivery(order)}</Text>
          )}
        </Card>
      )}

      <Card>
        <Text variant="strong" style={styles.cardTitle}>Items</Text>
        {order.items.map(item => (
          <ItemRow key={item.id} item={item} canReview={delivered} />
        ))}
        <View style={styles.totals}>
          <Row label="Subtotal" value={formatMoney(order.subtotal)} />
          {order.discount > 0 && <Row label={`Discount${order.couponCode ? ` · ${order.couponCode}` : ''}`} value={`−${formatMoney(order.discount)}`} color={colors.successInk} />}
          <Row label={order.shippingMethod === 'EXPRESS' ? 'Express shipping' : 'Standard shipping'} value={order.shippingCost ? formatMoney(order.shippingCost) : 'Free'} />
          <TotalRow value={formatMoney(order.total)} />
        </View>
      </Card>

      <Card style={styles.panel}>
        <Text variant="eyebrow" style={styles.panelTitle}>Delivering to</Text>
        <Text variant="base" style={styles.address}>{addressSummary(order.shippingAddress)}</Text>
      </Card>

      <Card style={styles.panel}>
        <Text variant="eyebrow" style={styles.panelTitle}>Need something?</Text>
        <Button label="Get help with this order" variant="neutral" onPress={() => router.push({ pathname: '/support/new', params: { order: String(order.id) } })} />
        <Button label="Buy again" variant="outline" loading={add.isPending} onPress={buyAgain} />
        {canCancel &&
          (asking ? (
            <Rise style={styles.cancelAsk}>
              <Text variant="base" color={colors.dangerInk}>{`Cancel ${orderNumber(order.id)}? ${cancelNote}`}</Text>
              <View style={styles.cancelButtons}>
                <Button label="Keep order" variant="neutral" onPress={() => setAsking(false)} style={styles.flex} />
                <Button label="Yes, cancel" variant="dangerSolid" loading={cancel.isPending} onPress={() => cancel.mutate(order.id, { onSuccess: () => { setAsking(false); toast('success', `${orderNumber(order.id)} cancelled`); } })} style={styles.flex} />
              </View>
            </Rise>
          ) : (
            <Button label="Cancel order" variant="danger" onPress={() => setAsking(true)} />
          ))}
        {cancel.isError && <Alert tone="danger">{cancel.error.message}</Alert>}
      </Card>
    </Page>
  );
}

export default function OrderScreen() {
  return (
    <RequireAuth>
      <OrderContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { alignSelf: 'flex-start', minHeight: 32 },
  head: { gap: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end' },
  headText: { gap: 8 },
  title: { fontSize: 30 },
  placed: { fontSize: 14 },
  holdBanner: { gap: 14, padding: 18, backgroundColor: colors.warningSurface, borderWidth: 1, borderColor: colors.warningLine, borderRadius: 2 },
  holdText: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  holdCopy: { flex: 1, lineHeight: 21 },
  cancelled: { padding: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.muted, backgroundColor: colors.surface, borderRadius: 2 },
  progress: { gap: 18, padding: 22 },
  timeline: { flexDirection: 'row' },
  stage: { flex: 1, gap: 10 },
  stageTrack: { flexDirection: 'row', alignItems: 'center' },
  stageDot: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5 },
  stageNumber: { fontFamily: fonts.sansBold, fontSize: 12 },
  stageLine: { flex: 1, height: 2, marginHorizontal: 6 },
  stageText: { gap: 2, paddingRight: 6 },
  stageCurrent: { fontFamily: fonts.sansSemibold },
  tracking: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.tint, borderRadius: 2 },
  trackingText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 16, padding: 16, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  itemImage: { width: 72, height: 72 },
  itemText: { flex: 1, minWidth: 0, gap: 3 },
  itemName: { fontSize: 18, lineHeight: 21 },
  itemMeta: { fontSize: 13 },
  itemPrice: { fontSize: 15, fontVariant: ['tabular-nums'] },
  totals: { gap: 8, padding: 18 },
  panel: { gap: 10, padding: 18 },
  panelTitle: { fontSize: 12, letterSpacing: 1.2 },
  address: { lineHeight: 22, color: colors.ink },
  cancelAsk: { gap: 10, padding: 14, backgroundColor: colors.dangerSurface, borderWidth: 1, borderColor: colors.dangerLine, borderRadius: 2 },
  cancelButtons: { flexDirection: 'row', gap: spacing.sm },
});
