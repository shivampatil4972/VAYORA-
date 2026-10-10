# Known limitations

What the project does not do, does only in part, or does in a way a reader could
mistake for more. Updated 2026-10-10.

## Nothing here is evidence about real people

- There is no real booking data. The model is trained, and every experiment is run, on
  simulator output.
- Every number in `experiments/configs/world.yaml` is an assumption chosen to be
  plausible. None is estimated from data.
- The public hotel-reservation dataset named in the synopsis has not been examined.

## The research result so far

- The first 30-seed run does not support the central hypothesis on the primary metric:
  the intervention moves cancellations earlier but adds no completed rides beyond what
  ranking alone gives. See EXPERIMENT_PROTOCOL.md section 5.
- That result depends on assumed passenger responses that have not been swept. It is
  one point, not a conclusion.
- Variants B1, B2 and B5 to B11 are not built. No component-removal or robustness
  experiment has been run.
- The model discriminates weakly (concordance 0.59) and violates the
  proportional-hazards assumption for lead time.

## Platform

- **No payments of any kind.** No payment intent, hold, refund, payout, invoice or
  ledger. A booking has a price and nobody is charged.
- **No seat holds with expiry and no Redis use.** A pending request holds its seats
  until the driver answers or the ride starts.
- **Search matches stop names exactly.** No distance, detour or route check. OSRM is
  configured but has never been started in this environment, and nothing calls it.
- **One role per account.** A person cannot be both passenger and driver.
- **The 7-day booking horizon is not enforced** when publishing or booking.
- **Completion is the driver's word alone.** No boarding code, no passenger
  confirmation.
- **A driver withdrawing a ride triggers nothing** for the passengers: no notification,
  no recovery search, no alternative.
- No ratings, reviews, reports, moderation, notifications, chat, live tracking, travel
  passes, referral, recurring or return rides, or price suggestion.
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
- No rate limiting on any endpoint, including sign-in.
- Registration reveals whether an email is already registered.
- No security headers beyond Spring Security's defaults have been reviewed.
- No audit log of administrative actions.
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
  a production build only.
- The vehicle, publish-ride and my-rides pages have no page-level test.
- English only. No Hindi or Marathi.
- No map anywhere.
- No end-to-end browser test.

## Environment

- The host has Java 26 and Python 3.14; the project targets Java 21 and Python 3.11.
  Builds and tests run in containers that pin the right versions.
- Something emptied the working tree before this work began. The cause is unknown.
