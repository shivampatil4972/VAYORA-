import { useQuery } from '@tanstack/react-query';

import { RatingSummary } from '../components/rating';
import { Card, Page, QueryState } from '../components/ui';
import { api } from '../lib/api';
import { formatPercent } from '../lib/format';
import { useT, useUnits } from '../lib/i18n';
import { levelLabels } from '../lib/levels';
import type { Reliability } from '../lib/types';

/** A driver's own record: what passengers and the platform see of them, and more. */
export function ReliabilityPage() {
  const t = useT();
  const units = useUnits();
  const record = useQuery({ queryKey: ['me', 'reliability'], queryFn: () => api<Reliability>('/me/reliability') });
  const data = record.data;
  const rows: [string, string][] = data
    ? [
        [t('Level'), levelLabels[data.level] ? t(levelLabels[data.level]) : data.level],
        [t('Rides completed'), String(data.ridesCompleted)],
        [t('Rides you withdrew'), String(data.ridesWithdrawn)],
        [t('Passengers carried'), String(data.passengersCarried)],
        [t('Passengers whose booking you cancelled'), String(data.passengersCancelled)],
        [t('Passengers you marked as not boarding'), String(data.noShowsMarked)],
        [
          t('Answers requests'),
          data.responseRate == null
            ? t('Not enough requests yet')
            : data.responseMinutes == null
              ? formatPercent(data.responseRate)
              : t('{rate}, usually within {time}', { rate: formatPercent(data.responseRate), time: units.duration(data.responseMinutes) }),
        ],
      ]
    : [];
  return (
    <Page title={t('My record')}>
      <p className="text-sm text-slate-600">
        {t('Only you see this page. Passengers see your level, rating, completed trips and how you answer requests.')}
      </p>
      <QueryState isPending={record.isPending} error={record.error} isEmpty={false} empty="" onRetry={() => void record.refetch()} />
      {data && (
        <Card>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="mt-1 font-medium">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-slate-500">{t('Rating')}</dt>
              <dd className="mt-1 font-medium">
                <RatingSummary average={data.averageStars} count={data.ratingCount} />
              </dd>
            </div>
          </dl>
        </Card>
      )}
    </Page>
  );
}
