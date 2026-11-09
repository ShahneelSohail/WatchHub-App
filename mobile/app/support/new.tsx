import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Page, RequireAuth } from '@/components/Page';
import { useToast } from '@/components/Toast';
import { Button, FormError, Input, Pill, Text } from '@/components/ui';
import { orderNumber } from '@/lib/format';
import { useOrders } from '@/lib/orders';
import { useTicketActions } from '@/lib/support';
import { colors, radius } from '@/theme';

const MIN_SUBJECT = 4;
const MIN_MESSAGE = 10;

function NewTicketContent() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ order?: string }>();
  const { data: orders } = useOrders();
  const { create } = useTicketActions();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState<number | null>(Number(params.order) || null);
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({});

  const submit = () => {
    const found = {
      subject: subject.trim().length >= MIN_SUBJECT ? undefined : 'Add a short subject',
      message: message.trim().length >= MIN_MESSAGE ? undefined : `Tell us a bit more, at least ${MIN_MESSAGE} characters`,
    };
    setErrors(found);
    if (found.subject || found.message) return;
    create.mutate(
      { subject: subject.trim(), message: message.trim(), orderId },
      {
        onSuccess: ticket => {
          toast('success', `T-${ticket.id} sent to support`);
          router.replace({ pathname: '/support/[id]', params: { id: String(ticket.id) } });
        },
      }
    );
  };

  return (
    <Page>
      <View style={styles.form}>
        <Text variant="title" style={styles.title}>New ticket</Text>
        <Input label="Subject" placeholder="e.g. Strap doesn’t fit" value={subject} error={errors.subject} onChangeText={value => { setSubject(value); setErrors(found => ({ ...found, subject: undefined })); }} />
        <View style={styles.orders}>
          <Text variant="label">Related order</Text>
          <View style={styles.pills}>
            <Pill label="Not about an order" selected={orderId === null} onPress={() => setOrderId(null)} />
            {orders?.items.map(order => (
              <Pill key={order.id} label={`${orderNumber(order.id)} · ${order.items[0]?.name ?? ''}`} selected={orderId === order.id} onPress={() => setOrderId(order.id)} />
            ))}
          </View>
        </View>
        <Input label="Message" multiline placeholder="Tell us what happened. Photos help with damage claims." value={message} error={errors.message} onChangeText={value => { setMessage(value); setErrors(found => ({ ...found, message: undefined })); }} />
        <FormError message={create.isError ? create.error.message : null} />
        <View style={styles.actions}>
          <Button label="Cancel" variant="neutral" onPress={() => router.back()} />
          <Button label="Send to support" loading={create.isPending} onPress={submit} />
        </View>
      </View>
    </Page>
  );
}

export default function NewTicketScreen() {
  return (
    <RequireAuth>
      <NewTicketContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, padding: 22, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.base },
  title: { fontSize: 22 },
  orders: { gap: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
