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
import { formatDateTime, formatRupees, formatTime, todayInCorridor } from '../lib/format';
import { useT, useUnits } from '../lib/i18n';
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
  const t = useT();
  const ride = useQuery({ queryKey: ['ride', rideId], queryFn: () => api<Ride>(`/rides/${rideId}`) });
  if (!ride.data) {
    return <QueryState isPending={ride.isPending} error={ride.error} isEmpty={false} empty="" onRetry={() => void ride.refetch()} />;
  }
  const points: MapPoint[] = ride.data.stops.map((stop) => ({
    lat: stop.lat,
    lon: stop.lon,
    label:
      stop.seq === fromSeq
        ? t('Board here: {stop}', { stop: t(stop.name) })
        : stop.seq === toSeq
          ? t('Get off here: {stop}', { stop: t(stop.name) })
          : t(stop.name),
    emphasis: stop.seq === fromSeq || stop.seq === toSeq,
  }));
  const boarding = ride.data.stops.find((stop) => stop.seq === fromSeq);
  return (
    <div className="mt-3 space-y-2">
      <RouteMap
        path={ride.data.path}
        points={points}
        describe={t('Map of the ride through {stops}', { stops: ride.data.stops.map((stop) => t(stop.name)).join(', ') })}
      />
      <p className="text-sm text-slate-600">
        {boarding && t('Board at {stop}, leaving {time}.', { stop: t(boarding.name), time: formatDateTime(boarding.departureTime) })}{' '}
        {ride.data.distanceKm !== null &&
          (ride.data.routeSource === 'OSRM'
            ? t('The whole ride is {km} km by road.', { km: ride.data.distanceKm })
            : t('The whole ride is about {km} km in a straight line; the road distance is not available.', { km: ride.data.distanceKm }))}
      </p>
    </div>
  );
}

