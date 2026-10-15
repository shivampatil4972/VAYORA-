# Experiment protocol

## Question

Does modelling booking durability as a time-to-event process, and acting on the
estimate before departure, raise **completed rides per 100 searches** over a baseline
that does neither?

This is a hypothesis under test. Section 5 reports what the first full run found.

## 1. Fixed design

| Item | Value | Where it is fixed |
|---|---|---|
| Corridor | Kolhapur to Pune | `sim/frozen.py` |
| Booking horizon | 7 days | `sim/frozen.py` |
| Simulated span | 60 days | `sim/frozen.py` |
| Seeds per variant | 30 (seeds 1-30) | `sim/frozen.py` |
| Primary metric | completed rides per 100 searches | `metrics.sql`, `primary_metric` |
| World | `experiments/configs/world.yaml` | every value an assumption |
| Model seeds | train 1001-1020, validation 2001-2010 | `experiments/configs/hazard.yaml` |

## 2. Variants

| Variant | Ranking | Model | Intervention | Status |
|---|---|---|---|---|
| B0 | Closest to the preferred departure time | none | none | Run |
| B1 | Feasibility filter | | | Not built: the simulated corridor has one origin and one destination, so there is no geography to filter |
| B2 | Two-sided ranking | | | Not built |
| B3 | Predicted survival to departure | `h2-cox` (`h1-cox` in section 5) | none | Run |
| B4 | As B3 | `h2-cox` (`h1-cox` in section 5) | Reconfirmation request when estimated survival is below 0.8, at most once per booking, never within 24 h of departure, scored every 24 h | Run |
| B5 | As B3 | `h2-cox` | As B4, but at most 2 requests per daily round, 1 per ride, and 4 seats asked about per departure day, chosen by the contact scheduler | Run (section 8) |
| B3-KM | As B3 | `h2-km`, which uses no booking feature | none | Run (section 14) |
| B4-KM | As B3-KM | `h2-km` | As B4 | Run (section 14) |
| ASK-ONLY | As B0 | `h2-cox`, for choosing whom to ask only | As B4 | Run (section 14) |
| B5-RANDOM | As B3 | `h2-cox` | As B5, but the requests go to eligible bookings in a random order, not the scheduler's choice | Run (section 14) |
| B6-B11 | | | | Not built |

The platform never cancels a booking. An intervention only asks; the passenger decides.

## 3. How variants are compared

- **Paired by seed.** Supply, search arrivals and each passenger's random draws come
  from separate streams keyed by the seed, so a seed is the same world under every
  variant. Tests verify that every variant faces identical searches and identical rides.
- **Per-seed differences** against the baseline, with a 95% t interval on the mean
  difference and a Wilcoxon signed-rank test (`experiments/analysis/compare.py`).
- **Every figure is a SQL aggregate over the `events` table** through `metrics.sql`.
- No correction for multiple comparisons is applied. With three variants and seven
  measures, treat any single p-value near 0.05 as unremarkable.

## 4. Reproducing a run

**One command rebuilds every current result** and fails unless each file comes out
exactly as committed:

```sh
scripts/reproduce.sh              # tests, model, ladder, sweeps: about an hour
scripts/reproduce.sh --no-sweeps  # without the sweeps
```

It was run in full on 2026-10-16. The model files, the model report, the ladder report
and the departure-tolerance and publishing-lead sweeps came out byte for byte as
committed. The contact-budget sweep report came out with three more tables, because
sweep reports gained those measures after it was first written; every number already in
it was identical, and the fuller report is now the committed one. Ladders `...001` and
`...002` and sweeps `...001` and `...002` were made with earlier code and are kept as
history; the script does not rebuild them.

To run a single comparison by hand:

```sh
docker compose up -d --wait postgres core-api
RUN=$(python -c "import uuid; print(uuid.uuid4())")
for v in B0 B3 B4 B5; do
  docker compose --profile research run --rm research \
    python -m sim.run --variant experiments/configs/variants/$v.yaml --run-id $RUN
done
docker compose --profile research run --rm research \
  python -m experiments.analysis.compare --run-id $RUN --baseline B0 B3 B4 B5
```

