"""The public hotel bookings become the events a booking of a seat makes, and nothing else.

Hand-made rows in the file's own columns, so no download is needed.
"""

from datetime import datetime, timedelta, timezone

import pytest

from experiments.hotel.load import HotelConfig, events, fetch, load_config, sha256

CONFIG = HotelConfig(url="https://example.invalid/hotels.csv", sha256="0" * 64, horizon_days=7, hour_utc=12)


def row(hotel="City Hotel", lead=3, arrival=(2016, "March", 28), status="Check-Out", status_date="2016-03-31"):
    year, month, day = arrival
    return {"hotel": hotel, "lead_time": str(lead), "arrival_date_year": str(year),
            "arrival_date_month": month, "arrival_date_day_of_month": str(day),
            "reservation_status": status, "reservation_status_date": status_date}


def noon(year, month, day):
    return datetime(year, month, day, 12, tzinfo=timezone.utc)


def test_a_booking_within_the_horizon_becomes_the_events_of_a_seat_booking():
    got = list(events([
        row(lead=3),                                                    # 1: stayed
        row(lead=8),                                                    # 2: beyond the horizon
        row(hotel="Resort Hotel", lead=7, arrival=(2017, "August", 1),
            status="Canceled", status_date="2017-07-30"),               # 3: cancelled 2 days out
        row(lead=0, status="No-Show", status_date="2016-03-28"),        # 4: never came
    ], CONFIG))

    assert [(e.variant, e.seed, e.event_type, e.sim_time) for e in got] == [
        ("HOTEL-CITY", 2016, "booking_requested", noon(2016, 3, 25)),
        ("HOTEL-CITY", 2016, "booking_accepted", noon(2016, 3, 25)),
        ("HOTEL-RESORT", 2017, "booking_requested", noon(2017, 7, 25)),
        ("HOTEL-RESORT", 2017, "booking_accepted", noon(2017, 7, 25)),
        ("HOTEL-RESORT", 2017, "booking_cancelled", noon(2017, 7, 30)),
        ("HOTEL-CITY", 2016, "booking_requested", noon(2016, 3, 28)),
        ("HOTEL-CITY", 2016, "booking_accepted", noon(2016, 3, 28)),
        ("HOTEL-CITY", 2016, "trip_failed", noon(2016, 3, 28)),
    ]
    assert got[0].payload == {"booking_id": 1, "seats": 1, "departure_time": "2016-03-28T12:00:00+00:00"}
    assert got[1].payload == {"booking_id": 1}
    assert got[4].payload == {"booking_id": 3, "seats": 1, "departure_time": "2017-08-01T12:00:00+00:00",
                              "cancelled_by": "passenger"}
    assert got[7].payload == {"booking_id": 4, "reason": "passenger_no_show"}
    # Portugal's clocks went forward on 27 March 2016; read in UTC the three days stay three.
    assert datetime.fromisoformat(got[0].payload["departure_time"]) - got[0].sim_time == timedelta(days=3)


@pytest.mark.parametrize("bad", [
    row(status="Canceled", status_date="2016-03-29"),   # after arrival
    row(status="Canceled", status_date="2016-03-24"),   # before it was made
    row(status="Waitlisted"),
])
def test_a_booking_that_cannot_be_read_stops_the_load(bad):
    with pytest.raises(ValueError):
        list(events([bad], CONFIG))


def test_the_file_is_refused_unless_its_hash_is_the_one_configured(tmp_path):
    path = tmp_path / "hotels.csv"
    path.write_text("hotel,lead_time\n", encoding="utf-8")

    right = HotelConfig(CONFIG.url, sha256(path), 7, 12)
    assert fetch(right, path) == path   # already here: nothing is downloaded
    with pytest.raises(ValueError, match="refusing"):
        fetch(CONFIG, path)


def test_the_configuration_is_strict(tmp_path):
    shipped = load_config()
    assert (shipped.horizon_days, shipped.hour_utc, len(shipped.sha256)) == (7, 12, 64)

    extra = tmp_path / "hotel.yaml"
    extra.write_text("source: {url: x, sha256: y}\nhorizon_days: 7\nhour_utc: 12\nrefill: true\n", encoding="utf-8")
    with pytest.raises(ValueError):
        load_config(extra)
