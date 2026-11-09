import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Page, PageHeading, RequireAuth } from '@/components/Page';
import { Photo } from '@/components/Photo';
import { Button, EmptyState, Loading, Pill, StatusPill, Text } from '@/components/ui';
import { Rise } from '@/components/Motion';
import { expectedDelivery, formatDate, formatMoney, orderNumber } from '@/lib/format';
import { useOrders } from '@/lib/orders';
import type { Order, OrderStatus } from '@/lib/types';
import { colors, orderStatusStyles } from '@/theme';

const IN_PROGRESS: OrderStatus[] = ['PENDING_PAYMENT', 'PENDING', 'CONFIRMED', 'SHIPPED'];

const FILTERS: { label: string; match: (order: Order) => boolean }[] = [
  { label: 'All', match: () => true },
  { label: 'In progress', match: order => IN_PROGRESS.includes(order.status) },
  { label: 'Delivered', match: order => order.status === 'DELIVERED' },
  { label: 'Cancelled', match: order => order.status === 'CANCELLED' },
];

const estimate = (order: Order): { text: string; color: string } => {
  if (order.status === 'CANCELLED') return { text: 'Cancelled', color: colors.secondary };
  if (order.status === 'PENDING_PAYMENT') return { text: 'Ships after payment', color: colors.warningInk };
  if (order.status === 'DELIVERED') return { text: 'Delivered', color: colors.successInk };
  return { text: expectedDelivery(order), color: colors.secondary };
};

const summary = (order: Order): string => {
  const [first] = order.items;
  return order.items.length > 1 ? `${first?.name} and ${order.items.length - 1} more` : (first?.name ?? '');
};

function OrdersContent() {
  const router = useRouter();
  const { data, isPending, refetch, isRefetching } = useOrders();
  const [filter, setFilter] = useState(FILTERS[0]);
  const orders = data?.items ?? [];
  const visible = orders.filter(order => filter?.match(order));

  const open = (order: Order) => router.push({ pathname: '/orders/[id]', params: { id: String(order.id) } });
  const pay = (order: Order) => router.push({ pathname: '/checkout/result', params: { order: String(order.id), status: 'redirect' } });

  return (
    <Page refreshing={isRefetching} onRefresh={refetch}>
      <PageHeading title="My orders" aside={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`} />
      {isPending ? (
        <Loading />
      ) : orders.length === 0 ? (
        <EmptyState icon="receipt" title="No orders yet" message="When you buy a watch, you’ll be able to track it and see its warranty here." actions={<Button label="Shop all watches" size="lg" onPress={() => router.replace('/shop')} />} />
      ) : (
        <>
          <View style={styles.filters}>
            {FILTERS.map(option => (
              <Pill key={option.label} label={option.label} count={orders.filter(option.match).length} selected={filter === option} onPress={() => setFilter(option)} />
            ))}
          </View>
          {visible.length === 0 && (
            <View style={styles.none}>
              <Text variant="body" align="center">No orders in this view.</Text>
            </View>
          )}
          {visible.map((order, index) => {
            const eta = estimate(order);
            return (
              <Rise key={order.id} index={index} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.facts}>
                    <Fact label="Order" value={orderNumber(order.id)} accent />
                    <Fact label="Placed" value={formatDate(order.createdAt)} />
                    <Fact label="Total" value={formatMoney(order.total)} strong />
                  </View>
                  <StatusPill status={orderStatusStyles[order.status]} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.thumbs}>
                    {order.items.slice(0, 3).map(item => (
                      <Photo key={item.id} path={item.image} opacity={order.status === 'CANCELLED' ? 0.5 : 1} style={styles.thumb} />
                    ))}
                  </View>
                  <View style={styles.summary}>
                    <Text variant="baseMedium" style={styles.summaryTitle}>{summary(order)}</Text>
                    <Text variant="label" color={eta.color}>{eta.text}</Text>
                  </View>
                  <View style={styles.actions}>
                    {order.status === 'PENDING_PAYMENT' && order.paymentMethod === 'STRIPE' && <Button label="Pay now" onPress={() => pay(order)} />}
                    <Button label="View order" variant="outline" onPress={() => open(order)} />
                  </View>
                </View>
              </Rise>
            );
          })}
        </>
      )}
    </Page>
  );
}

const Fact = ({ label, value, accent, strong }: { label: string; value: string; accent?: boolean; strong?: boolean }) => (
  <View style={styles.fact}>
    <Text variant="label" color={colors.secondary} style={styles.factLabel}>{label}</Text>
    <Text variant={accent || strong ? 'strong' : 'base'} color={accent ? colors.primary : colors.ink} style={styles.factValue}>{value}</Text>
  </View>
);

export default function OrdersScreen() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  none: { padding: 40, backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, borderRadius: 2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 2 },
  cardHead: { gap: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  fact: { gap: 2 },
  factLabel: { fontSize: 13 },
  factValue: { fontSize: 13 },
  cardBody: { gap: 16, padding: 18 },
  thumbs: { flexDirection: 'row', gap: 8 },
  thumb: { width: 64, height: 64 },
  summary: { gap: 4 },
  summaryTitle: { fontSize: 15 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
