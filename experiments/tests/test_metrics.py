"""Stage 2 acceptance: hand-crafted event rows in, hand-computed numbers out.

No simulator, no app, no real data. The expected values below were worked out on
paper from the counts in SEEDS; the test fails if metrics.sql disagrees.
"""

import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from experiments.analysis.queries import load_queries, run_query

RUN_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
OTHER_RUN_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
VARIANT = "B0"

NOW = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)
IST = timezone(timedelta(hours=5, minutes=30))

H = timedelta(hours=1)
M = timedelta(minutes=1)

# How long before departure each cancellation happens. Late means under 24 hours.
SEEDS = {
    1: {
        "search_issued": 200,
        "booking_requested": 60,
        "booking_accepted": 45,
        "booking_rejected": 15,
        "trip_started": 33,
        "trip_completed": 30,
        "trip_failed": 3,
        "recovery_search": 8,
        "recovery_booked": 6,
        # 4 late, 6 early; 24h exactly sits on the early side of the boundary
        "cancel_lead": [2 * H, 5 * H, 12 * H, 23 * H + 59 * M,
                        24 * H, 24 * H + M, 36 * H, 72 * H, 100 * H, 167 * H],
    },
    2: {
        "search_issued": 150,
        "booking_requested": 30,
        "booking_accepted": 24,
        "booking_rejected": 6,
        "trip_started": 18,
        "trip_completed": 18,
        "recovery_search": 5,
        "recovery_booked": 1,
        # all 5 late
        "cancel_lead": [30 * M, 1 * H, 3 * H, 10 * H, 20 * H],
    },
    3: {
        "search_issued": 120,
        "booking_requested": 48,
        "booking_accepted": 12,
        "booking_rejected": 36,
        "trip_started": 9,
        "trip_completed": 7,
        "trip_failed": 2,
        # no recovery searches at all: the rate is undefined, not zero
        # 2 late, 6 early
        "cancel_lead": [6 * H, 18 * H,
                        25 * H, 48 * H, 60 * H, 96 * H, 120 * H, 150 * H],
    },
}

# Worked by hand from SEEDS.
EXPECTED_PRIMARY = {
    1: (200, 30, 15.0),          # 100 * 30 / 200
    2: (150, 18, 12.0),          # 100 * 18 / 150
    3: (120, 7, 35 / 6),         # 100 * 7 / 120 = 5.8333...
}
EXPECTED_LATE = {
    1: (10, 4, 0.4),             # 4 / 10
    2: (5, 5, 1.0),              # 5 / 5
    3: (8, 2, 0.25),             # 2 / 8
}
EXPECTED_FUNNEL = {
    # booking_rate, acceptance_rate, recovery_success_rate
    1: (0.30, 0.75, 0.75),       # 60/200, 45/60, 6/8
    2: (0.20, 0.80, 0.20),       # 30/150, 24/30, 1/5
    3: (0.40, 0.25, None),       # 48/120, 12/48, 0 recovery searches
}

INSERT = text(
    "INSERT INTO events (run_id, variant, seed, sim_time, event_type, payload) "
    "VALUES (:run_id, :variant, :seed, :sim_time, :event_type, CAST(:payload AS jsonb))"
)


def _rows(run_id, variant, seed, spec):
    rows = []

    def add(event_type, payload=None):
        rows.append({
            "run_id": run_id, "variant": variant, "seed": seed, "sim_time": NOW,
            "event_type": event_type, "payload": json.dumps(payload or {}),
        })

    for event_type, count in spec.items():
        if event_type == "cancel_lead":
            continue
        for _ in range(count):
            add(event_type)
    for lead in spec.get("cancel_lead", []):
        # Departure written in IST while sim_time is UTC: the query must compare
        # instants, not wall-clock strings.
        departure = (NOW + lead).astimezone(IST)
        add("booking_cancelled", {"departure_time": departure.isoformat()})
    return rows


@pytest.fixture
def crafted(sa_conn):
    rows = []
    for seed, spec in SEEDS.items():
        rows += _rows(RUN_ID, VARIANT, seed, spec)
    # Rows the queries must ignore: same run under another variant, and another run.
    decoy = {"search_issued": 50, "trip_completed": 50, "booking_requested": 50,
             "booking_accepted": 50, "recovery_search": 4, "recovery_booked": 4,
             "cancel_lead": [1 * H, 2 * H, 3 * H]}
    rows += _rows(RUN_ID, "B1", 1, decoy)
    rows += _rows(OTHER_RUN_ID, VARIANT, 1, decoy)
    sa_conn.execute(INSERT, rows)
    return sa_conn


def test_primary_metric_matches_hand_computed_values(crafted):
    result = run_query(crafted, "primary_metric", run_id=RUN_ID, variant=VARIANT)

    assert [r["seed"] for r in result] == [1, 2, 3]
    for row in result:
        searches, completed, per_100 = EXPECTED_PRIMARY[row["seed"]]
        assert row["searches"] == searches
        assert row["completed"] == completed
        assert float(row["per_100"]) == pytest.approx(per_100, abs=1e-9)


def test_late_cancellation_share_matches_hand_computed_values(crafted):
    result = run_query(crafted, "late_cancellation_share", run_id=RUN_ID, variant=VARIANT)

    assert [r["seed"] for r in result] == [1, 2, 3]
    for row in result:
        cancellations, late, late_share = EXPECTED_LATE[row["seed"]]
        assert row["cancellations"] == cancellations
        assert row["late"] == late
        assert row["missing_departure_time"] == 0
        assert float(row["late_share"]) == pytest.approx(late_share, abs=1e-9)


