# Feature matrix

One row per requirement of the 95-feature backlog (IDs 1-95, original numbering).

**Tier** (A = fully implemented and tested, B = implemented with a documented
simplification, C = mock or simulated provider) was meant to be preserved from a supplied
classification. The build specification did not include one, so every tier is `TBD` until
the team supplies it. Nothing here has been assigned a tier by guesswork.

**Stage** is `TBD` for the same reason: CLAUDE.md fixes eight stages but only Stage 3
(the simulator) is described in the repository.

**Status** values: `Not started`, `Partial`, `Verified`, `Blocked`. `Verified` means the
behaviour is exercised by an automated test that passes; a row says which layers. No
screen has been looked at in a browser: UI claims rest on component tests and a clean
production build.

Last updated: 2026-10-13. Test suites and how to run them are in [TESTING.md](TESTING.md).

## Identity and profile

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 1 | Email/phone signup | TBD | TBD | Partial: email signup and sign-in, API and UI tested; no phone signup |
| 2 | Google OAuth login | TBD | TBD | Not started |
| 3 | Profile photo upload | TBD | TBD | Not started |
| 4 | Bio, age, and gender | TBD | TBD | Verified (API and UI tests): bio and an approximate age on the profile; gender is stored and shown to nobody |
| 5 | Email verification | TBD | TBD | Verified (API and UI tests), simulated sender, nothing is sent: the code is read from an administrator-only outbox |
| 6 | Phone OTP verification | TBD | TBD | Partial: API verified, simulated sender, nothing is sent: the code is read from an administrator-only outbox; the screen is the email one, tested for email only |
| 7 | Government ID verification | TBD | TBD | Not started |
| 8 | Verified-profile badge | TBD | TBD | Partial: "Email confirmed" and "Phone confirmed" on the profile, which also says no identity document was checked |
| 9 | Experience levels from Newcomer to Ambassador | TBD | TBD | Not started |
| 10 | Smoking, pets, music, and travel preferences | TBD | TBD | Verified (API and UI tests): shown on the profile; not yet used by search |
| 11 | Chattiness level | TBD | TBD | Verified (API and UI tests): shown on the profile; not yet used by search |

## Vehicle management

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 12 | Make, model, year, and colour | TBD | TBD | Partial: API verified; vehicle form built, validation tested, page itself untested |
| 13 | Seat count and comfort class | TBD | TBD | Partial: seat count as 12; no comfort class |
| 14 | Luggage allowance | TBD | TBD | Not started |
| 15 | EV status, battery capacity, and consumption rate | TBD | TBD | Not started |
| 16 | Vehicle photo | TBD | TBD | Not started |

## Driver ride publishing

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 17 | Origin-to-destination ride publishing | TBD | TBD | Partial: API verified; publish form built, its validation and request mapping tested, page itself untested |
| 18 | Intermediate stopovers | TBD | TBD | Partial: API verified; publish form built, its validation and request mapping tested, page itself untested |
| 19 | Per-segment pricing | TBD | TBD | Partial: API verified; publish form built, its validation and request mapping tested, page itself untested |
| 20 | Price suggestion engine | TBD | TBD | Verified (API and UI tests), simplified: road distance times a flat rate, offered to the driver, never applied |
| 21 | Date and departure time | TBD | TBD | Partial: API verified; publish form built, its validation and request mapping tested, page itself untested |
| 22 | Offered seats | TBD | TBD | Partial: API verified; publish form built, its validation and request mapping tested, page itself untested |
| 23 | Maximum-two-in-the-back preference | TBD | TBD | Not started |
| 24 | Instant booking versus approval | TBD | TBD | Partial: API verified; publish form built, its validation and request mapping tested, page itself untested |
| 25 | Return trip publishing | TBD | TBD | Not started |
| 26 | Recurring weekly rides | TBD | TBD | Not started |
| 27 | Map-based pickup/drop-off selection | TBD | TBD | Verified: a driver moves each meeting point on a map. UI tested with a stand-in map; the real map has not been seen in a browser |
| 28 | Detour tolerance | TBD | TBD | Not started. Passengers board at a ride's stops, so a driver never detours; there is nothing to tolerate yet |
| 29 | Journey description and notes | TBD | TBD | Not started |

## Passenger search and booking

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 30 | Search by origin, destination, date, and seats | TBD | TBD | Verified (API and UI tests): by location, date and seats. A stop must be within 5 km of each end |
| 31 | Segment booking at stopovers | TBD | TBD | Verified (API and UI tests) |
| 32 | Departure-time filter | TBD | TBD | Not started |
| 33 | Price-range filter | TBD | TBD | Not started |
| 34 | Instant-booking filter | TBD | TBD | Not started |
| 35 | Verified-profile filter | TBD | TBD | Not started |
| 36 | Maximum-two-in-the-back filter | TBD | TBD | Not started |
| 37 | Amenity filters | TBD | TBD | Not started |
| 38 | Sorting by price, time, rating, and pickup proximity | TBD | TBD | Verified (API and UI tests): by time, price, driver rating or pickup distance |
| 39 | Pickup-point map | TBD | TBD | Verified: a result's route with the boarding stop marked. UI tested with a stand-in map; the real map has not been seen in a browser |
| 40 | Booking request and driver approval | TBD | TBD | Partial: request and cancel verified in API and UI tests; driver accept and decline verified in API, screen untested |
| 41 | Redis temporary seat holds with TTL | TBD | TBD | Not started |

