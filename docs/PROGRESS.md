# Progress

## 2026-10-14 — phone confirmation screen tested

- **Feature 6** moves from Partial to Verified: a UI test now confirms a phone number on the
  account page. No code changed; the screen was already shared with email. Still a
  simulated sender: no SMS is sent.

## 2026-10-14 — electric range warning

- **Range against route (features 15 and 75).** When a driver works out the route for an
  electric car, the publish screen compares the road distance with the range implied by the
  driver's own battery and consumption figures and, if the route is longer, tells them to
  plan a charging stop. A warning only: publishing is not blocked, and no charging stop is
  planned (feature 83 still needs charger data). Verified by `App.test.tsx`.

## 2026-10-14 — bus alternatives

- **Bus alternatives (features 73 and 92).** Administrators enter bus services (operator,
  towns, daily departure time, journey time, fare). A passenger whose search finds no ride
  sees the listed buses between those towns; a passenger whose ride is withdrawn with no
  other ride to offer is named up to three in the notice. No timetable ships with the
  platform: nothing was invented, and nothing checks the entries against MSRTC, which both
  screens and the notice say. Verified by `BusIntegrationTest` and `App.test.tsx`.

## 2026-10-16 (later) — reproducibility, completion confirmation, rating reminders

- **`scripts/reproduce.sh`** rebuilds the tests, the model, the ladder and the current
  sweeps, and fails unless every output matches the committed file. Run in full: every
  committed number reproduced exactly (EXPERIMENT_PROTOCOL.md section 4). The script was
  committed with the boarding-code change by mistake rather than on its own.
- **Two-sided completion (feature 69).** A passenger can confirm a completed trip or say
  it did not happen; a denial is listed for administrators and nothing is reversed
  automatically. API only so far.
- **Rating reminders (feature 70).** One reminder, a day after the trip, to each side that
  has not rated it.

## 2026-10-16 (later) — boarding codes

Each booking now has a reference (`JX-000090`) and a 4-digit boarding code. The passenger
can show theirs; the driver can check a code against a booking but is never sent it.
Checking changes nothing: a wrong code does not stop anyone travelling, and boarding is
still the driver's word. Verified by `BoardingIntegrationTest` and `App.test.tsx`.

## 2026-10-16 — the oracle ceiling

Committed on `stage-2-3-booking-core-and-simulator`.

An `ORACLE` variant asks exactly the bookings the simulator knows will be cancelled late:
an upper bound for any reconfirmation policy, labelled as not a method. Against B3 it gains
+0.10 completed rides per 100 searches (+0.07 to +0.13, 30 seeds), against B4's −0.01.
Section 12 of EXPERIMENT_PROTOCOL.md states the research conclusion so far: the premise
holds, the lever is weak even when aimed perfectly, and the model cannot aim it.

## 2026-10-15 (late night) — why early release adds so little

Committed on `stage-2-3-booking-core-and-simulator`.

A new metric, `refill_by_release_timing`, applied to the existing ladder run: seats
released early are refilled about 94% of the time, seats released late about 68%. So the
project's premise holds in this simulator. The intervention fails for a plainer reason:
B4 moves only about 10 of 67 late releases per seed earlier, worth at most about 0.07
completed rides per 100 searches, and adds about 7 cancellations of its own. The
measured effect (zero within ±0.04) is close to what that arithmetic allows. Section 11
of EXPERIMENT_PROTOCOL.md has the numbers and the proposed next test, an oracle variant.

## 2026-10-15 (night) — publishing lead, and driver response rate

Committed on `stage-2-3-booking-core-and-simulator`.

**Research, synthetic data.** A publishing-lead sweep (rides published at least 1, 4 or 7
days ahead) tested the other explanation left by section 9. Publishing everything a week
ahead lowers empty searches only from 54.5% to 50%, so most are full rides, which the
configuration's own numbers predict (about 31 seats a day offered, 84 wanted). Early
release still adds nothing, which in a seat-scarce world is the real puzzle. Section 10
lists three candidate reasons; the first can be measured from the existing log.

**Driver response rate (feature 53).** A driver's profile shows the share of requests
they answered themselves and their median time to answer. A new column records whether a
request was declined by the driver or closed by the platform, so lapsed requests and those
closed when the ride started count against the driver rather than as answers. Nothing is
shown below three settled requests.

