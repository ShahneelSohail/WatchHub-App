import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Page, RequireAuth } from '@/components/Page';
import { Button, EmptyState, Loading, StatusPill, Text } from '@/components/ui';
import { formatRelative, orderNumber } from '@/lib/format';
import { useTickets } from '@/lib/support';
import { colors, ticketStatusStyles } from '@/theme';

function SupportContent() {
  const router = useRouter();
  const { data, isPending, refetch, isRefetching } = useTickets();
  const tickets = data ?? [];

  return (
    <Page refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.head}>
        <View style={styles.titles}>
          <Text variant="h1" style={styles.title}>Support</Text>
          <Text variant="body" style={styles.sub}>We reply within 4 working hours, Monday to Saturday.</Text>
        </View>
        <Button label="+ New ticket" onPress={() => router.push('/support/new')} />
      </View>

      {isPending ? (
        <Loading />
      ) : tickets.length === 0 ? (
        <EmptyState icon="message" title="No tickets yet" message="Questions about an order or a watch? Open a ticket and we’ll reply within 4 working hours." actions={<Button label="New ticket" size="lg" onPress={() => router.push('/support/new')} />} />
      ) : (
        <View style={styles.list}>
          {tickets.map(ticket => (
            <Pressable key={ticket.id} accessibilityRole="link" onPress={() => router.push({ pathname: '/support/[id]', params: { id: String(ticket.id) } })} style={styles.row}>
              <View style={styles.rowHead}>
                <Text variant="strong" style={styles.subject}>{ticket.subject}</Text>
                <Text variant="small">{formatRelative(ticket.updatedAt)}</Text>
              </View>
              <View style={styles.rowMeta}>
                <Text variant="small">{`T-${ticket.id}`}</Text>
                {ticket.order && <Text variant="small">{orderNumber(ticket.order.id)}</Text>}
                <StatusPill status={ticketStatusStyles[ticket.status]} size="sm" />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Page>
  );
}

export default function SupportScreen() {
  return (
    <RequireAuth>
      <SupportContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  head: { gap: 14 },
  titles: { gap: 6 },
  title: { fontSize: 30 },
  sub: { fontSize: 14 },
  list: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 2 },
  row: { gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  subject: { flex: 1, fontSize: 15 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