The simulator is deterministic given a seed, so a rerun reproduces the same events and
the same report. The model is retrained with `python -m experiments.hazard.train`, which
is also deterministic.

## 5. First full run

Run `7a1c0de0-0000-4000-8000-000000000001`, 30 seeds per variant. Source:
`experiments/reports/ladder-7a1c0de0-0000-4000-8000-000000000001.md`. Synthetic data.

| Measure | B0 | B3 | B4 |
|---|---|---|---|
| Completed rides per 100 searches | 29.59 | 29.89 | 29.89 |
| difference vs B0 (95% CI) | | +0.30 (+0.24 to +0.36) | +0.29 (+0.22 to +0.36) |
| seeds better / worse than B0 | | 29 / 1 | 28 / 1 |
| Late share of cancellations | 0.390 | 0.394 | 0.340 |
| difference vs B0 (95% CI) | | +0.004 (+0.000 to +0.008) | -0.050 (-0.058 to -0.042) |
| Released seats refilled, per seed | 157.4 | 157.8 | 168.6 |
| Reconfirmation requests per accepted booking | 0 | 0 | 0.190 |

### What this shows

1. **Survival-aware ranking gives a small, consistent gain**: +0.30 completed rides per
   100 searches, about 1% of the baseline, better on 29 of 30 seeds.
2. **The intervention works mechanically.** Cancellations move earlier (late share falls
   by 0.05, on all 30 seeds) and about 11 more released seats per seed are refilled.
3. **The intervention adds nothing to the primary metric.** B4 and B3 are
   indistinguishable on completed rides (29.89 and 29.89). At these parameter values the
   hypothesis that acting on the estimate before departure raises completed rides is
   **not supported** beyond what ranking alone achieves.

### Why the third point should not yet be taken as the answer

- **The response assumptions decide it.** B4's outcome depends on
  `intervention_response` in `world.yaml`: a passenger who would have cancelled releases
  early with probability 0.5, and one who would have travelled cancels out of annoyance
  with probability 0.02. Both numbers are guesses and a simulation cannot estimate them.
  About 19% of accepted bookings are contacted and most of those would have travelled,
  so even a 2% annoyance rate costs trips of the same order as the refills gain.
- **The model discriminates weakly** (concordance 0.59), so a threshold contacts many
  bookings that were never at risk.
- **Passengers search once.** One who is cancelled on, rejected or finds nothing never
  returns, so a released seat can only be taken by a new arrival.
- **One threshold, one interval, one world.** None has been swept.

## 6. Sweep: how passengers respond to being asked

Run `5eeb0000-0000-4000-8000-000000000001`, 30 seeds per cell. Source:
`experiments/reports/sweep-intervention-response-5eeb0000-0000-4000-8000-000000000001.md`.
Config: `experiments/configs/sweeps/intervention_response.yaml`. B4 on a world with the
two response parameters replaced, against B3 on the unmodified world, paired by seed.
Synthetic data.

Difference in completed rides per 100 searches, B4 minus B3 (B3 = 29.89), with 95% CI:

| Releases when asked | Annoyed: 0 | Annoyed: 0.02 | Annoyed: 0.05 |
|---|---|---|---|
| 0.25 | +0.02 (+0.00 to +0.04) | -0.02 (-0.04 to +0.01) | -0.06 (-0.10 to -0.02) |
| 0.5 | +0.03 (+0.00 to +0.06) | -0.01 (-0.04 to +0.02) | -0.05 (-0.09 to -0.02) |
| 1.0 | +0.06 (+0.02 to +0.10) | +0.02 (-0.02 to +0.06) | -0.02 (-0.07 to +0.02) |

Change in the late share of cancellations (B3 = 0.394) runs from -0.022 at (0.25, 0) to
-0.108 at (1.0, 0.05), lower than B3 on at least 29 of 30 seeds in every cell.

### What this shows

