import dataclasses
import json
import re
import uuid
from collections import Counter
from datetime import datetime, timedelta

import pytest

from experiments.analysis.queries import run_query
from journex_events import EventType, EventWriter
from sim.config import Variant, load_variant, load_world
from sim.frozen import BOOKING_HORIZON_DAYS, LATENT_TYPES, SPAN_DAYS
from sim.run import CONFIGS
from sim.simulator import MemorySink, Simulation

WORLD = load_world(CONFIGS / "world.yaml")
B0 = load_variant(CONFIGS / "variants" / "B0.yaml")


def _run(world=WORLD, seed=1, variant=B0):
    sink = MemorySink()
    sim = Simulation(world, variant, seed, sink)
    sim.run()
    return sim, sink.events


def _counts(events):
    return Counter(e.event_type for e in events)


def _demand(world, **changes):
    return dataclasses.replace(world, demand=dataclasses.replace(world.demand, **changes))


def _supply(world, **changes):
    return dataclasses.replace(world, supply=dataclasses.replace(world.supply, **changes))


def _only(world, kind):
    """A world in which every passenger is of one latent type."""
    types = {
        name: dataclasses.replace(spec, share=1.0 if name == kind else 0.0)
        for name, spec in world.demand.types.items()
    }
    return _demand(world, types=types)


@pytest.fixture(scope="module")
def baseline():
    return _run()


def test_the_same_seed_reproduces_the_run_exactly_and_another_seed_does_not(baseline):
    _, events = baseline

    assert _run(seed=1)[1] == events
    assert _run(seed=2)[1] != events


def test_the_run_produces_a_working_corridor_not_an_empty_or_saturated_one(baseline):
    _, events = baseline
    counts = _counts(events)

    # Guards against a config or code change that quietly kills part of the funnel.
    assert counts["search_issued"] > 2000
    for event_type in ["booking_requested", "booking_accepted", "booking_rejected",
                       "booking_cancelled", "seat_refilled", "trip_started",
                       "trip_completed", "trip_failed"]:
        assert counts[event_type] > 0, event_type
    assert counts["trip_completed"] < counts["search_issued"]


def test_every_event_uses_the_frozen_vocabulary_and_snake_case_keys(baseline):
    _, events = baseline
    vocabulary = {t.value for t in EventType}
    snake = re.compile(r"^[a-z][a-z0-9_]*$")

    for event in events:
        assert event.event_type in vocabulary
        assert all(snake.match(key) for key in event.payload)
        assert event.sim_time.utcoffset() is not None
        assert event.actor_type in ("passenger", "driver")
        assert isinstance(event.actor_id, int)


def test_latent_type_never_appears_in_any_event(baseline):
    """Research integrity rule 1."""
    _, events = baseline
    forbidden = set(LATENT_TYPES) | {"kind", "latent", "type", "passenger_type"}

    for event in events:
        assert not forbidden & set(event.payload), event
        assert not forbidden & {v for v in event.payload.values() if isinstance(v, str)}, event


def test_events_are_in_time_order_and_inside_the_simulated_span(baseline):
    _, events = baseline
    times = [e.sim_time for e in events]
    end = WORLD.start + timedelta(days=SPAN_DAYS, hours=WORLD.supply.trip_duration_hours)

    assert times == sorted(times)
    assert times[0] >= WORLD.start
    assert times[-1] <= end
    searches = [e.sim_time for e in events if e.event_type == "search_issued"]
    assert max(searches) < WORLD.start + timedelta(days=SPAN_DAYS)


def test_each_booking_follows_one_legal_path(baseline):
    _, events = baseline
    paths: dict[int, list[str]] = {}
    for event in events:
        if "booking_id" in event.payload and event.event_type != "seat_refilled":
            paths.setdefault(event.payload["booking_id"], []).append(event.event_type)

    legal = {
        ("booking_requested", "booking_rejected"),
        ("booking_requested", "booking_cancelled"),  # driver withdrew before answering
        ("booking_requested", "booking_accepted", "booking_cancelled"),
        ("booking_requested", "booking_accepted", "trip_started", "trip_completed"),
        ("booking_requested", "booking_accepted", "trip_started", "trip_failed"),
    }
    assert paths
    assert {tuple(path) for path in paths.values()} <= legal
    # Nothing is left hanging once the run is over.
    assert all(len(path) >= 2 for path in paths.values())


def test_started_trips_equal_completed_plus_failed(baseline):
    _, events = baseline
    counts = _counts(events)

    assert counts["trip_started"] == counts["trip_completed"] + counts["trip_failed"]


def test_no_ride_is_ever_oversold(baseline):
    sim, events = baseline
    seats = {ride.id: ride.seats for ride in sim.rides}
    size = {b.id: b.seats for b in sim.bookings}
    ride_of = {b.id: b.ride.id for b in sim.bookings}
    held: Counter = Counter()

    for event in events:
        booking = event.payload.get("booking_id")
        if event.event_type == "booking_requested":
            held[ride_of[booking]] += size[booking]
            assert held[ride_of[booking]] <= seats[ride_of[booking]]
        elif event.event_type in ("booking_rejected", "booking_cancelled"):
            held[ride_of[booking]] -= size[booking]
            assert held[ride_of[booking]] >= 0

    for ride in sim.rides:
        assert ride.seats_available == ride.seats - held[ride.id]


