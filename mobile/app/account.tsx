import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { AddressForm } from '@/components/AddressForm';
import { Icon, type IconName } from '@/components/Icon';
import { Rise } from '@/components/Motion';
import { Page, RequireAuth } from '@/components/Page';
import { useToast } from '@/components/Toast';
import { Alert, Button, Card, CountBadge, FormError, Input, Loading, Text, TextButton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAddressActions, useAddresses } from '@/lib/checkout';
import { formatDate, initials } from '@/lib/format';
import { useUnreadCount } from '@/lib/notifications';
import { useOrders } from '@/lib/orders';
import type { Address, User } from '@/lib/types';
import { colors, fonts, radius } from '@/theme';

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'password', label: 'Password' },
  { key: 'addresses', label: 'Addresses' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const EMAIL_PATTERN = /^\S+@\S+\.\S{2,}$/;
const MIN_PASSWORD = 8;

const SHORTCUTS: { label: string; icon: IconName; href: Href }[] = [
  { label: 'My orders', icon: 'receipt', href: '/orders' },
  { label: 'Notifications', icon: 'bell', href: '/notifications' },
  { label: 'Support', icon: 'message', href: '/support' },
  { label: 'Help centre', icon: 'alert', href: '/faq' },
];

const ProfileTab = ({ user }: { user: User }) => {
  const { setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [dirty, setDirty] = useState(false);
  const save = useMutation({
    mutationFn: () => api.patch<User>('/auth/me', { name: name.trim(), email: email.trim(), phone: phone.trim() || null }),
    onSuccess: updated => {
      setUser(updated);
      setDirty(false);
      toast('success', 'Profile saved');
    },
  });

  const edit = (apply: () => void) => {
    apply();
    setDirty(true);
    save.reset();
  };

  const submit = () => {
    const found = { name: name.trim() ? undefined : 'Enter your name', email: EMAIL_PATTERN.test(email) ? undefined : 'Enter a valid email address' };
    setErrors(found);
    if (!found.name && !found.email) save.mutate();
  };

  return (
    <Rise style={styles.panel}>
      <Input label="Full name" autoComplete="name" value={name} error={errors.name} onChangeText={value => edit(() => setName(value))} />
      <Input label="Email" autoComplete="email" keyboardType="email-address" autoCapitalize="none" value={email} error={errors.email} onChangeText={value => edit(() => setEmail(value))} />
      <Input label="Phone" autoComplete="tel" keyboardType="phone-pad" value={phone} onChangeText={value => edit(() => setPhone(value))} />
      <FormError message={save.isError ? save.error.message : null} />
      <View style={styles.saveRow}>
        <Text variant="label" color={dirty ? colors.warningInk : colors.successInk}>{dirty ? 'Unsaved changes' : save.isSuccess ? 'Your details are up to date' : ''}</Text>
        <Button label={save.isPending ? 'Saving' : save.isSuccess && !dirty ? 'Saved' : 'Save changes'} loading={save.isPending} onPress={submit} style={save.isSuccess && !dirty ? styles.saved : undefined} />
      </View>
    </Rise>
  );
};

const PASSWORD_RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: `${MIN_PASSWORD}+ characters`, test: value => value.length >= MIN_PASSWORD },
  { label: 'A number', test: value => /\d/.test(value) },
  { label: 'A capital letter', test: value => /[A-Z]/.test(value) },
];

const STRENGTH_COLORS = [colors.danger, colors.danger, colors.warning, colors.primaryHover, colors.success];

