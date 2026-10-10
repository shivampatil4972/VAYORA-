import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, Card, Notice, Page, QueryState } from '../components/ui';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { HazardScore, ScoringSummary } from '../lib/types';

const percent = new Intl.NumberFormat('en-IN', { style: 'percent', maximumFractionDigits: 0 });

export function DurabilityPage() {
  const queryClient = useQueryClient();
  const scores = useQuery({ queryKey: ['hazard-scores'], queryFn: () => api<HazardScore[]>('/admin/hazard/scores') });
  const run = useMutation({
    mutationFn: () => api<ScoringSummary>('/admin/hazard/score', { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['hazard-scores'] }),
  });

  return (
    <Page title="Booking durability">
      <Notice tone="info">
        Each figure is a model's estimate that the passenger will not cancel before departure. The model was trained on
        simulated data only and separates risky from safe bookings weakly. It is not a fact about any person and must
        not be used to decline, penalise or price anyone.
      </Notice>

      <div className="flex flex-wrap items-center gap-4">
        <Button disabled={run.isPending} onClick={() => run.mutate()}>
          {run.isPending ? 'Scoring…' : 'Score bookings now'}
        </Button>
        {run.data && (
          <p role="status" className="text-sm text-slate-700">
            {run.data.skippedRun
              ? 'Another scoring run is in progress.'
              : `${run.data.scored} scored, ${run.data.alreadyScored} already scored today, ${run.data.failed} could not be scored.`}
          </p>
        )}
      </div>
      {run.error && <Notice tone="error">{run.error.message}</Notice>}
      {run.data && run.data.failed > 0 && (
        <Notice tone="error">The model service did not answer for some bookings. They are unchanged; run it again later.</Notice>
      )}

      <QueryState
        isPending={scores.isPending}
        error={scores.error}
        isEmpty={scores.data?.length === 0}
        empty="No confirmed booking has been scored yet."
        onRetry={() => void scores.refetch()}
      />
      {scores.data && scores.data.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Latest durability estimate of each confirmed booking</caption>
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">Booking</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Passenger</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Trip</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Leaves</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Estimate</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Model</th>
                  <th scope="col" className="py-2 font-medium">Scored</th>
                </tr>
              </thead>
              <tbody>
                {scores.data.map((score) => (
                  <tr key={score.bookingId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4">#{score.bookingId}</td>
                    <td className="py-2 pr-4">{score.passengerName}</td>
                    <td className="py-2 pr-4">
                      {score.fromStop} → {score.toStop}
                    </td>
                    <td className="py-2 pr-4">{formatDateTime(score.boardingTime)}</td>
                    <td className="py-2 pr-4 font-medium">{percent.format(score.survivalProbability)}</td>
                    <td className="py-2 pr-4">{score.modelVersion}</td>
                    <td className="py-2">{formatDateTime(score.scoredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}