def test_funnel_rates_match_hand_computed_values(crafted):
    result = run_query(crafted, "funnel_rates", run_id=RUN_ID, variant=VARIANT)

    assert [r["seed"] for r in result] == [1, 2, 3]
    for row in result:
        booking, acceptance, recovery = EXPECTED_FUNNEL[row["seed"]]
        assert float(row["booking_rate"]) == pytest.approx(booking, abs=1e-9)
        assert float(row["acceptance_rate"]) == pytest.approx(acceptance, abs=1e-9)
        if recovery is None:
            assert row["recovery_success_rate"] is None
        else:
            assert float(row["recovery_success_rate"]) == pytest.approx(recovery, abs=1e-9)


def test_seed_with_no_searches_has_undefined_metric_not_an_error(sa_conn):
    sa_conn.execute(INSERT, _rows(RUN_ID, VARIANT, 9, {"trip_completed": 2}))

    (row,) = run_query(sa_conn, "primary_metric", run_id=RUN_ID, variant=VARIANT)

    assert (row["searches"], row["completed"], row["per_100"]) == (0, 2, None)


def test_cancellation_without_departure_time_is_surfaced(sa_conn):
    rows = _rows(RUN_ID, VARIANT, 1, {"cancel_lead": [2 * H]})
    rows += _rows(RUN_ID, VARIANT, 1, {"booking_cancelled": 1})
    sa_conn.execute(INSERT, rows)

    (row,) = run_query(sa_conn, "late_cancellation_share", run_id=RUN_ID, variant=VARIANT)

    assert (row["cancellations"], row["late"], row["missing_departure_time"]) == (2, 1, 1)


def test_metrics_file_defines_the_expected_queries():
    assert set(load_queries()) == {
        "primary_metric", "late_cancellation_share", "funnel_rates", "intervention_volume",
        "refill_additionality"}


def test_intervention_volume_matches_hand_computed_values(sa_conn):
    def event(seed, event_type, payload=None):
        return {"run_id": RUN_ID, "variant": VARIANT, "seed": seed, "sim_time": NOW,
                "event_type": event_type, "payload": json.dumps(payload or {})}

    rows = [event(1, "booking_accepted") for _ in range(20)]
    rows += [event(1, "intervention_issued") for _ in range(5)]
    rows += [event(1, "intervention_responded", {"response": "released"}) for _ in range(2)]
    rows += [event(1, "intervention_responded", {"response": "confirmed"}) for _ in range(3)]
    rows += [event(1, "seat_refilled") for _ in range(4)]
    rows += [event(2, "search_issued")]  # a seed with nothing accepted and nothing asked
    sa_conn.execute(INSERT, rows)

    one, two = run_query(sa_conn, "intervention_volume", run_id=RUN_ID, variant=VARIANT)

    assert (one["asked"], one["released"], one["refilled"]) == (5, 2, 4)
    assert float(one["contact_rate"]) == pytest.approx(0.25)  # 5 / 20
    assert (two["asked"], two["contact_rate"]) == (0, None)


def test_refill_additionality_matches_hand_computed_values(sa_conn):
    later = NOW + 5 * H

    def event(seed, event_type, payload, when=NOW, variant=VARIANT):
        return {"run_id": RUN_ID, "variant": variant, "seed": seed, "sim_time": when,
                "event_type": event_type, "payload": json.dumps(payload)}

    def search(seed, search_id, offered, booking_id=None, refill=False, when=NOW, variant=VARIANT):
        rows = [event(seed, "candidates_returned", {"search_id": search_id, "count": offered},
                      when, variant)]
        if booking_id is not None:
            rows.append(event(seed, "booking_requested",
                              {"search_id": search_id, "booking_id": booking_id}, when, variant))
        if refill:
            rows.append(event(seed, "seat_refilled", {"booking_id": booking_id}, when, variant))
        return rows

    rows = []
    # Seed 1: six answers, two of them empty. Three refills: one by a passenger offered
    # only that ride, one offered three, and one on a repeat search.
    rows += search(1, 1, 0)
    rows += search(1, 2, 1, booking_id=10, refill=True)
    rows += search(1, 3, 3, booking_id=11, refill=True)
    rows += search(1, 4, 2, booking_id=12)              # booked, but no released seat
    # Search 5 found nothing, then on its repeat was offered one ride and took a released
    # seat on it. The repeat reuses the search id: the booking belongs to the later answer.
    rows += search(1, 5, 0)
    rows += search(1, 5, 1, booking_id=13, refill=True, when=later)
    # Seed 2: searches, no refills at all.
    rows += search(2, 1, 2, booking_id=20)
    rows += search(2, 2, 0)
    # Another variant in the same run must not leak in.
    rows += search(1, 9, 1, booking_id=99, refill=True, variant="B1")
    sa_conn.execute(INSERT, rows)

    one, two = run_query(sa_conn, "refill_additionality", run_id=RUN_ID, variant=VARIANT)

    assert (one["searches_shown"], one["shown_nothing"]) == (6, 2)
    assert float(one["empty_share"]) == pytest.approx(2 / 6)
    assert (one["refills"], one["refills_only_option"]) == (3, 2)
    assert float(one["only_option_share"]) == pytest.approx(2 / 3)
    assert (two["searches_shown"], two["shown_nothing"], two["refills"],
            two["refills_only_option"], two["only_option_share"]) == (2, 1, 0, 0, None)
