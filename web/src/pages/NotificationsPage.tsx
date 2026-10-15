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