1. **The intervention is worth almost nothing on the primary metric anywhere on the
   grid.** In the best case there can be, where every passenger destined to cancel
   releases the moment they are asked and nobody is ever put off, the gain is +0.06
   completed rides per 100 searches: 0.2% of the baseline.
2. **It can do harm.** With 5% of contacted travellers put off, the difference is
   negative in all three rows and its interval excludes zero in two.
3. **It reliably makes cancellations earlier**, by up to a quarter of the late share.

So section 5's caveat is resolved in one direction: the null result on completed rides
is not an artefact of the assumed response. In this world, **earlier release does not
turn into more completed rides**, whatever passengers do when asked.

### Why that might be, and what would test it

These are hypotheses, not findings:

- **Nobody comes back.** A passenger who found nothing, was rejected or was cancelled on
  never searches again, so a released seat can only be taken by a fresh arrival whose
  preferred time is within two hours of that ride. Modelling repeat search is the most
  direct test.
- **Refill depends on excess demand at the right time.** Sweeping `searches_per_day`
  and `rides_per_day` would show whether the gain appears when seats are scarcer.
- **Most released seats were going to be released anyway.** The intervention moves a
  cancellation earlier; if the original time was already early enough to refill, the
  move buys nothing. The late share shows only 39% of cancellations are late to begin
  with.
- **The primary metric may be the wrong place to look for this effect.** The
  intervention's measurable effect is on *when* seats come back. Whether that has value
  the primary metric does not capture (driver certainty, less last-minute disruption)
  is a question for the team, and must be decided before looking at more results, not
  after.

### Still to run

- Repeat search by unserved passengers, then B3 against B4 again.
- A sweep of supply and demand density, and of the survival threshold.
- B4 with the no-feature model (`h1-km`), to separate the value of the features from
  the value of knowing time-to-departure.
- Component-removal: B4's intervention with B0's ranking.

## 7. Two more worlds: repeat search, and supply density

After section 6 the world was changed so that a passenger left without a seat may search
again (`demand.retry` in `world.yaml`: probability 0.6, up to two further attempts). The
model was retrained on that world as `h2` (`experiments/reports/hazard-h2.json`:
concordance 0.595, departure Brier 0.1018 against 0.1037 for the no-feature curve).
Sections 5 and 6 used the earlier world and model `h1`; their numbers are not comparable
with the ones below.

### Ladder with repeat search

Run `7a1c0de0-0000-4000-8000-000000000002`, 30 seeds per variant. Synthetic data.

| Measure | B0 | B3 | B4 |
|---|---|---|---|
| Completed rides per 100 searches | 30.77 | 31.11 | 31.10 |
| difference vs B0 (95% CI) | | +0.34 (+0.25 to +0.42) | +0.33 (+0.24 to +0.42) |
| Late share of cancellations | 0.373 | 0.376 | 0.321 |

### Supply density

Run `5eeb0000-0000-4000-8000-000000000002`, 30 seeds per cell, B4 against B3 **on the same
world** (`experiments/configs/sweeps/supply_density.yaml`). Synthetic data.

| Rides per day | B3, completed per 100 | B4 minus B3 (95% CI) | Change in late share |
|---|---|---|---|
| 6 | 17.79 | +0.00 (-0.03 to +0.03) | -0.058 |
| 12 | 31.11 | -0.01 (-0.04 to +0.03) | -0.056 |
| 20 | 40.94 | -0.04 (-0.07 to -0.01) | -0.054 |

The model was trained at 12 rides a day, so at 6 and 20 it is used outside the world it
learnt from.

### What this shows

Three things were varied that could each have explained the null result: how passengers
respond when asked (section 6), whether unserved passengers come back, and how scarce
seats are. In every case the answer is the same:

- **Survival-aware ranking gives a small, reliable gain**, about 1% of the baseline.
- **Asking bookings to reconfirm adds nothing to completed rides**, and is slightly
  harmful where seats are plentiful.
- **It reliably makes cancellations earlier**, by about 0.055 of the late share, on all
  30 seeds in every world tried.

