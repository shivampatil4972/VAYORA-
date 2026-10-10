# Progress

## 2026-10-10 — model, variants, first experiment, web app, model in the platform

Committed on branch `stage-2-3-booking-core-and-simulator`. On the user's instruction
this work ran through several stages without stopping for approval after each.

| Slice | What | Verified by |
|---|---|---|
| Simulator population | People search repeatedly and lead time depends on latent type, so type leaves a trace the platform can observe | `sim/tests` |
| Durability model | Features, Kaplan-Meier / Cox / gradient-boosted survival, evaluation on disjoint seeds, Cox served by intel as `POST /v1/hazard/score` | `experiments/reports/hazard-h1.json`, `intel/tests`, `experiments/tests` |
| Variants B3, B4 | Survival-aware ranking; threshold reconfirmation request | `sim/tests` |
| First experiment | B0, B3, B4 on seeds 1-30, paired comparison | `experiments/reports/ladder-7a1c0de0-*.md` |
| Web app | Sign-in, search and booking, vehicles, publishing and running rides, administrator's durability screen | 34 component tests, production build |
| Model in the platform | Feature snapshot at request, daily and on-demand scoring through intel, scores appended to the event log, administrators only | `HazardScoringIntegrationTest`, live run |

**Headline result, synthetic data:** survival-aware ranking raises completed rides per
100 searches from 29.59 to 29.89 (+0.30, 95% CI +0.24 to +0.36). The intervention moves
cancellations earlier and refills more seats but adds nothing further on that metric.
The hypothesis is not supported at the assumed parameter values; the assumptions that
decide it have not been swept. Details in EXPERIMENT_PROTOCOL.md.

**Decisions made here**

- Cox PH is served: best departure Brier score and concordance of the three models.
- Durability scores are shown to administrators only, not to drivers or passengers.
- B1 and B2 were skipped: the simulated corridor has no geography to filter on.
- The gradient-boosted model is trained on a 5,000-row sample because its loss is
  quadratic in rows.

Current limitations are in KNOWN_LIMITATIONS.md; test counts and commands in TESTING.md.
The sections below are the earlier entries, kept as written.

## 2026-10-10 — Stage 3, first slice: the B0 simulator

Uncommitted. Details and simplifications are in [sim/README.md](../sim/README.md).

### What was built

- `sim/`: SimPy simulator (`simulator.py`), ground-truth cancellation process
  (`hazard.py`), strict config loader (`config.py`), frozen parameters (`frozen.py`), CLI
  runner (`run.py`).
- `experiments/configs/world.yaml`: the synthetic world. `variants/B0.yaml`: the baseline.
- New pinned dependencies in `requirements-research.txt`: `simpy`, `PyYAML`.

### Verified

Python 3.11 research container: 56 tests, 0 failures (39 new in `sim/tests`, 17 existing).
The new tests cover reproducibility by seed, the frozen vocabulary, no latent type in any
payload, legal booking paths, started = completed + failed, no overselling, the booking
horizon, paired environments, each latent type behaving as configured, strict config
loading, the hazard sampler, and a run written to PostgreSQL and read back by the metric
queries.

### A smoke run, not a result

`python -m sim.run --variant .../B0.yaml --seeds 1-3`, read through `metrics.sql`, then
deleted from the database:

| Seed | Searches | Completed trips | Per 100 searches | Late share of cancellations |
|---|---|---|---|---|
| 1 | 3640 | 1089 | 29.9 | 0.42 |
| 2 | 3569 | 1097 | 30.7 | 0.43 |
| 3 | 3749 | 1041 | 27.8 | 0.41 |

About 42% of searches returned no candidate. These figures show the pipeline works and
the corridor is neither empty nor full. They are **not findings**: three seeds, one
variant, and every parameter in `world.yaml` is an assumption.

### Open questions for the team

- The values in `world.yaml`. Each is a guess at a plausible magnitude and needs a
  source or a deliberate choice before any number is reported.
- Whether a passenger who is rejected, cancelled on or finds nothing should search again.
  Recovery variants need this; B0 does not have it.

## 2026-10-10 — Stage 2, second slice: trips

Uncommitted, like the first slice.

### What was built

| Endpoint (driver only) | Effect |
|---|---|
| `POST /rides/{id}/start` | Ride `SCHEDULED` to `IN_PROGRESS`. Unanswered requests are rejected and their seats returned. One `trip_started` per confirmed booking. |
| `POST /bookings/{id}/no-show` | Booking `CONFIRMED` to `NO_SHOW` while the ride is in progress. `trip_failed` with `reason: passenger_no_show`. |
| `POST /rides/{id}/complete` | Ride to `COMPLETED`. Each booking still confirmed becomes `COMPLETED` with a `trip_completed`. |
| `POST /rides/{id}/cancel` | Withdraws a ride that has not started. Each live booking is cancelled with a `booking_cancelled` carrying `departure_time` and `cancelled_by: driver`. |