const PasswordTab = () => {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const change = useMutation({
    mutationFn: () => api.post('/auth/change-password', { currentPassword: current, newPassword: next }),
    onSuccess: () => {
      setCurrent('');
      setNext('');
      setConfirm('');
    },
  });

  const passed = PASSWORD_RULES.filter(rule => rule.test(next)).length;
  const score = passed + (next.length >= 12 ? 1 : 0);

  const submit = () => {
    change.reset();
    const found = {
      current: current ? undefined : 'Enter your current password',
      next: passed === PASSWORD_RULES.length ? undefined : 'Use 8+ characters with a number and a capital letter',
      confirm: confirm && confirm === next ? undefined : 'Passwords don’t match',
    };
    setErrors(found);
    if (!found.current && !found.next && !found.confirm) change.mutate();
  };

  const field = (label: string, value: string, set: (value: string) => void, key: keyof typeof errors, complete: 'current-password' | 'new-password') => (
    <Input
      label={label}
      secureTextEntry
      autoComplete={complete}
      value={value}
      error={errors[key]}
      onChangeText={text => {
        set(text);
        setErrors(found => ({ ...found, [key]: undefined }));
        change.reset();
      }}
    />
  );

  return (
    <Rise style={styles.panel}>
      {change.isSuccess && <Alert tone="success" icon="check">Password updated.</Alert>}
      {field('Current password', current, setCurrent, 'current', 'current-password')}
      {field('New password', next, setNext, 'next', 'new-password')}
      {field('Confirm new password', confirm, setConfirm, 'confirm', 'new-password')}
      <View style={styles.strength}>
        <View style={styles.bars}>
          {[0, 1, 2, 3].map(index => (
            <View key={index} style={[styles.bar, { backgroundColor: next && index < Math.max(score, 1) ? STRENGTH_COLORS[score] : colors.line }]} />
          ))}
        </View>
        <View style={styles.rules}>
          {PASSWORD_RULES.map(rule => {
            const ok = rule.test(next);
            return (
              <View key={rule.label} style={styles.rule}>
                <Icon name={ok ? 'check' : 'minus'} size={12} color={ok ? colors.successInk : colors.secondary} strokeWidth={3} />
                <Text variant="small" color={ok ? colors.successInk : colors.secondary}>{rule.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <FormError message={change.isError ? change.error.message : null} />
      <Button label="Update password" loading={change.isPending} onPress={submit} style={styles.start} />
      <TextButton label="Forgot your current password?" onPress={() => router.push('/forgot-password')} style={styles.start} />
    </Rise>
  );
};

const AddressesTab = () => {
  const toast = useToast();
  const { data, isPending } = useAddresses();
  const addresses = data ?? [];
  const { update, remove } = useAddressActions();
  const [editing, setEditing] = useState<Address | 'new' | null>(null);

  if (isPending) return <Loading />;

  return (
    <Rise style={styles.addresses}>
      {addresses.map(address => (
        <View key={address.id} style={[styles.address, { borderColor: editing !== 'new' && editing?.id === address.id ? colors.primary : colors.line }]}>
          <View style={styles.addressHead}>
            <Text variant="strong" style={styles.addressName}>{address.recipient}</Text>
            {address.isDefault && (
              <View style={styles.defaultPill}>
                <RNText style={styles.defaultLabel}>Default</RNText>
              </View>
            )}
          </View>
          <Text variant="base" style={styles.addressText}>{`${address.addressLine}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`}</Text>
          {address.phone ? <Text variant="label" color={colors.secondary}>{address.phone}</Text> : null}
          <View style={styles.addressActions}>
            <TextButton label="Edit" weight="sansSemibold" onPress={() => setEditing(address)} />
            {!address.isDefault && (
              <>
                <TextButton label="Make default" onPress={() => update.mutate({ id: address.id, input: { ...address, isDefault: true } }, { onSuccess: () => toast('success', 'Default address updated') })} />
                <TextButton label="Delete" color={colors.dangerInk} onPress={() => remove.mutate(address.id, { onSuccess: () => toast('success', 'Address deleted') })} />
              </>
            )}
          </View>
        </View>
      ))}
      {editing === null && (
        <Pressable accessibilityRole="button" onPress={() => setEditing('new')} style={styles.addAddress}>
          <RNText style={styles.addPlus}>+</RNText>
          <Text variant="strong" color={colors.primary}>Add an address</Text>
        </Pressable>
      )}
      {editing !== null && (
        <AddressForm
          key={editing === 'new' ? 'new' : editing.id}
          address={editing === 'new' ? undefined : editing}
          title={editing === 'new' ? 'New address' : 'Edit address'}
          submitLabel="Save address"
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast('success', 'Address saved');
          }}
        />
      )}
    </Rise>
  );
};

function AccountContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const orders = useOrders();
  const unread = useUnreadCount();
  const [tab, setTab] = useState<TabKey>(TABS.find(entry => entry.key === params.tab)?.key ?? 'profile');

  if (!user) return null;

  return (
    <Page>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <RNText style={styles.avatarLabel}>{initials(user.name)}</RNText>
        </View>
        <View style={styles.identity}>
          <Text variant="h1" style={styles.name}>{user.name}</Text>
          <Text variant="small" style={styles.since}>{`Member since ${formatDate(user.createdAt)}${orders.data ? ` · ${orders.data.items.length} ${orders.data.items.length === 1 ? 'order' : 'orders'}` : ''}`}</Text>
        </View>
        <Button label="Sign out" variant="neutral" size="sm" onPress={() => logout().then(() => router.replace('/login'))} />
      </View>

      <Card>
        {SHORTCUTS.map(({ label, icon, href }) => (
          <Pressable key={label} accessibilityRole="link" onPress={() => router.push(href)} style={styles.shortcut}>
            <Icon name={icon} size={18} color={colors.primary} strokeWidth={1.7} />
            <Text variant="base" style={styles.shortcutLabel}>{label}</Text>
            {label === 'Notifications' && unread > 0 && <CountBadge count={unread} color={colors.danger} style={styles.unread} />}
            <Icon name="forward" size={16} color={colors.secondary} strokeWidth={1.6} />
          </Pressable>
        ))}
      </Card>

      <View accessibilityRole="tablist" style={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} style={[styles.tab, { borderBottomColor: tab === key ? colors.primary : 'transparent' }]}>
            <RNText style={[styles.tabLabel, { color: tab === key ? colors.primary : colors.secondary, fontFamily: tab === key ? fonts.sansSemibold : fonts.sansMedium }]}>{label}</RNText>
          </Pressable>
        ))}
      </View>

      {tab === 'profile' && <ProfileTab user={user} />}
      {tab === 'password' && <PasswordTab />}
      {tab === 'addresses' && <AddressesTab />}
    </Page>
  );
}

