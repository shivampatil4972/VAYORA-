import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { RefundTerms, SimulatedPaymentNotice } from '../components/payment';
import { RateForm, RatingSummary } from '../components/rating';
import { RouteMap, type MapPoint } from '../components/RouteMap';
import { Button, Card, ConfirmButton, Notice, Page, QueryState, SelectField, StatusBadge, TextField } from '../components/ui';
import { api } from '../lib/api';
import { CORRIDOR } from '../lib/corridor';
import { formatDateTime, formatKm, formatRupees, formatTime, todayInCorridor } from '../lib/format';
import { searchSchema, type SearchForm } from '../lib/schemas';
import type { Booking, Candidate, PaymentMethod, Ride, SearchSort } from '../lib/types';

interface LatLon {
  lat: number;
  lon: number;
}

/** What was searched for: the form, plus any exact points and the ordering. */
interface Criteria {
  form: SearchForm;
  origin: LatLon;
  destination: LatLon;
  sort: SearchSort;
}

const townPoint = (name: string): LatLon => {
  const town = CORRIDOR.find((stop) => stop.name === name)!;
  return { lat: town.lat, lon: town.lon };
};

const candidateKey = (candidate: Candidate, seats: number) =>
  `${candidate.rideId}-${candidate.fromSeq}-${candidate.toSeq}-${seats}`;

/** The ride's route with the passenger's own stretch picked out. Fetched when opened. */
function RideRoute({ rideId, fromSeq, toSeq }: { rideId: number; fromSeq: number; toSeq?: number }) {
  const ride = useQuery({ queryKey: ['ride', rideId], queryFn: () => api<Ride>(`/rides/${rideId}`) });
  if (!ride.data) {
    return <QueryState isPending={ride.isPending} error={ride.error} isEmpty={false} empty="" onRetry={() => void ride.refetch()} />;
  }
  const points: MapPoint[] = ride.data.stops.map((stop) => ({
    lat: stop.lat,
    lon: stop.lon,
    label: stop.seq === fromSeq ? `Board here: ${stop.name}` : stop.seq === toSeq ? `Get off here: ${stop.name}` : stop.name,
    emphasis: stop.seq === fromSeq || stop.seq === toSeq,
  }));
  const boarding = ride.data.stops.find((stop) => stop.seq === fromSeq);
  return (
    <div className="mt-3 space-y-2">
      <RouteMap
        path={ride.data.path}
        points={points}
        describe={`Map of the ride through ${ride.data.stops.map((stop) => stop.name).join(', ')}`}
      />
      <p className="text-sm text-slate-600">
        {boarding && `Board at ${boarding.name}, leaving ${formatDateTime(boarding.departureTime)}. `}
        {ride.data.distanceKm !== null &&
          (ride.data.routeSource === 'OSRM'
            ? `The whole ride is ${ride.data.distanceKm} km by road.`
            : `The whole ride is about ${ride.data.distanceKm} km in a straight line; the road distance is not available.`)}
      </p>
    </div>
  );
}

