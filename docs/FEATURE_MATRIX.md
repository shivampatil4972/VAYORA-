# Feature matrix

One row per requirement of the 95-feature backlog (IDs 1-95, original numbering).

**Tier** (A = fully implemented and tested, B = implemented with a documented
simplification, C = mock or simulated provider) was meant to be preserved from a supplied
classification. The build specification did not include one, so every tier is `TBD` until
the team supplies it. Nothing here has been assigned a tier by guesswork.

**Stage** is `TBD` for the same reason: CLAUDE.md fixes eight stages but only Stage 3
(the simulator) is described in the repository.

**Status** values: `Not started`, `Partial`, `Done (verified)`, `Blocked`.
A row only becomes `Done (verified)` with a named test or command that passed.

Last updated: 2026-10-10. `API verified` means the core-api endpoints pass the automated
tests listed in [PROGRESS.md](PROGRESS.md). No feature has a user interface yet.

## Identity and profile

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 1 | Email/phone signup | TBD | TBD | Partial (email signup and login API verified; no phone, no UI) |
| 2 | Google OAuth login | TBD | TBD | Not started |
| 3 | Profile photo upload | TBD | TBD | Not started |
| 4 | Bio, age, and gender | TBD | TBD | Not started |
| 5 | Email verification | TBD | TBD | Not started |
| 6 | Phone OTP verification | TBD | TBD | Not started |
| 7 | Government ID verification | TBD | TBD | Not started |
| 8 | Verified-profile badge | TBD | TBD | Not started |
| 9 | Experience levels from Newcomer to Ambassador | TBD | TBD | Not started |
| 10 | Smoking, pets, music, and travel preferences | TBD | TBD | Not started |
| 11 | Chattiness level | TBD | TBD | Not started |

## Vehicle management

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 12 | Make, model, year, and colour | TBD | TBD | Partial (API verified, no UI) |
| 13 | Seat count and comfort class | TBD | TBD | Partial (seat count API verified; no comfort class, no UI) |
| 14 | Luggage allowance | TBD | TBD | Not started |
| 15 | EV status, battery capacity, and consumption rate | TBD | TBD | Not started |
| 16 | Vehicle photo | TBD | TBD | Not started |

## Driver ride publishing

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 17 | Origin-to-destination ride publishing | TBD | TBD | Partial (API verified, no UI) |
| 18 | Intermediate stopovers | TBD | TBD | Partial (API verified, no UI) |
| 19 | Per-segment pricing | TBD | TBD | Partial (API verified, no UI) |
| 20 | Price suggestion engine | TBD | TBD | Not started |
| 21 | Date and departure time | TBD | TBD | Partial (API verified, no UI) |
| 22 | Offered seats | TBD | TBD | Partial (API verified, no UI) |
| 23 | Maximum-two-in-the-back preference | TBD | TBD | Not started |
| 24 | Instant booking versus approval | TBD | TBD | Partial (API verified, no UI) |
| 25 | Return trip publishing | TBD | TBD | Not started |
| 26 | Recurring weekly rides | TBD | TBD | Not started |
| 27 | Map-based pickup/drop-off selection | TBD | TBD | Not started |
| 28 | Detour tolerance | TBD | TBD | Not started |
| 29 | Journey description and notes | TBD | TBD | Not started |

## Passenger search and booking

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 30 | Search by origin, destination, date, and seats | TBD | TBD | Partial (API verified; stops match by name only, no UI) |
| 31 | Segment booking at stopovers | TBD | TBD | Partial (API verified, no UI) |
| 32 | Departure-time filter | TBD | TBD | Not started |
| 33 | Price-range filter | TBD | TBD | Not started |
| 34 | Instant-booking filter | TBD | TBD | Not started |
| 35 | Verified-profile filter | TBD | TBD | Not started |
| 36 | Maximum-two-in-the-back filter | TBD | TBD | Not started |
| 37 | Amenity filters | TBD | TBD | Not started |
| 38 | Sorting by price, time, rating, and pickup proximity | TBD | TBD | Not started |
| 39 | Pickup-point map | TBD | TBD | Not started |
| 40 | Booking request and driver approval | TBD | TBD | Partial (API verified, no UI) |
| 41 | Redis temporary seat holds with TTL | TBD | TBD | Not started |

