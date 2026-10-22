import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Notice, Page, QueryState } from '../components/ui';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useT } from '../lib/i18n';
import { translatedNotification } from '../lib/notificationText';
import type { AppNotification } from '../lib/types';

export function NotificationsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => api<AppNotification[]>('/notifications') });
  const markRead = useMutation({
    mutationFn: (id: string | null) =>
      api<void>(id === null ? '/notifications/read-all' : `/notifications/${id}/read`, { method: 'POST' }),
    // Shown as read at once, the badge in the navigation too; put back if the server refuses.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const list = queryClient.getQueryData<AppNotification[]>(['notifications']);
      const unread = queryClient.getQueryData<{ unread: number }>(['notifications', 'unread-count']);
      const marked = list?.filter((notification) => !notification.read && (id === null || notification.id === id)).length ?? 0;
      if (list) {
        queryClient.setQueryData<AppNotification[]>(['notifications'], list.map((notification) =>
          id === null || notification.id === id ? { ...notification, read: true } : notification));
      }
      if (unread) queryClient.setQueryData(['notifications', 'unread-count'], { unread: Math.max(0, unread.unread - marked) });
      return { list, unread };
    },
    onError: (_error, _id, before) => {
      if (before?.list) queryClient.setQueryData(['notifications'], before.list);
      if (before?.unread) queryClient.setQueryData(['notifications', 'unread-count'], before.unread);
    },
    // Covers the list and the unread count in the navigation.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const anyUnread = notifications.data?.some((notification) => !notification.read) ?? false;

  return (
    <Page title={t('Notifications')}>
      {markRead.error && <Notice tone="error">{markRead.error.message}</Notice>}
      {anyUnread && (
        <Button tone="secondary" disabled={markRead.isPending} onClick={() => markRead.mutate(null)}>
          {t('Mark all as read')}
        </Button>
      )}
      <QueryState
        isPending={notifications.isPending}
        error={notifications.error}
        isEmpty={notifications.data?.length === 0}
        empty={t('You have no notifications.')}
        onRetry={() => void notifications.refetch()}
      />
      <ul className="space-y-3">
        {notifications.data?.map((notification) => {
          const translated = translatedNotification(t, notification.text);
          return (
          <li key={notification.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {/* Older notifications have only the server's English, and say so to a screen reader. */}
                  <p
                    className={notification.read ? 'text-slate-700' : 'font-semibold text-slate-900'}
                    lang={translated === null ? 'en' : undefined}
                  >
                    {!notification.read && <span className="sr-only">{t('Unread:')} </span>}
                    {translated ?? notification.message}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{formatDateTime(notification.createdAt)}</p>
                </div>
                {!notification.read && (
                  <Button tone="secondary" disabled={markRead.isPending} onClick={() => markRead.mutate(notification.id)}>
                    {t('Mark as read')}
                  </Button>
                )}
              </div>
            </Card>
          </li>
          );
        })}
      </ul>
    </Page>
  );
}
