import itertools
import random

import pytest
from fastapi.testclient import TestClient

from intel.app.main import app
from intel.app.scheduler.plan import Candidate, Limits, plan, worth

LIMITS = Limits(contacts=3, contacts_per_ride=1, seats_per_departure_day=4,
                refill_horizon_hours=100.0, time_limit_seconds=10.0)


def _candidate(booking_id, *, ride=None, day=0, seats=1, survival=0.5, hours=100.0):
    return Candidate(booking_id, booking_id if ride is None else ride, day, seats, survival, hours)


def _allowed(chosen, limits):
    rides, days = {}, {}
    for c in chosen:
        rides[c.ride_id] = rides.get(c.ride_id, 0) + 1
        days[c.departure_day] = days.get(c.departure_day, 0) + c.seats
    return (len(chosen) <= limits.contacts
            and all(n <= limits.contacts_per_ride for n in rides.values())
            and all(n <= limits.seats_per_departure_day for n in days.values()))


def _best_by_brute_force(candidates, limits):
    return max(
        sum(worth(c, limits) for c in subset)
        for size in range(len(candidates) + 1)
        for subset in itertools.combinations(candidates, size)
        if _allowed(subset, limits))


# ---- worth --------------------------------------------------------------------

def test_worth_is_seats_at_risk_scaled_by_how_early_it_is():
    assert worth(_candidate(1, seats=2, survival=0.7, hours=100), LIMITS) == pytest.approx(0.6)
    assert worth(_candidate(1, seats=2, survival=0.7, hours=25), LIMITS) == pytest.approx(0.15)
    # Earlier than the horizon counts in full, not more.
    assert worth(_candidate(1, seats=2, survival=0.7, hours=160), LIMITS) == pytest.approx(0.6)
    assert worth(_candidate(1, survival=1.0), LIMITS) == 0.0


@pytest.mark.parametrize("bad", [
    dict(survival=1.2), dict(survival=-0.1), dict(seats=0), dict(hours=-1.0)])
def test_worth_refuses_what_is_not_a_booking(bad):
    with pytest.raises(ValueError):
        worth(_candidate(1, **bad), LIMITS)


# ---- plan ---------------------------------------------------------------------

def test_with_room_for_everyone_everyone_worth_asking_is_asked():
    result = plan([_candidate(3), _candidate(1), _candidate(2, survival=1.0)], LIMITS)

    assert result.booking_ids == (1, 3)  # certain to last: nothing to gain by asking
    assert result.status == "optimal"
    assert result.worth == pytest.approx(1.0)


def test_the_request_budget_goes_to_the_bookings_worth_most():
    candidates = [_candidate(i, day=i, survival=s) for i, s in enumerate([0.9, 0.2, 0.6, 0.4, 0.8])]

    assert plan(candidates, LIMITS).booking_ids == (1, 2, 3)


def test_no_ride_is_asked_more_often_than_its_limit():
    candidates = [_candidate(1, ride=7, survival=0.1), _candidate(2, ride=7, survival=0.2),
                  _candidate(3, ride=8, day=1, survival=0.9)]

    assert plan(candidates, LIMITS).booking_ids == (1, 3)


def test_the_seat_allowance_of_a_day_is_what_needs_a_solver():
    # Taking the most valuable first uses three of the day's four seats on one party and
    # leaves room for one single. Two pairs are worth more than that.
    candidates = [_candidate(1, seats=3, survival=0.5),   # worth 1.5
                  _candidate(2, seats=2, survival=0.55),  # worth 0.9
                  _candidate(3, seats=2, survival=0.55),  # worth 0.9
                  _candidate(4, seats=1, survival=0.8)]   # worth 0.2

    result = plan(candidates, LIMITS)

    assert result.booking_ids == (2, 3)
    assert result.worth == pytest.approx(1.8)
    # Another day has its own allowance.
    assert plan(candidates + [_candidate(5, day=1, seats=3, survival=0.5)], LIMITS).booking_ids \
        == (2, 3, 5)


def test_an_exact_tie_goes_to_the_lower_booking_ids_whatever_the_order_given():
    candidates = [_candidate(i, day=i) for i in (5, 2, 9, 4, 7)]

    for _ in range(5):
        random.Random(_).shuffle(candidates)
        assert plan(candidates, LIMITS).booking_ids == (2, 4, 5)


