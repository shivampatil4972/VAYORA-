"""Loads experiments/configs YAML into immutable, validated objects.

Loading is strict: an unknown or missing key is an error, so a typo in a config can
never silently fall back to a default hidden in Python.
"""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Mapping

import yaml

from sim.frozen import LATENT_TYPES


class ConfigError(ValueError):
    pass


@dataclass(frozen=True)
class PassengerType:
    share: float
    book_probability: float
    weibull_shape: float
    weibull_scale_hours: float
    no_show_probability: float


@dataclass(frozen=True)
class Shock:
    rate_per_day: float
    hazard_multiplier: float


@dataclass(frozen=True)
class Supply:
    rides_per_day: float
    departure_hours: Mapping[int, float]
    seats: Mapping[int, float]
    publish_lead_days_min: float
    publish_lead_days_max: float
    trip_duration_hours: float
    accept_probability: float
    response_delay_mean_hours: float
    withdraw_probability: float


@dataclass(frozen=True)
class Demand:
    searches_per_day: float
    lead_days_mean: float
    departure_hours: Mapping[int, float]
    departure_tolerance_hours: float
    party_size: Mapping[int, float]
    types: Mapping[str, PassengerType]
    shock: Shock


@dataclass(frozen=True)
class World:
    start: datetime
    supply: Supply
    demand: Demand


@dataclass(frozen=True)
class Variant:
    name: str
    ranking: str


def load_world(path: Path) -> World:
    raw = _read(path)
    _require_keys(raw, {"start", "supply", "demand"}, path.name)

    start = datetime.fromisoformat(str(raw["start"]))
    if start.tzinfo is None:
        raise ConfigError("start must carry a UTC offset")

    demand_raw = dict(raw["demand"])
    types_raw = demand_raw.pop("types", None) or {}
    shock_raw = demand_raw.pop("shock", None) or {}
    if set(types_raw) != set(LATENT_TYPES):
        raise ConfigError(f"demand.types must be exactly {sorted(LATENT_TYPES)}")
    types = {
        name: _build(PassengerType, types_raw[name], f"demand.types.{name}")
        for name in LATENT_TYPES
    }
    demand = _build(
        Demand,
        {**demand_raw, "types": types, "shock": _build(Shock, shock_raw, "demand.shock")},
        "demand",
    )
    world = World(start=start, supply=_build(Supply, raw["supply"], "supply"), demand=demand)
    validate(world)
    return world


def load_variant(path: Path) -> Variant:
    return _build(Variant, _read(path), path.name)


def validate(world: World) -> None:
    """Rejects a world the simulator could not run or that makes no sense."""
    supply, demand = world.supply, world.demand
    for name, value in [
        ("supply.rides_per_day", supply.rides_per_day),
        ("supply.trip_duration_hours", supply.trip_duration_hours),
        ("supply.response_delay_mean_hours", supply.response_delay_mean_hours),
        ("demand.searches_per_day", demand.searches_per_day),
        ("demand.lead_days_mean", demand.lead_days_mean),
        ("demand.shock.hazard_multiplier", demand.shock.hazard_multiplier),
    ]:
        if value <= 0:
            raise ConfigError(f"{name} must be positive")
    if demand.departure_tolerance_hours < 0 or demand.shock.rate_per_day < 0:
        raise ConfigError("tolerances and rates cannot be negative")
    if not 0 <= supply.publish_lead_days_min <= supply.publish_lead_days_max:
        raise ConfigError("supply.publish_lead_days_min must not exceed the max")

    probabilities = [
        ("supply.accept_probability", supply.accept_probability),
        ("supply.withdraw_probability", supply.withdraw_probability),
    ]
    for name, kind in demand.types.items():
        probabilities += [
            (f"demand.types.{name}.book_probability", kind.book_probability),
            (f"demand.types.{name}.no_show_probability", kind.no_show_probability),
        ]
        if kind.weibull_shape <= 0 or kind.weibull_scale_hours <= 0:
            raise ConfigError(f"demand.types.{name}: Weibull shape and scale must be positive")
    for name, value in probabilities:
        if not 0 <= value <= 1:
            raise ConfigError(f"{name} must be between 0 and 1")

    if abs(sum(kind.share for kind in demand.types.values()) - 1.0) > 1e-9:
        raise ConfigError("demand.types shares must sum to 1")

    for name, weights in [
        ("supply.departure_hours", supply.departure_hours),
        ("supply.seats", supply.seats),
        ("demand.departure_hours", demand.departure_hours),
        ("demand.party_size", demand.party_size),
    ]:
        if not weights or any(w < 0 for w in weights.values()) or sum(weights.values()) <= 0:
            raise ConfigError(f"{name} needs non-negative weights with a positive total")
    for name, hours in [
        ("supply.departure_hours", supply.departure_hours),
        ("demand.departure_hours", demand.departure_hours),
    ]:
        if any(not 0 <= hour < 24 for hour in hours):
            raise ConfigError(f"{name} keys must be hours of the day, 0 to 23")
    if any(n < 1 for n in supply.seats) or any(n < 1 for n in demand.party_size):
        raise ConfigError("seat counts and party sizes must be at least 1")


def _read(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ConfigError(f"{path} must contain a mapping")
    return data


def _build(cls, raw: Any, where: str):
    if not isinstance(raw, Mapping):
        raise ConfigError(f"{where} must be a mapping")
    _require_keys(raw, {f.name for f in dataclasses.fields(cls)}, where)
    return cls(**raw)


def _require_keys(raw: Mapping[str, Any], expected: set[str], where: str) -> None:
    missing, unknown = expected - set(raw), set(raw) - expected
    if missing or unknown:
        raise ConfigError(
            f"{where}: missing keys {sorted(missing)}, unknown keys {sorted(unknown)}"
        )