## 2026-10-15 (late) — a wider departure window, and explained scores

Committed on `stage-2-3-booking-core-and-simulator`.

**Research, synthetic data.** A departure-tolerance sweep (1, 2, 4 and 8 hours either side,
each with its own B3 baseline, 30 seeds) tested the guess in section 8 that early release
fails because freed seats are on the wrong departure. It does not hold: a wider window
helps every variant equally, early release still adds nothing (and at 8 hours costs
0.05), and 52% of searches find no ride even at 8 hours. Section 8 is marked as
corrected; section 9 has the result and the two explanations still standing.

**Explanations.** Every durability score now carries each feature's exact share of the
log relative risk, from intel through the event log to the administrators' page, which
names the two features that moved each estimate most. For Cox these shares are the whole
explanation, so no SHAP library was added. Verified by intel, core-api and web tests.

Sweep reports now include refills and the share of searches offered no ride.

## 2026-10-15 (night) — the last three documents

DECISIONS, IMPLEMENTATION_ROADMAP and DATASET_DOCUMENTATION are written, so every
document the specification asked for now exists. DECISIONS gathers what PROGRESS
recorded, by subject. The roadmap says plainly that the team's stage definitions and
feature tiers were never given and that its order is a proposal. DATASET_DOCUMENTATION
was checked against the training code, which corrected three statements in the draft.

## 2026-10-15 (evening) — PDF receipts

Committed on `stage-2-3-booking-core-and-simulator`.

A passenger can download a PDF receipt for each booking payment and each pass, from the
payments and passes pages. Verified by `ReceiptIntegrationTest`, which reads each PDF
back as text, `App.test.tsx`, and a receipt downloaded from the running API and opened.

- Apache PDFBox is the one new dependency: Apache-2.0, pure Java, and able to read PDFs
  back, which is how the tests check what a receipt says.
- Every receipt states the provider and, while it is the mock, that no money moved. None
  is a tax invoice.
- The download goes through the API client with the session token; a plain link would go
  without it and be refused.

## 2026-10-15 (later) — travel passes

Committed on `stage-2-3-booking-core-and-simulator`.

Passengers can buy a weekly (₹99), monthly (₹299) or annual (₹2,499) pass through the
mock provider. While it runs, search prices and bookings carry no service fee. Verified by
`PassIntegrationTest`, `App.test.tsx` and a live run.

- **A pass waives only the service fee.** Drivers set their fares, so a platform discount
  can only come out of what the platform charges. The driver is paid the same either way.
- Whether a pass applies is decided when the booking is requested, and is not revisited.
- A pass bought while another runs starts when that one ends, so buying early wastes no
  days.
- Prices are in `application.yml` and are the authors' assumptions.

## 2026-10-15 — women-only rides

Committed on `stage-2-3-booking-core-and-simulator`.

A driver whose profile says she is a woman can offer a ride to women passengers only.
It is shown to, and can be booked or held by, passengers whose profile says the same,
and nobody else; a search filter lets a woman see only such rides. Verified by
`WomenOnlyRideIntegrationTest`, `App.test.tsx` and a live run.

- **The rule rests on a self-declaration.** Gender is what members choose on their
  profile, and nothing checks it. The account page now says so where the choice is made.
  A stronger rule needs identity checks the project does not have.
- The rule is enforced on the server three times: in search, booking and holds. The
  screens only decide what to offer.
- Gender is still never shown to anyone.

## 2026-10-14 (late night) — the driver's pages tested, and a payments page

Committed on `stage-2-3-booking-core-and-simulator`.

- **Page-level tests for publishing and running a ride.** The publish form is now tested
  through the page, from typing to the request sent and the list shown after, and the
  my-rides page through accepting, declining, starting, marking a no-show and completing.
  Seven features held at "partial" only for want of these tests are now verified. All
  four tests passed on their first run.
- **A payments page for passengers**: what was paid, by which method, what came back
  and why, under the notice that payments are simulated.

## 2026-10-14 (night) — a time limit on unanswered requests

Committed on `stage-2-3-booking-core-and-simulator`.