export default function AccountScreen() {
  return (
    <RequireAuth>
      <AccountContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  avatar: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 30, backgroundColor: colors.primary },
  avatarLabel: { fontFamily: fonts.sansBold, fontSize: 20, color: colors.onPrimary },
  identity: { flex: 1, minWidth: 160, gap: 4 },
  name: { fontSize: 30 },
  since: { fontSize: 14 },
  shortcut: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  shortcutLabel: { flex: 1, color: colors.ink },
  unread: { position: 'relative', top: 0, right: 0 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { height: 48, paddingHorizontal: 18, justifyContent: 'center', borderBottomWidth: 2, marginBottom: -1 },
  tabLabel: { fontSize: 14 },
  panel: { gap: 16, padding: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.base },
  saveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' },
  saved: { backgroundColor: colors.success, borderColor: colors.success },
  start: { alignSelf: 'flex-start' },
  strength: { gap: 8 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addresses: { gap: 14 },
  address: { gap: 10, padding: 18, backgroundColor: colors.surface, borderWidth: 1.5, borderRadius: radius.base },
  addressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addressName: { fontSize: 15 },
  defaultPill: { height: 22, paddingHorizontal: 8, justifyContent: 'center', backgroundColor: colors.tint, borderRadius: radius.round },
  defaultLabel: { fontFamily: fonts.sansSemibold, fontSize: 11, color: colors.primary },
  addressText: { lineHeight: 22, color: colors.ink },
  addressActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.line },
  addAddress: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.page, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.muted, borderRadius: radius.base },
  addPlus: { fontFamily: fonts.sans, fontSize: 22, lineHeight: 22, color: colors.primary },
});
