import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Card, ConfirmButton, Notice, Page, QueryState, SelectField, StatusBadge, TextField } from '../components/ui';
import { api } from '../lib/api';
import { CORRIDOR } from '../lib/corridor';
import { formatDateTime, formatRupees, formatTime, todayInCorridor } from '../lib/format';
import { searchSchema, type SearchForm } from '../lib/schemas';
import type { Booking, Candidate } from '../lib/types';

export function SearchPage() {
  const queryClient = useQueryClient();
  const [criteria, setCriteria] = useState<SearchForm | null>(null);
  const [booked, setBooked] = useState<Booking | null>(null);
  const { register, handleSubmit, formState } = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: { origin: 'Kolhapur', destination: 'Pune', date: todayInCorridor(), seats: 1 },
  });

  const results = useQuery({
    queryKey: ['search', criteria],
    queryFn: () => api<Candidate[]>(`/rides/search?${new URLSearchParams({ ...criteria!, seats: String(criteria!.seats) })}`),
    enabled: criteria !== null,
  });

  const book = useMutation({
    mutationFn: (candidate: Candidate) =>
      api<Booking>('/bookings', {
        method: 'POST',
        body: { rideId: candidate.rideId, fromSeq: candidate.fromSeq, toSeq: candidate.toSeq, seats: criteria!.seats },
      }),
    onSuccess: (booking) => {
      setBooked(booking);
      // Seat counts in the results and the bookings list are both stale now.
      void queryClient.invalidateQueries({ queryKey: ['search'] });
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  return (
    <Page title="Find a ride">
      <Card>
        <form
          onSubmit={handleSubmit((form) => {
            setBooked(null);
            book.reset();
            setCriteria(form);
          })}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
        >
          <SelectField label="From" error={formState.errors.origin?.message} {...register('origin')}>
            {CORRIDOR.slice(0, -1).map((stop) => (
              <option key={stop.name}>{stop.name}</option>
            ))}
          </SelectField>
          <SelectField label="To" error={formState.errors.destination?.message} {...register('destination')}>
            {CORRIDOR.slice(1).map((stop) => (
              <option key={stop.name}>{stop.name}</option>
            ))}
          </SelectField>
          <TextField label="Date" type="date" min={todayInCorridor()} error={formState.errors.date?.message} {...register('date')} />
          <TextField label="Seats" type="number" min={1} max={8} error={formState.errors.seats?.message} {...register('seats')} />
          <div className="sm:col-span-2">
            <Button type="submit">Search</Button>
          </div>
        </form>
      </Card>

      {booked && (
        <Notice tone="success">
          {booked.status === 'CONFIRMED'
            ? `Booked. ${booked.fromStop} to ${booked.toStop}, leaving ${formatDateTime(booked.boardingTime)}.`
            : `Request sent. Your seats are held while the driver decides; see My bookings.`}
        </Notice>
      )}
      {book.error && <Notice tone="error">{book.error.message}</Notice>}

      {criteria && (
        <section aria-label="Search results" className="space-y-3">
          <QueryState
            isPending={results.isPending}
            error={results.error}
            isEmpty={results.data?.length === 0}
            empty="No rides match that day and number of seats. Try another date."
            onRetry={() => void results.refetch()}
          />
          {results.data?.map((candidate) => (
            <Card key={`${candidate.rideId}-${candidate.fromSeq}-${candidate.toSeq}`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {formatTime(candidate.boardingTime)} {candidate.fromStop} → {formatTime(candidate.arrivalTime)} {candidate.toStop}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {candidate.driverName} · {candidate.seatsAvailable} {candidate.seatsAvailable === 1 ? 'seat' : 'seats'} left ·{' '}
                    {candidate.instantBooking ? 'Confirms instantly' : 'Driver approves each request'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-right">
                    <span className="block text-lg font-semibold">{formatRupees(candidate.pricePerSeat * criteria.seats)}</span>
                    <span className="block text-xs text-slate-500">
                      {formatRupees(candidate.pricePerSeat)} per seat
                    </span>
                  </p>
                  <Button disabled={book.isPending} onClick={() => book.mutate(candidate)}>
                    {candidate.instantBooking ? 'Book' : 'Request'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}
    </Page>
  );
}

export function BookingsPage() {
  const queryClient = useQueryClient();
  const bookings = useQuery({ queryKey: ['bookings'], queryFn: () => api<Booking[]>('/bookings') });
  const cancel = useMutation({
    mutationFn: (id: number) => api<Booking>(`/bookings/${id}/cancel`, { method: 'POST' }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });

  return (
    <Page title="My bookings">
      {cancel.error && <Notice tone="error">{cancel.error.message}</Notice>}
      <QueryState
        isPending={bookings.isPending}
        error={bookings.error}
        isEmpty={bookings.data?.length === 0}
        empty="You have no bookings yet."
        onRetry={() => void bookings.refetch()}
      />
      {bookings.data?.map((booking) => (
        <Card key={booking.id}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">
                {booking.fromStop} → {booking.toStop}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Leaves {formatDateTime(booking.boardingTime)} · {booking.seats} {booking.seats === 1 ? 'seat' : 'seats'} ·{' '}
                {formatRupees(booking.price)}
              </p>
              <p className="mt-2">
                <StatusBadge status={booking.status} />
              </p>
            </div>
            {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
              <ConfirmButton
                label="Cancel booking"
                confirmLabel="Yes, cancel it"
                disabled={cancel.isPending}
                onConfirm={() => cancel.mutate(booking.id)}
              />
            )}
          </div>
        </Card>
      ))}
    </Page>
  );
}
