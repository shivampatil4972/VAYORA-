# Testing

Counts are from the runs on 2026-10-13. Every suite passed with no failures.

| Suite | Command, from the repository root | Tests |
|---|---|---|
| core-api | `docker compose --profile test run --rm core-api-tests` | 161 |
| Python (events, simulator, model, scheduler, experiments, intel API) | `docker compose --profile research run --rm research` | 168 |
| web | `cd web && npm ci && npm test` | 148 |
| gateway | `cd gateway && npm ci && npm test` | 25 |

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
| `AccountIntegrationTest` | 11 | Profile replace and clear, **the public profile never shows phone, birth year or gender**, **a code is stored only as a hash, works once, expires, and is spent by wrong guesses**, a changed number undoes its proof, three contacts at most, **an SOS answer says nobody was really messaged**, repeat presses, acknowledgement audited, administrators only |
| `VehicleIntegrationTest` | 6 | Comfort, luggage and EV figures kept, **the range is the driver's two figures divided and rounded down**, battery figures refused on a non-electric vehicle, a search result names its car, validation, a driver sees only their own |
| `SeatHoldIntegrationTest` | 8 | Held seats are left alone on the legs held and nowhere else, a hold takes nothing from PostgreSQL, **8 simultaneous holds on the last seat: exactly one is placed**, replacing and releasing, one ride at a time, **a hold lapses on its own**, search shows others only what is not held, **with Redis unreachable nothing is held and nothing is blocked** |
| `BookingExpiryIntegrationTest` | 5 | An unanswered request closes after 12 hours or 2 hours before boarding, **refunded in full with the fee, logged as the platform's action**, closed once, an answered or instant booking is never closed, a request too late to be answered is refused, the terms endpoint |
| `WomenOnlyRideIntegrationTest` | 5 | Only a driver who says she is a woman can offer one; **shown to, bookable and holdable by women only**, a filter cannot get round it, the rule follows the profile as it is now |
| `PassIntegrationTest` | 5 | A pass runs for its days and the next starts when it ends, **a declined payment buys nothing**, **the fee is waived in search and in the booking while the fare stays the same**, an expired pass waives nothing, who may buy |
| `ReceiptIntegrationTest` | 6 | **Each receipt read back as text**: amounts, refund, provider, the simulated-payment statement, not a tax invoice; nobody gets another's; characters the fonts cannot draw become "?"; the endpoint serves a PDF |
| `ResponseRateIntegrationTest` | 3 | **Only the driver's own answers count**: lapsed requests and those closed when the ride starts are unanswered, withdrawn ones do not count; the median time; nothing for passengers or instant rides |
| `RouteServiceTest` | 7 | OSRM request and response, caching, **an outage gives straight lines labelled as such**, great-circle distance |
| `RoutingIntegrationTest` | 12 | **A ride, its return and their weekly repeats are published together or not at all**, the return reverses stops, intervals and prices, the back-seat promise and its filter, **Each search filter narrows and none widens; a driver who has not said is not assumed smoke-free**, impossible filters are a 400, route stored on a ride, **the access distance is a hard limit**, direction, the four sort orders, coarse positions in the event log, route preview and price suggestion, the Redis cache |
| `HazardScoringIntegrationTest` | 5 | Feature snapshot and history, one score per booking per day, which bookings are scored, **model outage changes nothing**, administrators only |
| `IntelHazardScorerTest` | 4 | Request contract with intel; outage, wrong feature version and invalid probability all yield no score |
| `ApiIntegrationTest` | 7 | 401 without a token, hashed passwords, bad credentials, role checks, another user's booking is invisible, **a bad query is a 400, not a 500**, full journey over HTTP, CORS |
| `EventLogService*` | 11 | The event writer never throws into its caller; events commit with the business change |

### Python (pytest, Python 3.11)

| Path | Tests | Covers |
|---|---|---|
| `sim/tests` | 61 | **The oracle asks exactly the late cancellers and leaks nothing**, **A contact budget is never exceeded and, when too large to bind, reproduces the threshold policy exactly**, **the scheduler is given no ground truth**, reproducibility by seed, frozen vocabulary, **no latent type in any payload**, legal booking paths, no overselling, paired environments, each variant's rules, repeat search, strict config, the hazard sampler |
| `intel/tests` | 68 | Exact per-feature explanations that reproduce the score, Feature tracker, model maths, shipped models, scoring API and its validation; the contact scheduler: each limit, **the plan equals the best of every subset on 25 random instances**, ties, order-independence, a 400-booking round, its API |
| `experiments/tests` | 28 | Refill share by release timing against hand-computed values, The refill-additionality metric against hand-computed values, sweeps over a variant's parameters, metric queries against hand-computed values, the training set, **disjoint seeds**, exported Cox model against lifelines, paired comparison statistics, parameter sweeps |
| `journex_events/tests` | 11 | Event writer and vocabulary |

### web (Vitest, Testing Library)

