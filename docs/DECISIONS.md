# Decisions

The decisions that shape JOURNEX, each with the reason it was made and what it costs. Each
was recorded when it was made, in PROGRESS.md; this file gathers them by subject. A
decision listed here is to be changed on purpose, not by accident: change it here first.

The rules in CLAUDE.md (frozen parameters, the architecture rule, data placement, the
research integrity rules) are the project's own and are not repeated. Everything below
was decided while building within them.

## Research

| Decision | Why | Cost |
|---|---|---|
| The primary metric is completed rides per 100 searches, every other number secondary | CLAUDE.md fixes it; bookings can rise while rides do not | A variant that only moves cancellations earlier scores nothing, which is what happened |
| Cox proportional hazards is the served model | Best departure Brier score and concordance of the three fitted | Its proportional-hazards assumption is violated for lead time |
| The gradient-boosted survival model trains on a 5,000-row sample | Its loss is quadratic in rows; the full set ran for over ten minutes | It is compared on less data than Cox |
| Variants B1 and B2 are not built | The simulated corridor has one origin and one destination: there is no geography to filter or rank two-sidedly | Two rungs of the ladder are missing |
| B5 keeps B4's threshold and adds only a budget | So the two differ in one thing | |
| The contact scheduler is a CP-SAT integer programme | A seat limit per departure day makes the choice one that sorting cannot solve | A dependency (OR-Tools) for a constraint that rarely binds at this scale |
| A sweep can vary a variant's parameters, not only the world's | The budget is a property of the variant | |
| Metric queries group rather than join on keys inside the JSON payload | A join on payload keys did not finish in ten minutes; grouping takes seconds | Queries are longer to read |
| SOS presses and seat holds write no event | The 22-event vocabulary is frozen and neither is a research measurement | They cannot be analysed from the log |
| A request closed for want of an answer is logged as `booking_rejected` by the platform, with a reason | Tells a lapse from a driver's refusal without a new event type | Queries must read the actor to tell them apart |

## Platform: correctness

| Decision | Why | Cost |
|---|---|---|
| The seat-release reminder goes to every confirmed passenger alike, once, 48 hours before boarding | Choosing whom to ask by predicted risk would act on a guess about a real person; the simulator found targeting adds no rides anyway | People who were always going to travel get a message they did not need |
| The reminder states the refund the passenger would get at that moment | At 48 hours the whole-fare tier is ending; promising it would mislead | The figure is 50% for most who read it later |
| JdbcTemplate with hand-written SQL, no ORM | The existing code used it, and taking seats is one conditional `UPDATE` that reads more plainly without an ORM | More SQL to maintain |
| Seats are counted per leg of a ride | A passenger on one stretch must not take a seat from another stretch | Every booking touches several rows |
| Booking locks the ride row, then takes all legs in one conditional update | Concurrent requests for the last seat must produce exactly one booking | Bookings on one ride are serialised |
| Payment is held in the same transaction as the booking | A declined payment leaves no booking and no seat taken, and no hold-expiry machinery is needed | A slow provider would hold the ride lock |
| The money ledger and the audit log cannot be rewritten, enforced by database triggers | So the application cannot quietly correct history | Mistakes are fixed by new entries only |
| A seat hold lives only in Redis and never changes PostgreSQL's counts | No entity in two stores, and nothing to keep in step | A hold is a courtesy: it is not honoured while Redis is down |
| An unanswered request closes after 12 hours or 2 hours before boarding | So seats and money are not tied up until the ride leaves | A driver who answers late finds it gone |
| A ride, its return and its weekly repeats are published in one transaction | A driver is never left with half a series | Each is still a ride of its own, with no series-wide edit |

## Platform: money

