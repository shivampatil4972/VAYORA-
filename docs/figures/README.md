# Figures

Six figures for the report, drawn by `python -m experiments.analysis.figures` from files
the repository already commits: the ladder and sweep reports, whose numbers come from
`experiments/analysis/metrics.sql`, and the durability model. `scripts/reproduce.sh`
redraws them and fails if any comes out different.

**All of it is synthetic: simulator output under assumptions in
`experiments/configs/world.yaml`, not evidence about real passengers.** Each figure says
so in its footnote.

## Figure 1. The variant ladder (`fig1-ladder.png`)

Completed rides per 100 searches, each variant against B0, with the 95% interval of the
seed-paired difference (run `7a1c0de0-…-003`, 30 seeds per variant). B3 gains +0.34. B4
and B5, which ask passengers to reconfirm, gain +0.33: nothing beyond B3. ORACLE, which
asks exactly the bookings that will cancel late, gains +0.44, so even perfect targeting
adds only about +0.10 to B3. EXPERIMENT_PROTOCOL.md sections 5, 8 and 12.

## Figure 2. Early and late releases (`fig2-refill-timing.png`)

The share of released seats that were refilled, on rides whose passenger releases were
all at least 24 hours before departure ("early") or all later ("late"); rides with both
are left out. Under B0, 93% of early releases and 66% of late ones are refilled. The
premise holds: an early release is worth more. But late releases are refilled two times
in three anyway, which bounds what moving them earlier can gain. Section 11.

## Figure 3. The sweeps (`fig3-sweeps.png`)

The change in completed rides per 100 searches from asking passengers, across three
settings: how far from their chosen time passengers will travel (B4 against B3), how early
drivers publish (B4 against B3), and how many requests go out per round (B5 against B4).
No setting tried shows a gain; an 8-hour window (−0.05, −0.10 to −0.01) and a 7-day
publishing lead (−0.05) show a loss. Sections 8, 9 and 10.

## Figure 4. Booking durability (`fig4-survival.png`)

The Kaplan–Meier curve of model h2: of bookings still waiting to depart, the share not yet
cancelled by their passenger, by days since booking (training seeds only). 95% last a day,
80% three days, 60% six. A booking leaves the curve when it departs, so the later part
describes only bookings made well ahead: in this simulator, a booking made a week ahead
has roughly a two-in-five chance of being released before it travels. That is the seat the
project's idea is about. AI_ML_METHODOLOGY.md.

## Figure 5. Calibration (`fig5-calibration.png`)

Predicted against observed survival to departure, validation seeds, in ten equal groups by
prediction, for the Cox and gradient-boosted models. Both sit close to the diagonal, so a
predicted 80% means about 80%. Neither ranks bookings well (concordance 0.60 and 0.58), and
the simulator generates cancellations from a Weibull hazard with shocks that neither model
can represent, on purpose. AI_ML_METHODOLOGY.md.

## Figure 6. When cancellations come (`fig6-cancellation-timing.png`)

Cancellations per seed by how long before departure they came, for B3, B4 and ORACLE (run
`7a1c0de0-…-003`, 30 seeds, from the `cancellation_timing` query; every cancellation is
counted, as in the late share). Asking passengers (B4) does cut late cancellations, by
about 10 per seed, but it also cuts about 10 from 24–48 hours and adds about 23 four or
more days out: about 6 more cancellations in all, so some bookings that would have
travelled unasked are released instead. ORACLE, which asks only the bookings that will cancel late, cuts late
cancellations by about 24 per seed and moves them mostly into the one to four days before
departure. Even that buys only about +0.10 completed rides per 100 searches (Figure 1),
because late releases are mostly refilled anyway (Figure 2).

Mean cancellations per seed, and the seed-paired difference from B3:

| Before departure | B3 | B4 | B4 − B3 (95%) | ORACLE | ORACLE − B3 (95%) |
|---|---|---|---|---|---|
| 96 h or more | 20.6 | 43.3 | +22.7 (+21.1 to +24.4) | 25.2 | +4.7 (+4.0 to +5.3) |
| 48-96 h | 58.3 | 61.8 | +3.5 (+1.7 to +5.3) | 70.0 | +11.7 (+10.2 to +13.3) |
| 24-48 h | 54.5 | 44.4 | -10.1 (-11.6 to -8.6) | 63.1 | +8.6 (+7.7 to +9.6) |
| 12-24 h | 37.1 | 31.7 | -5.4 (-6.2 to -4.6) | 25.7 | -11.4 (-12.4 to -10.3) |
| 6-12 h | 20.4 | 18.3 | -2.2 (-2.8 to -1.5) | 14.5 | -5.9 (-7.0 to -4.9) |
| 2-6 h | 15.1 | 13.6 | -1.6 (-2.2 to -0.9) | 10.9 | -4.2 (-5.1 to -3.3) |
| under 2 h | 7.8 | 7.0 | -0.8 (-1.2 to -0.4) | 5.7 | -2.0 (-2.5 to -1.5) |
