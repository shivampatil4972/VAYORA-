# Feature matrix

One row per requirement of the 95-feature backlog (IDs 1-95, original numbering).

**Tier** (A = fully implemented and tested, B = implemented with a documented
simplification, C = mock or simulated provider) was meant to be preserved from a supplied
classification. The build specification did not include one, so every tier is `TBD` until
the team supplies it. Nothing here has been assigned a tier by guesswork.

**Stage** is `TBD` for the same reason: CLAUDE.md fixes eight stages but only Stage 3
(the simulator) is described in the repository.

**Status** values: `Not started`, `Partial`, `Verified`, `Blocked`. `Verified` means the
behaviour is exercised by an automated test that passes; a row says which layers. UI
claims rest on component tests and a clean production build. From 2026-10-15 to 17 the full
stack was also driven in a real browser (headless Microsoft Edge), page by page: sign-up;
a vehicle, electric included; publishing over the real road route; search and booking; a
trip started, completed, confirmed and rated; payments and a receipt; passes; a public
profile; the emergency panel; notifications; Hindi and Marathi; phone width; every
administrator page; and live position between a driver's and a passenger's browser.
Screens were checked by eye from screenshots, not by a person using the app.

Last updated: 2026-10-17. Test suites and how to run them are in [TESTING.md](TESTING.md).

