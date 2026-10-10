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

### What has to be run before any conclusion

- A sweep of `early_release_probability` and `annoyed_cancel_probability`, to find where,
  if anywhere, the intervention pays.
- A sweep of the survival threshold and of supply and demand density.
- B4 run with the no-feature model (`h1-km`), to separate the value of the features
  from the value of knowing time-to-departure.
- Component-removal: B4's intervention with B0's ranking.