def test_bookings_respect_the_horizon_and_the_passengers_time_window(baseline):
    _, events = baseline
    wanted = {
        e.payload["passenger_id"]: datetime.fromisoformat(e.payload["desired_departure"])
        for e in events if e.event_type == "search_issued"
    }
    requests = [e for e in events if e.event_type == "booking_requested"]

    for event in requests:
        departure = datetime.fromisoformat(event.payload["departure_time"])
        assert timedelta(0) < departure - event.sim_time <= timedelta(days=BOOKING_HORIZON_DAYS)
        gap = abs(departure - wanted[event.payload["passenger_id"]])
        assert gap <= timedelta(hours=WORLD.demand.departure_tolerance_hours)


def test_cancellations_carry_a_departure_time_and_happen_before_it(baseline):
    _, events = baseline
    cancellations = [e for e in events if e.event_type == "booking_cancelled"]

    assert {e.payload["cancelled_by"] for e in cancellations} == {"passenger", "driver"}
    for event in cancellations:
        departure = datetime.fromisoformat(event.payload["departure_time"])
        assert departure.utcoffset() is not None
        assert event.sim_time < departure
        assert event.actor_type == event.payload["cancelled_by"]


def test_a_refilled_seat_was_first_released_by_a_passenger_on_that_ride(baseline):
    _, events = baseline
    released: Counter = Counter()

    for event in events:
        ride = event.payload.get("ride_id")
        if event.event_type == "booking_cancelled" and event.payload["cancelled_by"] == "passenger":
            released[ride] += event.payload["seats"]
        elif event.event_type == "seat_refilled":
            released[ride] -= event.payload["seats"]
            assert released[ride] >= 0


def test_demand_is_identical_whatever_the_supply_and_the_ranking():
    """Paired environments: a variant or a supply change must not alter who searches."""
    def searches(events):
        return [(e.sim_time, e.payload) for e in events if e.event_type == "search_issued"]

    _, plenty = _run()
    _, scarce = _run(_supply(WORLD, rides_per_day=2, accept_probability=0.3))

    assert searches(plenty) == searches(scarce)
    assert _counts(plenty)["booking_requested"] > _counts(scarce)["booking_requested"]


def test_supply_is_identical_whatever_the_demand():
    quiet, _ = _run(_demand(WORLD, searches_per_day=5))
    busy, _ = _run()

    def offered(sim):
        return [(r.id, r.departure, r.seats, r.publish_at, r.withdraw_at) for r in sim.rides]

    assert offered(quiet) == offered(busy)


def test_latent_types_behave_as_configured():
    def cancelled_share(kind):
        counts = Counter()
        for seed in (1, 2, 3):
            events = _run(_only(_supply(WORLD, withdraw_probability=0.0), kind), seed)[1]
            counts.update(_counts(events))
        return counts["booking_cancelled"] / counts["booking_accepted"]

    committed, opportunistic = cancelled_share("committed"), cancelled_share("opportunistic")

    assert committed < 0.15
    assert opportunistic > 2 * committed


def test_shocks_add_cancellations():
    calm = dataclasses.replace(WORLD.demand.shock, rate_per_day=0.0)
    stormy = dataclasses.replace(WORLD.demand.shock, rate_per_day=0.5)

    def cancellations(shock):
        events = _run(_only(_demand(WORLD, shock=shock), "committed"))[1]
        return sum(1 for e in events
                   if e.event_type == "booking_cancelled" and e.payload["cancelled_by"] == "passenger")

    assert cancellations(stormy) > 2 * cancellations(calm)


@pytest.mark.parametrize("change, absent", [
    (lambda w: _supply(w, accept_probability=0.0), ["booking_accepted", "trip_started"]),
    (lambda w: _supply(w, withdraw_probability=1.0), ["trip_started", "trip_completed"]),
    (lambda w: _demand(w, types={
        name: dataclasses.replace(spec, book_probability=0.0)
        for name, spec in w.demand.types.items()}), ["booking_requested"]),
])
def test_switching_a_behaviour_off_removes_its_events(change, absent):
    counts = _counts(_run(change(WORLD))[1])

    assert counts["search_issued"] > 0
    for event_type in absent:
        assert counts[event_type] == 0


def test_an_unknown_ranking_is_refused():
    with pytest.raises(ValueError, match="unknown ranking"):
        Simulation(WORLD, Variant(name="BX", ranking="vibes"), 1, MemorySink())


def test_payloads_survive_a_round_trip_through_json(baseline):
    _, events = baseline

    for event in events[:500]:
        assert json.loads(json.dumps(event.payload)) == event.payload


def test_a_run_written_to_postgres_is_read_correctly_by_the_metric_queries(pg_conn, sa_conn):
    run_id = uuid.uuid4()
    world = _demand(WORLD, searches_per_day=15)
    expected = {}
    for seed in (1, 2):
        expected[seed] = _counts(_run(world, seed)[1])
        with EventWriter(pg_conn, run_id=run_id, variant=B0.name, seed=seed) as writer:
            Simulation(world, B0, seed, writer).run()

    primary = {r["seed"]: r for r in run_query(sa_conn, "primary_metric", run_id=run_id, variant="B0")}
    late = {r["seed"]: r for r in
            run_query(sa_conn, "late_cancellation_share", run_id=run_id, variant="B0")}

    assert set(primary) == {1, 2}
    for seed, counts in expected.items():
        assert primary[seed]["searches"] == counts["search_issued"]
        assert primary[seed]["completed"] == counts["trip_completed"]
        assert late[seed]["cancellations"] == counts["booking_cancelled"]
        assert late[seed]["missing_departure_time"] == 0
