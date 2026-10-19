'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { RequireAuth } from '@/components/RequireAuth';
import { Button, Card, EmptyState, PageHeading, Pagination, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { Notification } from '@/lib/types';

const NotificationList = () => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications', page], queryFn: () => api.page<Notification>(`/notifications?page=${page}&pageSize=15`) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: (id: number) => api.post(`/notifications/${id}/read`), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refresh });

  if (notifications.isPending) return <Spinner />;
  if (notifications.data?.items.length === 0) return <EmptyState title="You're all caught up" description="Order updates and support replies will appear here." />;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="secondary" onClick={() => markAll.mutate()} disabled={!notifications.data?.meta.unread}>
          Mark all as read
        </Button>
      </div>
      <ul className="space-y-3">
        {notifications.data?.items.map(item => (
          <li key={item.id}>
            <Card className={`flex items-start justify-between gap-4 ${item.readAt ? '' : 'border-navy/40 bg-navy/5'}`}>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted">{item.body}</p>
                <p className="mt-1 text-xs text-faint">{formatDateTime(item.createdAt)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {item.link && (
                  <Link href={item.link} onClick={() => !item.readAt && markRead.mutate(item.id)} className="text-sm font-medium text-navy hover:underline">
                    View
                  </Link>
                )}
                {!item.readAt && (
                  <Button variant="ghost" className="px-2 py-0" onClick={() => markRead.mutate(item.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {notifications.data && <Pagination meta={notifications.data.meta} onChange={setPage} />}
    </>
  );
};

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <PageHeading eyebrow="Your account" title="Notifications" />
      <NotificationList />
    </RequireAuth>
  );
}
