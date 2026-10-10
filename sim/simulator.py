"""One seeded run of the corridor under one variant.

Randomness is split into independent streams so that two variants given the same seed
face the same world:

- ``supply``          every ride: when it leaves, its seats, whether the driver withdraws
- ``demand``          when each search arrives
- ``person:<id>``     a person's latent type, fixed for the whole run
- ``search:<n>``      who makes the n-th search and everything about that search, drawn
                      in full on arrival whether or not it ends up being used

A variant changes what the platform does with a search. It cannot change who shows up,
what they are like, or what was on offer.

Time is in hours since ``World.start``.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable, Mapping, Protocol

import simpy

from journex_events import EventType
from sim.config import PassengerType, Variant, World
from sim.frozen import BOOKING_HORIZON_DAYS, DESTINATION, LATENT_TYPES, ORIGIN, SPAN_DAYS
from sim.hazard import cancellation_time

HOURS_PER_DAY = 24.0


class Sink(Protocol):
    """Where events go. ``journex_events.EventWriter`` satisfies this."""

    def write(
        self,
        event_type: EventType | str,
        payload: Mapping[str, Any] | None = None,
        *,
        sim_time: datetime,
        actor_type: str | None = None,
        actor_id: int | None = None,
    ) -> None: ...


@dataclass(frozen=True)
class Event:
    event_type: str
    payload: dict[str, Any]
    sim_time: datetime
    actor_type: str | None
    actor_id: int | None


class MemorySink:
    """Keeps events in a list, validating the type like the real writer does."""

    def __init__(self) -> None:
        self.events: list[Event] = []

    def write(self, event_type, payload=None, *, sim_time, actor_type=None, actor_id=None):
        self.events.append(Event(
            EventType(event_type).value, dict(payload or {}), sim_time, actor_type, actor_id))


@dataclass
class Ride:
    id: int
    driver_id: int
    departure: float
    seats: int
    publish_at: float
    withdraw_at: float | None
    seats_available: int
    status: str = "unpublished"  # unpublished, open, in_progress, completed, withdrawn
    # Seats handed back by a cancellation and not yet taken by a later booking.
    released: int = 0
    bookings: list[Booking] = field(default_factory=list)


@dataclass
class Booking:
    id: int
    ride: Ride
    passenger_id: int
    seats: int
    status: str = "pending"  # pending, confirmed, rejected, cancelled, completed, no_show


@dataclass(frozen=True)
class Passenger:
    """One search by one person, and every random draw its story will need."""

    id: int
    search_id: int
    # Latent. Must never leave this module in an event payload or a feature.
    kind: str
    desired_departure: float
    seats: int
    book_draw: float
    accept_draw: float
    response_delay: float
    cancel_exposure: float
    shock_time: float | None
    no_show_draw: float


def _by_departure_time(candidates: list[Ride], passenger: Passenger) -> list[Ride]:
    return sorted(candidates, key=lambda r: (abs(r.departure - passenger.desired_departure), r.id))


RANKINGS: dict[str, Callable[[list[Ride], Passenger], list[Ride]]] = {
    "departure_time": _by_departure_time,
}


class Simulation:

    def __init__(self, world: World, variant: Variant, seed: int, sink: Sink) -> None:
        if variant.ranking not in RANKINGS:
            raise ValueError(f"unknown ranking {variant.ranking!r}; known: {sorted(RANKINGS)}")
        self.world = world
        self.variant = variant
        self.seed = seed
        self.sink = sink
        self.env = simpy.Environment()
        self.rides: list[Ride] = []
        self.bookings: list[Booking] = []
        self._rank = RANKINGS[variant.ranking]
        self._searches = 0
        self._passenger_of: dict[int, Passenger] = {}  # by booking id

    def run(self) -> None:
        self.rides = self._generate_rides()
        for ride in self.rides:
            self.env.process(self._ride_life(ride))
        self.env.process(self._arrivals())
        # No horizon: arrivals stop at the end of the span and the last trips finish.
        self.env.run()

    # ---- supply ---------------------------------------------------------------

    def _generate_rides(self) -> list[Ride]:
        supply = self.world.supply
        rng = self._stream("supply")
        rides: list[Ride] = []
        for day in range(SPAN_DAYS):
            for _ in range(_poisson(rng, supply.rides_per_day)):
                departure = day * HOURS_PER_DAY + _weighted(rng, supply.departure_hours)
                seats = _weighted(rng, supply.seats)
                lead = rng.uniform(supply.publish_lead_days_min, supply.publish_lead_days_max)
                publish_at = max(0.0, departure - lead * HOURS_PER_DAY)
                withdraws = rng.random() < supply.withdraw_probability
                withdraw_at = rng.uniform(publish_at, departure)
                ride_id = len(rides) + 1
                rides.append(Ride(
                    id=ride_id,
                    # One driver per ride: repeat drivers are not modelled yet.
                    driver_id=ride_id,
                    departure=departure,
                    seats=seats,
                    publish_at=publish_at,
                    withdraw_at=withdraw_at if withdraws else None,
                    seats_available=seats,
                ))
        return rides

    def _ride_life(self, ride: Ride):
        yield self.env.timeout(ride.publish_at)
        ride.status = "open"

        if ride.withdraw_at is not None:
            yield self.env.timeout(ride.withdraw_at - self.env.now)
            ride.status = "withdrawn"
            for booking in ride.bookings:
                if booking.status in ("pending", "confirmed"):
                    self._cancel(booking, by="driver", actor_id=ride.driver_id)
            return

        yield self.env.timeout(ride.departure - self.env.now)
        ride.status = "in_progress"
        travelling: list[Booking] = []
        for booking in ride.bookings:
            if booking.status == "pending":
                # The driver left without answering, as core-api's TripService does.
                self._reject(booking)
            elif booking.status == "confirmed":
                self._emit(EventType.TRIP_STARTED, self._trip(booking), "driver", ride.driver_id)
                travelling.append(booking)
        for booking in travelling:
            if self._passenger_of[booking.id].no_show_draw < self._kind(booking).no_show_probability:
                booking.status = "no_show"
                self._emit(EventType.TRIP_FAILED,
                           {**self._trip(booking), "reason": "passenger_no_show"},
                           "driver", ride.driver_id)

        yield self.env.timeout(self.world.supply.trip_duration_hours)
        ride.status = "completed"
        for booking in travelling:
            if booking.status == "confirmed":
                booking.status = "completed"
                self._emit(EventType.TRIP_COMPLETED, self._trip(booking), "driver", ride.driver_id)

    # ---- demand ---------------------------------------------------------------

    def _arrivals(self):
        rng = self._stream("demand")
        per_hour = self.world.demand.searches_per_day / HOURS_PER_DAY
        span = SPAN_DAYS * HOURS_PER_DAY
        while True:
            yield self.env.timeout(rng.expovariate(per_hour))
            if self.env.now >= span:
                return
            self._search(self._new_passenger())

    def _new_passenger(self) -> Passenger:
        demand, supply = self.world.demand, self.world.supply
        self._searches += 1
        rng = self._stream(f"search:{self._searches}")

        person = rng.randrange(demand.population) + 1
        kind = self._stream(f"person:{person}").choices(
            LATENT_TYPES, weights=[demand.types[k].share for k in LATENT_TYPES])[0]
        lead_days = min(rng.expovariate(1.0 / demand.types[kind].lead_days_mean),
                        BOOKING_HORIZON_DAYS)
        day = min(int((self.env.now + lead_days * HOURS_PER_DAY) // HOURS_PER_DAY), SPAN_DAYS - 1)
        hour = _weighted(rng, demand.departure_hours)
        shock_rate = demand.shock.rate_per_day / HOURS_PER_DAY
        return Passenger(
            id=person,
            search_id=self._searches,
            kind=kind,
            desired_departure=day * HOURS_PER_DAY + hour,
            seats=_weighted(rng, demand.party_size),
            book_draw=rng.random(),
            accept_draw=rng.random(),
            response_delay=rng.expovariate(1.0 / supply.response_delay_mean_hours),
            cancel_exposure=rng.expovariate(1.0),
            shock_time=rng.expovariate(shock_rate) if shock_rate > 0 else None,
            no_show_draw=rng.random(),
        )

    def _search(self, passenger: Passenger) -> None:
        now = self.env.now
        self._emit(EventType.SEARCH_ISSUED, {
            "search_id": passenger.search_id,
            "passenger_id": passenger.id,
            "origin": ORIGIN,
            "destination": DESTINATION,
            "desired_departure": self._iso(passenger.desired_departure),
            "seats": passenger.seats,
        }, "passenger", passenger.id)

        tolerance = self.world.demand.departure_tolerance_hours
        horizon = BOOKING_HORIZON_DAYS * HOURS_PER_DAY
        candidates = self._rank([
            ride for ride in self.rides
            if ride.status == "open"
            and now < ride.departure <= now + horizon
            and abs(ride.departure - passenger.desired_departure) <= tolerance
            and ride.seats_available >= passenger.seats
        ], passenger)

        self._emit(EventType.CANDIDATES_RETURNED,
                   {"search_id": passenger.search_id, "passenger_id": passenger.id,
                    "count": len(candidates)},
                   "passenger", passenger.id)
        for rank, ride in enumerate(candidates, start=1):
            self._emit(EventType.CANDIDATE_RANKED,
                       {"search_id": passenger.search_id, "passenger_id": passenger.id,
                        "ride_id": ride.id, "rank": rank},
                       "passenger", passenger.id)

        kind = self.world.demand.types[passenger.kind]
        if candidates and passenger.book_draw < kind.book_probability:
            self._request(passenger, candidates[0])

    # ---- bookings -------------------------------------------------------------

    def _request(self, passenger: Passenger, ride: Ride) -> None:
        booking = Booking(len(self.bookings) + 1, ride, passenger.id, passenger.seats)
        self.bookings.append(booking)
        ride.bookings.append(booking)
        self._passenger_of[booking.id] = passenger
        self._take_seats(ride, booking.seats)

        self._emit(EventType.BOOKING_REQUESTED, {
            "booking_id": booking.id,
            "search_id": passenger.search_id,
            "ride_id": ride.id,
            "passenger_id": passenger.id,
            "seats": booking.seats,
            "departure_time": self._iso(ride.departure),
        }, "passenger", passenger.id)

        refilled = min(booking.seats, ride.released)
        if refilled:
            ride.released -= refilled
            self._emit(EventType.SEAT_REFILLED, {
                "booking_id": booking.id,
                "ride_id": ride.id,
                "seats": refilled,
                "departure_time": self._iso(ride.departure),
            }, "passenger", passenger.id)

        self.env.process(self._booking_life(booking, passenger))

    def _booking_life(self, booking: Booking, passenger: Passenger):
        ride = booking.ride
        yield self.env.timeout(passenger.response_delay)
        if booking.status != "pending":
            return  # the ride left or was withdrawn before the driver answered
        if passenger.accept_draw >= self.world.supply.accept_probability:
            self._reject(booking)
            return
        booking.status = "confirmed"
        self._emit(EventType.BOOKING_ACCEPTED, {
            "booking_id": booking.id, "ride_id": ride.id, "driver_id": ride.driver_id,
        }, "driver", ride.driver_id)

        kind = self._kind(booking)
        wait = cancellation_time(
            passenger.cancel_exposure,
            shape=kind.weibull_shape,
            scale=kind.weibull_scale_hours,
            shock_time=passenger.shock_time,
            shock_multiplier=self.world.demand.shock.hazard_multiplier,
        )
        if self.env.now + wait >= ride.departure:
            return  # survives to departure
        yield self.env.timeout(wait)
        if booking.status == "confirmed":
            self._cancel(booking, by="passenger", actor_id=passenger.id)

    def _reject(self, booking: Booking) -> None:
        booking.status = "rejected"
        self._give_back_seats(booking.ride, booking.seats)
        self._emit(EventType.BOOKING_REJECTED, {
            "booking_id": booking.id,
            "ride_id": booking.ride.id,
            "driver_id": booking.ride.driver_id,
        }, "driver", booking.ride.driver_id)

    def _cancel(self, booking: Booking, *, by: str, actor_id: int) -> None:
        ride = booking.ride
        booking.status = "cancelled"
        self._give_back_seats(ride, booking.seats)
        if by == "passenger":
            ride.released += booking.seats
        self._emit(EventType.BOOKING_CANCELLED, {
            "booking_id": booking.id,
            "ride_id": ride.id,
            "passenger_id": booking.passenger_id,
            "seats": booking.seats,
            # Required by the late-cancellation metric.
            "departure_time": self._iso(ride.departure),
            "cancelled_by": by,
        }, by, actor_id)

    def _take_seats(self, ride: Ride, seats: int) -> None:
        ride.seats_available -= seats
        if ride.seats_available < 0:
            raise AssertionError(f"ride {ride.id} oversold")

    def _give_back_seats(self, ride: Ride, seats: int) -> None:
        ride.seats_available += seats
        if ride.seats_available > ride.seats:
            raise AssertionError(f"ride {ride.id} released more seats than it has")

    # ---- helpers --------------------------------------------------------------

    def _kind(self, booking: Booking) -> PassengerType:
        return self.world.demand.types[self._passenger_of[booking.id].kind]

    def _trip(self, booking: Booking) -> dict[str, Any]:
        return {
            "booking_id": booking.id,
            "ride_id": booking.ride.id,
            "passenger_id": booking.passenger_id,
            "driver_id": booking.ride.driver_id,
        }

    def _stream(self, name: str) -> random.Random:
        # A string seed is hashed with SHA-512, so streams are stable across runs
        # and platforms and independent of one another.
        return random.Random(f"{self.seed}:{name}")

    def _iso(self, hours: float) -> str:
        return (self.world.start + timedelta(hours=hours)).isoformat()

    def _emit(self, event_type: EventType, payload: dict[str, Any], actor_type: str,
              actor_id: int) -> None:
        self.sink.write(
            event_type, payload,
            sim_time=self.world.start + timedelta(hours=self.env.now),
            actor_type=actor_type, actor_id=actor_id,
        )


def _poisson(rng: random.Random, mean: float) -> int:
    """Number of arrivals of a rate-``mean`` Poisson process in one unit of time."""
    count, elapsed = 0, rng.expovariate(mean)
    while elapsed < 1.0:
        count += 1
        elapsed += rng.expovariate(mean)
    return count


def _weighted(rng: random.Random, weights: Mapping[int, float]) -> int:
    values = sorted(weights)
    return rng.choices(values, weights=[weights[v] for v in values])[0]
