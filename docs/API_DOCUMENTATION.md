# API

Every endpoint the three services expose, who may call it, and what it is for. Field
names and limits are in the controller of each endpoint; this is the map, not the
territory.

## Conventions (core-api)

- Base URL `http://localhost:8080`. Everything except sign-up, sign-in and the health
  check needs `Authorization: Bearer <token>`.
- Bodies are JSON. Times are ISO-8601 instants. Money is a decimal number of rupees.
- Errors are RFC 9457 problem documents: `{"status": 409, "detail": "..."}`. `detail` is
  written to be shown to a person.
- A stranger's booking, ride or contact answers 404, not 403, so ids cannot be probed.

| Status | Means |
|---|---|
| 400 | The request is malformed or breaks a rule that needs no state to check |
| 401 | No token, or one that is expired or not ours |
| 403 | Signed in, but the wrong role, or the account is suspended |
| 404 | Not there, or not yours |
| 409 | Well-formed, but the state forbids it: no seats, already rated, already decided |
| 429 | Too many attempts (confirmation codes only) |
| 503 | A dependency the request cannot do without is down (seat holds only) |

**Roles**: P passenger, D driver, A administrator, any = any signed-in account.

## core-api

### Accounts

| Method and path | Who | What |
|---|---|---|
| `POST /api/v1/auth/register` | public | Create a passenger or driver account; returns a token |
| `POST /api/v1/auth/login` | public | Returns a token valid for 12 hours |
| `GET /api/v1/me` | any | The signed-in account |
| `GET /api/v1/me/profile` | any | Own profile, including phone and confirmation status |
| `PUT /api/v1/me/profile` | any | Replace own profile. A changed phone must be confirmed again |
| `POST /api/v1/me/verification/{email\|phone}/request` | any | Send a 6-digit code (simulated sender) |
| `POST /api/v1/me/verification/{email\|phone}/confirm` | any | Confirm with the code |
| `GET /api/v1/users/{id}/profile` | any | What anyone may know about a member: no contact details |

### Vehicles and rides

| Method and path | Who | What |
|---|---|---|
| `POST /api/v1/vehicles` | D | Add a vehicle |
| `GET /api/v1/vehicles` | D | Own vehicles |
| `POST /api/v1/rides/route-preview` | D | Road route through some stops, with a suggested price per leg |
| `POST /api/v1/rides` | D | Publish a ride; optionally its return and up to 8 weekly repeats, all or nothing |
| `GET /api/v1/rides/mine` | D | Own rides |
| `GET /api/v1/rides/{id}` | any | A ride with its stops, legs, route and notes |
| `GET /api/v1/rides/{id}/membership` | any | Whether the caller is on the ride. Used by the gateway |
| `GET /api/v1/rides/search` | any | Rides with a stop near each end on a day |

Search takes `originLat`, `originLon`, `destLat`, `destLon`, `date`, and optionally
`seats` (default 1), `sort` (`TIME`, `PRICE`, `RATING`, `PROXIMITY`), and filters
`earliestHour`, `latestHour`, `maxPrice`, `instantOnly`, `confirmedDriver`, `smokeFree`,
`petsWelcome`, `maxTwoInBack`, `womenOnly`. A filter only ever narrows the result.
A women-only ride is never returned to a passenger whose profile does not say she is a
woman, filter or no filter.

### Booking

| Method and path | Who | What |
|---|---|---|
| `POST /api/v1/holds` | P | Hold seats for 5 minutes. Not a booking |
| `GET /api/v1/holds/mine` | P | Own hold, or 204 |
| `DELETE /api/v1/holds/mine` | P | Give the hold up |
| `POST /api/v1/bookings` | P | Request seats on a stretch of a ride; the payment hold is placed in the same step |
| `GET /api/v1/bookings` | P | Own bookings |
| `POST /api/v1/bookings/{id}/cancel` | P | Cancel; the refund follows the published tiers |
| `GET /api/v1/rides/{rideId}/bookings` | D | Bookings on own ride |
| `POST /api/v1/bookings/{id}/accept` | D | Accept a pending request |
| `POST /api/v1/bookings/{id}/reject` | D | Decline it; everything is returned |

`POST /api/v1/bookings` accepts an `Idempotency-Key` header. Sending the same key again
returns the booking the first request made instead of making another.

### The trip