The project's central idea, that an early cancellation is a success because the seat is
refilled and the journey completes, is **not supported by this simulator** as far as
completed rides are concerned. Earlier release happens; the extra completed rides do not
follow.

### What this does not show

- That the idea is wrong in reality. This is one synthetic corridor whose every parameter
  is an assumption. A world could be built in which it works; none of the three most
  obvious candidates did.
- Anything about value the primary metric does not measure, such as a driver knowing a
  seat is free a day earlier. Whether to measure that is the team's decision, and it
  should be made on its merits, not because the primary metric disappointed.

### Still to run

- Why refills do not convert: how many released seats are refilled at all, and whether
  the bookings that refill them would have found another ride anyway.
- A sweep of the survival threshold, and B4 with the no-feature model (`h1-km`).
- Component-removal: B4's intervention with B0's ranking.

## 8. A contact budget, and why refills do not add rides

Run on 2026-10-13. Synthetic data; 30 seeds per variant; model `h2-cox`; the world of
section 7 (repeat search on, 12 rides a day).

- Ladder: `experiments/reports/ladder-7a1c0de0-0000-4000-8000-000000000003.md`
- Sweep: `experiments/reports/sweep-contact-budget-5eeb0000-0000-4000-8000-000000000003.md`

B0, B3 and B4 reproduce section 7's ladder to every printed digit, which is the check
that adding the budget changed nothing for variants without one.

### B5 in the ladder (differences against B0)

| | B3 | B4 | B5 |
|---|---|---|---|
| Completed rides per 100 searches | 31.11 (+0.34) | 31.10 (+0.33) | 31.10 (+0.33) |
| Late share of cancellations | 0.376 | 0.321 | 0.357 |
| Requests per accepted booking | 0 | 0.207 | 0.083 |
| Released seats refilled | 186.2 | 197.4 | 191.5 |

### The budget swept (differences against B4, which asks everyone eligible)

| Requests allowed per round | Requests per accepted booking | Share of B4's requests | Late share | Share of B4's late-share reduction |
|---|---|---|---|---|
| 1 | 0.042 | 20% | 0.367 | 16% |
| 2 | 0.083 | 40% | 0.357 | 35% |
| 4 | 0.149 | 72% | 0.338 | 69% |
| 8 | 0.183 | 88% | 0.327 | 89% |
| no limit (B4) | 0.207 | 100% | 0.321 | 100% |

The last column is `(0.376 - late share) / (0.376 - 0.321)`, B3 being the same ranking
with no requests. It is arithmetic on the two reports' means, not a paired statistic.

Completed rides per 100 searches does not move with the budget: every cell is within
0.01 of B4 and every interval includes zero.

### What this shows

- **The budget buys what it pays for and no more.** The effect on the late share is
  close to proportional to the number of requests sent, and slightly below proportional
  when the budget is tight. The scheduler's choice of whom to ask does not concentrate
  the effect on fewer requests.
- That is a finding about the worth formula and the model, not about the solver. The
  formula favours bookings far from departure with many seats; the model that scores
  them discriminates weakly (concordance 0.59). Neither points reliably at the bookings
  whose release would otherwise have come late.
- **A random choice of the same number of requests was not run.** Without it, "no better
  than proportional" cannot be sharpened to "no better than chance".
- The primary metric is as indifferent to how many are asked as it was to whether
  anyone is.

### Why refills do not add completed rides

A new measure, `refill_additionality` in `metrics.sql`, asks of every booking that took
a released seat: was the passenger's search offered any other ride? A passenger offered
another ride would have asked for one anyway, so only a refill by a passenger offered
nothing else can be a booking that would not otherwise exist.

| | B0 | B3 | B4 | B5 |
|---|---|---|---|---|
| Released seats refilled, per seed | 183.0 | 186.2 | 197.4 | 191.5 |
| of which by a passenger offered no other ride | 77.7 | 76.4 | 76.4 | 76.1 |
| Searches offered no ride at all | 0.550 | 0.545 | 0.542 | 0.544 |

