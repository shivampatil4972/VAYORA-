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
    lead_days_mean: float
    book_probability: float
    weibull_shape: float
    weibull_scale_hours: float
    no_show_probability: float


@dataclass(frozen=True)
class Shock:
    rate_per_day: float
    hazard_multiplier: float


@dataclass(frozen=True)
class InterventionResponse:
    """How a passenger reacts to being asked to reconfirm a booking."""

    early_release_probability: float
    annoyed_cancel_probability: float
    response_delay_mean_hours: float


@dataclass(frozen=True)
class Retry:
    """Whether a passenger who was left without a seat searches again."""

    probability: float
    delay_mean_hours: float
    max_attempts: int


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
    population: int
    departure_hours: Mapping[int, float]
    departure_tolerance_hours: float
    party_size: Mapping[int, float]
    types: Mapping[str, PassengerType]
    shock: Shock
    intervention_response: InterventionResponse
    retry: Retry


@dataclass(frozen=True)
class World:
    start: datetime
    supply: Supply
    demand: Demand


@dataclass(frozen=True)
class ContactBudget:
    """Limits on how many reconfirmation requests one scoring round may send."""

    contacts_per_round: int
    max_contacts_per_ride: int
    # Seats asked about among rides leaving on the same day.
    max_seats_asked_per_departure_day: int
    # A release this long before departure, or longer, counts in full; later ones
    # count for proportionally less. An assumption, not an estimate.
    refill_horizon_hours: float
    solver_time_limit_seconds: float
    # Who chooses within the limits. "scheduler": the CP-SAT contact scheduler, which
    # weighs each booking's score and time left. "random": bookings taken in a random
    # order until a limit stops them, to measure whether the scheduler beats chance.
    chooser: str = "scheduler"


@dataclass(frozen=True)
class Intervention:
    """Ask a booking to reconfirm when its predicted survival falls below a threshold."""

    survival_threshold: float
    # No request is sent closer to departure than this: a seat released later than
    # that has little chance of being refilled.
    min_hours_before_departure: float
    scoring_interval_hours: float
    # None: everyone below the threshold is asked. Otherwise the scheduler chooses
    # among them within these limits.
    budget: ContactBudget | None = None
    # Who is asked. "model": bookings the model scores below the threshold. "oracle":
    # exactly the bookings the simulator knows will be cancelled late. The oracle reads
    # ground truth no platform could have; it exists only to measure the most any
    # reconfirmation policy could gain, and must never be reported as a method.
    selector: str = "model"


@dataclass(frozen=True)
class Variant:
    name: str
    ranking: str
    # Model file in intel/app/hazard/models, without the extension.
    hazard_model: str | None = None
    intervention: Intervention | None = None


def load_world(path: Path) -> World:
    raw = _read(path)
    _require_keys(raw, {"start", "supply", "demand"}, path.name)

    start = datetime.fromisoformat(str(raw["start"]))
    if start.tzinfo is None:
        raise ConfigError("start must carry a UTC offset")

    demand_raw = dict(raw["demand"])
    types_raw = demand_raw.pop("types", None) or {}
    shock_raw = demand_raw.pop("shock", None) or {}
    response_raw = demand_raw.pop("intervention_response", None) or {}
    retry_raw = demand_raw.pop("retry", None) or {}
    if set(types_raw) != set(LATENT_TYPES):
        raise ConfigError(f"demand.types must be exactly {sorted(LATENT_TYPES)}")
    types = {
        name: _build(PassengerType, types_raw[name], f"demand.types.{name}")
        for name in LATENT_TYPES
    }
    demand = _build(
        Demand,
        {**demand_raw, "types": types, "shock": _build(Shock, shock_raw, "demand.shock"),
         "intervention_response": _build(
             InterventionResponse, response_raw, "demand.intervention_response"),
         "retry": _build(Retry, retry_raw, "demand.retry")},
        "demand",
    )
    world = World(start=start, supply=_build(Supply, raw["supply"], "supply"), demand=demand)
    validate(world)
    return world