| File | Tests | Covers |
|---|---|---|
| `App.test.tsx` | 79 | A driver's response rate on the profile, The two main reasons for a durability estimate, Downloading a receipt with the session token, Buying a pass, running, waiting and ended passes, Women-only rides offered and filtered only where the profile allows, A passenger's payments and refunds, Publishing a ride through the page, a driver accepting and declining requests, starting, marking a no-show and completing, each irreversible step only after confirming, The deadline shown on a pending request, Holding seats and being told it is not a booking, Adding a vehicle through the page, the car named on a search result, How many rides a form will publish, driver notes shown as text, Search filters sent only when set and only on Search, the account page, confirmation by code, emergency contacts, **the emergency panel puts 112 first and says the contacts were not messaged**, the administrator emergency queue and simulated outbox, route protection by role, sign-in, search and booking with fee and payment method, idempotency key reuse, refund terms, earnings, ratings and profiles, notifications, reporting and moderation, the back office, maps and location search, the route planner, failure and retry states |
| `lib/schemas.test.ts` | 24 | Vehicle details and their request mapping, A return that leaves before arrival is refused, repeat and notes limits, Form validation and the publish request mapping |
| `components/RideChat.test.tsx` | 15 | Joining with the session token, history, sending, **a message shown once and only when relayed**, text rendered as text, refusal and outage states, rejoining after a dropped connection, position shown to passengers, sharing offered to the driver only while under way |
| `lib/i18n.test.tsx` | 21 | **Every marked string has a Hindi and a Marathi entry with the same placeholders**, no unused entries, **no screen has text that bypasses translation**, fallback to English, switching and remembering the language, the same digits for money in every language |
| `lib/api.test.ts` | 7 | Token header, problem-document errors, unreachable server, sign-out on a rejected token, **no sign-out on a stale rejection** |

### gateway (node:test, real Socket.IO server and clients)

| File | Tests | Covers |
|---|---|---|
| `test/realtime.test.js` | 19 | Connection refused without a valid token, **a non-member cannot join and a missing ride looks the same**, **a message never reaches another ride**, the sender is named by the server, validation, rate limit, history on join, **someone who cancels stops receiving even if silent**, only the driver may send a position and only under way, rejoin after a dropped connection, a failing store, the membership call to core-api |
| `test/auth.test.js` | 6 | Token verification |

No web test can reach a real server: `fetch` is replaced before every test. The map
library is replaced by a stand-in that renders what the map was given as plain elements,
because Leaflet needs a real browser to draw.

## Checked by hand against the running stack

- Flyway migrations V1 to V14 applied to an existing database.
- **A receipt**: a pass receipt downloaded from the running API and opened: it reads
  correctly and states that the payment was simulated.
- **A travel pass**: a weekly pass bought for ₹99; the holder saw and paid no fee on a
  ₹450 fare, another passenger saw and paid ₹45.
- **A women-only ride**: published by a driver who said she is a woman, found by a woman
  passenger and not by a man, booked by her and refused to him.
- **An unanswered request**: aged by 13 hours in the database, it was closed by the
  scheduled job within five minutes, refunded ₹495 (fare and fee) and logged as the
  platform's action. A request 90 minutes before an approval ride left was refused.
- **A seat hold**: one passenger held both seats of a ride; a second was refused a hold
  and refused a booking, each with a reason; the first then booked and the hold was gone.
- **A vehicle**: an electric vehicle added over HTTP came back with a 270 km range from
  40.5 kWh at 15 kWh per 100 km; battery figures on a non-electric vehicle were refused.
- **A series**: one request published a ride, its return and next week's pair; the
  return was found by a search in the other direction with the back-seat filter; a
  return leaving before arrival was refused with a reason.
- **Account and SOS**: a profile saved, a second code refused within the minute, the
  code read from the administrator outbox (refused to a member), a wrong then the right
  code, an SOS with a position, a repeat press returning the same alert, the alert in
  the queue, acknowledged once, and the public profile showing an age but no phone.
- A token issued by core-api verified by the gateway's own `verifyToken`.
- A full journey through the HTTP API with the browser's `Origin` header.
- A real booking scored by the real intel service, then the scoring job with intel stopped.
- A paid journey: a declined payment, a retried request returning the same booking, a
  late cancellation and a completed trip, with the ledger read back from the database.
- A rating reaching the driver's profile, notifications reaching both sides, and a
  booking made with MongoDB stopped.
- **Chat and position** (`node gateway/scripts/live-check.mjs`): over real sockets, a
  stranger was refused, driver and passenger exchanged a message, a position was refused
  before the ride started and from the passenger, then relayed once under way, and both
  were found in MongoDB with the 7-day expiry on positions.
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

## A bug the tests did not find

- **Saving a profile, removing an emergency contact and releasing a seat hold would have
  failed in a browser.** The CORS configuration allowed only GET and POST, and those
  three use PUT and DELETE. Every test passed, because server tests sent no browser
  preflight for those methods and web tests replace the network. It was found by reading
  the configuration while writing SECURITY.md. A preflight test for each method now
  exists. It is the clearest evidence so far for the first item below.

## Not tested

- Confirming a phone number through the screen. The API path is tested; the screen is
  the same component as for email and is tested for email only.
- The device position on a real device: the emergency panel is tested with a stand-in.
- **No screen has been viewed in a browser**, and there is no browser end-to-end test.
  The real map has therefore never been seen to draw.
- No load, security-scan or accessibility-audit tooling has been run.
- Duplicate provider callbacks: the feature does not exist.
- A hold lapsing in real time. The test moves a clock; nobody waited five minutes.
- A gateway restart with clients connected. Rejoining after a single dropped connection
  is tested; the whole server going away and coming back is not.