A request a driver does not answer is closed after 12 hours, or once boarding is 2 hours
away, whichever comes first. Its seats go back and the passenger gets everything back,
fee included. Both sides are told. A request for an approval ride that could not be
answered in time is refused when it is made. The passenger's bookings page says when a
pending request will close. Verified by `BookingExpiryIntegrationTest`, `App.test.tsx`
and a live run in which the scheduled job closed a request by itself.

- The closing is logged as `booking_rejected` with the platform as actor and
  `reason: not_answered_in_time`, so a driver's refusal and a lapse can be told apart.
  The vocabulary is unchanged; the payload gains a key.
- Each request is closed in its own transaction and re-checked under the ride lock, so a
  driver accepting at the same moment wins.

## 2026-10-14 (evening) — reference documents, and a bug found writing them

Committed on `stage-2-3-booking-core-and-simulator`.

Five documents were written from the code, not from memory: ARCHITECTURE,
DATABASE_DESIGN, API_DOCUMENTATION, SECURITY and DEPLOYMENT. The README now indexes
every document.

Writing SECURITY.md turned up a real fault: browsers were allowed only GET and POST, so
the profile, emergency-contact and seat-hold screens would have failed for every user
while all tests passed. Fixed, with a test that fails without the fix. See TESTING.md.

Still not written: DECISIONS, IMPLEMENTATION_ROADMAP and DATASET_DOCUMENTATION. The
roadmap needs the team's stage definitions and feature tiers, which have not been given.

## 2026-10-14 (later) — seat holds

Committed on `stage-2-3-booking-core-and-simulator`.

A passenger can hold the seats of a search result for five minutes while deciding. While
the hold lasts, other passengers cannot book or hold those seats on those legs, and their
searches show the ride with fewer seats. Verified by `SeatHoldIntegrationTest`,
`App.test.tsx` and a live run.

- **Holds live in Redis and only there.** PostgreSQL's seat counts never change for a
  hold, so no entity is in two stores and there is nothing to keep in step.
- **Redis is never in the way of a booking.** If it cannot be reached, holds are simply
  not honoured.
- Placing a hold is one Lua script, so two passengers asking for the last seat at the
  same moment cannot both get it.
- A passenger's own hold never blocks their own booking, and booking the ride releases it.
- No event is logged for a hold: the vocabulary is frozen, and a hold is not a booking.

## 2026-10-14 — vehicle details

Committed on `stage-2-3-booking-core-and-simulator`.

A driver can say a vehicle's comfort class, the luggage each passenger may bring, and,
for an electric vehicle, its battery and consumption. Search results name the car and
show what was said. Verified by `VehicleIntegrationTest`, `App.test.tsx` and
`schemas.test.ts`; the vehicles page now has a page-level test.

- All of it is self-described and labelled so on the form.
- The range is battery divided by consumption, rounded down, and is shown to the driver
  only, with the words "not a measured range". Nothing acts on it.
- Battery figures are refused on a vehicle not marked electric, by the form, the service
  and a database constraint.

## 2026-10-13 (after midnight) — notes, the back-seat promise, return and weekly rides

Committed on `stage-2-3-booking-core-and-simulator`.

| Slice | What | Verified by |
|---|---|---|
| Notes | Up to 500 characters from the driver, shown with the route | `RoutingIntegrationTest`, `App.test.tsx` |
| Back-seat promise | "At most two in the back" on a ride, on results, and as a search filter | same |
| Return ride | The same stops reversed, published with the ride out | same, `schemas.test.ts`, live run |
| Weekly repeats | Up to 8 further weeks, each a ride of its own | same |

- Everything a publish request asks for is written in one transaction. A return that
  cannot be driven publishes nothing.
- The return keeps each stretch's price and each interval between stops.
- Rides published together share a `series_id`, used so far only to say how many there
  were. Nothing acts on a series as a whole.
- A weekly repeat keeps the time of day on the corridor's clock.

## 2026-10-13 (late night) — search filters

Committed on `stage-2-3-booking-core-and-simulator`.

A passenger can narrow a search by time of day, maximum price per seat, instant booking,
a driver with a confirmed email or phone, and a driver who said no smoking or pets
welcome. Verified by `RoutingIntegrationTest`, `App.test.tsx` and a live call.

