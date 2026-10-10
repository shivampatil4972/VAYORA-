import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Notice, Page, QueryState } from '../components/ui';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { AppNotification } from '../lib/types';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => api<AppNotification[]>('/notifications') });
  const markRead = useMutation({
    mutationFn: (id: string | null) =>
      api<void>(id === null ? '/notifications/read-all' : `/notifications/${id}/read`, { method: 'POST' }),
    // Covers the list and the unread count in the navigation.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const anyUnread = notifications.data?.some((notification) => !notification.read) ?? false;

  return (
    <Page title="Notifications">
      {markRead.error && <Notice tone="error">{markRead.error.message}</Notice>}
      {anyUnread && (
        <Button tone="secondary" disabled={markRead.isPending} onClick={() => markRead.mutate(null)}>
          Mark all as read
        </Button>
      )}
      <QueryState
        isPending={notifications.isPending}
        error={notifications.error}
        isEmpty={notifications.data?.length === 0}
        empty="You have no notifications."
        onRetry={() => void notifications.refetch()}
      />
      <ul className="space-y-3">
        {notifications.data?.map((notification) => (
          <li key={notification.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={notification.read ? 'text-slate-700' : 'font-semibold text-slate-900'}>
                    {!notification.read && <span className="sr-only">Unread: </span>}
                    {notification.message}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{formatDateTime(notification.createdAt)}</p>
                </div>
                {!notification.read && (
                  <Button tone="secondary" disabled={markRead.isPending} onClick={() => markRead.mutate(notification.id)}>
                    Mark as read
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
}
