# Testing

Counts are from the runs on 2026-10-10. Every suite passed with no failures.

| Suite | Command, from the repository root | Tests |
|---|---|---|
| core-api | `docker compose --profile test run --rm core-api-tests` | 84 |
| Python (events, simulator, model, experiments, intel API) | `docker compose --profile research run --rm research` | 100 |
| web | `cd web && npm ci && npm test` | 45 |
| gateway | `cd gateway && npm ci && npm test` | 6 |

The first two need only Docker. The Python suite also needs PostgreSQL running:
`docker compose up -d --wait postgres core-api` (core-api's Flyway creates the tables).

## What each suite covers

### core-api (JUnit 5, Testcontainers with real PostGIS and MongoDB)

| Class | Tests | Covers |
|---|---|---|
| `BookingStatusTest` | 6 | Allowed and forbidden status transitions |
| `BookingFlowIntegrationTest` | 11 | Per-leg inventory, a full middle leg, **8 concurrent requests for the last seat**, approval hold, release on reject and cancel exactly once, ownership, search, events |
| `TripFlowIntegrationTest` | 6 | Start, no-show, complete, driver withdrawal; started = completed + failed |
| `HazardScoringIntegrationTest` | 5 | Feature snapshot and history, one score per booking per day, which bookings are scored, **model outage changes nothing**, administrators only |
| `IntelHazardScorerTest` | 4 | Request contract with intel; outage, wrong feature version and invalid probability all yield no score |
| `PaymentFlowIntegrationTest` | 16 | Hold on request, **a declined payment leaves no booking and no seat taken**, every refund tier, driver cancellation, payouts, **the ledger balances and cannot be rewritten**, idempotency key, the published terms |
| `RefundPolicyTest` | 5 | Tier boundaries, rounding, invalid tier configurations |
| `RatingFlowIntegrationTest` | 8 | One rating per side per completed trip, who may rate, averages, profiles expose no contact details |
| `NotificationIntegrationTest` | 6 | Who is told what, **nothing is sent for a rolled-back booking**, per-member access, **a MongoDB outage does not fail the caller** |
| `ApiIntegrationTest` | 6 | 401 without a token, hashed passwords, bad credentials, role checks, another user's booking is invisible, full journey over HTTP, CORS |
| `EventLogService*` | 11 | The event writer never throws into its caller; events commit with the business change |

### Python (pytest, Python 3.11)

| Path | Tests | Covers |
|---|---|---|
| `sim/tests` | 47 | Reproducibility by seed, frozen vocabulary, **no latent type in any payload**, legal booking paths, no overselling, paired environments, each variant's rules, strict config, the hazard sampler |
| `intel/tests` | 19 | Feature tracker, model maths, shipped models, scoring API and its validation |
| `experiments/tests` | 23 | Metric queries against hand-computed values, the training set, **disjoint seeds**, exported Cox model against lifelines, paired comparison statistics, parameter sweeps |
| `journex_events/tests` | 11 | Event writer and vocabulary |

### web (Vitest, Testing Library)

| File | Tests | Covers |
|---|---|---|
| `App.test.tsx` | 24 | Route protection by role, sign-in errors, search and booking with fee and payment method, idempotency key reuse, refund terms, earnings, ratings and profiles, notifications, failure and retry states, the administrator's screen |
| `lib/schemas.test.ts` | 15 | Form validation and the publish request mapping |
| `lib/api.test.ts` | 6 | Token header, problem-document errors, unreachable server, sign-out on a rejected token |

## Checked by hand against the running stack

- Flyway migrations V1 to V5 applied to an existing database.
- A token issued by core-api verified by the gateway's own `verifyToken`.
- A full journey through the HTTP API with the browser's `Origin` header: publish,
  search, book, accept, start, no-show, complete, with the expected events written.
- A real booking scored by the real intel service, then the scoring job run with intel
  stopped.
- A paid journey: a declined payment, a retried request returning the same booking, a
  late cancellation and a completed trip, with the ledger read back from the database.
- A rating reaching the driver's profile, notifications reaching both sides, and a
  booking made with MongoDB stopped.

## Not tested

- No browser end-to-end test, and no screen has been viewed in a browser.
- The vehicle, publish-ride and my-rides pages have no page-level test.
- OSRM has never been started here.
- No load, security-scan or accessibility-audit tooling has been run.
- Hold expiry, duplicate provider callbacks, recovery and Socket.IO restart: the
  features do not exist. Payment failure, refunds and notification failure are tested.