- A filter can only narrow. A driver who has not said is left out by the smoking and
  pets filters: silence is not a promise.
- Filters apply when Search is pressed, not as each box is ticked.
- The `search_issued` event is unchanged. Filters are a product convenience, and adding
  them to the research payload was not asked for.

## 2026-10-13 (night) — the contact scheduler, variant B5, and why refills add nothing

Committed on `stage-2-3-booking-core-and-simulator`.

| Slice | What | Verified by |
|---|---|---|
| Scheduler | `intel/app/scheduler`: whom to ask under limits per round, per ride and per departure day; CP-SAT; `POST /v1/scheduler/plan` | `intel/tests/test_scheduler.py`, live call |
| B5 | B4 under a contact budget, in the simulator | `sim/tests`, 30-seed ladder |
| Sweeps over a variant | A sweep can vary a variant's parameters, not only the world's | `experiments/tests/test_sweep.py`, 30-seed budget sweep |
| Refill metric | `refill_additionality` in `metrics.sql` | `experiments/tests/test_metrics.py` |

**Results** (EXPERIMENT_PROTOCOL.md section 8). The budget cuts the late-share effect
about in proportion to the requests withheld; completed rides do not move. The extra
seats B4 frees all go to passengers who had another ride on offer, which is the first
explanation the project has for why early release adds no completed rides.

**Decisions made here**

- OR-Tools is the one new dependency: the seat limit per departure day makes the choice
  an integer programme, which sorting cannot solve.
- B5 keeps B4's threshold, so the two differ only in the budget.
- The platform does not call the scheduler. It sends no interventions, and wiring one
  in would be a product decision, not a research one.
- The first version of the refill query joined on keys inside the JSON payload and did
  not finish in ten minutes on the full log. It now groups instead and takes seconds.

**For the team to decide**

- Whether the simulator may say why a search was offered nothing (no ride at that time,
  or no seats). It needs a new payload key on `candidates_returned`.
- Whether every number under `budget` in `B5.yaml` is acceptable as an assumption.

## 2026-10-13 (evening) — profiles, confirmation codes, emergency contacts and SOS

Committed on `stage-2-3-booking-core-and-simulator`.

| Slice | What | Verified by |
|---|---|---|
| Profile | Phone, bio, year of birth, gender, smoking, pets, music, conversation; an account page | `AccountIntegrationTest`, `App.test.tsx` |
| Confirmation | A 6-digit code proves an email address or a phone number | same, live run |
| Emergency contacts | Up to three per member | same |
| SOS | A button on every member's screen; an administrator queue with acknowledgement | same, live run |

**Nothing in this slice leaves the platform.** The only message sender is a mock. It
writes each message to the server log and keeps the newest 50 in memory, where an
administrator can read them. That outbox is how a confirmation code is obtained in a
demonstration. An SOS therefore tells an administrator queue and nobody else, and the
answer, the screen and the queue all say that the contacts were not messaged.

**Decisions made here**

- Codes are stored only as BCrypt hashes, last ten minutes, work once, and are spent
  after five wrong guesses. A new one can be asked for after a minute.
- A code proves the address it was sent to. Changing the phone number undoes the proof.
- "Confirmed" is the word used, never "verified": it says a code was received, not who
  someone is. The profile states that no identity document has been checked.
- The public profile shows an approximate age, never the birth year, and never the
  phone number or gender.
- The emergency panel puts calling 112 first, before the button that alerts JOURNEX.
- Pressing SOS twice within a minute repeats nothing.
- SOS writes no event-log row: the 22-event vocabulary is frozen and this is not a
  research measurement.

## 2026-10-13 (later) — Hindi and Marathi, chat and live position

Committed on `stage-2-3-booking-core-and-simulator`.

| Slice | What | Verified by |
|---|---|---|
| Languages | Every screen in English, Hindi and Marathi; dates and money localised; a switcher in the header | `lib/i18n.test.tsx` |
| Chat | One room per ride through the gateway, stored in MongoDB; core-api decides membership | `gateway/test/realtime.test.js`, `RideChat.test.tsx`, live run |
| Live position | The driver shares a position while the ride is under way; passengers see the latest point | same |

**Decisions made here**