## Identity and profile

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 1 | Email/phone signup | TBD | TBD | Verified (API and UI tests): sign up and sign in with an email address or a phone number. A phone number belongs to one account and stays unconfirmed until a code (simulated sender, no SMS sent) proves it; nothing stops someone signing up with a number that is not theirs |
| 2 | Google OAuth login | TBD | TBD | Partial: "Sign in with Google" on the sign-in and sign-up pages, checked as Google documents (signature against Google's keys, issuer, our client ID, expiry, a confirmed email); links an existing account with the same address, or creates one after the person chooses passenger or driver. API and UI tested against a stand-in for Google. **Off until a Google client ID is configured, and never tried with Google itself** |
| 3 | Profile photo upload | TBD | TBD | Verified (API and UI tests): a member adds, replaces or removes a photo on the account page; it shows on their profile. Stored in PostgreSQL as a re-encoded JPEG at most 800 px, without the file's metadata (a phone photo can carry where it was taken) |
| 4 | Bio, age, and gender | TBD | TBD | Verified (API and UI tests): bio and an approximate age on the profile; gender is stored and shown to nobody |
| 5 | Email verification | TBD | TBD | Verified (API and UI tests): the code goes by real email when an SMTP server is configured (see 63); otherwise the sender is simulated, nothing is sent, and the code is read from an administrator-only outbox |
| 6 | Phone OTP verification | TBD | TBD | Verified (API and UI tests), simulated sender, nothing is sent: the code is read from an administrator-only outbox |
| 7 | Government ID verification | TBD | TBD | Not started |
| 8 | Verified-profile badge | TBD | TBD | Partial: "Email confirmed" and "Phone confirmed" on the profile, which also says no identity document was checked |
| 9 | Experience levels from Newcomer to Ambassador | TBD | TBD | Verified (API and UI tests): five levels from completed trips, ratings and confirmed contact details, shown on profiles. The thresholds are the authors' assumptions, in `application.yml` |
| 10 | Smoking, pets, music, and travel preferences | TBD | TBD | Verified (API and UI tests): shown on the profile; smoking and pets can filter a search |
| 11 | Chattiness level | TBD | TBD | Verified (API and UI tests): shown on the profile; not yet used by search |

## Vehicle management

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 12 | Make, model, year, and colour | TBD | TBD | Verified (API and UI tests) |
| 13 | Seat count and comfort class | TBD | TBD | Verified (API and UI tests): comfort is the driver's own description, shown on search results; nothing inspects the car |
| 14 | Luggage allowance | TBD | TBD | Verified (API and UI tests): the largest bag each passenger may bring, shown on search results; not a search filter |
| 15 | EV status, battery capacity, and consumption rate | TBD | TBD | Verified (API and UI tests): stored and shown, with the range the two figures imply. When a driver works out a route longer than that range, the publish screen tells them to plan a charging stop (UI tested); it does not stop them publishing and plans no stop |
| 16 | Vehicle photo | TBD | TBD | Verified (API and UI tests): as for profile photos, on the vehicles page; only the owner can change it |

## Driver ride publishing

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 17 | Origin-to-destination ride publishing | TBD | TBD | Verified (API and UI tests): publishing through the page is tested end to end |
| 18 | Intermediate stopovers | TBD | TBD | Verified (API and UI tests): publishing through the page is tested end to end |
| 19 | Per-segment pricing | TBD | TBD | Verified (API and UI tests): publishing through the page is tested end to end |
| 20 | Price suggestion engine | TBD | TBD | Verified (API and UI tests), simplified: road distance times a flat rate, offered to the driver, never applied |
| 21 | Date and departure time | TBD | TBD | Verified (API and UI tests): publishing through the page is tested end to end |
| 22 | Offered seats | TBD | TBD | Verified (API and UI tests): publishing through the page is tested end to end |
| 23 | Maximum-two-in-the-back preference | TBD | TBD | Verified (API and UI tests): a promise the driver makes on a ride and passengers see. Nothing enforces it |
| 24 | Instant booking versus approval | TBD | TBD | Verified (API and UI tests): publishing through the page is tested end to end |
| 25 | Return trip publishing | TBD | TBD | Verified (API tests, form validation and mapping tested): the same stops reversed, published with the ride out; must leave after it arrives |
| 26 | Recurring weekly rides | TBD | TBD | Verified (API and UI tests): up to 8 further weeks published at once, and a whole series withdrawn at once with every passenger refunded. No open-ended schedule, and a series cannot be edited |
| 27 | Map-based pickup/drop-off selection | TBD | TBD | Verified: a driver moves each meeting point on a map. UI tested with a stand-in map; the real map has not been seen in a browser |
| 28 | Detour tolerance | TBD | TBD | Not started. Passengers board at a ride's stops, so a driver never detours; there is nothing to tolerate yet |
| 29 | Journey description and notes | TBD | TBD | Verified (API and UI tests): up to 500 characters, shown with the route as plain text |

## Passenger search and booking

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 30 | Search by origin, destination, date, and seats | TBD | TBD | Verified (API and UI tests): by location, date and seats. A stop must be within 5 km of each end |
| 31 | Segment booking at stopovers | TBD | TBD | Verified (API and UI tests) |
| 32 | Departure-time filter | TBD | TBD | Verified (API and UI tests): by hour in the API; the screen offers morning, afternoon and evening |
| 33 | Price-range filter | TBD | TBD | Verified (API and UI tests): lowest and highest price per seat |
| 34 | Instant-booking filter | TBD | TBD | Verified (API and UI tests): only rides that confirm at once |
| 35 | Verified-profile filter | TBD | TBD | Partial: only drivers with a confirmed email or phone, API and UI tested. Confirmation is by simulated code; no identity is checked |
| 36 | Maximum-two-in-the-back filter | TBD | TBD | Verified (API and UI tests) |
| 37 | Amenity filters | TBD | TBD | Verified (API and UI tests): no smoking, pets, music, quiet ride, and minimum comfort and luggage. All from what drivers said; a driver who said nothing never matches |
| 38 | Sorting by price, time, rating, and pickup proximity | TBD | TBD | Verified (API and UI tests): by time, price, driver rating or pickup distance |
| 39 | Pickup-point map | TBD | TBD | Verified: a result's route with the boarding stop marked. UI tested with a stand-in map; the real map has not been seen in a browser |
| 40 | Booking request and driver approval | TBD | TBD | Verified (API and UI tests): request, cancel, and the driver accepting or declining through the page. An unanswered request closes after 12 hours or 2 hours before boarding, refunded in full (API, UI and live) |
| 41 | Redis temporary seat holds with TTL | TBD | TBD | Verified (API and UI tests, live run): a passenger holds seats for 5 minutes; other passengers' bookings, holds and searches leave them alone. A pending request still holds its seats in PostgreSQL with no time limit |

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
| 49 | Transaction history | TBD | TBD | Verified (API and UI tests), mock provider, no money moves: a passenger's payments with what came back and why; a driver's payouts |
| 50 | PDF invoice and receipt | TBD | TBD | Partial: PDF receipts for booking payments and passes, API and UI tested, one opened and read. In English only, says the payment is simulated, and is **not a tax invoice**: no GST |

## Trust and safety

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 51 | Two-way star ratings | TBD | TBD | Verified (API and UI tests): each side rates the other once after a completed trip |
| 52 | Written reviews | TBD | TBD | Verified (API and UI tests): optional comment, shown on the profile as plain text; no moderation |
| 53 | Driver response rate and time | TBD | TBD | Verified (API and UI tests): share of requests answered by the driver, and the median time, on the public profile; only the driver's own answers count, and nothing is shown below three requests |
| 54 | Membership duration and completed rides | TBD | TBD | Verified (API and UI tests): member-since and completed trips on the profile |
| 55 | Report a user | TBD | TBD | Verified (API and UI tests): only someone you shared a booking with; one open report per pair |
| 56 | Admin moderation queue | TBD | TBD | Verified (API and UI tests): dismiss, warn or suspend; suspension is enforced on every request |
| 57 | SOS and emergency-contact workflow | TBD | TBD | Verified (API and UI tests), simulated: the alert reaches an administrator queue; **emergency contacts are not messaged** and the screen says so and points to 112 |
| 58 | Insurance coverage badge | TBD | TBD | Partial, a labelled mock (API and UI tests, seen in a browser): a driver declares the insurer and the date the cover runs to; passengers see it on a result while it covers the trip, marked "declared by the driver, not checked". **No insurer is connected and nothing is checked**; no policy number is asked for |
| 59 | Women-only ride option | TBD | TBD | Verified (API and UI tests, live run): offered, shown, booked and held only by members whose own profile says they are a woman. **Nobody checks that declaration** |

## Communication

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 60 | Socket.IO chat | TBD | TBD | Verified (gateway and UI tests, live run): one chat per ride for its driver and booked passengers, stored in MongoDB |
| 61 | Masked calling | TBD | TBD | Partial, a labelled mock (API and UI tests, seen in a browser): the passenger and the driver of a confirmed booking can "call" each other from 24 hours before boarding, between confirmed phone numbers; the other side is told someone tried. **No telephony provider is connected: nothing is dialled**, every answer says so, and no phone number is ever returned |
| 62 | Web push | TBD | TBD | Verified (API and UI tests): standard Web Push, written with the JDK alone and checked against RFC 8291's worked example; turned on per browser on the account page. **Off until the server's key pair is configured**, and never seen arriving in a real browser. Pushes carry the English |
| 63 | Email notifications | TBD | TBD | Verified (API and UI tests): a copy of each notification, and confirmation codes, by real email through any SMTP server set with `SPRING_MAIL_HOST`; tested against an in-process SMTP server. **Without one configured, nothing is emailed** and copies go to the simulated outbox as before. Never tried with a real provider |
| 64 | SMS notifications | TBD | TBD | Partial: as for email, to a confirmed phone; **simulated, nothing is really sent** |
| 65 | Notification preferences | TBD | TBD | Verified (API and UI tests): email and SMS copies on or off; in-app always kept; copies only to confirmed addresses and never for a rolled-back change |

## Trip execution

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 66 | Booking reference and boarding code | TBD | TBD | Verified (API and UI tests): the passenger sees a reference and a 4-digit code; the driver can check a code but is never sent it. Checking changes nothing about the booking |
| 67 | Meeting-point details and map | TBD | TBD | Verified: meeting point and route on a booking. UI tested with a stand-in map; the real map has not been seen in a browser |
| 68 | Live GPS tracking | TBD | TBD | Verified (gateway and UI tests): the driver shares their position while the ride is under way and passengers see the latest point on a map. Also driven between two browsers with the browser's own location reading (emulated): shared, seen on the real map, kept through a moment without a fix, stopped. **Never tried on a phone with real GPS**; at most one reading per 5 s is sent, and one inside that window is dropped, not sent later |
| 69 | Two-sided completion confirmation | TBD | TBD | Verified (API and UI tests): the passenger confirms a completed trip or says it did not happen; a denial is listed for administrators and reverses nothing |
| 70 | Post-trip rating prompt | TBD | TBD | Verified (API and UI tests): a rating form on completed trips, and one reminder a day later to each side that has not rated |

## General platform

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 71 | English, Hindi, and Marathi | TBD | TBD | Partial: every screen, notification and fixed server error message is in English, Hindi and Marathi, and tests enforce completeness on both sides (a core-api test fails if the server gains a message or notification the app cannot translate). Error messages built from numbers stay in English. **The translations have had no native review**, which is all that keeps this partial |
| 72 | Referral programme | TBD | TBD | Verified (API and UI tests): invitation codes, recorded at sign-up; once the invited member completes a first trip, each of the pair who is a passenger gets a free weekly pass, once, starting when any running pass ends, and is told. Drivers get none, as a pass only waives a passenger's fee. Seen in a browser, from the invitation code to the free pass and its receipt. The reward is an assumption, in `application.yml`, and can be turned off |
| 73 | Static/configured MSRTC alternatives | TBD | TBD | Verified (API and UI tests): administrators enter bus services; passengers see them when a search finds no ride. None ship with the platform, nothing checks them against MSRTC, and passengers are told to check with the operator |
| 74 | Admin back office | TBD | TBD | Verified (API and UI tests): overview, reports queue, members, rides and bookings by status, disputed trips, emergencies and simulated outbox, booking durability with reasons, audit log. No experiment screens |

## Research modules

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 75 | PostGIS/OSRM feasibility filter | TBD | TBD | Partial: the access distance is a hard limit enforced in PostGIS, and rides carry an OSRM road route; an electric car's route is compared with its stated range and the driver warned (UI only, not enforced). No detour check |
| 76 | Two-sided match scoring | TBD | TBD | Verified (API and UI tests): every search result is scored out of 100 for both people, from how near the pickup and drop-off are, the price against the cheapest result, the driver's record of rides kept, and whether the two agree on smoking, pets, music and conversation as each said on their profile. A "Best match for both of you" order sorts by it and shows the score with its reasons; seen in a browser putting the driver the passenger agrees with first (83 against 63). Never from the durability model or any prediction. The weights are assumptions, in `application.yml` |
| 77 | CommitmentDecay survival modelling | TBD | TBD | Partial: model trained, evaluated, served and scored in the app, on synthetic data only; see AI_ML_METHODOLOGY.md. Its features add nothing measurable in the simulator: a no-feature model ranks as well (EXPERIMENT_PROTOCOL.md section 14) |
| 78 | Reliability indicator in search results | TBD | TBD | Verified (API and UI tests): each result shows the driver's own record, rides completed out of those completed or withdrawn. From past rides only: no prediction about the driver or any passenger is shown |
| 79 | Anticipatory interventions | TBD | TBD | Partial: targeted by the durability model in the simulator only (variant B4). On the platform, by decision, an untargeted reminder: every passenger with a confirmed seat booked before the window is asked once, 48 hours before boarding, to release it if plans changed, with the refund it would get then (API tested). Nothing reads anyone's predicted risk and nothing is cancelled. No gain is claimed: in the simulator asking adds no completed rides |
| 80 | CP-SAT contact-budget scheduler | TBD | TBD | Partial: built and tested in intel (`POST /v1/scheduler/plan`) and used by simulator variant B5; the platform does not call it, because the platform sends no interventions. In the simulator it does no better than random choice within the same limits (EXPERIMENT_PROTOCOL.md section 14) |
| 81 | Hazard-informed passenger flexibility tiers | TBD | TBD | Verified (API and UI tests), as the team defined them: when booking, a passenger chooses what happens if the driver withdraws: this ride only, Flexible (booked automatically on the closest ride within 2 hours) or any time that day. Same price; a new booking has its own payment hold. Flexible is suggested on rides whose driver has withdrawn rides and completed under 90%: the driver's record, never a prediction about the passenger. `tier_selected` is logged for every non-default choice |
| 84 | Mid-route vacant-seat allocation | TBD | TBD | Verified (API and UI tests): a ride already under way stays on sale from stops it is due at no sooner than 30 minutes ahead, by its timetable or, if it started early, by its actual start (the only progress the platform knows), and only if it confirms instantly, since a driver at the wheel answers nothing. A no-show's seat goes back on sale for those stops. Search, booking and seat holds apply the same rule; a result says the ride is on the road and may reach the stop before the time shown. Driven in a browser: booked from Karad on a ride under way, refused from the stop it had left, and a no-show's seat back on sale |
| 86 | Per-booking SHAP explanations | TBD | TBD | Verified (model, API and UI tests): exact per-feature shares of the log relative risk, which for Cox are the full explanation, so SHAP is not used. Administrators only |
| 88 | Cascade-aware recovery | TBD | TBD | Partial: when a driver withdraws a ride, each passenger is told of up to three other rides on the same stretch within 3 hours with seats for their party (API tested). Passengers who chose a flexible tier (81) are rebooked automatically on the closest ride that fits; the others get the suggestions. The simulator models neither |
| 89 | Corridor demand calibration | TBD | TBD | Not started |
| 93 | Supply-gap detection and nudging | TBD | TBD | Verified (API and UI tests): each morning, days in the coming week where at least three searches on one stretch found no ride are logged (`supply_gap_detected`), and up to five drivers who drove the stretch in the last 90 days are told, none more than once a week (`nudge_issued`). A nudged driver who then offers the stretch that day is logged (`nudge_converted`), **for the record, never as a result**. Administrators see the coming gaps. There is no way to dismiss a nudge, so `nudge_dismissed` is unused |
| 94 | Driver commitment pricing | TBD | TBD | Verified (API and UI tests): passengers on rides by a driver who keeps their rides (at least 10 completed, none withdrawn among rides due to leave in the last 90 days or later) pay a 7% service fee instead of 10%, and the search result says why. From the record alone, never from a prediction, and never above the standard fee (the setting is refused otherwise). Seen in a browser: ₹32 against ₹46 on a ₹460 fare, and ₹32 held. The thresholds and rate are the authors' assumptions; whether it changes what drivers do is not measured |

## Advanced extensions

| ID | Feature | Tier | Stage | Status |
|---|---|---|---|---|
| 82 | Driver rest-stop planning | TBD | TBD | Verified (API and UI tests): administrators enter rest stops; a driver working out a route sees those within 2 km of it, in order, with the one nearest the two-hour mark suggested for a break. None ship with the platform, and nothing checks a stop is open |
| 83 | Fuel and EV charging stops | TBD | TBD | Verified (API and UI tests): chargers are entered and shown the same way, with their stated power, and the electric-range warning says whether any is listed near the route. Nothing checks a charger works, and no charging stop is planned |
| 85 | Weekly, monthly, and annual travel passes | TBD | TBD | Verified (API and UI tests, live run), mock provider, no money moves: a running pass waives the service fee; the driver's fare is untouched. Prices are assumptions |
| 87 | Live what-if simulator | TBD | TBD | Partial: an administrator page explores the saved sweeps (departure window, publishing lead, contact budget) one setting at a time, with each run's figures against its baseline (Python and UI tests). **Nothing is simulated live**: only settings a sweep was run at can be chosen |
| 90 | Reproducibility capsule (`make reproduce` or equivalent) | TBD | TBD | Verified: `scripts/reproduce.sh` rebuilds the tests, model, ladder and current sweeps and fails unless every file matches the committed one. Run in full on 2026-10-16: every committed number reproduced exactly |
| 91 | Last-mile rickshaw, bus, and walking access | TBD | TBD | Partial: each result shows a rough walk to the pickup, from the straight-line distance at 4.5 km/h (API and UI tests), and buses are offered as in 73. No rickshaw data, and no walking route |
| 92 | Bus alternative after recovery failure | TBD | TBD | Verified (API test): when a driver withdraws and no other ride fits, the notice names up to three listed buses, with the same warning |
| 95 | Driver reliability self-view | TBD | TBD | Verified (API and UI tests): rides completed and withdrawn, passengers carried, cancelled and marked absent, rating, response rate and level, for the driver only |

## Infrastructure that exists but is not a backlog feature

| Item | State |
|---|---|
| `events` table and 22-event vocabulary (core-api V2 migration) | Verified 2026-10-10: migration applies, core-api tests 11/11 |
| Java `EventLogService` and Python `journex_events` writer | Verified 2026-10-10: Java 11/11, Python 17/17 (shared run) |
| Metric queries (`experiments/analysis/metrics.sql`) | Verified: five named queries, each tested against hand-computed values |
| Service skeletons: core-api, intel, gateway, web | Verified 2026-10-10: all four health endpoints UP; gateway tests 6/6 |
| OSRM routing | Verified against the running container: 235.9 km for the four-town route; cached in Redis |
| Audit log of administrative actions | Verified (API and UI tests); append-only by trigger |
| B0, B3, B4, B5 simulator variants and paired comparison | Verified: 30-seed run, see EXPERIMENT_PROTOCOL.md |
| Parameter sweeps over the simulated world or a variant | Verified: intervention-response, supply-density and contact-budget sweeps, see EXPERIMENT_PROTOCOL.md |
| In-app notifications (MongoDB) | Verified (API and UI tests). Not one of the 95: features 62-64 are push, email and SMS, none of which exist |
| Idempotent booking requests | Verified (API and UI tests) |
