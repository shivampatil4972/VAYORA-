import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { SimulatedPaymentNotice } from '../components/payment';
import { RateForm } from '../components/rating';
import { RouteMap } from '../components/RouteMap';
import { Button, Card, ConfirmButton, Notice, Page, QueryState, SelectField, StatusBadge, TextField } from '../components/ui';
import { api } from '../lib/api';
import { CORRIDOR } from '../lib/corridor';
import { formatDateTime, formatDuration, formatRupees, formatTime } from '../lib/format';
import { rideSchema, toPublishRequest, vehicleSchema, type RideForm, type VehicleForm } from '../lib/schemas';
import type { Booking, Ride, RoutePreview, Settlement, Vehicle } from '../lib/types';

const useVehicles = () => useQuery({ queryKey: ['vehicles'], queryFn: () => api<Vehicle[]>('/vehicles') });

export function VehiclesPage() {
  const queryClient = useQueryClient();
  const vehicles = useVehicles();
  const { register, handleSubmit, formState, reset } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { make: '', model: '', year: '', colour: '', seats: 5 },
  });
  const add = useMutation({
    mutationFn: (form: VehicleForm) =>
      api<Vehicle>('/vehicles', {
        method: 'POST',
        body: { ...form, year: form.year === '' ? null : form.year, colour: form.colour || null },
      }),
    onSuccess: () => {
      reset();
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  return (
    <Page title="My vehicles">
      <QueryState
        isPending={vehicles.isPending}
        error={vehicles.error}
        isEmpty={vehicles.data?.length === 0}
        empty="Add a vehicle before you publish a ride."
        onRetry={() => void vehicles.refetch()}
      />
      {vehicles.data?.map((vehicle) => (
        <Card key={vehicle.id}>
          <p className="font-medium">
            {vehicle.make} {vehicle.model}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {[vehicle.colour, vehicle.year, `${vehicle.seats} seats including yours`].filter(Boolean).join(' · ')}
          </p>
        </Card>
      ))}

      <Card>
        <h2 className="text-lg font-semibold">Add a vehicle</h2>
        <form onSubmit={handleSubmit((form) => add.mutate(form))} noValidate className="mt-4 grid gap-4 sm:grid-cols-2">
          {add.error && (
            <div className="sm:col-span-2">
              <Notice tone="error">{add.error.message}</Notice>
            </div>
          )}
          <TextField label="Make" error={formState.errors.make?.message} {...register('make')} />
          <TextField label="Model" error={formState.errors.model?.message} {...register('model')} />
          <TextField label="Year (optional)" type="number" error={formState.errors.year?.message} {...register('year')} />
          <TextField label="Colour (optional)" error={formState.errors.colour?.message} {...register('colour')} />
          <TextField
            label="Seats"
            type="number"
            min={2}
            max={9}
            hint="Every seat in the vehicle, counting the driver's."
            error={formState.errors.seats?.message}
            {...register('seats')}
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? 'Adding…' : 'Add vehicle'}
            </Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}

/**
 * Shows the road route through the chosen stops, lets the driver move a meeting point by
 * clicking the map, and offers prices and timings worked out from the route.
 */
function RoutePlanner({ stops, onMove, onUse }: {
  stops: RideForm['stops'];
  onMove: (index: number, lat: number, lon: number) => void;
  onUse: (included: number[], preview: RoutePreview) => void;
}) {
  const included = stops.map((stop, index) => ({ ...stop, index })).filter((stop) => stop.included);
  const [moving, setMoving] = useState<number | null>(null);
  const target = included.some((stop) => stop.index === moving) ? moving! : included[0]?.index;
  const preview = useMutation({
    mutationFn: () =>
      api<RoutePreview>('/rides/route-preview', {
        method: 'POST',
        body: { stops: included.map((stop) => ({ lat: Number(stop.lat), lon: Number(stop.lon) })) },
      }),
  });

  if (included.length < 2) return null;
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">Route and meeting points</legend>
      <div className="max-w-xs">
        <SelectField
          label="A click on the map moves the meeting point for"
          value={target}
          onChange={(event) => setMoving(Number(event.target.value))}
          hint="Each starts at the town centre. Put it where passengers should actually find you."
        >
          {included.map((stop) => (
            <option key={stop.index} value={stop.index}>
              {CORRIDOR[stop.index].name}
            </option>
          ))}
        </SelectField>
      </div>
      <RouteMap
        path={preview.data?.path}
        points={included.map((stop) => ({
          lat: Number(stop.lat),
          lon: Number(stop.lon),
          label: `${CORRIDOR[stop.index].name} meeting point`,
          emphasis: stop.index === target,
        }))}
        onPick={(lat, lon) => {
          if (target !== undefined) onMove(target, lat, lon);
          preview.reset(); // the route shown no longer matches the pins
        }}
        describe={`Map of your stops: ${included.map((stop) => CORRIDOR[stop.index].name).join(', ')}`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button tone="secondary" disabled={preview.isPending} onClick={() => preview.mutate()}>
          {preview.isPending ? 'Working out the route…' : 'Work out the route'}
        </Button>
        {preview.data && (
          <Button tone="secondary" onClick={() => onUse(included.map((stop) => stop.index), preview.data)}>
            Use the suggested prices and times
          </Button>
        )}
      </div>
      {preview.error && <Notice tone="error">{preview.error.message}</Notice>}
      {preview.data && (
        <div className="text-sm text-slate-700">
          <p role="status">
            {preview.data.source === 'OSRM'
              ? `${preview.data.distanceKm} km by road, about ${formatDuration(preview.data.durationMinutes)} of driving.`
              : `About ${preview.data.distanceKm} km in a straight line. The routing service is unavailable, so this is not a road distance and the times are rough guesses.`}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {preview.data.legs.map((leg, i) => (
              <li key={included[i + 1].index}>
                {CORRIDOR[included[i].index].name} to {CORRIDOR[included[i + 1].index].name}: {leg.distanceKm} km,{' '}
                {formatDuration(leg.durationMinutes)}, suggested {formatRupees(leg.suggestedPrice)} a seat
              </li>
            ))}
          </ul>
          <p className="mt-1 text-slate-500">The suggestion is distance times a flat rate. The price is yours to set.</p>
        </div>
      )}
    </fieldset>
  );
}

export function PublishRidePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const vehicles = useVehicles();
  const { register, handleSubmit, formState, watch, setValue } = useForm<RideForm>({
    resolver: zodResolver(rideSchema),
    defaultValues: {
      departure: '',
      seatsOffered: 3,
      instantBooking: true,
      stops: CORRIDOR.map((stop, index) => ({
        // The two ends by default; the driver adds the towns in between.
        included: index === 0 || index === CORRIDOR.length - 1,
        lat: stop.lat,
        lon: stop.lon,
        offsetMinutes: stop.typicalOffsetMinutes,
        priceFromPrevious: 0,
      })),
    },
  });
  const publish = useMutation({
    mutationFn: (form: RideForm) => api<Ride>('/rides', { method: 'POST', body: toPublishRequest(form) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rides'] });
      navigate('/rides');
    },
  });

  const stops = watch('stops');
  const firstIncluded = stops.findIndex((stop) => stop.included);
  const stopsError = (formState.errors.stops as { root?: { message?: string }; message?: string } | undefined);

  if (vehicles.data?.length === 0) {
    return (
      <Page title="Publish a ride">
        <Notice tone="info">
          You need a vehicle first.{' '}
          <Link to="/vehicles" className="font-medium underline">
            Add one
          </Link>
          .
        </Notice>
      </Page>
    );
  }

  return (
    <Page title="Publish a ride">
      <QueryState isPending={vehicles.isPending} error={vehicles.error} isEmpty={false} empty="" onRetry={() => void vehicles.refetch()} />
      {vehicles.data && (
        <Card>
          <form onSubmit={handleSubmit((form) => publish.mutate(form))} noValidate className="space-y-6">
            {publish.error && <Notice tone="error">{publish.error.message}</Notice>}
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Vehicle" error={formState.errors.vehicleId?.message} {...register('vehicleId')}>
                {vehicles.data.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} ({vehicle.seats - 1} passenger seats)
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Leaving at"
                type="datetime-local"
                hint="In your device's local time."
                error={formState.errors.departure?.message}
                {...register('departure')}
              />
              <TextField
                label="Seats offered"
                type="number"
                min={1}
                max={8}
                error={formState.errors.seatsOffered?.message}
                {...register('seatsOffered')}
              />
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register('instantBooking')} />
                Confirm bookings instantly, without asking me
              </label>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">Stops and price per seat</legend>
              <p className="mt-1 text-sm text-slate-500">
                Passengers can book between any two of your stops. Each price is for the stretch that ends at that stop.
              </p>
              {(stopsError?.root?.message ?? stopsError?.message) && (
                <p className="mt-2 text-sm text-red-700" role="alert">
                  {stopsError?.root?.message ?? stopsError?.message}
                </p>
              )}
              <div className="mt-3 space-y-3">
                {CORRIDOR.map((stop, index) => (
                  <div key={stop.name} className="grid items-end gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-3">
                    <label className="flex items-center gap-2 pb-2 font-medium">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...register(`stops.${index}.included`)} />
                      {stop.name}
                    </label>
                    {stops[index]?.included && (
                      <>
                        <TextField
                          label={`Minutes from Kolhapur to ${stop.name}`}
                          type="number"
                          min={0}
                          error={formState.errors.stops?.[index]?.offsetMinutes?.message}
                          {...register(`stops.${index}.offsetMinutes`)}
                        />
                        {index !== firstIncluded && (
                          <TextField
                            label={`Price to ${stop.name} (₹)`}
                            type="number"
                            min={0}
                            error={formState.errors.stops?.[index]?.priceFromPrevious?.message}
                            {...register(`stops.${index}.priceFromPrevious`)}
                          />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </fieldset>

            <RoutePlanner
              stops={stops}
              onMove={(index, lat, lon) => {
                setValue(`stops.${index}.lat`, lat);
                setValue(`stops.${index}.lon`, lon);
              }}
              onUse={(included, preview) => {
                // Timings run on from the first stop's own offset; prices are per leg.
                let minutes = Number(stops[included[0]].offsetMinutes);
                preview.legs.forEach((leg, i) => {
                  minutes += leg.durationMinutes;
                  setValue(`stops.${included[i + 1]}.offsetMinutes`, minutes);
                  setValue(`stops.${included[i + 1]}.priceFromPrevious`, leg.suggestedPrice);
                });
              }}
            />

            <Button type="submit" disabled={publish.isPending}>
              {publish.isPending ? 'Publishing…' : 'Publish ride'}
            </Button>
          </form>
        </Card>
      )}
    </Page>
  );
}

export function RidesPage() {
  const queryClient = useQueryClient();
  const rides = useQuery({ queryKey: ['rides'], queryFn: () => api<Ride[]>('/rides/mine') });
  const act = useMutation({
    mutationFn: ({ ride, action }: { ride: number; action: 'start' | 'complete' | 'cancel' }) =>
      api<Ride>(`/rides/${ride}/${action}`, { method: 'POST' }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['rides'] }),
  });

  return (
    <Page title="My rides">
      {act.error && <Notice tone="error">{act.error.message}</Notice>}
      <QueryState
        isPending={rides.isPending}
        error={rides.error}
        isEmpty={rides.data?.length === 0}
        empty="You have not published a ride yet."
        onRetry={() => void rides.refetch()}
      />
      {rides.data?.map((ride) => (
        <Card key={ride.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium">{ride.stops.map((stop) => stop.name).join(' → ')}</p>
              <p className="mt-1 text-sm text-slate-600">
                Leaves {formatDateTime(ride.departureTime)} · {ride.instantBooking ? 'Instant booking' : 'You approve requests'}
              </p>
              {ride.distanceKm !== null && ride.durationMinutes !== null && (
                <p className="mt-1 text-sm text-slate-600">
                  {ride.routeSource === 'OSRM'
                    ? `${ride.distanceKm} km by road, about ${formatDuration(ride.durationMinutes)}`
                    : `About ${ride.distanceKm} km in a straight line (road distance unavailable)`}
                </p>
              )}
              <p className="mt-2">
                <StatusBadge status={ride.status} />
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ride.status === 'SCHEDULED' && (
                <>
                  <Button disabled={act.isPending} onClick={() => act.mutate({ ride: ride.id, action: 'start' })}>
                    Start ride
                  </Button>
                  <ConfirmButton
                    label="Cancel ride"
                    confirmLabel="Yes, cancel for everyone"
                    disabled={act.isPending}
                    onConfirm={() => act.mutate({ ride: ride.id, action: 'cancel' })}
                  />
                </>
              )}
              {ride.status === 'IN_PROGRESS' && (
                <ConfirmButton
                  label="Complete ride"
                  confirmLabel="Yes, we have arrived"
                  tone="primary"
                  disabled={act.isPending}
                  onConfirm={() => act.mutate({ ride: ride.id, action: 'complete' })}
                />
              )}
            </div>
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            {ride.segments.map((segment) => (
              <li key={segment.seq}>
                {ride.stops[segment.seq].name} → {ride.stops[segment.seq + 1].name}: {segment.seatsAvailable} of {segment.seatsTotal}{' '}
                seats free, {formatRupees(segment.price)}
              </li>
            ))}
          </ul>
          <RideBookings ride={ride} />
        </Card>
      ))}
    </Page>
  );
}

function RideBookings({ ride }: { ride: Ride }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const bookings = useQuery({
    queryKey: ['rides', ride.id, 'bookings'],
    queryFn: () => api<Booking[]>(`/rides/${ride.id}/bookings`),
    enabled: open,
  });
  const decide = useMutation({
    mutationFn: ({ booking, action }: { booking: number; action: 'accept' | 'reject' | 'no-show' }) =>
      api<Booking>(`/bookings/${booking}/${action}`, { method: 'POST' }),
    // Covers this ride's bookings and the seat counts on the ride itself.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['rides'] }),
  });

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <Button tone="secondary" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide passengers' : 'Show passengers'}
      </Button>
      {open && (
        <div className="mt-3 space-y-2">
          {decide.error && <Notice tone="error">{decide.error.message}</Notice>}
          <QueryState
            isPending={bookings.isPending}
            error={bookings.error}
            isEmpty={bookings.data?.length === 0}
            empty="Nobody has booked this ride yet."
            onRetry={() => void bookings.refetch()}
          />
          {bookings.data?.map((booking) => (
            <div key={booking.id} className="rounded-md bg-slate-50 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium">
                  <Link to={`/users/${booking.passengerId}`} className="text-teal-800 underline">
                    {booking.passengerName}
                  </Link>
                </p>
                <p className="text-slate-600">
                  {booking.fromStop} → {booking.toStop} · boards {formatTime(booking.boardingTime)} · {booking.seats}{' '}
                  {booking.seats === 1 ? 'seat' : 'seats'} · {formatRupees(booking.price)}
                </p>
                <p className="mt-1">
                  <StatusBadge status={booking.status} />
                </p>
              </div>
              <div className="flex gap-2">
                {booking.status === 'PENDING' && ride.status === 'SCHEDULED' && (
                  <>
                    <Button disabled={decide.isPending} onClick={() => decide.mutate({ booking: booking.id, action: 'accept' })}>
                      Accept
                    </Button>
                    <Button tone="secondary" disabled={decide.isPending} onClick={() => decide.mutate({ booking: booking.id, action: 'reject' })}>
                      Decline
                    </Button>
                  </>
                )}
                {booking.status === 'CONFIRMED' && ride.status === 'IN_PROGRESS' && (
                  <ConfirmButton
                    label="Did not board"
                    confirmLabel="Yes, mark as no-show"
                    disabled={decide.isPending}
                    onConfirm={() => decide.mutate({ booking: booking.id, action: 'no-show' })}
                  />
                )}
              </div>
            </div>
            {booking.status === 'COMPLETED' && !booking.driverRated && (
              <RateForm bookingId={booking.id} who={booking.passengerName} />
            )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const settlementReason: Record<Settlement['reason'], string> = {
  TRIP_COMPLETED: 'Trip completed',
  PASSENGER_NO_SHOW: 'Passenger did not board',
  LATE_CANCELLATION: 'Passenger cancelled late',
};

export function EarningsPage() {
  const settlements = useQuery({ queryKey: ['settlements'], queryFn: () => api<Settlement[]>('/settlements') });
  const total = settlements.data?.reduce((sum, settlement) => sum + settlement.amount, 0) ?? 0;

  return (
    <Page title="Earnings">
      <SimulatedPaymentNotice />
      <QueryState
        isPending={settlements.isPending}
        error={settlements.error}
        isEmpty={settlements.data?.length === 0}
        empty="Nothing has been paid out yet. You are paid the fare when a trip completes."
        onRetry={() => void settlements.refetch()}
      />
      {settlements.data && settlements.data.length > 0 && (
        <Card>
          <p className="text-sm text-slate-600">Total paid out</p>
          <p className="text-2xl font-semibold">{formatRupees(total)}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Payouts, newest first</caption>
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">Paid</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Passenger</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Trip</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Why</th>
                  <th scope="col" className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {settlements.data.map((settlement) => (
                  <tr key={settlement.bookingId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4">{formatDateTime(settlement.createdAt)}</td>
                    <td className="py-2 pr-4">{settlement.passengerName}</td>
                    <td className="py-2 pr-4">
                      {settlement.fromStop} → {settlement.toStop}
                    </td>
                    <td className="py-2 pr-4">{settlementReason[settlement.reason]}</td>
                    <td className="py-2 text-right font-medium">{formatRupees(settlement.amount)}</td>
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