export function SearchPage() {
  const queryClient = useQueryClient();
  const [criteria, setCriteria] = useState<Criteria | null>(null);
  const [booked, setBooked] = useState<Booking | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [sort, setSort] = useState<SearchSort>('TIME');
  // Exact points chosen on the map. Either replaces its town's centre.
  const [picked, setPicked] = useState<{ origin?: LatLon; destination?: LatLon }>({});
  const [setting, setSetting] = useState<'origin' | 'destination'>('origin');
  const [mapOpen, setMapOpen] = useState(false);
  const [routeShown, setRouteShown] = useState<string | null>(null);
  // One key per thing the passenger is trying to book, kept until it succeeds, so that
  // pressing the button again after a lost response cannot book and charge twice.
  const idempotencyKeys = useRef(new Map<string, string>());
  const { register, handleSubmit, formState, watch } = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: { origin: 'Kolhapur', destination: 'Pune', date: todayInCorridor(), seats: 1 },
  });
  const towns = { origin: watch('origin'), destination: watch('destination') };

  const results = useQuery({
    queryKey: ['search', criteria],
    queryFn: () =>
      api<Candidate[]>(
        `/rides/search?${new URLSearchParams({
          originLat: String(criteria!.origin.lat),
          originLon: String(criteria!.origin.lon),
          destLat: String(criteria!.destination.lat),
          destLon: String(criteria!.destination.lon),
          date: criteria!.form.date,
          seats: String(criteria!.form.seats),
          sort: criteria!.sort,
        })}`,
      ),
    enabled: criteria !== null,
  });

  const book = useMutation({
    mutationFn: (candidate: Candidate) => {
      const key = candidateKey(candidate, criteria!.form.seats);
      if (!idempotencyKeys.current.has(key)) idempotencyKeys.current.set(key, crypto.randomUUID());
      return api<Booking>('/bookings', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKeys.current.get(key)! },
        body: {
          rideId: candidate.rideId,
          fromSeq: candidate.fromSeq,
          toSeq: candidate.toSeq,
          seats: criteria!.form.seats,
          paymentMethod: method,
        },
      });
    },
    onSuccess: (booking, candidate) => {
      idempotencyKeys.current.delete(candidateKey(candidate, criteria!.form.seats));
      setBooked(booking);
      // Seat counts in the results and the bookings list are both stale now.
      void queryClient.invalidateQueries({ queryKey: ['search'] });
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const mapPoints: MapPoint[] = [
    ...CORRIDOR.map((stop) => ({ lat: stop.lat, lon: stop.lon, label: stop.name })),
    ...(picked.origin ? [{ ...picked.origin, label: 'Your start', emphasis: true }] : []),
    ...(picked.destination ? [{ ...picked.destination, label: 'Your destination', emphasis: true }] : []),
  ];

  return (
    <Page title="Find a ride">
      <Card>
        <form
          onSubmit={handleSubmit((form) => {
            setBooked(null);
            book.reset();
            setCriteria({
              form,
              origin: picked.origin ?? townPoint(form.origin),
              destination: picked.destination ?? townPoint(form.destination),
              sort,
            });
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

          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm text-slate-600">
              Rides are matched to the centre of each town unless you choose an exact point. Only rides with a stop near
              each end are shown.
            </p>
            <ul className="space-y-1 text-sm text-slate-700">
              {(['origin', 'destination'] as const).map((end) => (
                <li key={end}>
                  {end === 'origin' ? 'Start' : 'Destination'}:{' '}
                  {picked[end] ? (
                    <>
                      a point you chose ({picked[end]!.lat.toFixed(4)}, {picked[end]!.lon.toFixed(4)}){' '}
                      <button
                        type="button"
                        className="font-medium text-teal-800 underline"
                        onClick={() => setPicked({ ...picked, [end]: undefined })}
                      >
                        Use the centre of {towns[end]} instead
                      </button>
                    </>
                  ) : (
                    `the centre of ${towns[end]}`
                  )}
                </li>
              ))}
            </ul>
            <Button tone="secondary" aria-expanded={mapOpen} onClick={() => setMapOpen(!mapOpen)}>
              {mapOpen ? 'Hide the map' : 'Choose exact points on a map'}
            </Button>
            {mapOpen && (
              <div className="space-y-2">
                <fieldset className="flex flex-wrap gap-4 text-sm">
                  <legend className="sr-only">Which point a click on the map sets</legend>
                  {(['origin', 'destination'] as const).map((end) => (
                    <label key={end} className="flex items-center gap-1">
                      <input type="radio" name="setting" checked={setting === end} onChange={() => setSetting(end)} />
                      A click sets my {end === 'origin' ? 'start' : 'destination'}
                    </label>
                  ))}
                </fieldset>
                <RouteMap
                  points={mapPoints}
                  onPick={(lat, lon) => setPicked({ ...picked, [setting]: { lat, lon } })}
                  describe="Map of the towns between Kolhapur and Pune. Click to choose an exact point."
                />
              </div>
            )}
          </div>

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
            empty="No rides have a stop near both ends on that day with that many seats. Try another date or other points."
            onRetry={() => void results.refetch()}
          />
          {results.data && results.data.length > 0 && (
            <>
              <SimulatedPaymentNotice />
              <div className="grid max-w-xl gap-4 sm:grid-cols-2">
                <SelectField
                  label="Sort by"
                  value={criteria.sort}
                  onChange={(event) => {
                    const next = event.target.value as SearchSort;
                    setSort(next);
                    setCriteria({ ...criteria, sort: next });
                  }}
                >
                  <option value="TIME">Earliest departure</option>
                  <option value="PRICE">Lowest price</option>
                  <option value="RATING">Best-rated driver</option>
                  <option value="PROXIMITY">Nearest pickup</option>
                </SelectField>
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
          {results.data?.map((candidate) => {
            const key = candidateKey(candidate, criteria.form.seats);
            return (
              <Card key={key}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {formatTime(candidate.boardingTime)} {candidate.fromStop} → {formatTime(candidate.arrivalTime)} {candidate.toStop}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      <Link to={`/users/${candidate.driverId}`} className="font-medium text-teal-800 underline">
                        {candidate.driverName}
                      </Link>{' '}
                      · <RatingSummary average={candidate.driverRating} count={candidate.driverRatingCount} />
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {candidate.seatsAvailable} {candidate.seatsAvailable === 1 ? 'seat' : 'seats'} left ·{' '}
                      {candidate.instantBooking ? 'Confirms instantly' : 'Driver approves each request'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Pickup {formatKm(candidate.pickupDistanceM)} from your start · drop-off {formatKm(candidate.dropoffDistanceM)} from
                      your destination
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
                <div className="mt-3">
                  <Button tone="secondary" aria-expanded={routeShown === key} onClick={() => setRouteShown(routeShown === key ? null : key)}>
                    {routeShown === key ? 'Hide route' : 'Show route'}
                  </Button>
                  {routeShown === key && <RideRoute rideId={candidate.rideId} fromSeq={candidate.fromSeq} toSeq={candidate.toSeq} />}
                </div>
              </Card>
            );
          })}
        </section>
      )}
    </Page>
  );
}

export function BookingsPage() {
  const queryClient = useQueryClient();
  const bookings = useQuery({ queryKey: ['bookings'], queryFn: () => api<Booking[]>('/bookings') });
  const [meetingShown, setMeetingShown] = useState<number | null>(null);
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
            <div className="flex flex-wrap gap-2">
              {cancellable(booking) && (
                <>
                  <Button
                    tone="secondary"
                    aria-expanded={meetingShown === booking.id}
                    onClick={() => setMeetingShown(meetingShown === booking.id ? null : booking.id)}
                  >
                    {meetingShown === booking.id ? 'Hide meeting point' : 'Show meeting point'}
                  </Button>
                  <ConfirmButton
                    label="Cancel booking"
                    confirmLabel="Yes, cancel it"
                    disabled={cancel.isPending}
                    onConfirm={() => cancel.mutate(booking.id)}
                  />
                </>
              )}
            </div>
          </div>
          {meetingShown === booking.id && <RideRoute rideId={booking.rideId} fromSeq={booking.fromSeq} toSeq={booking.toSeq} />}
          {booking.status === 'COMPLETED' && !booking.passengerRated && <RateForm bookingId={booking.id} who="your driver" />}
        </Card>
      ))}
    </Page>
  );
}
