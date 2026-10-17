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

As of 2026-10-17: of 95 features, **75 verified, 16 partial, 4 not started**, about 88%
counting a partial feature as half. Everything left needs a decision, an outside service
or data that does not exist; nothing remains that is only a matter of building.

## What is left, by what it needs

### A. Can be finished with what exists, no outside service

Ordered by value to the research question first, then by size.

| # | Feature | What is missing | Size |
|---|---|---|---|
| 89 | Corridor demand calibration | Needs real demand figures to calibrate against, which do not exist | Blocked on data |
| ~~84~~ | ~~Mid-route seat allocation~~ | Done on the platform, 2026-10-17 | |
| 76 | Two-sided match scoring | Needs geography the simulator does not have (see B1, B2 below) | Large |
| 87 | Live what-if simulator | Saved sweeps can be explored; running a new simulation from the screen would need a service to run it, which the architecture rule does not provide | Large, placement first |
| ~~94~~ | ~~Driver commitment pricing~~ | Done, 2026-10-17: a lower passenger fee on rides by drivers who keep their rides | |

### B. Needs an outside service or account

None of these can be completed honestly without the service. Each can be built against a
mock that says so, as payments and SMS already are.

| # | Feature | Needs |
|---|---|---|
| 2 | Google sign-in, tried for real | A Google Cloud OAuth client ID; everything else is built |
| 1, 6, 64 | Phone sign-up, real SMS codes and notifications | An SMS gateway account |
| 63 | Email with a real provider | Built for any SMTP server; needs an account with one to try it |
| 61 | Masked calling | A telephony provider; built as a labelled mock on 2026-10-17 |
| 46 | Card, UPI and wallet doing something different | A payment gateway in test mode |
| 7, 8 | Government ID verification and a real verified badge | An identity verification provider, and a privacy review |
| 58 | Insurance badge | An insurer; built as a labelled mock (the driver's declaration) on 2026-10-17 |
| 91 | Last-mile access beyond walking | Rickshaw data, and walking routes rather than straight lines |

### C. Research work

| Item | What it is | Why it matters |
|---|---|---|
| ~~Split "offered no ride"~~ | Done: two empty searches in three meet only full rides (EXPERIMENT_PROTOCOL.md section 16) | |
| ~~Time-tolerance sweep~~ | Done: a wider window does not help (EXPERIMENT_PROTOCOL.md section 9) | |
| ~~Publishing-lead sweep~~ | Done: late publishing explains little; most empty searches are full rides (EXPERIMENT_PROTOCOL.md section 10) | |
| ~~Refills by release timing~~ | Done: early releases are refilled 94%, late ones 68%; B4 moves too few (EXPERIMENT_PROTOCOL.md section 11) | |
| ~~Oracle variant~~ | Done: the ceiling is +0.10 per 100 searches (EXPERIMENT_PROTOCOL.md section 12) | |
| ~~Oracle across release probability~~ | Done: the ceiling is +0.05 to +0.22 as the release chance goes from 0.25 to 1.0 (EXPERIMENT_PROTOCOL.md section 15) | |
| ~~B5 with random choice~~ | Done: random choice does as well; the scheduler does not beat chance (EXPERIMENT_PROTOCOL.md section 14) | |
| ~~Survival-threshold sweep; B4 with the no-feature model; component removal~~ | Done: no threshold helps, the features add nothing, all the gain is the ranking (EXPERIMENT_PROTOCOL.md section 14) | |
| Variants B6 to B11 | Not defined anywhere in the repository | Need their definitions |
| The public hotel dataset | Decide whether it can support a time-to-event check at all | The only route to any real data |

### D. Not code

| Item | Who |
|---|---|
| Use every screen as a person would, on a phone | The team. A script drove every screen in headless Edge (2026-10-15 to 17) and found eight faults the tests had missed; nobody has yet used the app by hand |
| Native-speaker review of the Hindi and Marathi text | The team |
| Confirm or replace the assumed values in `world.yaml`, `B5.yaml`, pass prices | The team |
| Decide how to present a central hypothesis the simulator did not support | The team and the guide |

## Proposed order

1. ~~The browser check (D)~~: done by script, 2026-10-15 to 17. A person using it on a
   phone is still owed.
2. ~~The research items (C)~~: done except those waiting on a decision (B6 to B11, the
   hotel dataset).
3. ~~Small platform items from A~~: boarding code, completion confirmation, rating
   reminder, response rate and the reproducibility capsule are all built.
4. ~~The two reserved event families (81, 93)~~: flexibility tiers and supply-gap nudges
   are built.
5. **Group B, one service at a time**, only if the team gets the accounts. Otherwise
   leave them as clearly labelled mocks and say so in the report.
6. **Group A, each once its policy or placement is decided.**

## What will not be built

- Anything that cancels a booking or changes a price because of a predicted risk. The
  project's own rules forbid it.
- A sync layer between stores, a third data store or a fourth runtime. CLAUDE.md forbids
  them. Photos (3, 16) are kept in PostgreSQL for that reason, not in a file store.
