"""The hotel bookings as survival data: times, outcomes and only what is known at booking."""

import pytest

from experiments.hotel.load import HotelConfig
from experiments.hotel.survival import AFTER_BOOKING, load_survival_config, rows

HOTEL = HotelConfig(url="https://example.invalid/hotels.csv", sha256="0" * 64, horizon_days=7, hour_utc=12)


def record(lead=3, status="Check-Out", status_date="2016-03-31", **overrides):
    base = {"hotel": "City Hotel", "lead_time": str(lead), "arrival_date_year": "2016",
            "arrival_date_month": "March", "arrival_date_day_of_month": "28",
            "reservation_status": status, "reservation_status_date": status_date,
            "adults": "2", "children": "NA", "babies": "1", "stays_in_weekend_nights": "1",
            "stays_in_week_nights": "2", "is_repeated_guest": "0", "previous_cancellations": "1",
            "previous_bookings_not_canceled": "0", "deposit_type": "Non Refund", "customer_type": "Transient",
            "market_segment": "Online TA", "adr": "95.5"}
    return base | overrides


def test_a_booking_becomes_its_time_its_outcome_and_what_was_known_when_it_was_made():
    frame = rows([
        record(lead=3),                                                       # stayed
        record(lead=5, status="Canceled", status_date="2016-03-25"),          # made 23rd, cancelled day 2
        record(lead=9),                                                       # beyond the horizon
        record(lead=0, hotel="Resort Hotel", status="No-Show", status_date="2016-03-28"),
    ], HOTEL)

    assert list(frame["duration_days"]) == [4.0, 2.5, 1.0]
    assert list(frame["cancelled"]) == [False, True, False]
    first = frame.iloc[0]
    assert (first["lead_days"], first["city_hotel"], first["children"], first["non_refundable"],
            first["transient"], first["online_agent"], first["price_per_night"]) == (3, 1, 1, 1, 1, 1, 95.5)
    assert frame.iloc[2]["city_hotel"] == 0


def test_the_shipped_configuration_uses_nothing_known_only_after_booking(tmp_path):
    config = load_survival_config()
    assert not AFTER_BOOKING & set(config["features"])
    assert not set(config["train_years"]) & set(config["validation_years"])

    overlapping = tmp_path / "survival.yaml"
    overlapping.write_text("train_years: [2016]\nvalidation_years: [2016]\nfeatures: [lead_days]\n"
                           "timing_only: [lead_days]\n", encoding="utf-8")
    with pytest.raises(ValueError):
        load_survival_config(overlapping)
