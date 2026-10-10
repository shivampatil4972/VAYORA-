import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { RefundTerms, SimulatedPaymentNotice } from '../components/payment';
import { Button, Card, ConfirmButton, Notice, Page, QueryState, SelectField, StatusBadge, TextField } from '../components/ui';
import { api } from '../lib/api';
import { CORRIDOR } from '../lib/corridor';
import { formatDateTime, formatRupees, formatTime, todayInCorridor } from '../lib/format';
import { searchSchema, type SearchForm } from '../lib/schemas';
import type { Booking, Candidate, PaymentMethod } from '../lib/types';

const candidateKey = (candidate: Candidate, seats: number) =>
  `${candidate.rideId}-${candidate.fromSeq}-${candidate.toSeq}-${seats}`;

export function SearchPage() {
  const queryClient = useQueryClient();
  const [criteria, setCriteria] = useState<SearchForm | null>(null);
  const [booked, setBooked] = useState<Booking | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  // One key per thing the passenger is trying to book, kept until it succeeds, so that
  // pressing the button again after a lost response cannot book and charge twice.
  const idempotencyKeys = useRef(new Map<string, string>());
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
    mutationFn: (candidate: Candidate) => {
      const key = candidateKey(candidate, criteria!.seats);
      if (!idempotencyKeys.current.has(key)) idempotencyKeys.current.set(key, crypto.randomUUID());
      return api<Booking>('/bookings', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKeys.current.get(key)! },
        body: {
          rideId: candidate.rideId,
          fromSeq: candidate.fromSeq,
          toSeq: candidate.toSeq,
          seats: criteria!.seats,
          paymentMethod: method,
        },
      });
    },
    onSuccess: (booking, candidate) => {
      idempotencyKeys.current.delete(candidateKey(candidate, criteria!.seats));
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
          {booked.total !== null && ` ${formatRupees(booked.total)} is held (simulated payment).`}
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
          {results.data && results.data.length > 0 && (
            <>
              <SimulatedPaymentNotice />
              <div className="max-w-xs">
                <SelectField
                  label="Pay with"
                  value={method}
                  onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                  hint="The amount is held when you book and settled when the trip ends."
                >
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="WALLET">Wallet</option>
                </SelectField>
              </div>
            </>
          )}
          {results.data?.map((candidate) => (
            <Card key={candidateKey(candidate, criteria.seats)}>
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
                    <span className="block text-lg font-semibold">{formatRupees(candidate.total)}</span>
                    <span className="block text-xs text-slate-500">
                      {formatRupees(candidate.fare)} fare + {formatRupees(candidate.serviceFee)} service fee
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
  const cancellable = (booking: Booking) => booking.status === 'PENDING' || booking.status === 'CONFIRMED';

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
      {bookings.data && bookings.data.length > 0 && <SimulatedPaymentNotice />}
      {bookings.data?.some(cancellable) && <RefundTerms />}
      {bookings.data?.map((booking) => (
        <Card key={booking.id}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">
                {booking.fromStop} → {booking.toStop}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Leaves {formatDateTime(booking.boardingTime)} · {booking.seats} {booking.seats === 1 ? 'seat' : 'seats'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {booking.total === null
                  ? `Fare ${formatRupees(booking.price)}`
                  : `${formatRupees(booking.total)} (${formatRupees(booking.price)} fare + ${formatRupees(booking.serviceFee ?? 0)} service fee)`}
                {booking.refunded !== null && ` · ${formatRupees(booking.refunded)} returned`}
              </p>
              <p className="mt-2">
                <StatusBadge status={booking.status} />
              </p>
            </div>
            {cancellable(booking) && (
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