## Payments and pricing

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 42 | Prepayment at booking | TBD | TBD | Verified (API and UI tests), mock provider, no money moves: fare plus fee is held when the booking is requested |
| 43 | Escrow-style payment hold | TBD | TBD | Verified (API tests), mock provider, no money moves: hold, then capture or release once when the booking ends; append-only ledger |
| 44 | Service fee calculation | TBD | TBD | Verified (API and UI tests): 10% of the fare, configurable, shown before booking |
| 45 | Driver payout after trip | TBD | TBD | Verified (API and UI tests), mock provider, no money moves: fare paid to the driver on completion, no-show or late cancellation |
| 46 | Card, UPI, and wallet selection | TBD | TBD | Partial: method is chosen and recorded, API and UI tested; mock provider, no money moves, so the choice changes nothing |
| 47 | Tiered refunds by cancellation timing | TBD | TBD | Verified (API and UI tests): refund share by time before boarding, tiers in config and shown before cancelling |
| 48 | Full refund for qualifying driver cancellations | TBD | TBD | Verified (API tests): everything returned, fee included, when the driver cancels, declines or never answers |
| 49 | Transaction history | TBD | TBD | Partial: passenger payments and driver payouts by API; driver earnings screen tested; no passenger payments screen |
| 50 | PDF invoice and receipt | TBD | TBD | Not started |

## Trust and safety

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 51 | Two-way star ratings | TBD | TBD | Verified (API and UI tests): each side rates the other once after a completed trip |
| 52 | Written reviews | TBD | TBD | Verified (API and UI tests): optional comment, shown on the profile as plain text; no moderation |
| 53 | Driver response rate and time | TBD | TBD | Not started |
| 54 | Membership duration and completed rides | TBD | TBD | Verified (API and UI tests): member-since and completed trips on the profile |
| 55 | Report a user | TBD | TBD | Verified (API and UI tests): only someone you shared a booking with; one open report per pair |
| 56 | Admin moderation queue | TBD | TBD | Verified (API and UI tests): dismiss, warn or suspend; suspension is enforced on every request |
| 57 | SOS and emergency-contact workflow | TBD | TBD | Verified (API and UI tests), simulated: the alert reaches an administrator queue; **emergency contacts are not messaged** and the screen says so and points to 112 |
| 58 | Insurance coverage badge | TBD | TBD | Not started |
| 59 | Women-only ride option | TBD | TBD | Not started |

## Communication

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 60 | Socket.IO chat | TBD | TBD | Verified (gateway and UI tests, live run): one chat per ride for its driver and booked passengers, stored in MongoDB |
| 61 | Masked calling | TBD | TBD | Not started |
| 62 | Web push | TBD | TBD | Not started |
| 63 | Email notifications | TBD | TBD | Not started |
| 64 | SMS notifications | TBD | TBD | Not started |
| 65 | Notification preferences | TBD | TBD | Not started |

## Trip execution

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 66 | Booking reference and boarding code | TBD | TBD | Not started |
| 67 | Meeting-point details and map | TBD | TBD | Verified: meeting point and route on a booking. UI tested with a stand-in map; the real map has not been seen in a browser |
| 68 | Live GPS tracking | TBD | TBD | Partial: the driver shares their position while the ride is under way and passengers see the latest point on a map. Verified in gateway and UI tests and a live run; the browser's own location reading and the real map are unseen |
| 69 | Two-sided completion confirmation | TBD | TBD | Partial: driver starts and completes, API verified; no passenger confirmation |
| 70 | Post-trip rating prompt | TBD | TBD | Partial: a rating form appears on completed trips and a notification points to it; no reminder |

## General platform

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 71 | English, Hindi, and Marathi | TBD | TBD | Partial: every screen is in English, Hindi and Marathi and tests enforce completeness. The translations have had no native review, and text the server writes (error explanations, notification messages) stays in English |
| 72 | Referral programme | TBD | TBD | Not started |
| 73 | Static/configured MSRTC alternatives | TBD | TBD | Not started |
| 74 | Admin back office | TBD | TBD | Partial: overview, reports queue, members, booking durability and audit log, API and UI tested; no ride or booking browser, no experiment screens |

## Research modules

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 75 | PostGIS/OSRM feasibility filter | TBD | TBD | Partial: the access distance is a hard limit enforced in PostGIS, and rides carry an OSRM road route; no detour or EV energy check |
| 76 | Two-sided match scoring | TBD | TBD | Not started |
| 77 | CommitmentDecay survival modelling | TBD | TBD | Partial: model trained, evaluated, served and scored in the app, on synthetic data only; see AI_ML_METHODOLOGY.md |
| 78 | Reliability indicator in search results | TBD | TBD | Not started |
| 79 | Anticipatory interventions | TBD | TBD | Partial: in the simulator only (variant B4); the platform sends no interventions |
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
| 90 | Reproducibility capsule (`make reproduce` or equivalent) | TBD | TBD | Partial: every result reproduces from documented commands; no single `make reproduce` |
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
| OSRM routing | Verified against the running container: 235.9 km for the four-town route; cached in Redis |
| Audit log of administrative actions | Verified (API and UI tests); append-only by trigger |
| B0, B3, B4 simulator variants and paired comparison | Verified: 30-seed run, see EXPERIMENT_PROTOCOL.md |
| Parameter sweeps over the simulated world | Verified: intervention-response sweep, see EXPERIMENT_PROTOCOL.md |
| In-app notifications (MongoDB) | Verified (API and UI tests). Not one of the 95: features 62-64 are push, email and SMS, none of which exist |
| Idempotent booking requests | Verified (API and UI tests) |