| Decision | Why | Cost |
|---|---|---|
| The only payment provider is a mock, and every screen and receipt says so | The project must not claim money moves | Nothing is tested against a real gateway |
| The service fee is kept once a driver has accepted; returned in full if the driver declines, never answers or cancels | The platform did its part once the driver accepted | |
| The fare a late-cancelling passenger forfeits goes to the driver | The seat was held for them | |
| A travel pass waives only the service fee | Drivers set fares; the only price the platform can discount is its own fee | A pass is worth 10% of fares, which may be too little to be attractive |
| Refund terms and booking deadlines are fetched from the server, not repeated in the app | One source of truth | One more request per page |
| Receipts are not tax invoices | The platform handles no GST | |
| A referral earns each passenger of the pair a free weekly pass, once, when the invited member completes a first trip | The pass is the platform's own fee to give away; a first trip, not a sign-up, so fake accounts earn nothing | Drivers earn nothing, as passes are worth nothing to them |
| Commitment pricing lowers the passenger's service fee on a reliable driver's ride, and never raises anything | Drivers keep the whole fare, so the only price the platform can move is its own fee; the project's rules forbid pricing on predicted risk and punitive prices | The platform gives up 3 points of fee on those rides; a new driver cannot earn it until they have 10 completed rides |
| "Keeps their rides" means at least 10 completed and none withdrawn among rides due to leave in the last 90 days or later | Observed behaviour only, simple enough to explain on the result | A withdrawal for good reason costs the driver the same as any other |

## Platform: identity, trust and safety

| Decision | Why | Cost |
|---|---|---|
| Insurance is the driver's declaration, shown as such, with no policy number kept | No insurer is connected, so nothing can be checked; a policy number would be personal data for no purpose | A passenger has only the driver's word |
| A masked call is simulated, only between confirmed numbers, from 24 hours before boarding while the booking is confirmed, and the other side is told | No telephony provider; a real relay must never ring a number nobody proved | Nobody can actually call; the chat is the working channel |
| One role per account: passenger, driver or administrator | Simpler permissions | A person cannot be both passenger and driver |
| Administrators cannot sign up; they are created from configuration | So nobody can make themselves one | |
| Another member's booking, ride or contact answers 404, not 403 | Ids cannot be probed | Debugging is a little harder |
| Suspension is checked on every request | A token cannot be recalled before it expires | One extra query per request |
| A report needs a booking shared with the member reported | Strangers cannot file against each other | |
| "Confirmed", never "verified", for an email or phone proved by code | A code proves an address, not a person | |
| Confirmation codes are stored as hashes, expire in 10 minutes, work once, die after 5 wrong guesses | Codes are credentials | |
| Women-only rides rest on the gender a member declares, which nobody checks | It is the only information the platform has | The rule can be got round by anyone willing to lie |
| Experience levels need a confirmed email from the second level and a confirmed phone from the fourth | Levels should reward what can be checked, however weakly | The thresholds are assumptions |
| Gender is used but never shown | It decides women-only access; it is not other members' business | |
| The emergency panel puts calling 112 before alerting JOURNEX | JOURNEX is not an emergency service, and its messages are simulated | |
| Durability scores are shown to administrators only | A prediction about a person must not change how they are treated by other members | |
| Predicted risk never cancels a booking or changes a price | The project's own rules forbid treating a prediction as proof of intent | The intervention can only ask |

## Platform: search and routing

| Decision | Why | Cost |
|---|---|---|
| Search is by location; town names are presets for coordinates | Passengers rarely start at a stop | A straight-line access limit, not a walking distance |
| The 5 km access distance is a hard limit | A far-away ride ranked low is still not one a passenger can take | |
| A road route unavailable from OSRM is drawn as straight lines and labelled so | A straight-line estimate must never pass for a road distance | |
| A filter only ever narrows a search | Predictability | |
| Smoking and pets filters leave out drivers who have not said | Silence is not a promise | Today they leave out nearly everyone |
| Search positions are rounded to about 100 m in the event log | Research needs the area, not the doorstep | |
| A driver's detour allowance is one total for the ride, spent pickup by pickup | A driver cares how late they arrive, not how the minutes are split | One far pickup can use up the allowance for everyone after |
| A pickup is weighed again by road at booking, under the ride lock | The search's figure could be stale, and two passengers must not both spend the last minutes | One more routing call per booking |
| Pickups only, not drop-offs | Half the work for the case that matters most: getting to a ride is the hard part | A passenger still walks from the last stop |
| Match scoring uses only what both people said, distance, price and the driver's record of rides kept | Ranking real people by a model's guess about them is not done anywhere on the platform | It knows nothing about people who leave their profile empty |
| A preference either person left unsaid counts half | Silence should neither help nor hurt | Saying nothing scores the same as half agreeing |
| "Best match" is one order among five, not the default | A passenger should be able to see results by time without a score in the way | |
| A ride under way is sold only from a stop it is due at 30 minutes or more ahead, by its timetable or by its actual start if that was earlier | The timetable and the start are all core-api knows of a ride's progress; live position is the gateway's and is not kept as truth. A ride may start up to an hour early | A ride that gains time on the road can still beat a late booker to the stop; the margin is in `application.yml` |
| A ride under way is sold only if it confirms instantly | A driver at the wheel must not be answering requests | Rides that need approval lose these seats |
| A no-show gives the seat back | The seat is empty for the rest of the ride, and an empty seat refilled is the project's whole idea | The no-show passenger has still paid, so the seat may earn twice |
| A booking on a ride under way writes `trip_started` when it is made | Every `trip_completed` or `trip_failed` must have a start, and there is no boarding event | Its start is when it was booked, not when the passenger got in |

