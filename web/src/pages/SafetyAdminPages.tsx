import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { Button, Card, Notice, Page, QueryState } from '../components/ui';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useT } from '../lib/i18n';
import type { MockMessage, SosAlert } from '../lib/types';

/** Messages the mock sender was asked to send. They include one-time codes, so only administrators see them. */
function MockOutbox() {
  const t = useT();
  const outbox = useQuery({ queryKey: ['admin', 'mock-outbox'], queryFn: () => api<MockMessage[]>('/admin/mock-outbox') });
  return (
    <section aria-label={t('Simulated outbox')} className="space-y-3">
      <h2 className="text-lg font-semibold">{t('Simulated outbox')}</h2>
      <p className="text-sm text-slate-600">
        {t('None of these was sent to anyone. The newest 50 are kept in memory and are lost when the server restarts.')}
      </p>
      <QueryState
        isPending={outbox.isPending}
        error={outbox.error}
        isEmpty={outbox.data?.length === 0}
        empty={t('Nothing has been handed to the simulated sender.')}
        onRetry={() => void outbox.refetch()}
      />
      {outbox.data && outbox.data.length > 0 && (
        <Card>
          <ul className="divide-y divide-slate-100 text-sm">
            {outbox.data.map((message, index) => (
              <li key={index} className="py-2">
                <p className="text-slate-600">
                  {formatDateTime(message.at)} · {message.channel === 'EMAIL' ? t('Email') : t('Phone')} · {message.to}
                </p>
                {/* As the server wrote it: message text is not translated. */}
                <p className="mt-1">{message.text}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

export function EmergenciesPage() {
  const t = useT();
  const queryClient = useQueryClient();
  // An alert should not wait for someone to reload the page.
  const alerts = useQuery({ queryKey: ['admin', 'sos'], queryFn: () => api<SosAlert[]>('/admin/sos'), refetchInterval: 15_000 });
  const acknowledge = useMutation({
    mutationFn: (id: number) => api<void>(`/admin/sos/${id}/acknowledge`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'sos'] }),
  });

  return (
    <Page title={t('Emergencies')}>
      <p className="text-sm text-slate-600">
        {t('Members who pressed the emergency button, oldest first. Acknowledging one records that you have seen it and are acting on it.')}
      </p>
      {acknowledge.error && <Notice tone="error">{acknowledge.error.message}</Notice>}
      <QueryState
        isPending={alerts.isPending}
        error={alerts.error}
        isEmpty={alerts.data?.length === 0}
        empty={t('No emergency is waiting.')}
        onRetry={() => void alerts.refetch()}
      />
      {alerts.data?.map((alert) => (
        <Card key={alert.id}>
          <div className="space-y-2 text-sm">
            <p className="font-medium">
              <Link to={`/users/${alert.userId}`} className="text-teal-800 underline underline-offset-2">
                {alert.userName}
              </Link>{' '}
              · {formatDateTime(alert.createdAt)}
            </p>
            <p>{alert.userPhone ? t('Phone: {phone}', { phone: alert.userPhone }) : t('No phone number on the account.')}</p>
            <p>
              {alert.lat !== null && alert.lon !== null
                ? t('Position given: {lat}, {lon}', { lat: alert.lat.toFixed(5), lon: alert.lon.toFixed(5) })
                : t('No position was given.')}
            </p>
            {alert.rideId !== null && <p>{t('On ride {id}', { id: alert.rideId })}</p>}
            <p className={alert.sender === 'MOCK' ? 'font-semibold text-red-800' : ''}>
              {alert.sender === 'MOCK'
                ? t('{n} emergency contacts on file. They were NOT messaged: the sender is simulated.', { n: alert.contactsTold })
                : t('A message was sent to {n} emergency contacts.', { n: alert.contactsTold })}
            </p>
            {alert.sender !== 'MOCK' && (alert.contactsMissed ?? 0) > 0 && (
              <p className="font-semibold text-red-800">
                {t('{n} emergency contacts could not be messaged.', { n: alert.contactsMissed ?? 0 })}
              </p>
            )}
            <Button disabled={acknowledge.isPending} onClick={() => acknowledge.mutate(alert.id)}>
              {t('Acknowledge')}
            </Button>
          </div>
        </Card>
      ))}
      <MockOutbox />
    </Page>
  );
}