| Method and path | Who | What |
|---|---|---|
| `POST /api/v1/rides/{id}/start` | D | Start the ride, up to an hour early |
| `POST /api/v1/bookings/{id}/no-show` | D | Mark a passenger who did not board |
| `POST /api/v1/rides/{id}/complete` | D | Complete the ride and pay out |
| `POST /api/v1/rides/{id}/cancel` | D | Withdraw the ride; passengers are refunded in full |

### Money

| Method and path | Who | What |
|---|---|---|
| `GET /api/v1/payment-terms` | any | The provider (`MOCK`), the service fee rate, and the refund tiers |
| `GET /api/v1/payments` | P | Own payments |
| `GET /api/v1/settlements` | D | Own payouts |

### After the trip, and safety

| Method and path | Who | What |
|---|---|---|
| `POST /api/v1/bookings/{bookingId}/rating` | P, D | Rate the other side of a completed booking, once |
| `GET /api/v1/ratings/pending` | any | Completed trips the caller has not rated |
| `POST /api/v1/reports` | P, D | Report a member one has shared a booking with |
| `GET /api/v1/me/emergency-contacts` | any | Own emergency contacts |
| `POST /api/v1/me/emergency-contacts` | any | Add one, up to three |
| `DELETE /api/v1/me/emergency-contacts/{id}` | any | Remove one |
| `POST /api/v1/sos` | P, D | Raise an alert. The answer says whether anyone was really messaged; today nobody is |

### Notifications

| Method and path | Who | What |
|---|---|---|
| `GET /api/v1/notifications` | any | The newest 50 |
| `GET /api/v1/notifications/unread-count` | any | How many are unread |
| `POST /api/v1/notifications/{id}/read` | any | Mark one read |
| `POST /api/v1/notifications/read-all` | any | Mark all read |

### Administration

| Method and path | Who | What |
|---|---|---|
| `GET /api/v1/admin/overview` | A | Counts of users, rides and bookings by state |
| `GET /api/v1/admin/users?q=` | A | Find members by name or email; at most 100 |
| `POST /api/v1/admin/users/{id}/reinstate` | A | Lift a suspension |
| `GET /api/v1/admin/reports?status=` | A | The reports queue |
| `POST /api/v1/admin/reports/{id}/resolve` | A | Dismiss, warn or suspend |
| `GET /api/v1/admin/sos` | A | Unacknowledged emergency alerts |
| `POST /api/v1/admin/sos/{id}/acknowledge` | A | Acknowledge one |
| `GET /api/v1/admin/mock-outbox` | A | What the simulated sender was asked to send, including confirmation codes |
| `POST /api/v1/admin/hazard/score` | A | Score confirmed bookings now |
| `GET /api/v1/admin/hazard/scores` | A | The newest durability estimate of each live booking |
| `GET /api/v1/admin/audit` | A | The newest 100 administrative actions |

### Health

`GET /actuator/health`, public.

## intel

Base URL `http://localhost:8000`. No authentication: it is called by core-api and by
research code, holds nothing, and is not meant to be reachable from a browser.

| Method and path | What |
|---|---|
| `GET /health` | Liveness |
| `POST /v1/hazard/score` | The probability a booking lasts to a horizon, given its nine features and the time elapsed. Says `trained_on: synthetic` |
| `POST /v1/scheduler/plan` | Which bookings to ask to reconfirm, given candidates and limits. Never recommends cancelling |

## gateway

Base URL `http://localhost:3000`. `GET /health` over HTTP; everything else is Socket.IO.
A connection must present the same token core-api issued, as `auth.token`.

| Client sends | With | Answer |
|---|---|---|
| `ride:join` | `{rideId}` | The last 50 messages and the latest position, if the caller is on the ride |
| `ride:leave` | `{rideId}` | |
| `chat:send` | `{rideId, body}` | Refused if empty, over 500 characters, or more than 10 in 10 seconds |
| `location:update` | `{rideId, lat, lon}` | Drivers only, only while the ride is under way, at most once a second |

| Server sends | To | Carries |
|---|---|---|
| `chat:message` | Everyone on the ride | The message, with its sender and time |
| `location` | Everyone on the ride | The driver's latest position |

Membership is asked of core-api and re-checked every 15 seconds, so a passenger who
cancels stops receiving the ride's messages shortly after.
