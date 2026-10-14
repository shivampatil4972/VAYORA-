"""Scores booking durability from an exported model file. Pure Python, no state.

Time is hours since the booking was accepted. S(t | x) is the probability that a
booking with features x has not been cancelled by its passenger t hours after
acceptance. It says nothing about whether the passenger boards or the ride runs.
"""

from __future__ import annotations

import json
import math
from bisect import bisect_right
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

from .features import FEATURE_VERSION, FEATURES

MODEL_DIR = Path(__file__).with_name("models")


@dataclass(frozen=True)
class HazardModel:
    """A proportional-hazards model: S(t | x) = exp(-H0(t) * exp(coef . (x - mean))).

    With every coefficient zero this is a single population survival curve, which is
    how the no-covariate baseline is stored.
    """

    version: str
    feature_version: str
    kind: str
    features: tuple[str, ...]
    coef: tuple[float, ...]
    mean: tuple[float, ...]
    # Baseline cumulative hazard H0 as a right-continuous step function.
    times: tuple[float, ...]
    cumulative_hazard: tuple[float, ...]

    def __post_init__(self) -> None:
        if self.feature_version != FEATURE_VERSION:
            raise ValueError(
                f"model {self.version} was trained on features {self.feature_version}, "
                f"this code computes {FEATURE_VERSION}")
        if self.features != FEATURES:
            raise ValueError(f"model {self.version} has unexpected feature columns")
        if not len(self.coef) == len(self.mean) == len(self.features):
            raise ValueError("coef, mean and features must have the same length")
        if len(self.times) != len(self.cumulative_hazard) or list(self.times) != sorted(self.times):
            raise ValueError("baseline hazard must be a time-ordered step function")

    @classmethod
    def load(cls, path: Path) -> HazardModel:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(
            version=raw["version"], feature_version=raw["feature_version"], kind=raw["kind"],
            features=tuple(raw["features"]), coef=tuple(raw["coef"]), mean=tuple(raw["mean"]),
            times=tuple(raw["times"]), cumulative_hazard=tuple(raw["cumulative_hazard"]))

    def to_json(self) -> str:
        return json.dumps({
            "version": self.version, "feature_version": self.feature_version, "kind": self.kind,
            "features": list(self.features), "coef": list(self.coef), "mean": list(self.mean),
            "times": list(self.times), "cumulative_hazard": list(self.cumulative_hazard),
        })

    def survival(self, x: Mapping[str, float], hours: float) -> float:
        """S(hours | x): probability of no cancellation in the first `hours`."""
        return math.exp(-self._baseline(hours) * self._relative_risk(x))

    def conditional_survival(self, x: Mapping[str, float], *, elapsed_hours: float,
                             horizon_hours: float) -> float:
        """P(no cancellation by `horizon_hours` | none by `elapsed_hours`).

        Both are measured from acceptance. For a booking not yet made, `elapsed_hours`
        is 0 and `horizon_hours` is the time left until departure.
        """
        if horizon_hours < elapsed_hours:
            raise ValueError("horizon_hours must not be before elapsed_hours")
        extra = self._baseline(horizon_hours) - self._baseline(elapsed_hours)
        return math.exp(-extra * self._relative_risk(x))

    def _baseline(self, hours: float) -> float:
        index = bisect_right(self.times, hours)
        return self.cumulative_hazard[index - 1] if index else 0.0

    def contributions(self, x: Mapping[str, float]) -> dict[str, float]:
        """Each feature's exact share of the log relative risk, coef * (x - mean).

        They add up to log(relative risk). Positive means the feature makes an early
        cancellation more likely than for a booking at the training means; negative, less.
        For a proportional-hazards model this is the whole explanation, with no
        approximation, which is why no SHAP is used.
        """
        missing = [name for name in self.features if name not in x]
        if missing:
            raise KeyError(f"missing features: {missing}")
        return {name: c * (x[name] - m) for name, c, m in zip(self.features, self.coef, self.mean)}

    def _relative_risk(self, x: Mapping[str, float]) -> float:
        missing = [name for name in self.features if name not in x]
        if missing:
            raise KeyError(f"missing features: {missing}")
        return math.exp(sum(
            c * (x[name] - m) for name, c, m in zip(self.features, self.coef, self.mean)))