- **B4 refills 11 more seats per seed than B3, and none of the extra go to a passenger
  who had no alternative.** The count of only-option refills is the same to one decimal
  with and without the intervention. The seats released early are taken by passengers
  who would have booked a different ride.
- This is an explanation that fits, not a proof. Only-option refills are an upper bound
  on added bookings, not a count of them; the B3-to-B4 comparison is of means, and no
  paired test of that difference was run.
- **More than half of all searches are offered nothing.** Demand for seats is not what
  is missing. A search is offered nothing when no ride within the passenger's time
  tolerance has enough seats, and the event log does not say which of the two it was.
  If it is mostly timing, a seat released on Tuesday's 06:00 ride cannot help someone
  who needs Thursday evening, however early it is released.

That last point is the most useful thing the project has learnt about its own idea:
in this simulator an early release fails to add rides not because nobody wants a seat,
but because the people who want one mostly want a different departure.

**Corrected by section 9.** The paragraph above was a guess, and the sweep run to test
it does not support it: with an 8-hour window, which covers nearly every departure of
the day, 52% of searches are still offered nothing and early releases add no rides. It
is kept here so the record shows what was believed and why it changed.

### Still to run

- Split "offered no ride" into no ride in the time window and no seats on the rides in
  it. This needs the simulator to say which, and so a payload change that needs
  approval under the frozen vocabulary.
- B5 with requests chosen at random within the same limits.
- ~~The time-tolerance sweep the finding above points to.~~ Run: section 9.
- Still open from section 7: a sweep of the survival threshold, B4 with `h1-km`, and
  B4's intervention with B0's ranking.

## 9. A wider departure window

Run on 2026-10-15. Synthetic data; 30 seeds per cell; model `h2-cox`; repeat search on.
Report: `experiments/reports/sweep-departure-tolerance-5eeb0000-0000-4000-8000-000000000004.md`

The question, from section 8: if passengers accept a departure further from the time they
asked for, do the seats B4 frees early start to add completed rides? Tolerance changes
what everyone is offered, so each cell compares B4 with its own B3 on the same world.

