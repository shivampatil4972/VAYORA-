# Implementation roadmap

What is left of the 95-feature backlog, grouped by what it needs, in the order proposed to
build it. FEATURE_MATRIX.md is the record of each feature's state; this file is a plan,
and like any plan it is a proposal.

## Two things the team has not yet decided

- **Stage definitions.** CLAUDE.md says the work is built in eight stages. Stage 2 (booking
  core) and Stage 3 (the simulator) were named in the original prompts; what Stages 1 and
  4 to 8 contain has never been given. The order below is therefore not organised by
  stage.
- **Feature tiers.** The backlog's Tier column is `TBD` for every row. The original A, B
  and C tiers were never supplied, so "must have" and "nice to have" are not separated
  here either.

Both should be settled before this plan is taken as the team's. Until then the order
below is the authors' recommendation, with reasons.

## Where things stand

As of 2026-10-15: of 95 features, **45 verified, 19 partial, 31 not started**, about 57%
counting a partial feature as half.

## What is left, by what it needs

### A. Can be finished with what exists, no outside service

Ordered by value to the research question first, then by size.

| # | Feature | What is missing | Size |
|---|---|---|---|
| 78 | Reliability indicator in search results | Show the durability score to passengers, which needs a decision: today scores are shown to administrators only, on purpose | Small, but a policy question first |
| 86 | Per-booking explanations | For Cox the per-feature contribution to the log hazard is `coef × (x − mean)`, exactly, without SHAP | Small |
| 81 | Hazard-informed flexibility tiers | Needs the tier rules defined, and two frozen event types (`tier_selected`, `driver_tier_selected`) already reserved for it | Medium |
| 93 | Supply-gap detection and nudging | Three event types already reserved (`nudge_*`, `supply_gap_detected`); nudge conversion must stay a swept parameter, never a result | Medium |
| 88 | Cascade-aware recovery | Re-offer a cancelled ride's passengers another ride | Medium |
| 89 | Corridor demand calibration | Needs real demand figures to calibrate against, which do not exist | Blocked on data |
| 90 | Reproducibility capsule | One command that rebuilds every result | Small |
| 53, 95 | Driver response rate; driver reliability self-view | Computed from events already logged | Small |
| 66, 69 | Boarding code; passenger confirms completion | A code shown to the passenger, checked by the driver | Small |
| 70 | Post-trip rating reminder | A reminder notification | Small |
| 33, 37 | Minimum price; music, conversation, vehicle filters | Data exists | Small |
| 9 | Experience levels | Needs the levels defined | Small |
| 26 | Recurring rides as a schedule | Edit or withdraw a whole series | Medium |
| 74 | Admin ride and booking browser | Screens over data that exists | Medium |
| 84, 76 | Mid-route seat allocation; two-sided match scoring | Need geography the simulator does not have (see B1, B2 below) | Large |
| 82, 83 | Rest stops; fuel and charging stops | Need stop data for the corridor | Medium |
| 72 | Referral programme | Rules and rewards to be decided | Medium |
| 73, 92 | MSRTC bus alternatives | A static timetable, entered by hand | Medium |
| 87 | Live what-if simulator | The simulator behind a screen | Large |
| 94 | Driver commitment pricing | Must not price on predicted risk (a project rule); needs careful definition | Medium, policy first |

### B. Needs an outside service or account

None of these can be completed honestly without the service. Each can be built against a
mock that says so, as payments and SMS already are.

| # | Feature | Needs |
|---|---|---|
| 2 | Google sign-in | A Google Cloud OAuth client |
| 1, 6, 64 | Phone sign-up, real SMS codes and notifications | An SMS gateway account |
| 63 | Email notifications | An email sending service |
| 62 | Web push | Push keys and a service worker |
| 61 | Masked calling | A telephony provider |
| 46 | Card, UPI and wallet doing something different | A payment gateway in test mode |
| 3, 16 | Profile and vehicle photos | File storage (a fourth store, which CLAUDE.md forbids without a decision) |
| 7, 8 | Government ID verification and a real verified badge | An identity verification provider, and a privacy review |
| 58 | Insurance badge | An insurer |
| 91 | Last-mile access | Rickshaw and bus data |

### C. Research work

| Item | What it is | Why it matters |
|---|---|---|
| Split "offered no ride" | Record whether a search failed for want of a ride at that time or want of seats | Section 8 of EXPERIMENT_PROTOCOL.md points here; needs approval for a new payload key |
| Time-tolerance sweep | Do early releases convert if passengers accept a wider window? | The likeliest way the central idea could still work in this simulator |
| B5 with random choice | Same budget, requests chosen at random | Says whether the scheduler beats chance |
| Survival-threshold sweep; B4 with the no-feature model; component removal | Robustness | Planned since section 7 |
| Variants B6 to B11 | Not defined anywhere in the repository | Need their definitions |
| The public hotel dataset | Decide whether it can support a time-to-event check at all | The only route to any real data |

### D. Not code

| Item | Who |
|---|---|
| Open the app in a browser and use every screen | The team. Three broken screens were found once by reading, not by tests |
| Native-speaker review of the Hindi and Marathi text | The team |
| Confirm or replace the assumed values in `world.yaml`, `B5.yaml`, pass prices | The team |
| Decide how to present a central hypothesis the simulator did not support | The team and the guide |

## Proposed order

1. **The browser check (D).** It costs an afternoon and has already been shown to find
   what tests miss.
2. **The research items (C), starting with the time-tolerance sweep.** The report's main
   claim rests on them, and they need no outside service.
3. **Small platform items from A** that complete features already partly built: boarding
   code, completion confirmation, rating reminder, response rate, reproducibility capsule.
4. **The two reserved event families (81, 93)**, once their rules are defined, since the
   vocabulary already makes room for them.
5. **Group B, one service at a time**, only if the team gets the accounts. Otherwise
   leave them as clearly labelled mocks and say so in the report.

## What will not be built

- Anything that cancels a booking or changes a price because of a predicted risk. The
  project's own rules forbid it.
- A sync layer between stores, a third data store or a fourth runtime. CLAUDE.md forbids
  them; photo storage (3, 16) would need that rule changed first.
