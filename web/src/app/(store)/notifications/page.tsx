'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { RequireAuth } from '@/components/RequireAuth';
import { Chip, EmptyState, PageHeading, Pagination, Spinner, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { Notification } from '@/lib/types';

const ICON_RULES: { test: RegExp; icon: IconName }[] = [
  { test: /ship|deliver|track/i, icon: 'truck' },
  { test: /support|ticket|repl/i, icon: 'message' },
  { test: /price|sale|discount/i, icon: 'tag' },
  { test: /payment|pay|wait/i, icon: 'clock' },
  { test: /stock/i, icon: 'box' },
];

const iconFor = (item: Notification): IconName => ICON_RULES.find(rule => rule.test.test(`${item.title} ${item.body} ${item.link ?? ''}`))?.icon ?? 'check';

const isToday = (value: string) => new Date(value).toDateString() === new Date().toDateString();

const NotificationList = () => {
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications', page], queryFn: () => api.page<Notification>(`/notifications?page=${page}&pageSize=15`) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: (id: number) => api.post(`/notifications/${id}/read`), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refresh });

  if (notifications.isPending) return <Spinner />;
  const { items, meta } = notifications.data!;
  const unread = meta.unread ?? 0;
  const visible = unreadOnly ? items.filter(item => !item.readAt) : items;
  const groups = [
    { label: 'Today', items: visible.filter(item => isToday(item.createdAt)) },
    { label: 'Earlier', items: visible.filter(item => !isToday(item.createdAt)) },
  ].filter(group => group.items.length);

  const open = (item: Notification) => {
    if (!item.readAt) markRead.mutate(item.id);
    if (item.link) router.push(item.link);
  };

  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          <Chip label="All" count={meta.total} selected={!unreadOnly} onClick={() => setUnreadOnly(false)} />
          <Chip label="Unread" count={unread} selected={unreadOnly} onClick={() => setUnreadOnly(true)} />
        </div>
        <button disabled={!unread} onClick={() => markAll.mutate()} className="min-h-9 text-sm font-medium text-primary disabled:opacity-40">
          Mark all as read
        </button>
      </div>
      {groups.map(group => (
        <section key={group.label} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.12em] text-ink-secondary uppercase">{group.label}</h2>
          <ul className="divide-y divide-line rounded-card border border-line bg-surface">
            {group.items.map(item => (
              <li key={item.id}>
                <button onClick={() => open(item)} className={cx('grid w-full grid-cols-[40px_minmax(0,1fr)_10px] items-start gap-3.5 px-[18px] py-4 text-left transition-colors hover:bg-page', !item.readAt && 'bg-primary-tint/40')}>
                  <span className={cx('grid h-10 w-10 place-items-center rounded-full text-primary', item.readAt ? 'bg-page' : 'bg-primary-tint')}>
                    <Icon name={iconFor(item)} size={18} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={cx('text-[15px]', item.readAt ? 'font-normal' : 'font-semibold')}>{item.title}</span>
                    <span className="text-sm leading-normal text-ink-secondary">{item.body}</span>
                    <span className="text-xs text-ink-muted">{formatDateTime(item.createdAt)}</span>
                  </span>
                  <span className={cx('mt-1.5 h-[9px] w-[9px] rounded-full', item.readAt ? 'bg-transparent' : 'bg-primary')} aria-label={item.readAt ? undefined : 'Unread'} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <EmptyState icon="check" title="You’re all caught up" description="New updates about orders, support and your wishlist will appear here." />}
      <Pagination meta={meta} onChange={setPage} />
    </div>
  );
};

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <PageHeading title="Notifications" />
      <NotificationList />
    </RequireAuth>
  );
}