## Interface

| Decision | Why | Cost |
|---|---|---|
| English text is the translation key, and tests fail if a string lacks Hindi or Marathi | A missing translation is caught by the build, and still shows English rather than nothing | The English wording cannot change without the tables |
| Money and times use the same digits in every language | Passenger and driver read the same fare | |
| A chat message is shown when the gateway relays it, not when it is typed | What a sender sees is what everyone received | |
| Irreversible actions need a second, explicit press | Cancelling, completing and marking a no-show cannot be undone | One more click |
| Receipts are in English | The PDF's built-in fonts cover Latin script only | Devanagari names print as "?" |
| Flexibility tiers are a time window, chosen by the passenger | The team's choice: the passenger agrees in advance to be moved, and the price never changes, so nothing is priced or decided on a prediction about them. "Hazard-informed" means only that Flexible is suggested on a driver whose own record shows withdrawals | A rebooked passenger may land on a ride the driver approves, so they hold a request, not a seat |
| A rebooking runs after the withdrawal commits, in its own transaction | So a rebooking that fails cannot undo the withdrawal or anyone's refund. Found in testing: a notification sent from an after-commit step must have its own transaction too, or it waits for a commit that has already happened and is never written | |
| Email goes through any SMTP server, chosen by configuration | No particular provider is assumed; text messages stay simulated. Each channel reports separately whether it really sends, so the SOS record stays honest when email is real and SMS is not | |
| Photos are kept in PostgreSQL | CLAUDE.md allows no third data store, and a photo belongs to the member or vehicle it shows. Each is a small re-encoded JPEG | The database grows with them; there is no CDN, and every view goes through core-api |
| Web Push written with the JDK, not a library | The protocol is three small pieces of standard cryptography; the libraries for it bring their own HTTP client and crypto provider. Checked against RFC 8291's example to the byte | Code to maintain that a library would have kept up to date |
| Google sign-in uses Google's ID token, checked by core-api | No server-side redirect flow and no client secret to keep; the browser gets a signed token and core-api verifies it with the JWT library it already uses | Needs Google's script on the sign-in pages, loaded only when a client ID is set |
| Supply gaps are read from the event log; nudges are few and plain | Searches and their results are already logged, so no new table. A nudge says only what passengers looked for, goes to drivers who drove the stretch, and is limited to one a week per driver and five per gap (all in `application.yml`) | `nudge_converted` shows only that a driver later offered the stretch, not that the nudge caused it; it is never reported as a result |
| Server error messages are translated by the app, not the server | The server stays in one language and the app already keys its tables by the English; a core-api test keeps the two lists in step | The server's wording cannot change without the app's tables |
| Notifications are stored as a template and its values | So the app can show them in the reader's language; the English is rendered from the same template, so copies and older notifications read as before. A core-api test reads the web app's list, so a template the app cannot translate fails the build | Every new notification needs its template added to the web app and translated |
| The what-if page shows saved sweeps; it runs nothing | Running the simulator from a screen needs a service to run it: intel holds no state and core-api owns transactions, and a fourth runtime is ruled out. The web image is built from `web/` alone, so `export_web.py` copies the sweep figures into `web/src/data/whatif.json`, and `reproduce.sh` and a test fail if the copy drifts | Only settings already swept can be chosen; a new question needs a sweep run by hand |

## Dependencies

Each was justified in one sentence when it was added, as CLAUDE.md requires.

| Dependency | Where | Why |
|---|---|---|
| OR-Tools | intel, research | CP-SAT for the contact scheduler |
| Apache PDFBox | core-api | Writes receipts; tests read them back |
| lifelines, scikit-survival | research only | Fitting the survival models; serving needs neither |
| Leaflet, react-leaflet | web | Maps for routes and meeting points |
| socket.io-client | web | Chat and live position |
| matplotlib | research only | Draws the report's figures from the committed results |
