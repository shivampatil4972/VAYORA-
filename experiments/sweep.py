"""Runs one variant across a grid of world parameters and compares each cell to a baseline.

    python -m experiments.sweep experiments/configs/sweeps/intervention_response.yaml

The baseline is run once on the unmodified world; it must be a variant the swept
parameters cannot affect. Each cell is the variant on a world with those parameters
replaced, stored under a variant name that spells the cell out. Everything is paired by
seed and every figure is read back from the event log through metrics.sql.

Writes experiments/reports/sweep-<name>-<run id>.json and .md.
"""

from __future__ import annotations

import argparse
import dataclasses
import itertools
import json
import os
import statistics
import uuid
from pathlib import Path
from typing import Any

import psycopg
import yaml
from sqlalchemy import Connection, create_engine, make_url

from experiments.analysis.compare import paired, per_seed
from journex_events import EventWriter
from sim.config import Variant, World, load_variant, load_world, validate
from sim.frozen import SEEDS_PER_VARIANT
from sim.simulator import Simulation

ROOT = Path(__file__).resolve().parents[1]
CONFIGS = ROOT / "experiments" / "configs"
REPORTS = ROOT / "experiments" / "reports"

MEASURES = [("per_100", "Completed rides per 100 searches", 2),
            ("late_share", "Late share of cancellations", 3),
            ("contact_rate", "Reconfirmation requests per accepted booking", 3)]


def with_parameter(world: World, path: str, value: Any) -> World:
    """A copy of `world` with the dotted `path` (e.g. ``demand.shock.rate_per_day``) set."""
    head, _, rest = path.partition(".")
    if not hasattr(world, head):
        raise KeyError(f"no such world parameter: {path}")
    current = getattr(world, head)
    return dataclasses.replace(world, **{head: with_parameter(current, rest, value) if rest else value})


def cells(parameters: dict[str, list[Any]]) -> list[dict[str, Any]]:
    names = list(parameters)
    return [dict(zip(names, values)) for values in itertools.product(*(parameters[n] for n in names))]


def cell_label(variant: str, cell: dict[str, Any]) -> str:
    """The name a cell's events are stored under, e.g. ``B4[early_release_probability=0.5]``."""
    settings = [path.rsplit(".", 1)[-1] + "=" + str(value) for path, value in cell.items()]
    return variant + "[" + ",".join(settings) + "]"


def run(conn: psycopg.Connection, world: World, variant: Variant, label: str, seeds: range,
        run_id: uuid.UUID) -> None:
    labelled = dataclasses.replace(variant, name=label)
    for seed in seeds:
        with EventWriter(conn, run_id=run_id, variant=label, seed=seed) as writer:
            Simulation(world, labelled, seed, writer).run()


def run_sweep(conn: psycopg.Connection, config: dict[str, Any], world: World, seeds: range,
              run_id: uuid.UUID) -> list[tuple[str, dict[str, Any]]]:
    baseline = load_variant(CONFIGS / config["baseline"])
    variant = load_variant(CONFIGS / config["variant"])
    run(conn, world, baseline, baseline.name, seeds, run_id)
    labelled = []
    for cell in cells(config["parameters"]):
        changed = world
        for path, value in cell.items():
            changed = with_parameter(changed, path, value)
        validate(changed)
        label = cell_label(variant.name, cell)
        run(conn, changed, variant, label, seeds, run_id)
        labelled.append((label, cell))
    return labelled


def build_report(conn: Connection, config: dict[str, Any], labelled: list[tuple[str, dict[str, Any]]],
                 run_id: uuid.UUID) -> dict[str, Any]:
    baseline = load_variant(CONFIGS / config["baseline"]).name
    reference = per_seed(conn, run_id, baseline)
    report: dict[str, Any] = {
        "name": config["name"], "run_id": str(run_id), "data": "synthetic (simulator)",
        "baseline": baseline, "parameters": config["parameters"],
        "baseline_means": {column: statistics.fmean(reference[column].values())
                           for column, _, _ in MEASURES if reference[column]},
        "cells": [],
    }
    for label, cell in labelled:
        values = per_seed(conn, run_id, label)
        report["cells"].append({
            "variant": label, "parameters": cell,
            "measures": {
                column: {"mean": statistics.fmean(values[column].values()),
                         "vs_baseline": paired(reference[column], values[column])}
                for column, _, _ in MEASURES if values[column]},
        })
    return report


def to_markdown(report: dict[str, Any]) -> str:
    names = [path.rsplit(".", 1)[-1] for path in report["parameters"]]
    lines = [
        f"# Sweep `{report['name']}`, run `{report['run_id']}`", "",
        f"Synthetic data from the simulator. Each row is the variant on a world with those "
        f"parameters, compared seed by seed with **{report['baseline']}** on the unmodified "
        "world. Intervals are 95% t intervals on the mean per-seed difference.", "",
    ]
    for column, label, decimals in MEASURES:
        base = report["baseline_means"].get(column)
        lines += [f"## {label}", ""]
        if base is not None:
            lines += [f"{report['baseline']}: {base:.{decimals}f}", ""]
        lines += ["| " + " | ".join(names) + " | Mean | Difference | 95% CI | Seeds up / down |",
                  "|" + "---|" * (len(names) + 4)]
        for cell in report["cells"]:
            measure = cell["measures"].get(column)
            if measure is None:
                continue
            diff = measure["vs_baseline"]
            row = [str(v) for v in cell["parameters"].values()] + [f"{measure['mean']:.{decimals}f}"]
            row += ["", "", ""] if diff is None else [
                f"{diff['mean_difference']:+.{decimals}f}",
                f"{diff['ci_low']:+.{decimals}f} to {diff['ci_high']:+.{decimals}f}",
                f"{diff['seeds_improved']} / {diff['seeds_worsened']}"]
            lines.append("| " + " | ".join(row) + " |")
        lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("config", type=Path)
    parser.add_argument("--world", type=Path, default=CONFIGS / "world.yaml")
    parser.add_argument("--run-id", type=uuid.UUID, default=None)
    args = parser.parse_args()

    url = os.environ.get("JOURNEX_DB_URL")
    if not url:
        parser.error("JOURNEX_DB_URL is not set")
    config = yaml.safe_load(args.config.read_text(encoding="utf-8"))
    run_id = args.run_id or uuid.uuid4()
    seeds = range(1, SEEDS_PER_VARIANT + 1)

    dsn = make_url(url).set(drivername="postgresql").render_as_string(hide_password=False)
    with psycopg.connect(dsn) as conn:
        labelled = run_sweep(conn, config, load_world(args.world), seeds, run_id)
    engine = create_engine(make_url(url).set(drivername="postgresql+psycopg"))
    with engine.connect() as conn:
        report = build_report(conn, config, labelled, run_id)

    REPORTS.mkdir(exist_ok=True)
    stem = REPORTS / f"sweep-{config['name']}-{run_id}"
    stem.with_suffix(".json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    stem.with_suffix(".md").write_text(to_markdown(report) + "\n", encoding="utf-8")
    print(to_markdown(report))


if __name__ == "__main__":
    main()
