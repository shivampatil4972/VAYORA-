import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { api } from '../lib/api';
import { formatOneDecimal } from '../lib/format';
import { useT } from '../lib/i18n';
import { Button, Notice } from './ui';

/** A member's average, or an honest "none yet". Never a made-up score. */
export function RatingSummary({ average, count }: { average: number | null; count: number }) {
  const t = useT();
  if (average === null || count === 0) return <span className="text-slate-500">{t('No ratings yet')}</span>;
  return (
    <span>
      <span aria-hidden="true">★ </span>
      {count === 1
        ? t('{average} out of 5 · {count} rating', { average: formatOneDecimal(average), count })
        : t('{average} out of 5 · {count} ratings', { average: formatOneDecimal(average), count })}
    </span>
  );
}

/**
 * Rates the other person on a completed trip. Shown once; the server refuses a second.
 *
 * @param legend the form's heading, already in the reader's language
 */
export function RateForm({ bookingId, legend }: { bookingId: number; legend: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const id = useId();
  const [stars, setStars] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const rate = useMutation({
    mutationFn: () => api<void>(`/bookings/${bookingId}/rating`, { method: 'POST', body: { stars, comment } }),
    // The booking now says it has been rated, which is what hides this form.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
  });

  return (
    <form
      className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (stars !== null) rate.mutate();
      }}
    >
      {rate.error && <Notice tone="error">{rate.error.message}</Notice>}
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">{legend}</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="flex items-center gap-1 text-sm">
              <input type="radio" name={`${id}-stars`} checked={stars === value} onChange={() => setStars(value)} />
              {value === 1 ? t('{n} star', { n: value }) : t('{n} stars', { n: value })}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-comment`} className="block text-sm font-medium text-slate-700">
          {t('Comment (optional, shown on their profile)')}
        </label>
        <textarea
          id={`${id}-comment`}
          rows={2}
          maxLength={1000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/40"
        />
      </div>
      <Button type="submit" disabled={stars === null || rate.isPending}>
        {rate.isPending ? t('Sending…') : t('Send rating')}
      </Button>
    </form>
  );
}
