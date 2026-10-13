"""Chooses which bookings to ask to reconfirm when not all of them can be asked.

Asking costs something: an operator's time, a passenger's patience. Given the bookings
that could be asked this round and what each is estimated to be worth asking, this picks
the set worth most, subject to three limits:

- a number of requests this round;
- a number of requests on any one ride, so one car's passengers are not all asked at once;
- a number of seats asked about among rides leaving on the same day, so that if everyone
  asked gives up their seat there is still demand enough to refill them.

The first two alone would not need a solver: every request costs one, so sorting by worth
and skipping full rides is optimal. The third counts seats, not requests, and a party of
three uses the allowance differently from three parties of one. That makes it an integer
programme, solved here with CP-SAT.

What a request is worth is an assumption, not a measurement: the chance the booking
does not last (one minus the model's survival estimate), times its seats, times a weight
that falls linearly to zero as departure approaches, because a seat released late is
unlikely to be refilled. `refill_horizon_hours` sets how early a release counts in full.

Nothing here cancels anything. The output is a list of people to ask.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from ortools.sat.python import cp_model

# Worth is turned into whole numbers for the solver at this resolution.
_SCALE = 1_000_000


@dataclass(frozen=True)
class Candidate:
    booking_id: int
    ride_id: int
    # Any label shared by rides that leave on the same day.
    departure_day: int
    seats: int
    # The model's estimate that the booking lasts until departure.
    survival_probability: float
    hours_to_departure: float


@dataclass(frozen=True)
class Limits:
    contacts: int
    contacts_per_ride: int
    seats_per_departure_day: int
    refill_horizon_hours: float
    time_limit_seconds: float

    def __post_init__(self) -> None:
        if min(self.contacts, self.contacts_per_ride, self.seats_per_departure_day) < 0:
            raise ValueError("limits must not be negative")
        if self.refill_horizon_hours <= 0 or self.time_limit_seconds <= 0:
            raise ValueError("refill_horizon_hours and time_limit_seconds must be positive")


@dataclass(frozen=True)
class Plan:
    # In ascending order.
    booking_ids: tuple[int, ...]
    # "optimal", or "feasible" if the time limit ended the search first.
    status: str
    # Total worth of the chosen requests, in expected seats.
    worth: float


def worth(candidate: Candidate, limits: Limits) -> float:
    """Expected seats saved from a late release by asking this booking now."""
    if not 0.0 <= candidate.survival_probability <= 1.0:
        raise ValueError(f"booking {candidate.booking_id}: survival must be a probability")
    if candidate.seats < 1 or candidate.hours_to_departure < 0:
        raise ValueError(f"booking {candidate.booking_id}: seats and hours must be positive")
    earliness = min(1.0, candidate.hours_to_departure / limits.refill_horizon_hours)
    return (1.0 - candidate.survival_probability) * candidate.seats * earliness


def plan(candidates: Sequence[Candidate], limits: Limits) -> Plan:
    """The most valuable set of bookings to ask within the limits.

    Among sets of equal worth the one with the lowest booking ids is chosen, so the
    answer does not depend on the order of `candidates` or on the solver's mood.
    """
    ids = [c.booking_id for c in candidates]
    if len(set(ids)) != len(ids):
        raise ValueError("booking ids must be unique")
    # Something worth nothing is never asked, whatever room the limits leave.
    scored = sorted(((round(worth(c, limits) * _SCALE), c) for c in candidates),
                    key=lambda pair: pair[1].booking_id)
    scored = [(value, c) for value, c in scored if value > 0]
    if not scored or limits.contacts == 0:
        return Plan((), "optimal", 0.0)

    model = cp_model.CpModel()
    asked = [model.new_bool_var(f"ask_{c.booking_id}") for _, c in scored]
    model.add(sum(asked) <= limits.contacts)
    by_ride: dict[int, list[int]] = {}
    by_day: dict[int, list[int]] = {}
    for index, (_, c) in enumerate(scored):
        by_ride.setdefault(c.ride_id, []).append(index)
        by_day.setdefault(c.departure_day, []).append(index)
    for members in by_ride.values():
        if len(members) > limits.contacts_per_ride:
            model.add(sum(asked[i] for i in members) <= limits.contacts_per_ride)
    for members in by_day.values():
        if sum(scored[i][1].seats for i in members) > limits.seats_per_departure_day:
            model.add(sum(scored[i][1].seats * asked[i] for i in members)
                      <= limits.seats_per_departure_day)
    # Worth first; position in id order only ever breaks an exact tie, because one unit
    # of worth outweighs every position added together.
    tie = len(scored) * (len(scored) + 1) // 2 + 1
    model.maximize(sum((value * tie - position) * ask
                       for position, ((value, _), ask) in enumerate(zip(scored, asked), start=1)))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = limits.time_limit_seconds
    # One worker and a fixed seed: the same input gives the same plan on every run.
    solver.parameters.num_workers = 1
    solver.parameters.random_seed = 0
    status = solver.solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        # Asking nobody always satisfies the limits, so this is a solver fault.
        raise RuntimeError(f"contact scheduler found no plan: {solver.status_name(status)}")

    chosen = [(value, c) for (value, c), ask in zip(scored, asked) if solver.boolean_value(ask)]
    return Plan(
        booking_ids=tuple(c.booking_id for _, c in chosen),
        status="optimal" if status == cp_model.OPTIMAL else "feasible",
        worth=sum(value for value, _ in chosen) / _SCALE,
    )