- English text is the translation key. A missing entry shows English; tests fail the
  build's test run if any marked string lacks an entry, so that should not happen.
- Money and times use the same digits in every language, so a passenger and a driver
  who chose different languages read the same fare.
- The gateway writes chat and GPS points to MongoDB itself, and asks core-api, with the
  user's own token, whether they are on a ride. It never reads PostgreSQL.
- A message appears on screen when the gateway relays it, not when it is typed: what a
  sender sees is what everyone received.
- Position sharing is off until the driver turns it on, and only possible while the ride
  is under way.
- GPS points expire after 7 days.

## 2026-10-13 — repeat search, density sweep, moderation, routing and maps

Committed on `stage-2-3-booking-core-and-simulator`.

| Slice | What | Verified by |
|---|---|---|
| Repeat search | Unserved passengers may search again, logged as `recovery_search`; model retrained as `h2` | `sim/tests`, `experiments/reports/hazard-h2.json` |
| Ladder and density sweep | B0, B3, B4 in the new world; B4 against B3 at 6, 12 and 20 rides a day | `experiments/reports/ladder-7a1c0de0-*-000000000002.md`, `sweep-supply-density-*.md` |
| Moderation | Reports, dismiss / warn / suspend, reinstatement, admin overview, members, audit log | `ModerationIntegrationTest`, web tests |
| Routing | OSRM road routes cached in Redis, stored in PostGIS; search by location with a hard access limit; four sort orders; price suggestion | `RouteServiceTest`, `RoutingIntegrationTest`, live run against OSRM |
| Maps | Route and stops, exact search points, meeting points, a route planner for drivers | web tests with a stand-in map |

**Research, synthetic data:** the result did not change. With repeat search, ranking gains
+0.34 completed rides per 100 searches and the intervention adds nothing; across supply
densities the intervention's effect is 0.00, -0.01 and -0.04. Late cancellations fall by
about 0.055 everywhere. EXPERIMENT_PROTOCOL.md section 7.

**Decisions made here**

- Search is by location, not by stop name. Town names in the UI are presets for
  coordinates. This replaced the name search outright.
- The access distance is a hard limit: a ride outside it is not returned at all.
- Search positions are rounded to about 100 m before they go in the event log.
- A report needs a shared booking. Strangers cannot file against each other.
- Suspension is checked on every request, because a token cannot be recalled.
- An invalid query parameter is now a 400. It was a 500.

## 2026-10-10 (later) — sweep, payments, ratings, notifications

Committed on `stage-2-3-booking-core-and-simulator`.

| Slice | What | Verified by |
|---|---|---|
| Parameter sweeps | Any world parameter can be swept against a baseline, paired by seed | `experiments/tests/test_sweep.py` |
| Intervention-response sweep | 9 cells x 30 seeds | `experiments/reports/sweep-intervention-response-5eeb0000-*.md` |
| Payments | Mock provider; fare plus 10% fee held at request; settled once; append-only ledger; tiered refunds; payouts; idempotency key | `PaymentFlowIntegrationTest`, `RefundPolicyTest`, live run |
| Ratings | Two-way, once per side per completed trip; reviews; profiles | `RatingFlowIntegrationTest`, live run |
| Notifications | In-app, in MongoDB, written after commit | `NotificationIntegrationTest`, live run with MongoDB stopped |

**Sweep result, synthetic data:** across the whole grid of assumed passenger responses the
intervention is worth at most +0.06 completed rides per 100 searches (0.2%), and is
harmful when 5% of contacted travellers are put off. It makes cancellations earlier in
every cell. The null result on the primary metric is therefore not an artefact of the
response assumptions. EXPERIMENT_PROTOCOL.md section 6.

**Decisions made here**

- Payment is taken in the same transaction as the booking. A declined payment leaves no
  booking, which avoids unpaid bookings and the hold-expiry machinery they would need.
- The service fee is not refunded once a driver has accepted; it is refunded in full if
  the driver declines, never answers or cancels.
- The part of the fare a late-cancelling passenger forfeits goes to the driver.
- Notifications use MongoDB, as CLAUDE.md places them, which gives core-api a second
  database client. core-api's health does not depend on it.
- The refund terms shown in the UI are fetched from the server, not written twice.

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