Schema: `V4__add_trip_states.sql` widens the ride and booking status checks.

### The decision that matters for the research

**Trip events are per passenger booking, not per vehicle.** The primary metric divides
`trip_completed` by `search_issued`, and a search belongs to one passenger; the existing
metric fixtures also put trip counts on the scale of accepted bookings. So every booking
that gets a `trip_started` gets exactly one `trip_completed` or `trip_failed`. The
simulator must follow the same rule or live and simulated numbers will not be comparable.

Other choices: a ride may be started up to one hour before departure
(`journex.trip.early-start`); once started it takes no new bookings and passengers cannot
cancel; a no-show keeps its seat, since mid-route refill is a separate feature.

### Verified

`docker compose --profile test run --rm core-api-tests`: 39 tests, 0 failures. New:
`TripFlowIntegrationTest` (6) covers the started = completed + failed accounting,
rejection of unanswered requests on start, a started ride refusing bookings and
cancellations, forward-only ride states, driver ownership, and driver withdrawal.
`BookingStatusTest` grew to 6. Live stack: V4 applied to the existing database.

With this slice the primary metric is computable from platform events for the first time.

### Still not done

- Completion is the driver's word alone: no boarding code, no passenger confirmation.
- `trip_failed` has one cause, a no-show. A ride abandoned mid-route has no endpoint.
- A driver withdrawing a ride triggers no recovery search and no refund.
- Everything in the first slice's list below, except trips and driver cancellation.

## 2026-10-10 — Stage 2, first slice: booking core in core-api

**Assumption to confirm.** The repository does not define Stage 2. This slice assumes it
is the transactional booking core, because the simulator (Stage 3) and every later stage
need bookings and their events to exist. Uncommitted until the team confirms.

### What was built

| Area | What |
|---|---|
| Schema | `V3__create_booking_core.sql`: `users`, `vehicles`, `rides`, `ride_stops` (PostGIS points), `ride_segments`, `bookings` |
| Identity | Register, login, `GET /me`; BCrypt hashes; HS256 access token with `sub` and `role`, verified by the gateway with the shared `JWT_SECRET` |
| Vehicles | Create and list own vehicles (drivers) |
| Rides | Publish with 2-10 ordered stops and a price per leg; get; search by origin stop, destination stop, date and seats |
| Bookings | Request, driver accept or reject, passenger cancel; list own; list per ride for its driver |
| Events | `search_issued`, `candidates_returned`, `booking_requested`, `booking_accepted`, `booking_rejected`, `booking_cancelled` (with `departure_time`); no new event types |

All endpoints are under `/api/v1`. Errors are RFC 7807 problem documents.

### How seats stay correct

- Inventory is per leg. Booking stop `a` to stop `b` decrements legs `a..b-1` only.
- A request locks the ride row, then runs one conditional `UPDATE` that only touches legs
  with enough seats. If it touched fewer legs than requested, the transaction rolls back.
- Accept, reject and cancel take the same locks in the same order (ride, booking, legs).
- `CHECK (seats_available BETWEEN 0 AND seats_total)` backs this up in the database.

### Verified

`docker compose --profile test run --rm core-api-tests`: 32 tests, 0 failures.

| Test class | Tests | Covers |
|---|---|---|
| `BookingStatusTest` | 5 | Allowed and forbidden state transitions |
| `BookingFlowIntegrationTest` | 11 | Overlapping stretches, full middle leg, 8 concurrent requests for the last seat (exactly one wins), approval hold, reject and cancel release seats once, ownership checks, search, event rows |
| `ApiIntegrationTest` | 5 | 401 without a token, password stored hashed, bad credentials, duplicate email, role checks (403), another passenger cannot see or cancel a booking, full publish-search-book-accept-cancel journey over HTTP |
| `EventLogService*` (existing) | 11 | Unchanged, still passing |

Live stack: Flyway applied V3 to the existing database; a token issued by core-api was
accepted by the gateway's `verifyToken`; `GET /api/v1/me` without a token returned 401.

### Decisions made in this slice

- **JdbcTemplate, not JPA.** The existing code uses it, and the seat update is a single
  conditional SQL statement that reads more plainly without an ORM.
- **`JWT_SECRET` must be at least 32 bytes.** HS256 requires it. The dev default grew from
  18 to 37 characters and core-api refuses to start on a shorter one.
- **One role per account** (`PASSENGER`, `DRIVER`, `ADMIN`); admins cannot self-register.
- **A stranger's booking returns 404, not 403**, so booking ids cannot be probed.

### Not done, by design of this slice

- No user interface. `web/` is still the empty shell.
- No payments, refunds, seat holds with expiry, or Redis use.
- Search matches stop names exactly (case-insensitive). No distance or detour check, and
  OSRM is not called.
- No refresh tokens, email verification or rate limiting.
- The 7-day booking horizon is not enforced on publishing or booking.
- Registration reveals whether an email is already registered (409).
