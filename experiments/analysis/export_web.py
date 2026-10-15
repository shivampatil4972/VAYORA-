"""Copies the figures of chosen sweeps into the web app, for the what-if explorer.

    python -m experiments.analysis.export_web <sweep run id> [<sweep run id> ...]

The web image is built from web/ alone, so it cannot read experiments/reports. This writes
web/src/data/whatif.json from the committed sweep reports: nothing is recomputed, figures
are only rounded. scripts/reproduce.sh rewrites it after the sweeps and fails on any
difference, and a test checks it against the reports.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / "experiments" / "reports"
OUT = ROOT / "web" / "src" / "data" / "whatif.json"

# Enough for every figure the reports print; keeps the bundle small.
DIGITS = 4


def _report(run_id: str) -> dict[str, Any]:
    found = sorted(REPORTS.glob(f"sweep-*-{run_id}.json"))
    if len(found) != 1:
        raise FileNotFoundError(f"expected one sweep report for run {run_id}, found {len(found)}")
    return json.loads(found[0].read_text(encoding="utf-8"))


def _round(value: float | int) -> float | int:
    return value if isinstance(value, int) else round(value, DIGITS)


def sweep(report: dict[str, Any]) -> dict[str, Any]:
    """One sweep as the explorer needs it: the grid, and each cell's figures against its baseline."""
    variants = {cell["variant"].split("[", 1)[0] for cell in report["cells"]}
    if len(variants) != 1:
        raise ValueError(f"sweep {report['name']} mixes variants: {sorted(variants)}")
    return {
        "name": report["name"],
        "runId": report["run_id"],
        "data": report["data"],
        "variant": variants.pop(),
        "baseline": report["baseline"],
        "baselinePerCell": bool(report.get("baseline_per_cell")),
        "parameters": report["parameters"],
        "cells": [
            {
                "parameters": cell["parameters"],
                "measures": {
                    key: {
                        "mean": _round(m["mean"]),
                        "baselineMean": _round(m["baseline_mean"]),
                        "difference": _round(m["vs_baseline"]["mean_difference"]),
                        "ciLow": _round(m["vs_baseline"]["ci_low"]),
                        "ciHigh": _round(m["vs_baseline"]["ci_high"]),
                        "seeds": m["vs_baseline"]["seeds"],
                    }
                    for key, m in cell["measures"].items()
                },
            }
            for cell in report["cells"]
        ],
    }


def export(run_ids: list[str]) -> dict[str, Any]:
    return {"source": "experiments/reports", "sweeps": [sweep(_report(run_id)) for run_id in run_ids]}


def render(run_ids: list[str]) -> str:
    return json.dumps(export(run_ids), indent=1, ensure_ascii=False) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("run_ids", nargs="+")
    args = parser.parse_args()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(render(args.run_ids), encoding="utf-8", newline="\n")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
