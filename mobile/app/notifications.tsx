import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Page, PageHeading, RequireAuth } from '@/components/Page';
import { Loading, Pill, Text, TextButton } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { routeForLink } from '@/lib/links';
import { useMarkRead, useNotifications } from '@/lib/notifications';
import type { Notification } from '@/lib/types';
import { colors, fonts } from '@/theme';

const iconFor = (link: string | null): IconName => {
  if (link?.startsWith('/orders')) return 'receipt';
  if (link?.startsWith('/support')) return 'message';
  if (link?.startsWith('/watch')) return 'tag';
  return 'bell';
};

const isToday = (value: string) => new Date(value).toDateString() === new Date().toDateString();

const TABS = ['All', 'Unread'] as const;

function NotificationsContent() {
  const router = useRouter();
  const { data, isPending, refetch, isRefetching } = useNotifications();
  const { one, all } = useMarkRead();
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');
  const items = data?.items ?? [];
  const unread = data?.meta.unread ?? 0;
  const shown = tab === 'All' ? items : items.filter(item => !item.readAt);
  const groups = [
    { label: 'Today', items: shown.filter(item => isToday(item.createdAt)) },
    { label: 'Earlier', items: shown.filter(item => !isToday(item.createdAt)) },
  ].filter(group => group.items.length > 0);

  const open = (item: Notification) => {
    if (!item.readAt) one.mutate(item.id);
    const href = routeForLink(item.link);
    if (href) router.push(href);
  };

  return (
    <Page refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.head}>
        <PageHeading title="Notifications" />
        <TextButton label="Mark all as read" onPress={() => unread && all.mutate()} size={14} style={[styles.markAll, { opacity: unread ? 1 : 0.4 }]} />
      </View>
      <View style={styles.tabs}>
        {TABS.map(label => (
          <Pill key={label} label={label} count={label === 'All' ? items.length : unread} selected={tab === label} onPress={() => setTab(label)} />
        ))}
      </View>
      {isPending ? (
        <Loading />
      ) : groups.length === 0 ? (
        <View style={styles.caughtUp}>
          <View style={styles.caughtUpIcon}>
            <Icon name="check" size={28} color={colors.success} strokeWidth={2} />
          </View>
          <Text variant="title">You’re all caught up</Text>
          <Text variant="body" align="center">New updates about orders, support and your wishlist will appear here.</Text>
        </View>
      ) : (
        groups.map(group => (
          <View key={group.label} style={styles.group}>
            <Text variant="eyebrow" style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.list}>
              {group.items.map(item => (
                <Pressable key={item.id} accessibilityRole="button" onPress={() => open(item)} style={[styles.row, { backgroundColor: item.readAt ? colors.surface : '#F8F9FD' }]}>
                  <View style={[styles.icon, { backgroundColor: item.readAt ? colors.page : colors.tint }]}>
                    <Icon name={iconFor(item.link)} size={18} color={colors.primary} strokeWidth={1.7} />
                  </View>
                  <View style={styles.text}>
                    <Text variant="body" color={colors.ink} style={[styles.title, !item.readAt && styles.titleUnread]}>{item.title}</Text>
                    <Text variant="base" color={colors.secondary} style={styles.body}>{item.body}</Text>
                    <Text variant="small" color={colors.muted}>{formatRelative(item.createdAt)}</Text>
                  </View>
                  <View style={[styles.dot, { backgroundColor: item.readAt ? 'transparent' : colors.primary }]} />
                </Pressable>
              ))}
            </View>
          </View>
        ))
      )}
    </Page>
  );
}

export default function NotificationsScreen() {
  return (
    <RequireAuth>
      <NotificationsContent />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  head: { gap: 4 },
  markAll: { alignSelf: 'flex-start' },
  tabs: { flexDirection: 'row', gap: 6 },
  caughtUp: { alignItems: 'center', gap: 10, paddingVertical: 56, paddingHorizontal: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 2 },
  caughtUpIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, backgroundColor: colors.successSurface },
  group: { gap: 8 },
  groupLabel: { fontSize: 12, letterSpacing: 1.44 },
  list: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 16, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  text: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontFamily: fonts.sans },
  titleUnread: { fontFamily: fonts.sansSemibold },
  body: { lineHeight: 21 },
  dot: { width: 9, height: 9, marginTop: 6, borderRadius: 5 },
});
