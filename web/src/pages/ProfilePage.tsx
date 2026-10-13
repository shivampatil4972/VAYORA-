import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { RatingSummary } from '../components/rating';
import { ReportMember } from '../components/report';
import { Card, Page, QueryState } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Profile } from '../lib/types';

const monthYear = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'long', year: 'numeric' });
const day = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

export function ProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const profile = useQuery({ queryKey: ['profile', id], queryFn: () => api<Profile>(`/users/${id}/profile`) });
  const member = profile.data;

  return (
    <Page title={member?.fullName ?? 'Member'}>
      <QueryState isPending={profile.isPending} error={profile.error} isEmpty={false} empty="" onRetry={() => void profile.refetch()} />
      {member && (
        <>
          <Card>
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-500">{member.role === 'DRIVER' ? 'Driver' : 'Passenger'} since</dt>
                <dd className="mt-1 font-medium">{monthYear.format(new Date(member.memberSince))}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Completed trips</dt>
                <dd className="mt-1 font-medium">{member.completedTrips}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Rating</dt>
                <dd className="mt-1 font-medium">
                  <RatingSummary average={member.averageStars} count={member.ratingCount} />
                </dd>
              </div>
            </dl>
          </Card>
          <section aria-label="Reviews" className="space-y-3">
            <h2 className="text-lg font-semibold">Reviews</h2>
            {member.reviews.length === 0 && <p className="text-sm text-slate-600">Nobody has written a review yet.</p>}
            {member.reviews.map((review, index) => (
              <Card key={index}>
                <p className="text-sm font-medium">
                  {review.stars} out of 5 · {review.reviewerName} · {day.format(new Date(review.createdAt))}
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