def test_nothing_to_ask_and_nothing_allowed_both_give_an_empty_plan():
    nobody = Limits(0, 1, 4, 100.0, 10.0)

    assert plan([], LIMITS).booking_ids == ()
    assert plan([_candidate(1)], nobody).booking_ids == ()
    assert plan([_candidate(1, seats=5)], LIMITS).booking_ids == ()  # larger than a day's allowance


def test_duplicate_bookings_and_impossible_limits_are_refused():
    with pytest.raises(ValueError, match="unique"):
        plan([_candidate(1), _candidate(1)], LIMITS)
    with pytest.raises(ValueError):
        Limits(-1, 1, 4, 100.0, 10.0)
    with pytest.raises(ValueError):
        Limits(1, 1, 4, 0.0, 10.0)


@pytest.mark.parametrize("seed", range(25))
def test_the_plan_is_as_good_as_trying_every_subset(seed):
    rng = random.Random(seed)
    limits = Limits(contacts=rng.randint(1, 5), contacts_per_ride=rng.randint(1, 2),
                    seats_per_departure_day=rng.randint(2, 6), refill_horizon_hours=120.0,
                    time_limit_seconds=10.0)
    candidates = [
        Candidate(booking_id=i, ride_id=rng.randint(1, 5), departure_day=rng.randint(0, 2),
                  seats=rng.randint(1, 3), survival_probability=rng.uniform(0.2, 1.0),
                  hours_to_departure=rng.uniform(24.0, 168.0))
        for i in range(rng.randint(1, 11))]

    result = plan(candidates, limits)

    chosen = [c for c in candidates if c.booking_id in result.booking_ids]
    assert _allowed(chosen, limits)
    assert result.status == "optimal"
    assert result.worth == pytest.approx(_best_by_brute_force(candidates, limits), abs=1e-5)
    assert result.worth == pytest.approx(sum(worth(c, limits) for c in chosen), abs=1e-5)


def test_a_round_the_size_of_the_corridors_is_planned_within_the_time_limit():
    rng = random.Random(1)
    candidates = [
        Candidate(i, rng.randint(1, 120), rng.randint(0, 6), rng.randint(1, 3),
                  rng.uniform(0.3, 0.95), rng.uniform(24.0, 168.0))
        for i in range(400)]
    limits = Limits(20, 1, 6, 168.0, 10.0)

    result = plan(candidates, limits)

    assert result.status == "optimal"
    assert 0 < len(result.booking_ids) <= 20


# ---- HTTP ---------------------------------------------------------------------

CLIENT = TestClient(app)
BODY = {
    "candidates": [
        {"booking_id": 1, "ride_id": 7, "departure_day": 0, "seats": 1,
         "survival_probability": 0.4, "hours_to_departure": 60},
        {"booking_id": 2, "ride_id": 7, "departure_day": 0, "seats": 2,
         "survival_probability": 0.9, "hours_to_departure": 60}],
    "limits": {"contacts": 5, "contacts_per_ride": 1, "seats_per_departure_day": 6,
               "refill_horizon_hours": 120, "time_limit_seconds": 5},
}


def test_the_endpoint_returns_who_to_ask_and_only_that():
    response = CLIENT.post("/v1/scheduler/plan", json=BODY)

    assert response.status_code == 200
    assert response.json() == {"booking_ids": [1], "status": "optimal",
                               "worth": pytest.approx(0.3)}


@pytest.mark.parametrize("change", [
    {"candidates": [BODY["candidates"][0], BODY["candidates"][0]]},
    {"candidates": [{**BODY["candidates"][0], "survival_probability": 1.4}]},
    {"candidates": [{**BODY["candidates"][0], "seats": 0}]},
    {"limits": {**BODY["limits"], "contacts": -1}},
    {"limits": {**BODY["limits"], "time_limit_seconds": 600}},
])
def test_the_endpoint_refuses_a_malformed_request(change):
    assert CLIENT.post("/v1/scheduler/plan", json={**BODY, **change}).status_code == 422
