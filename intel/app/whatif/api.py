"""HTTP face of the live what-if runs (feature 87). Administrators only; nothing is kept.

A run simulates one cell of a saved sweep at a value of its parameter the sweep did not
cover, on up to the frozen 30 seeds, for the variant and its baseline. It takes about a
second for every two seeds. What comes back is exploratory: means and the mean paired
difference, with no interval, and never a report figure.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from sim import live
from sim.frozen import SEEDS_PER_VARIANT

from ..auth import administrator

router = APIRouter(prefix="/v1/whatif", tags=["whatif"])


class RunRequest(BaseModel):
    sweep: str
    value: float
    seeds: int = Field(ge=2, le=SEEDS_PER_VARIANT)


@router.get("/sweeps")
def offered(_: int = Depends(administrator)) -> list[dict[str, Any]]:
    """Each sweep that may be run live, with the values its parameter may take."""
    return [{"name": s.name, "parameter": s.parameter, "min": s.low, "max": s.high, "whole": s.whole,
             "variant": s.variant, "baseline": s.baseline, "baseline_per_cell": s.baseline_per_cell}
            for s in live.sweeps().values()]


@router.post("/run")
def run(request: RunRequest, _: int = Depends(administrator)) -> dict[str, Any]:
    sweep = live.sweeps().get(request.sweep)
    if sweep is None:
        raise HTTPException(404, "No such sweep can be run live")
    try:
        return live.run(sweep, request.value, request.seeds)
    except ValueError as error:
        raise HTTPException(400, str(error)) from None