def load_variant(path: Path) -> Variant:
    raw = _read(path)
    _require_keys(raw, {"name", "ranking"}, path.name, optional={"hazard_model", "intervention"})
    intervention = raw.get("intervention")
    if intervention is not None:
        if not isinstance(intervention, Mapping):
            raise ConfigError(f"{path.name}: intervention must be a mapping")
        budget = intervention.get("budget")
        intervention = _build(Intervention, {"selector": "model", **intervention, "budget": None},
                              f"{path.name}: intervention")
        if intervention.selector not in ("model", "oracle"):
            raise ConfigError("intervention.selector must be model or oracle")
        if budget is not None:
            budget = _build(ContactBudget, {"chooser": "scheduler", **budget}, f"{path.name}: intervention.budget")
            if min(budget.contacts_per_round, budget.max_contacts_per_ride,
                   budget.max_seats_asked_per_departure_day) < 1:
                raise ConfigError("intervention.budget limits must be at least 1")
            if budget.refill_horizon_hours <= 0 or budget.solver_time_limit_seconds <= 0:
                raise ConfigError("intervention.budget durations must be positive")
            if budget.chooser not in ("scheduler", "random"):
                raise ConfigError("intervention.budget.chooser must be scheduler or random")
            intervention = dataclasses.replace(intervention, budget=budget)
        if not 0 <= intervention.survival_threshold <= 1:
            raise ConfigError("intervention.survival_threshold must be between 0 and 1")
        if intervention.scoring_interval_hours <= 0 or intervention.min_hours_before_departure < 0:
            raise ConfigError("intervention intervals must be positive")
    variant = Variant(raw["name"], raw["ranking"], raw.get("hazard_model"), intervention)
    needs_model = variant.ranking == "predicted_survival" or variant.intervention is not None
    if needs_model and variant.hazard_model is None:
        raise ConfigError(f"{path.name}: this variant needs a hazard_model")
    return variant


def validate(world: World) -> None:
    """Rejects a world the simulator could not run or that makes no sense."""
    supply, demand = world.supply, world.demand
    for name, value in [
        ("supply.rides_per_day", supply.rides_per_day),
        ("supply.trip_duration_hours", supply.trip_duration_hours),
        ("supply.response_delay_mean_hours", supply.response_delay_mean_hours),
        ("demand.searches_per_day", demand.searches_per_day),
        ("demand.population", demand.population),
        ("demand.shock.hazard_multiplier", demand.shock.hazard_multiplier),
        ("demand.intervention_response.response_delay_mean_hours",
         demand.intervention_response.response_delay_mean_hours),
        ("demand.retry.delay_mean_hours", demand.retry.delay_mean_hours),
    ]:
        if value <= 0:
            raise ConfigError(f"{name} must be positive")
    if demand.departure_tolerance_hours < 0 or demand.shock.rate_per_day < 0:
        raise ConfigError("tolerances and rates cannot be negative")
    if demand.retry.max_attempts < 0 or demand.retry.max_attempts != int(demand.retry.max_attempts):
        raise ConfigError("demand.retry.max_attempts must be a whole number, 0 or more")
    if not 0 <= supply.publish_lead_days_min <= supply.publish_lead_days_max:
        raise ConfigError("supply.publish_lead_days_min must not exceed the max")

    probabilities = [
        ("supply.accept_probability", supply.accept_probability),
        ("supply.withdraw_probability", supply.withdraw_probability),
        ("demand.intervention_response.early_release_probability",
         demand.intervention_response.early_release_probability),
        ("demand.intervention_response.annoyed_cancel_probability",
         demand.intervention_response.annoyed_cancel_probability),
        ("demand.retry.probability", demand.retry.probability),
    ]
    for name, kind in demand.types.items():
        probabilities += [
            (f"demand.types.{name}.book_probability", kind.book_probability),
            (f"demand.types.{name}.no_show_probability", kind.no_show_probability),
        ]
        if min(kind.weibull_shape, kind.weibull_scale_hours, kind.lead_days_mean) <= 0:
            raise ConfigError(
                f"demand.types.{name}: Weibull shape, scale and lead time must be positive")
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


def _require_keys(raw: Mapping[str, Any], expected: set[str], where: str,
                  optional: frozenset[str] | set[str] = frozenset()) -> None:
    missing, unknown = expected - set(raw), set(raw) - expected - optional
    if missing or unknown:
        raise ConfigError(
            f"{where}: missing keys {sorted(missing)}, unknown keys {sorted(unknown)}"
        )