export function SearchPage() {
  const t = useT();
  const units = useUnits();
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
    ...CORRIDOR.map((stop) => ({ lat: stop.lat, lon: stop.lon, label: t(stop.name) })),
    ...(picked.origin ? [{ ...picked.origin, label: t('Your start'), emphasis: true }] : []),
    ...(picked.destination ? [{ ...picked.destination, label: t('Your destination'), emphasis: true }] : []),
  ];

  const endLine = (end: 'origin' | 'destination') => {
    const point = picked[end];
    if (!point) {
      return end === 'origin'
        ? t('Start: the centre of {town}', { town: t(towns.origin) })
        : t('Destination: the centre of {town}', { town: t(towns.destination) });
    }
    const where = { lat: point.lat.toFixed(4), lon: point.lon.toFixed(4) };
    return (
      <>
        {end === 'origin'
          ? t('Start: a point you chose ({lat}, {lon})', where)
          : t('Destination: a point you chose ({lat}, {lon})', where)}{' '}
        <button type="button" className="font-medium text-teal-800 underline" onClick={() => setPicked({ ...picked, [end]: undefined })}>
          {t('Use the centre of {town} instead', { town: t(towns[end]) })}
        </button>
      </>
    );
  };

  return (
    <Page title={t('Find a ride')}>
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
          <SelectField label={t('From')} error={formState.errors.origin?.message} {...register('origin')}>
            {CORRIDOR.slice(0, -1).map((stop) => (
              <option key={stop.name} value={stop.name}>
                {t(stop.name)}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('To')} error={formState.errors.destination?.message} {...register('destination')}>
            {CORRIDOR.slice(1).map((stop) => (
              <option key={stop.name} value={stop.name}>
                {t(stop.name)}
              </option>
            ))}
          </SelectField>
          <TextField label={t('Date')} type="date" min={todayInCorridor()} error={formState.errors.date?.message} {...register('date')} />
          <TextField label={t('Seats')} type="number" min={1} max={8} error={formState.errors.seats?.message} {...register('seats')} />

          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm text-slate-600">
              {t(
                'Rides are matched to the centre of each town unless you choose an exact point. Only rides with a stop near each end are shown.',
              )}
            </p>
            <ul className="space-y-1 text-sm text-slate-700">
              <li>{endLine('origin')}</li>
              <li>{endLine('destination')}</li>
            </ul>
            <Button tone="secondary" aria-expanded={mapOpen} onClick={() => setMapOpen(!mapOpen)}>
              {mapOpen ? t('Hide the map') : t('Choose exact points on a map')}
            </Button>
            {mapOpen && (
              <div className="space-y-2">
                <fieldset className="flex flex-wrap gap-4 text-sm">
                  <legend className="sr-only">{t('Which point a click on the map sets')}</legend>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="setting" checked={setting === 'origin'} onChange={() => setSetting('origin')} />
                    {t('A click sets my start')}
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="setting" checked={setting === 'destination'} onChange={() => setSetting('destination')} />
                    {t('A click sets my destination')}
                  </label>
                </fieldset>
                <RouteMap
                  points={mapPoints}
                  onPick={(lat, lon) => setPicked({ ...picked, [setting]: { lat, lon } })}
                  describe={t('Map of the towns between Kolhapur and Pune. Click to choose an exact point.')}
                />
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <Button type="submit">{t('Search')}</Button>
          </div>
        </form>
      </Card>

      {booked && (
        <Notice tone="success">
          {booked.status === 'CONFIRMED'
            ? t('Booked. {from} to {to}, leaving {time}.', {
                from: t(booked.fromStop),
                to: t(booked.toStop),
                time: formatDateTime(booked.boardingTime),
              })
            : t('Request sent. Your seats are held while the driver decides; see My bookings.')}
          {booked.total !== null && ` ${t('{amount} is held (simulated payment).', { amount: formatRupees(booked.total) })}`}
        </Notice>
      )}
      {book.error && <Notice tone="error">{book.error.message}</Notice>}

      {criteria && (
        <section aria-label={t('Search results')} className="space-y-3">
          <QueryState
            isPending={results.isPending}
            error={results.error}
            isEmpty={results.data?.length === 0}
            empty={t('No rides have a stop near both ends on that day with that many seats. Try another date or other points.')}
            onRetry={() => void results.refetch()}
          />
          {results.data && results.data.length > 0 && (
            <>
              <SimulatedPaymentNotice />
              <div className="grid max-w-xl gap-4 sm:grid-cols-2">
                <SelectField
                  label={t('Sort by')}
                  value={criteria.sort}
                  onChange={(event) => {
                    const next = event.target.value as SearchSort;
                    setSort(next);
                    setCriteria({ ...criteria, sort: next });
                  }}
                >
                  <option value="TIME">{t('Earliest departure')}</option>
                  <option value="PRICE">{t('Lowest price')}</option>
                  <option value="RATING">{t('Best-rated driver')}</option>
                  <option value="PROXIMITY">{t('Nearest pickup')}</option>
                </SelectField>
                <SelectField
                  label={t('Pay with')}
                  value={method}
                  onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                  hint={t('The amount is held when you book and settled when the trip ends.')}
                >
                  <option value="UPI">{t('UPI')}</option>
                  <option value="CARD">{t('Card')}</option>
                  <option value="WALLET">{t('Wallet')}</option>
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
                      {formatTime(candidate.boardingTime)} {t(candidate.fromStop)} → {formatTime(candidate.arrivalTime)} {t(candidate.toStop)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      <Link to={`/users/${candidate.driverId}`} className="font-medium text-teal-800 underline">
                        {candidate.driverName}
                      </Link>{' '}
                      · <RatingSummary average={candidate.driverRating} count={candidate.driverRatingCount} />
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {candidate.seatsAvailable === 1
                        ? t('{n} seat left', { n: candidate.seatsAvailable })
                        : t('{n} seats left', { n: candidate.seatsAvailable })}{' '}
                      · {candidate.instantBooking ? t('Confirms instantly') : t('Driver approves each request')}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {t('Pickup {pickup} from your start · drop-off {dropoff} from your destination', {
                        pickup: units.distance(candidate.pickupDistanceM),
                        dropoff: units.distance(candidate.dropoffDistanceM),
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-right">
                      <span className="block text-lg font-semibold">{formatRupees(candidate.total)}</span>
                      <span className="block text-xs text-slate-500">
                        {t('{fare} fare + {fee} service fee', {
                          fare: formatRupees(candidate.fare),
                          fee: formatRupees(candidate.serviceFee),
                        })}
                      </span>
                    </p>
                    <Button disabled={book.isPending} onClick={() => book.mutate(candidate)}>
                      {candidate.instantBooking ? t('Book') : t('Request')}
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <Button tone="secondary" aria-expanded={routeShown === key} onClick={() => setRouteShown(routeShown === key ? null : key)}>
                    {routeShown === key ? t('Hide route') : t('Show route')}
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
  const t = useT();
  const queryClient = useQueryClient();
  const bookings = useQuery({ queryKey: ['bookings'], queryFn: () => api<Booking[]>('/bookings') });
  const [meetingShown, setMeetingShown] = useState<number | null>(null);
  const cancel = useMutation({
    mutationFn: (id: number) => api<Booking>(`/bookings/${id}/cancel`, { method: 'POST' }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
  const cancellable = (booking: Booking) => booking.status === 'PENDING' || booking.status === 'CONFIRMED';

  return (
    <Page title={t('My bookings')}>
      {cancel.error && <Notice tone="error">{cancel.error.message}</Notice>}
      <QueryState
        isPending={bookings.isPending}
        error={bookings.error}
        isEmpty={bookings.data?.length === 0}
        empty={t('You have no bookings yet.')}
        onRetry={() => void bookings.refetch()}
      />
      {bookings.data && bookings.data.length > 0 && <SimulatedPaymentNotice />}
      {bookings.data?.some(cancellable) && <RefundTerms />}
      {bookings.data?.map((booking) => (
        <Card key={booking.id}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">
                {t(booking.fromStop)} → {t(booking.toStop)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {booking.seats === 1
                  ? t('Leaves {time} · {n} seat', { time: formatDateTime(booking.boardingTime), n: booking.seats })
                  : t('Leaves {time} · {n} seats', { time: formatDateTime(booking.boardingTime), n: booking.seats })}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {booking.total === null
                  ? t('Fare {amount}', { amount: formatRupees(booking.price) })
                  : t('{total} ({fare} fare + {fee} service fee)', {
                      total: formatRupees(booking.total),
                      fare: formatRupees(booking.price),
                      fee: formatRupees(booking.serviceFee ?? 0),
                    })}
                {booking.refunded !== null && ` · ${t('{amount} returned', { amount: formatRupees(booking.refunded) })}`}
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
                    {meetingShown === booking.id ? t('Hide meeting point') : t('Show meeting point')}
                  </Button>
                  <ConfirmButton
                    label={t('Cancel booking')}
                    confirmLabel={t('Yes, cancel it')}
                    disabled={cancel.isPending}
                    onConfirm={() => cancel.mutate(booking.id)}
                  />
                </>
              )}
            </div>
          </div>
          {meetingShown === booking.id && <RideRoute rideId={booking.rideId} fromSeq={booking.fromSeq} toSeq={booking.toSeq} />}
          {booking.status === 'COMPLETED' && !booking.passengerRated && <RateForm bookingId={booking.id} legend={t('Rate your driver')} />}
        </Card>
      ))}
    </Page>
  );
}