## Payments and pricing

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 42 | Prepayment at booking | TBD | TBD | Not started |
| 43 | Escrow-style payment hold | TBD | TBD | Not started |
| 44 | Service fee calculation | TBD | TBD | Not started |
| 45 | Driver payout after trip | TBD | TBD | Not started |
| 46 | Card, UPI, and wallet selection | TBD | TBD | Not started |
| 47 | Tiered refunds by cancellation timing | TBD | TBD | Not started |
| 48 | Full refund for qualifying driver cancellations | TBD | TBD | Not started |
| 49 | Transaction history | TBD | TBD | Not started |
| 50 | PDF invoice and receipt | TBD | TBD | Not started |

## Trust and safety

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 51 | Two-way star ratings | TBD | TBD | Not started |
| 52 | Written reviews | TBD | TBD | Not started |
| 53 | Driver response rate and time | TBD | TBD | Not started |
| 54 | Membership duration and completed rides | TBD | TBD | Not started |
| 55 | Report a user | TBD | TBD | Not started |
| 56 | Admin moderation queue | TBD | TBD | Not started |
| 57 | SOS and emergency-contact workflow | TBD | TBD | Not started |
| 58 | Insurance coverage badge | TBD | TBD | Not started |
| 59 | Women-only ride option | TBD | TBD | Not started |

## Communication

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 60 | Socket.IO chat | TBD | TBD | Not started |
| 61 | Masked calling | TBD | TBD | Not started |
| 62 | Web push | TBD | TBD | Not started |
| 63 | Email notifications | TBD | TBD | Not started |
| 64 | SMS notifications | TBD | TBD | Not started |
| 65 | Notification preferences | TBD | TBD | Not started |

## Trip execution

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 66 | Booking reference and boarding code | TBD | TBD | Not started |
| 67 | Meeting-point details and map | TBD | TBD | Not started |
| 68 | Live GPS tracking | TBD | TBD | Not started |
| 69 | Two-sided completion confirmation | TBD | TBD | Not started |
| 70 | Post-trip rating prompt | TBD | TBD | Not started |

## General platform

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 71 | English, Hindi, and Marathi | TBD | TBD | Not started |
| 72 | Referral programme | TBD | TBD | Not started |
| 73 | Static/configured MSRTC alternatives | TBD | TBD | Not started |
| 74 | Admin back office | TBD | TBD | Not started |

## Research modules

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 75 | PostGIS/OSRM feasibility filter | TBD | TBD | Not started (OSRM container and corridor prep exist; no filter) |
| 76 | Two-sided match scoring | TBD | TBD | Not started |
| 77 | CommitmentDecay survival modelling | TBD | TBD | Not started |
| 78 | Reliability indicator in search results | TBD | TBD | Not started |
| 79 | Anticipatory interventions | TBD | TBD | Not started |
| 80 | CP-SAT contact-budget scheduler | TBD | TBD | Not started |
| 81 | Hazard-informed passenger flexibility tiers | TBD | TBD | Not started |
| 84 | Mid-route vacant-seat allocation | TBD | TBD | Not started |
| 86 | Per-booking SHAP explanations | TBD | TBD | Not started |
| 88 | Cascade-aware recovery | TBD | TBD | Not started |
| 89 | Corridor demand calibration | TBD | TBD | Not started |
| 93 | Supply-gap detection and nudging | TBD | TBD | Not started |
| 94 | Driver commitment pricing | TBD | TBD | Not started |

## Advanced extensions

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 82 | Driver rest-stop planning | TBD | TBD | Not started |
| 83 | Fuel and EV charging stops | TBD | TBD | Not started |
| 85 | Weekly, monthly, and annual travel passes | TBD | TBD | Not started |
| 87 | Live what-if simulator | TBD | TBD | Not started |
| 90 | Reproducibility capsule (`make reproduce` or equivalent) | TBD | TBD | Not started |
| 91 | Last-mile rickshaw, bus, and walking access | TBD | TBD | Not started |
| 92 | Bus alternative after recovery failure | TBD | TBD | Not started |
| 95 | Driver reliability self-view | TBD | TBD | Not started |

## Infrastructure that exists but is not a backlog feature

| Item | State |
|---|---|
| `events` table and 22-event vocabulary (core-api V2 migration) | Verified 2026-10-10: migration applies, core-api tests 11/11 |
| Java `EventLogService` and Python `journex_events` writer | Verified 2026-10-10: Java 11/11, Python 17/17 (shared run) |
| Metric queries (`experiments/analysis/metrics.sql`) | Verified 2026-10-10: included in the 17 Python tests |
| Service skeletons: core-api, intel, gateway, web | Verified 2026-10-10: all four health endpoints UP; gateway tests 6/6 |
| OSRM routing | Not verified: container not started (220 MB download skipped) |
