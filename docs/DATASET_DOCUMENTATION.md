# Datasets

**Every dataset in this project is synthetic.** It is produced by the simulator in `sim/`
from assumptions in `experiments/configs/world.yaml`. No data about real people, real
bookings or real cancellations has been collected or used. Nothing in this document, or
any result built on it, is evidence about how real passengers behave.

## Where the data comes from

| Dataset | Produced by | Kept in |
|---|---|---|
| Simulation event logs | `python -m sim.run` and the experiment runners, one run per variant and seed | `events` table in PostgreSQL, tagged with `run_id`, `variant`, `seed` |
| Model training and validation sets | `experiments/hazard/train.py`, which simulates the training and validation seeds in memory and turns their events into rows with `experiments/hazard/dataset.py` | In memory only; never stored |
| Fitted models | `experiments/hazard/train.py` | `intel/app/hazard/models/*.json` |
| Experiment reports | `experiments/analysis/compare.py`, `experiments/sweep.py` | `experiments/reports/*.json` and `.md` |
| Platform use | core-api, from people using the app | The same `events` table, with no `run_id` |

Platform rows exist only from development and testing on the authors' machines. None
has been used for any result.

## The event log

One table, `events`, holds both simulated and platform events, with the same vocabulary
of 22 types and the same payload conventions.

| Column | Meaning |
|---|---|
| `run_id`, `variant`, `seed` | Which simulated run produced the row. Empty for platform rows |
| `sim_time` | When it happened: simulated time for a simulation, wall-clock time for the platform |
| `actor_type`, `actor_id` | `passenger`, `driver` or `platform`, and who. `platform` rows have no id |
| `event_type` | One of the 22 types in `journex_events/vocabulary.py`, mirrored in core-api |
| `payload` | JSON, snake_case keys, timestamps in ISO-8601 with offset |

The vocabulary is frozen. Of the 22 types, these are written today: `search_issued`,
`candidates_returned`, `candidate_ranked`, `booking_requested`, `booking_accepted`,
`booking_rejected`, `booking_cancelled`, `seat_refilled`, `recovery_search`,
`recovery_booked`, `hazard_scored`, `intervention_issued`, `intervention_responded`,
`trip_started`, `trip_completed`, `trip_failed`, and, from core-api only,
`tier_selected` (a passenger choosing a flexible tier; the default is not logged). These
five are defined but not yet written by anything: `driver_tier_selected`,
`supply_gap_detected`, `nudge_issued`, `nudge_dismissed`, `nudge_converted`.

Contract the analysis relies on: `booking_cancelled` carries `departure_time`, so the
late-cancellation share can be computed.

## What the simulator assumes

All in `experiments/configs/world.yaml`, and **all assumptions chosen by the authors**,
not measured. The team has not yet confirmed them.

| Assumption | Value |
|---|---|
| Corridor | Kolhapur to Pune, about 230 km (fixed by the project) |
| Span | 60 days (fixed) |
| Booking horizon | 7 days (fixed) |
| Rides published per day | 12, at fixed weights across 06:00 to 18:00 |
| Seats per ride | 1 to 4, mostly 2 or 3 |
| Searches per day | 60, from a population of 800 people |
| Party size | 1 (70%), 2 (20%), 3 (10%) |
| A ride matches a search if it leaves within | 2 hours of the time asked for |
| A driver accepts a request | with probability 0.85 |
| A driver withdraws a published ride | with probability 0.04 |
| Passenger types | four latent types with different cancellation behaviour (below) |
| Cancellation timing | a Weibull hazard per type, with unobservable shocks |
| Response to a reconfirmation request | swept, never estimated |

### Latent passenger types

Each simulated person is one of `committed`, `flexible`, `opportunistic` or
`deadline_bound`, and keeps that type for the whole run. The type drives when and
whether they cancel. **It is never written to an event and never used as a feature.**
Tests fail if a type name, or a `kind` key, appears in any payload or training row.

### Deliberate misspecification

Cancellations are generated from a Weibull hazard with random shocks the models cannot
see. The models fitted are Cox proportional hazards and gradient-boosted survival,
neither of which can represent that generator. This is on purpose: a model that matched
its generator exactly would say nothing about how it would fare on real data.

## The training set

Built by `experiments/hazard/dataset.py`. One row per accepted booking.

| Field | Meaning |
|---|---|
| The nine features of version `f1` | Listed in AI_ML_METHODOLOGY.md section 3. All known when the booking was requested |
| `duration_hours` | From acceptance to the passenger's cancellation, or to censoring |
| `cancelled` | True if the passenger cancelled |
| `horizon_hours` | From acceptance to the scheduled departure |
| `reached_departure` | True if the booking was still live at departure |

The clock starts at acceptance. A booking is censored, not counted as a cancellation,
when it reaches departure, or earlier if the driver withdraws the ride: all that is known
then is that the passenger had not cancelled. Only cancellations by the passenger count.

| Set | Seeds | Accepted bookings | Passenger cancellations |
|---|---|---|---|
| Training | 1001-1020 | 25,272 | 3,196 |
| Validation | 2001-2010 | 12,595 | 1,611 |
| Experiments | 1-30 | never used for fitting or model choice | |

The three seed ranges are disjoint, set in `experiments/configs/hazard.yaml`, and the
training code refuses to run if they overlap. All training data comes from variant B0,
so the model learns from a world no intervention has yet changed.

## Reproducing the data

The simulator is deterministic given a seed: the same configuration and seed produce the
same events, row for row. A test checks this. So every dataset here can be regenerated
from the configuration files and the seed numbers, and nothing needs to be shipped
except the code and `experiments/configs/`.

The model's data needs no database: training simulates its seeds itself.

```sh
docker compose --profile research run --rm research python -m experiments.hazard.train
```

Experiment runs write to PostgreSQL; EXPERIMENT_PROTOCOL.md section 4 shows how.

## Personal data

The simulator invents no names, contacts or positions beyond stop coordinates; a
simulated person is a number. Platform events written by core-api carry user ids, and
search positions rounded to about 100 metres. There is no export of real user data and no
dataset of it.

## Not examined

The project synopsis names a public hotel-reservation dataset as a possible check on the
model. It has not been examined. A cancellation flag with a lead time does not give the
time a cancellation happened, so it may not support a time-to-event validation at all;
deciding that is still to be done.
