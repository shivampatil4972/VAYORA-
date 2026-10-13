# Testing

Counts are from the runs on 2026-10-13. The core-api, Python and web suites passed with
no failures. The gateway suite was last run on 2026-10-10 and has not changed since.

| Suite | Command, from the repository root | Tests |
|---|---|---|
| core-api | `docker compose --profile test run --rm core-api-tests` | 107 |
| Python (events, simulator, model, experiments, intel API) | `docker compose --profile research run --rm research` | 108 |
| web | `cd web && npm ci && npm test` | 59 |
| gateway | `cd gateway && npm ci && npm test` | 6 |

The first two need only Docker. The Python suite also needs PostgreSQL running:
`docker compose up -d --wait postgres core-api` (core-api's Flyway creates the tables).

## What each suite covers

### core-api (JUnit 5; Testcontainers with real PostGIS, MongoDB and Redis)

| Class | Tests | Covers |
|---|---|---|
| `BookingStatusTest` | 6 | Allowed and forbidden status transitions |
| `BookingFlowIntegrationTest` | 11 | Per-leg inventory, a full middle leg, **8 concurrent requests for the last seat**, approval hold, release on reject and cancel exactly once, ownership, search, events |
| `TripFlowIntegrationTest` | 6 | Start, no-show, complete, driver withdrawal; started = completed + failed |
| `PaymentFlowIntegrationTest` | 16 | Hold on request, **a declined payment leaves no booking and no seat taken**, every refund tier, driver cancellation, payouts, **the ledger balances and cannot be rewritten**, idempotency key, the published terms |
| `RefundPolicyTest` | 5 | Tier boundaries, rounding, invalid tier configurations |
| `RatingFlowIntegrationTest` | 8 | One rating per side per completed trip, who may rate, averages, profiles expose no contact details |
| `NotificationIntegrationTest` | 6 | Who is told what, **nothing is sent for a rolled-back booking**, per-member access, **a MongoDB outage does not fail the caller** |
| `ModerationIntegrationTest` | 8 | Who may report whom, dismiss / warn / suspend, **a suspended member's existing token is refused**, reinstatement, **the audit log cannot be rewritten**, back office is administrators only |
| `RouteServiceTest` | 7 | OSRM request and response, caching, **an outage gives straight lines labelled as such**, great-circle distance |
| `RoutingIntegrationTest` | 7 | Route stored on a ride, **the access distance is a hard limit**, direction, the four sort orders, coarse positions in the event log, route preview and price suggestion, the Redis cache |
| `HazardScoringIntegrationTest` | 5 | Feature snapshot and history, one score per booking per day, which bookings are scored, **model outage changes nothing**, administrators only |
| `IntelHazardScorerTest` | 4 | Request contract with intel; outage, wrong feature version and invalid probability all yield no score |
| `ApiIntegrationTest` | 7 | 401 without a token, hashed passwords, bad credentials, role checks, another user's booking is invisible, **a bad query is a 400, not a 500**, full journey over HTTP, CORS |
| `EventLogService*` | 11 | The event writer never throws into its caller; events commit with the business change |

### Python (pytest, Python 3.11)

| Path | Tests | Covers |
|---|---|---|
| `sim/tests` | 52 | Reproducibility by seed, frozen vocabulary, **no latent type in any payload**, legal booking paths, no overselling, paired environments, each variant's rules, repeat search, strict config, the hazard sampler |
| `intel/tests` | 21 | Feature tracker, model maths, shipped models, scoring API and its validation |
| `experiments/tests` | 24 | Metric queries against hand-computed values, the training set, **disjoint seeds**, exported Cox model against lifelines, paired comparison statistics, parameter sweeps |
| `journex_events/tests` | 11 | Event writer and vocabulary |

### web (Vitest, Testing Library)

| File | Tests | Covers |
|---|---|---|
| `App.test.tsx` | 36 | Route protection by role, sign-in, search and booking with fee and payment method, idempotency key reuse, refund terms, earnings, ratings and profiles, notifications, reporting and moderation, the back office, maps and location search, the route planner, failure and retry states |
| `lib/schemas.test.ts` | 16 | Form validation and the publish request mapping |
| `lib/api.test.ts` | 7 | Token header, problem-document errors, unreachable server, sign-out on a rejected token, **no sign-out on a stale rejection** |

No web test can reach a real server: `fetch` is replaced before every test. The map
library is replaced by a stand-in that renders what the map was given as plain elements,
because Leaflet needs a real browser to draw.

## Checked by hand against the running stack

- Flyway migrations V1 to V9 applied to an existing database.
- A token issued by core-api verified by the gateway's own `verifyToken`.
- A full journey through the HTTP API with the browser's `Origin` header.
- A real booking scored by the real intel service, then the scoring job with intel stopped.
- A paid journey: a declined payment, a retried request returning the same booking, a
  late cancellation and a completed trip, with the ledger read back from the database.
- A rating reaching the driver's profile, notifications reaching both sides, and a
  booking made with MongoDB stopped.
- **OSRM**: the Kolhapur-Karad-Satara-Pune route came back as 235.9 km by road, was
  served from the Redis cache on the second request, and a location search found a ride
  from 2 km away and not from 12 km away.

## Bugs the tests found

Kept here because each is a class of mistake worth remembering.

- An unticked stop on the publish form was still validated, so a stray value in a hidden
  field blocked publishing with no visible error.
- An invalid query parameter returned 500 instead of 400.
- A late 401 for a request made by an earlier session signed out the session that had
  replaced it. Found because a test without a stubbed server reached the running API.

## Not tested

- **No screen has been viewed in a browser**, and there is no browser end-to-end test.
  The real map has therefore never been seen to draw.
- The vehicle and my-rides pages have no page-level test, so the driver's accept, start,
  no-show and complete buttons are untested in the UI.
- No load, security-scan or accessibility-audit tooling has been run.
- Hold expiry, duplicate provider callbacks and Socket.IO restart: the features do not
  exist.
