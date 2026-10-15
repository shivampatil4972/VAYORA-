"""The what-if explorer's figures are the committed reports' figures, rounded."""

import json

import pytest

from experiments.analysis import export_web


def test_the_web_copy_matches_the_reports_it_names():
    committed = export_web.OUT.read_text(encoding="utf-8")
    run_ids = [s["runId"] for s in json.loads(committed)["sweeps"]]
    assert run_ids, "the explorer shows no sweep"
    assert committed == export_web.render(run_ids), (
        "web/src/data/whatif.json is stale: run python -m experiments.analysis.export_web "
        + " ".join(run_ids))


def test_a_cell_keeps_its_comparison_with_the_baseline():
    report = {"name": "s", "run_id": "r", "data": "synthetic (simulator)", "baseline": "B3",
              "baseline_per_cell": True, "parameters": {"supply.rides_per_day": [6]},
              "cells": [{"variant": "B4[rides_per_day=6]", "parameters": {"supply.rides_per_day": 6},
                         "measures": {"per_100": {"mean": 17.791045, "baseline_mean": 17.78978,
                                                  "vs_baseline": {"seeds": 30, "mean_difference": 0.0012604,
                                                                  "ci_low": -0.0308977, "ci_high": 0.0334188}}}}]}
    cell = export_web.sweep(report)["cells"][0]
    assert export_web.sweep(report)["variant"] == "B4"
    assert cell["measures"]["per_100"] == {"mean": 17.791, "baselineMean": 17.7898, "difference": 0.0013,
                                           "ciLow": -0.0309, "ciHigh": 0.0334, "seeds": 30}


def test_a_sweep_of_two_variants_is_refused():
    report = {"name": "s", "run_id": "r", "data": "", "baseline": "B3", "parameters": {},
              "cells": [{"variant": "B4[x=1]", "parameters": {}, "measures": {}},
                        {"variant": "B5[x=1]", "parameters": {}, "measures": {}}]}
    with pytest.raises(ValueError, match="mixes variants"):
        export_web.sweep(report)
