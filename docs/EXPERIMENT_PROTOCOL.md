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

### Still to run

- Split "offered no ride" into no ride in the time window and no seats on the rides in
  it. This needs the simulator to say which, and so a payload change that needs
  approval under the frozen vocabulary.
- B5 with requests chosen at random within the same limits.
- The time-tolerance sweep the finding above points to: if passengers accept a wider
  window, do early releases start to convert?
- Still open from section 7: a sweep of the survival threshold, B4 with `h1-km`, and
  B4's intervention with B0's ranking.
