import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Rise } from '@/components/Motion';
import { Page, RequireAuth } from '@/components/Page';
import { useToast } from '@/components/Toast';
import { Button, EmptyState, FormError, Input, Loading, Text, TextButton } from '@/components/ui';
import { formatDateTime, orderNumber } from '@/lib/format';
import { useTicket, useTicketActions } from '@/lib/support';
import { colors, radius } from '@/theme';

function ThreadContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const ticketId = Number(id);
  const { data: ticket, isPending, isError, refetch, isRefetching } = useTicket(ticketId);
  const { reply } = useTicketActions();
  const [draft, setDraft] = useState('');
  const [reopened, setReopened] = useState(false);

  if (isPending) {
    return (
      <Page>
        <Loading />
      </Page>
    );
  }

  if (isError || !ticket) {
    return (
      <Page>
        <EmptyState icon="message" title="We couldn’t find that ticket" actions={<Button label="Support" size="lg" onPress={() => router.replace('/support')} />} />
      </Page>
    );
  }

  const closed = ticket.status === 'CLOSED';
  const resolved = ticket.status === 'RESOLVED' && !reopened;
  const canReply = !closed && !resolved;

  const send = () => {
    const message = draft.trim();
    if (!message) return;
    reply.mutate({ id: ticket.id, message }, { onSuccess: () => { setDraft(''); toast('success', 'Reply sent. We’ll be back within 4 working hours.'); } });
  };

  return (
    <Page refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.thread}>
        <View style={styles.head}>
          <Text variant="title" style={styles.subject}>{ticket.subject}</Text>
          <View style={styles.meta}>
            <Text variant="label" color={colors.secondary}>{`T-${ticket.id}`}</Text>
            {ticket.order && (
              <>
                <Text variant="label" color={colors.secondary}>·</Text>
                <TextButton label={orderNumber(ticket.order.id)} weight="sansSemibold" onPress={() => router.push({ pathname: '/orders/[id]', params: { id: String(ticket.order?.id) } })} style={styles.orderLink} />
              </>
            )}
          </View>
        </View>

        <View style={styles.messages}>
          {(ticket.messages ?? []).map(message => {
            const mine = message.author.role === 'CUSTOMER';
            return (
              <Rise key={message.id} style={[styles.message, { alignSelf: mine ? 'flex-end' : 'flex-start', alignItems: mine ? 'flex-end' : 'flex-start' }]}>
                <Text variant="small">{`${mine ? 'You' : `${message.author.name} · WatchHub support`} · ${formatDateTime(message.createdAt)}`}</Text>
                <View style={[styles.bubble, { backgroundColor: mine ? colors.primary : colors.surface, borderColor: mine ? colors.primary : colors.line }]}>
                  <Text variant="base" color={mine ? colors.onPrimary : colors.ink} style={styles.bubbleText}>{message.message}</Text>
                </View>
              </Rise>
            );
          })}
        </View>

        {canReply && (
          <View style={styles.reply}>
            <Input label="Reply" multiline placeholder="Write a reply" value={draft} onChangeText={setDraft} />
            <FormError message={reply.isError ? reply.error.message : null} />
            <View style={styles.replyActions}>
              <Button label="Send reply" loading={reply.isPending} disabled={!draft.trim()} onPress={send} />
            </View>
          </View>
        )}
        {resolved && (
          <View style={styles.banner}>
            <Text variant="base" color={colors.successInk}>This ticket is resolved.</Text>
            <Button label="Reopen" variant="outline" size="sm" onPress={() => setReopened(true)} />
          </View>
        )}
        {closed && (
          <View style={styles.banner}>
            <Text variant="base" color={colors.successInk}>This ticket is closed.</Text>
            <Button label="New ticket" variant="outline" size="sm" onPress={() => router.push('/support/new')} />
          </View>
        )}
      </View>
    </Page>
  );
}

export default function TicketScreen() {
  return (
    <RequireAuth>
      <ThreadContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  thread: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  head: { gap: 4, padding: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  subject: { fontSize: 22, lineHeight: 26 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderLink: { minHeight: 24 },
  messages: { gap: 14, padding: 20, minHeight: 260, backgroundColor: colors.page },
  message: { maxWidth: '86%', gap: 6 },
  bubble: { paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderRadius: radius.base },
  bubbleText: { lineHeight: 22 },
  reply: { gap: 10, paddingTop: 14, paddingHorizontal: 20, paddingBottom: 18, borderTopWidth: 1, borderTopColor: colors.line },
  replyActions: { alignItems: 'flex-end' },
  banner: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.successSurface },
});