| Window (hours either side) | B3 completed per 100 | B4 − B3 | B4 − B3, late share | Searches offered no ride (B3) | Extra refills by passengers with no other ride |
|---|---|---|---|---|---|
| 1 | 29.07 | +0.00 (−0.04 to +0.04) | −0.052 | 0.585 | +2.0 (−0.2 to +4.1) |
| 2 (the world's value) | 31.11 | −0.01 (−0.04 to +0.03) | −0.056 | 0.545 | +0.1 (−2.3 to +2.4) |
| 4 | 31.87 | −0.00 (−0.04 to +0.04) | −0.056 | 0.534 | −1.2 (−3.3 to +1.0) |
| 8 | 33.11 | −0.05 (−0.10 to −0.01) | −0.058 | 0.519 | −2.9 (−4.9 to −0.8) |

### What this shows

- **A wider window does not make early release pay.** At every width B4 adds nothing to
  completed rides, and at 8 hours it costs a little (−0.05, interval excluding zero; 20
  seeds down, 7 up).
- **B4 still moves cancellations earlier** by about the same amount at every width.
- **A wider window helps everyone**, with or without intervention: B3 rises from 29.07 to
  33.11 completed per 100 searches. That is the effect of passengers being more flexible,
  not of anything the platform does.
- **The guess in section 8 was wrong.** With 8 hours either side, 52% of searches are
  still offered no ride. Departure times cannot be what is missing for most of them.

### What is left to explain

Over half of all searches find no ride even when almost any departure would do, and yet
seats freed early do not reach the people who found nothing. Two explanations remain, and
neither has been tested:

- **The rides are full.** Then an early release should help someone who found nothing,
  unless those searches happened before the seat was freed and the passenger did not come
  back. Repeat search is on, but only some passengers retry.
- **The ride did not exist yet.** Rides are published 1 to 7 days ahead. A search for a
  day whose rides have not been published finds nothing, however many seats will exist.

Telling these apart needs `candidates_returned` to say why a search found nothing, the
payload change already awaiting the team's approval.

### Still to run

- The split above, once approved.
- A sweep of how far ahead rides are published, which tests the second explanation
  without any payload change.

## 10. How far ahead rides are published

Run on 2026-10-15. Synthetic data; 30 seeds per cell; model `h2-cox`; repeat search on.
Report: `experiments/reports/sweep-publish-lead-5eeb0000-0000-4000-8000-000000000005.md`

Section 9 left two explanations for why over half of all searches find no ride. This
sweep tests one: that the ride wanted had not been published yet. Rides are published
between `publish_lead_days_min` and 7 days ahead; at 7, every ride is visible for the
whole booking horizon.

| Rides published at least | Searches offered no ride (B3) | B3 completed per 100 | B4 − B3 | Extra refills by passengers with no other ride |
|---|---|---|---|---|
| 1 day ahead (the world's value) | 0.545 | 31.11 | −0.01 (−0.04 to +0.03) | +0.1 |
| 4 days ahead | 0.525 | 31.31 | −0.03 (−0.07 to +0.00) | −9.4 |
| 7 days ahead | 0.501 | 31.53 | −0.05 (−0.09 to −0.01) | −13.5 |

### What this shows

- **Late publishing explains little.** Publishing every ride a full week ahead lowers the
  share of searches finding nothing by under 5 points, from 54.5% to 50%.
- **So most empty searches are full rides.** The configuration agrees, by arithmetic on
  its own assumptions rather than by measurement: 12 rides a day at an average of 2.56
  seats offer about 31 seats a day, while 60 searches a day at an average party of 1.4 ask
  for about 84.
- **Early release still adds nothing, and costs a little where everything is published
  early** (−0.05 at 7 days). It moves cancellations earlier at every setting.

### The question this leaves

Seats are scarce in this world, which is the condition under which an early release
ought to pay: someone is always waiting. It does not. B4 produces about 11 to 14 more
refills per seed than B3, yet no more completed rides, and with early publishing the
refills by passengers who had no other option go *down*.

The candidates, none yet measured:

- **Late releases are refilled too.** If seats are scarce, a seat freed a few hours
  before departure may still be taken, so freeing it days earlier gains little. This is
  measurable from the existing log: the share of released seats refilled, split by how
  long before departure they were released.
- **Asking costs travellers.** Some passengers asked to reconfirm cancel because they were
  asked (the "annoyed" response in `world.yaml`), losing trips that would have run.
- **Refills move passengers between rides.** An early release lets one passenger take a
  seat another would have taken a little later.

The first is the one to measure next; it needs only a new metric query.

## 11. Why early release adds so little

Measured on 2026-10-15 over the existing ladder run of section 8
(`experiments/reports/ladder-7a1c0de0-0000-4000-8000-000000000003.md`, regenerated with the
new measures); no new simulation. Synthetic data, 30 seeds.

### Are late releases refilled anyway? No.

A new query, `refill_by_release_timing`, compares rides whose passenger releases were all
early (24 hours or more before departure) with rides whose releases were all late. Seats
on a ride are interchangeable, so this is measured per ride, not per seat; rides with both
kinds, or with a driver cancellation, are left out.

| | B0 | B3 | B4 | B5 |
|---|---|---|---|---|
| Seats refilled, rides with only early releases | 0.928 | 0.935 | 0.944 | 0.938 |
| Seats refilled, rides with only late releases | 0.665 | 0.695 | 0.685 | 0.694 |

An early release is refilled about 94% of the time, a late one about 68%. **The project's
premise holds in this simulator: an early release is worth more than a late one**, by
roughly a quarter of a seat.

### Then why no gain? Because B4 moves very few releases.

Per seed, averaged over the 30 seeds:

| | B3 | B4 | B4 − B3 |
|---|---|---|---|
| Passenger cancellations | 186.2 | 193.0 | +6.8 |
| of which late (under 24 hours) | 67.1 | 57.0 | −10.1 |
| Completed trips | 1122.9 | 1122.6 | −0.3 |
| Searches | 3611 | 3611 | |

- B4 turns about 10 late releases into early ones. At a quarter of a seat each that is
  worth about **2.6 completed trips per seed, or 0.07 per 100 searches**, before anything
  is subtracted. The experiment's interval on the difference is about ±0.035 per 100, so
  a gain this size would just about show.
- Against it: B4 also produces about 7 cancellations B3 does not. In the simulator a
  passenger who was going to travel cancels only if put off by being asked (2% of them,
  an assumed value), and some refilled seats are booked by passengers who later cancel
  in turn. Each extra cancellation is a seat that must be refilled just to break even.
- And a refill is a completed trip only if whoever took it would not have travelled
  anyway. Section 8 found that the extra refills go to passengers who had another ride on
  offer, so part of the gain is a passenger moving between rides.

The arithmetic says the effect should be small and positive; the measurement says zero
within ±0.04. The two are not far apart, and the difference is in the direction the
second and third points predict. That account fits but has not been tested piece by
piece.

### What this means for the project's idea

The idea is right about seats and wrong about this intervention. An early release does
help, but **asking risky bookings to reconfirm moves too few releases to matter**: of
about 67 late releases per seed, B4 brings forward 10. That follows from a model that
discriminates weakly (concordance 0.59) and from assuming half of those asked who were
going to cancel would say so.

### What would test it next

- A sweep of `early_release_probability` already exists (section 6) and showed at most
  +0.06; this section explains why that is the ceiling.
- The lever that matters is how many late releases can be found and moved. A better model
  is the obvious one; an oracle variant that asks exactly the passengers who will cancel
  late would show the most any reconfirmation policy could gain in this world.

## 12. The ceiling: an oracle that knows who will cancel late

Run on 2026-10-15, added to the ladder run of section 8 (same world and seeds).
Synthetic data, 30 seeds. Variant `ORACLE` (`experiments/configs/variants/ORACLE.yaml`).

**ORACLE is an upper bound, not a method.** It is B4 with one change: instead of asking
the bookings the model scores as risky, it asks exactly the bookings the simulator knows
will be cancelled less than a day before departure. No platform could know this. It reads
the hidden cancellation time, never a latent type, and writes no event B4 would not.

| Against B3, seed by seed | B4 | ORACLE |
|---|---|---|
| Completed rides per 100 searches | −0.01 (−0.04 to +0.03) | **+0.10 (+0.07 to +0.13)**, 26 seeds up, 4 down |
| Late share of cancellations | −0.055 | −0.112 |
| Requests per accepted booking | 0.207 | 0.037 |

### What this shows

- **Perfect targeting does help, and measurably.** With 30 seeds the oracle's gain is
  clear of zero.
- **But the ceiling is low: +0.10 completed rides per 100 searches**, about a third of one
  percent, while asking only 4 in every 100 bookings. That is the most a reconfirmation
  request can do in this world, given the assumed responses: half of those asked who would
  cancel do so straight away, and 2% of those who would travel are put off.
- B4 reaches none of it. It asks five times as many bookings as the oracle and moves half
  as many late cancellations, because the model cannot pick the late cancellers out
  (concordance 0.59).

### Conclusion of the research so far

In this simulated corridor:

1. An early release is worth more than a late one: early releases are refilled about 94%
   of the time, late ones about 68% (section 11). The project's premise is right.
2. Asking bookings to reconfirm is a weak lever even when aimed perfectly: at best +0.10
   completed rides per 100 searches (this section).
3. Aimed with the model that exists, it gains nothing measurable (sections 5 to 8).
4. Ranking rides by predicted durability (B3) is the only variant that has helped by
   itself: about +0.34 per 100 searches over B0, three times the oracle's ceiling.

Every number is from one synthetic corridor whose parameters are the authors'
assumptions. None is evidence about real passengers.

### Still to run

- The oracle across `early_release_probability`: the ceiling scales with how readily
  passengers who will cancel say so when asked, which is an assumption.

## 13. When cancellations come

A new named query, `cancellation_timing`, counts each seed's cancellations in bands of
hours before departure; its four bands under 24 hours add up to `late_cancellation_share`'s
`late`, which a test checks on hand-made events. `experiments/analysis/timing.py` runs it
over the ladder run and writes `experiments/reports/timing-7a1c0de0-…-003.json`, paired by
seed against B3. Figure 6 and its table are in [figures/README.md](figures/README.md).

Against B3, B4 cuts late cancellations by 10.0 per seed and cancellations 24–48 hours out by
10.1, and adds 22.7 four or more days out (+21.1 to +24.4): about 6 more cancellations in
all. ORACLE cuts late cancellations by 23.5 and moves them mostly into the one to four days
before departure. This is the mechanism behind sections 8 and 12: asking moves many
releases from "early" to "earlier", which gains nothing, and a few from late to early, which
gains little because late seats are mostly refilled anyway (section 11).

## 14. Robustness: each component removed or replaced

Run `7a1c0de0-0000-4000-8000-000000000004`, 30 seeds per variant, every variant against
**B3**, paired by seed. B0, B3, B4 and B5 reproduce run `...003` to every digit of every
measure, which is the check that nothing else changed.

| Variant | Completed per 100 | vs B3 (95% CI) | Late share vs B3 (95% CI) | Requests per accepted booking |
|---|---|---|---|---|
| B0 | 30.77 | -0.34 (-0.42 to -0.25) | -0.003 (-0.008 to +0.001) | 0.000 |
| ASK-ONLY | 30.78 | -0.33 (-0.41 to -0.25) | -0.057 (-0.062 to -0.053) | 0.209 |
| B3-KM | 31.09 | -0.01 (-0.04 to +0.01) | +0.001 (-0.001 to +0.003) | 0.000 |
| B4 | 31.10 | -0.01 (-0.04 to +0.03) | -0.056 (-0.060 to -0.051) | 0.207 |
| B4-KM | 31.08 | -0.03 (-0.08 to +0.03) | -0.056 (-0.061 to -0.051) | 0.215 |
| B5 | 31.10 | -0.01 (-0.03 to +0.01) | -0.019 (-0.023 to -0.016) | 0.083 |
| B5-RANDOM | 31.11 | -0.00 (-0.03 to +0.02) | -0.022 (-0.025 to -0.018) | 0.084 |

B3 itself: 31.11 completed per 100 searches, late share 0.376.

- **B3's gain over B0 needs no booking features.** B3-KM ranks rides with a model that knows
  nothing about the passenger or the booking, only how far off departure is, and keeps all
  of B3's gain (−0.01, −0.04 to +0.01). In this simulator the survival-aware ranking works
  because of timing, not because the model reads anything about individual passengers. The
  Cox model's features add nothing measurable to the primary metric.
- **Asking adds nothing however it is done.** Choosing whom to ask by features (B4) or by
  timing alone (B4-KM) gives the same result. Asking on B0's ranking (ASK-ONLY) does no
  better than B0 (−0.33 against B0's −0.34): all of the gain is the ranking.
- **The scheduler does not beat chance.** With the same limits, sending B5's requests to
  eligible bookings in a random order (B5-RANDOM) does as well on the primary metric and
  slightly better on the late share (−0.022 against −0.019).
- **No threshold rescues B4.** Sweep `5eeb0000-0000-4000-8000-000000000006` asks below
  0.6, 0.7, 0.8 and 0.9 against B3. The late share falls steadily, from −0.011 to −0.097,
  as more bookings are asked (0.045 to 0.375 requests per accepted booking), and released
  seats refilled rise from +3.0 to +17.6 per seed. Completed rides per 100 searches move by
  −0.02 to +0.00, with every interval spanning zero.

Read with sections 11 to 13, this closes the question the simulator can answer: on this
corridor, under these assumptions, moving cancellations earlier is real but does not turn
into completed rides, and the part of the platform that helps is a ranking that needs no
prediction about the passenger. It says nothing about real passengers, whose behaviour
the simulator only assumes.
