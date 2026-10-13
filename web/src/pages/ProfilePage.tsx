import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { RatingSummary } from '../components/rating';
import { ReportMember } from '../components/report';
import { Card, Page, QueryState } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatMonthYear } from '../lib/format';
import { useT } from '../lib/i18n';
import type { Profile } from '../lib/types';

export function ProfilePage() {
  const t = useT();
  const { id } = useParams();
  const { user } = useAuth();
  const profile = useQuery({ queryKey: ['profile', id], queryFn: () => api<Profile>(`/users/${id}/profile`) });
  const member = profile.data;

  return (
    <Page title={member?.fullName ?? t('Member')}>
      <QueryState isPending={profile.isPending} error={profile.error} isEmpty={false} empty="" onRetry={() => void profile.refetch()} />
      {member && (
        <>
          <Card>
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">{member.role === 'DRIVER' ? t('Driver since') : t('Passenger since')}</dt>
                <dd className="mt-1 font-medium">{formatMonthYear(member.memberSince)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('Completed trips')}</dt>
                <dd className="mt-1 font-medium">{member.completedTrips}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('Rating')}</dt>
                <dd className="mt-1 font-medium">
                  <RatingSummary average={member.averageStars} count={member.ratingCount} />
                </dd>
              </div>
            </dl>
          </Card>
          <section aria-label={t('Reviews')} className="space-y-3">
            <h2 className="text-lg font-semibold">{t('Reviews')}</h2>
            {member.reviews.length === 0 && <p className="text-sm text-slate-600">{t('Nobody has written a review yet.')}</p>}
            {member.reviews.map((review, index) => (
              <Card key={index}>
                <p className="text-sm font-medium">
                  {t('{stars} out of 5 · {reviewer} · {date}', {
                    stars: review.stars,
                    reviewer: review.reviewerName,
                    date: formatDate(review.createdAt),
                  })}
                </p>
                {/* Rendered as text: a review is whatever someone typed. */}
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{review.comment}</p>
              </Card>
            ))}
          </section>
          {user && user.role !== 'ADMIN' && user.id !== member.id && <ReportMember userId={member.id} name={member.fullName} />}
        </>
      )}
    </Page>
  );
}
