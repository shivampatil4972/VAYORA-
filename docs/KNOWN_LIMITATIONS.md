# Known limitations

What the project does not do, does only in part, or does in a way a reader could
mistake for more. Updated 2026-10-13.

## Nothing here is evidence about real people

- There is no real booking data. The model is trained, and every experiment is run, on
  simulator output.
- Every number in `experiments/configs/world.yaml` is an assumption chosen to be
  plausible. None is estimated from data.
- The public hotel-reservation dataset named in the synopsis has not been examined.

## The research result so far

- The central hypothesis is not supported on the primary metric. The intervention moves
  cancellations earlier but adds at most +0.06 completed rides per 100 searches, even
  when every passenger destined to cancel releases the moment they are asked. See
  EXPERIMENT_PROTOCOL.md sections 5 and 6.
- It held when passengers' responses were varied, when unserved passengers were allowed
  to search again, and across supply densities of 6, 12 and 20 rides a day. The survival
  threshold has not been varied, and why refills do not convert has not been explained.
- A contact budget (B5) reduces the effect on the late share roughly in proportion to
  the requests withheld. The scheduler's choice of whom to ask concentrates nothing,
  and it has not been compared with choosing at random. Its worth formula is an
  assumption with no evidence behind it. See EXPERIMENT_PROTOCOL.md section 8.
- The likeliest reason refills add no rides: the extra seats B4 frees are all taken by
  passengers who were offered another ride as well. That is an upper-bound argument
  from means, not a paired test.
- Over half of all searches are offered no ride, and the event log cannot say whether
  for want of a ride at that time or want of seats on it.
- It is one synthetic corridor. It is not evidence that the idea fails in reality.
- Variants B1, B2 and B6 to B11 are not built. No component-removal or robustness
  experiment has been run.
- The model discriminates weakly (concordance 0.59) and violates the
  proportional-hazards assumption for lead time.

## Platform

- **Payments are simulated.** The only provider is a mock that approves every hold
  unless told to decline. No money moves and nothing is verified with any bank, card
  network or UPI. The ledger records what a real provider would have been asked to do.
- The mock is synchronous. A real provider confirms by callback; there is no callback
  endpoint, so duplicate-callback handling is unbuilt and untested.
- No invoice or receipt, and no screen listing a passenger's payments.
- A payout is recorded the moment a trip completes. There is no settlement delay,
  dispute window or bank detail.
- **No seat holds with expiry and no Redis use.** A pending request holds its seats
  until the driver answers or the ride starts.
- **Search measures access in a straight line**, not by road or on foot, and uses one
  fixed limit of 5 km for everyone.
- **Passengers board only at a ride's stops.** There is no door pickup, so no detour is
  ever computed and the detour-tolerance feature does not exist.
- A ride's stored route is OSRM's simplified line (19 points for the whole corridor). It
  is right for distance and for an overview map, and too coarse to follow turn by turn.
- If OSRM is down when a ride is published, the ride keeps a straight-line route for
  good; nothing recomputes it later.
- **One role per account.** A person cannot be both passenger and driver.
- **The 7-day booking horizon is not enforced** when publishing or booking.
- **Completion is the driver's word alone.** No boarding code, no passenger
  confirmation.
- **A driver withdrawing a ride triggers nothing** for the passengers: no notification,
  no recovery search, no alternative.
- Reviews cannot be edited or removed, and a report is about a member, not a review.
- A suspended member's future rides and bookings are left as they are; nobody is told.
- A reporter is never told what was decided.
- Ratings are visible at once; one side can see the other's rating before giving theirs.
- Notifications are in-app only. No email, SMS or push, and no preferences.
- **No message ever leaves the platform.** Confirmation codes and emergency messages go
  to a mock sender. "Email confirmed" therefore means only that someone read a code out
  of the administrator outbox; it proves nothing about the address.
- **The SOS button contacts nobody.** It records an alert for administrators, who are
  not an emergency service and are told only by an in-app notification and a queue
  that refreshes every 15 seconds. Emergency contacts are stored but not messaged.
- The simulated outbox is in memory: it is lost on restart and would not be shared
  between two core-api instances.
- Search filters for smoking and pets leave out every driver who has not said either
  way, which today is nearly all of them. There is no minimum price, no music or
  conversation filter, and filters are not recorded in the event log.
- No identity document is checked, and there is no profile photo.
- With MongoDB down, a booking still succeeds but its response waits about two seconds
  for the notification write to time out.
- **Chat is one room per ride.** Every booked passenger sees every message; there is no
  private conversation between one passenger and the driver.
- A passenger who cancels can lose chat access up to 15 seconds late: membership is
  re-checked on that interval, not pushed.
- Live position is the latest point only. There is no trail, no estimated arrival, and
  nothing tells passengers when the driver stops sharing.
- Chat messages are kept indefinitely; only GPS points expire (after 7 days).
- Trip state is not pushed. A passenger's screen does not change when the driver starts
  the ride until they reload or reopen the chat.
- No travel passes, referral, or recurring or return rides.
- No email verification, phone OTP, Google sign-in, profile, photo upload or identity
  verification.

## Model in the platform

- **Train and serve differ on one feature.** The simulator has a preferred departure
  time, so `desired_gap_hours` varies in training. A platform search names a day only,
  so the platform always sends 0.
- Scores are appended to the event log and shown to an administrator. Nothing acts on
  them: the platform sends no reconfirmation request.
- Scores are deliberately not shown to drivers or passengers.
- No explanation of a score is produced yet.

## Security

- The access token lives in the browser's `sessionStorage`, readable by any script on
  the page. There is no refresh token; a session lasts 12 hours and cannot be revoked.
- No rate limiting on any endpoint, including sign-in. Confirmation codes alone are
  limited: one a minute, five guesses each.
- An administrator can read every confirmation code in the simulated outbox. That is
  the point of it, and it must not exist alongside a real sender.
- Registration reveals whether an email is already registered.
- No security headers beyond Spring Security's defaults have been reviewed.
- Every signed-in request costs one extra database lookup, to check the account is not
  suspended.
- The development defaults in `docker-compose.yml` (database password, JWT secret) are
  public. They must be replaced for any deployment.

## Simulator

- Every trip is the full corridor; the platform's intermediate stops are not simulated.
- A passenger searches once per need. Nobody who is rejected, cancelled on or finds
  nothing tries again.
- One driver per ride; drivers have no history or reputation.
- Trip events are per passenger booking, by decision; see PROGRESS.md.

## Interface

- **No screen has been viewed in a browser.** The UI is checked by component tests and
  a production build only. The map in particular is tested through a stand-in, so
  whether tiles load and pins land where intended is unverified.
- Map tiles come from OpenStreetMap's public servers, which is acceptable for a
  demonstration and not for sustained use.
- The vehicle, publish-ride and my-rides pages have no page-level test, so the driver's
  accept, start, no-show and complete buttons are untested in the UI.
- **The Hindi and Marathi translations have had no native review.** I wrote them. The
  wording on refunds, payments and the emergency notice matters most and should be
  checked first.
- Text written by the server stays in English in every language: error explanations,
  notification messages and audit entries.
- Plurals use one form for one and another for the rest, which is right for these three
  languages and would not be for others.
- No end-to-end browser test.

## Environment

- The host has Java 26 and Python 3.14; the project targets Java 21 and Python 3.11.
  Builds and tests run in containers that pin the right versions.
- Something emptied the working tree before this work began. The cause is unknown.
