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
| B3 | Predicted survival to departure | `h1-cox` | none | Run |
| B4 | As B3 | `h1-cox` | Reconfirmation request when estimated survival is below 0.8, at most once per booking, never within 24 h of departure, scored every 24 h | Run |
| B5-B11 | | | | Not built |

The platform never cancels a booking. An intervention only asks; the passenger decides.

## 3. How variants are compared

- **Paired by seed.** Supply, search arrivals and each passenger's random draws come
  from separate streams keyed by the seed, so a seed is the same world under every
  variant. Tests verify that every variant faces identical searches and identical rides.
- **Per-seed differences** against the baseline, with a 95% t interval on the mean
  difference and a Wilcoxon signed-rank test (`experiments/analysis/compare.py`).
- **Every figure is a SQL aggregate over the `events` table** through `metrics.sql`.
- No correction for multiple comparisons is applied. With two variants and five
  measures, treat any single p-value near 0.05 as unremarkable.

## 4. Reproducing a run

```sh
docker compose up -d --wait postgres core-api
RUN=$(python -c "import uuid; print(uuid.uuid4())")
for v in B0 B3 B4; do
  docker compose --profile research run --rm research \
    python -m sim.run --variant experiments/configs/variants/$v.yaml --run-id $RUN
done
docker compose --profile research run --rm research \
  python -m experiments.analysis.compare --run-id $RUN --baseline B0 B3 B4
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
