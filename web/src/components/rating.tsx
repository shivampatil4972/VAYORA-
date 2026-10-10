import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';

import { api } from '../lib/api';
import { Button, Notice } from './ui';

const oneDecimal = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** A member's average, or an honest "none yet". Never a made-up score. */
export function RatingSummary({ average, count }: { average: number | null; count: number }) {
  if (average === null || count === 0) return <span className="text-slate-500">No ratings yet</span>;
  return (
    <span>
      <span aria-hidden="true">★ </span>
      {oneDecimal.format(average)} out of 5 · {count} {count === 1 ? 'rating' : 'ratings'}
    </span>
  );
}

/** Rates the other person on a completed trip. Shown once; the server refuses a second. */
export function RateForm({ bookingId, who }: { bookingId: number; who: string }) {
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
        <legend className="text-sm font-medium text-slate-700">Rate {who}</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="flex items-center gap-1 text-sm">
              <input type="radio" name={`${id}-stars`} checked={stars === value} onChange={() => setStars(value)} />
              {value} {value === 1 ? 'star' : 'stars'}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor={`${id}-comment`} className="block text-sm font-medium text-slate-700">
          Comment (optional, shown on their profile)
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
        {rate.isPending ? 'Sending…' : 'Send rating'}
      </Button>
    </form>
  );
}
