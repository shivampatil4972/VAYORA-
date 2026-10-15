# Security

What protects the platform today, how each protection is checked, and what is missing.
This is a student project that has had no external security review and no penetration
test. It must not be put on the public internet as it stands; the last section says why.

## What is in place

### Passwords and sign-in

| Control | Detail | Checked by |
|---|---|---|
| Passwords are hashed | BCrypt; 8 to 72 characters accepted | `ApiIntegrationTest` reads the stored value |
| A wrong password says nothing about the account | Same 401 whether or not the email exists, and whether or not the account is suspended | `ApiIntegrationTest`, `ModerationIntegrationTest` |
| Tokens are signed | HS256, 12 hours, secret of at least 32 bytes; core-api refuses to start with a shorter one | Startup validation |
| Administrators cannot sign up | Created only from `ADMIN_EMAIL` and `ADMIN_PASSWORD` at startup; password of 12 characters or more | `ApiIntegrationTest` |

### Who may do what

| Control | Detail | Checked by |
|---|---|---|
| Every endpoint needs a token | Except sign-up, sign-in and the health check | 401 tests on each controller |
| Roles are enforced on the server | `@PreAuthorize` on each endpoint; the screens hiding a button is not the control | 403 tests on each controller |
| Ownership is enforced on the server | A booking, ride, vehicle, contact or notification that is not the caller's answers 404 | Per-feature integration tests |
| A suspended account is stopped at once | Checked on every request, so a token issued before the suspension stops working | `ModerationIntegrationTest` |
| Chat is members only | The gateway asks core-api, with the user's token, whether they are on the ride, and asks again every 15 seconds | `realtime.test.js`, live check |

### Data people would not want shared

| Control | Detail | Checked by |
|---|---|---|
| Public profiles carry no contact details | No email, phone, birth year or gender. Gender is used, unshown, to decide who may see and book a women-only ride | `RatingFlowIntegrationTest`, `AccountIntegrationTest` |
| Confirmation codes are stored only as hashes | Expire in 10 minutes, work once, are spent after 5 wrong guesses, one a minute | `AccountIntegrationTest` |
| Search positions are coarsened in the research log | Three decimals, about 100 metres | `RoutingIntegrationTest` |
| The model never sees a passenger's latent type | And scores are visible to administrators only | `sim/tests`, `HazardScoringIntegrationTest` |
| GPS points expire | 7 days, by a database TTL | Gateway live check |
| A photo keeps only its pixels | Every upload is decoded and written again as a JPEG, which drops metadata such as where a phone photo was taken. Files over 5 MB, or claiming over 40 million pixels, are refused before decoding | `PhotoIntegrationTest` |

### Integrity

| Control | Detail | Checked by |
|---|---|---|
| The money ledger cannot be rewritten | A trigger refuses update and delete | `PaymentFlowIntegrationTest` |
| The audit log cannot be rewritten | The same | `ModerationIntegrationTest` |
| Every administrative action is audited | Report decisions, reinstatements, SOS acknowledgements | Same |
| A retried booking cannot charge twice | Idempotency key with a unique index | `PaymentFlowIntegrationTest` |
| Seats cannot be oversold | Row lock and a conditional update | 8-way concurrency test |

### Input and output

| Control | Detail |
|---|---|
| SQL is parameterised | No caller text is ever spliced into a query. Where a query is assembled (search sort and filters) the pieces are constants chosen by a flag |
| Requests are validated | Bean validation on every body and parameter; a bad query is a 400, not a 500 |
| Text people type is shown as text | Reviews, bios, notes, chat and report details are rendered by React as text nodes, never as HTML. Tests feed markup in and check it comes out as characters for reviews, ride notes and chat; bios and report details rely on the same mechanism untested |
| A search wildcard is text | `%` typed into the member search matches nothing |
| Push goes only to push services | A browser names the address its push service accepts messages at. Only HTTPS addresses at the configured push services (Google, Mozilla, Microsoft, Apple) are accepted, so a member cannot make the server send requests to an internal or chosen address. `PushIntegrationTest` tries localhost, a cloud metadata address, a look-alike host and a user-info trick |
| Push messages are encrypted for the browser | RFC 8291: only the subscribing browser can read one; the push service cannot |

### Browsers

- CORS allows only the configured origins, and only GET, POST, PUT and DELETE.
- No cookies are used, so there is no cross-site request forgery surface; CSRF protection
  is off for that reason, not by oversight.

### Predictions about people

The durability model estimates how likely a booking is to last. The rules it is held to:

- A booking is never cancelled because of an estimate. The only action is to ask.
- An estimate is not shown to drivers or passengers and does not change a price.
- It is trained on simulated data and says so in every response.

## What is missing

Listed so nobody mistakes the section above for the whole picture.

| Gap | Consequence |
|---|---|
| **No rate limiting**, on sign-in or anywhere except confirmation codes | Passwords can be guessed at network speed |
| **Tokens cannot be revoked** and there is no refresh token | A stolen token works for up to 12 hours. Suspension is the only cut-off |
| **The token is in `sessionStorage`** | Any script running on the page can read it. There is no content security policy to limit which scripts run |
| **No HTTPS** in the provided configuration | Tokens and passwords cross the network in the clear |
| **Sign-up reveals whether an email is registered** | By its 409 |
| **One shared signing secret** between core-api and the gateway | A compromise of either lets an attacker mint tokens for both |
| **intel has no authentication** | Anyone who can reach its port can call it. It holds no data, but it should not be exposed |
| **Databases have development passwords** and their ports are published to the host | In `docker-compose.yml` for convenience |
| **Administrators can read every confirmation code** | In the simulated outbox. It must not exist alongside a real sender |
| **No security headers** have been reviewed beyond framework defaults | |
| **No dependency or image scanning** has been run | |
| **Chat is not moderated** and is kept indefinitely | |
| **No account deletion or data export** | A member cannot remove their data |

## Before any real use

At the least: HTTPS in front of every service; real secrets from a secret store; database
ports closed to the outside; rate limiting on sign-in; a way to revoke tokens; intel and
the databases on a private network; a content security policy; the mock sender and mock
payment provider replaced, and the outbox removed; and a review by someone who does this
for a living.
