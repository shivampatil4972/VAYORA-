import copy

import pytest
import yaml

from sim.config import ConfigError, load_variant, load_world
from sim.frozen import LATENT_TYPES
from sim.run import CONFIGS
from sim.simulator import RANKINGS

WORLD = CONFIGS / "world.yaml"


def _world_with(tmp_path, change):
    raw = yaml.safe_load(WORLD.read_text(encoding="utf-8"))
    change(raw)
    path = tmp_path / "world.yaml"
    path.write_text(yaml.safe_dump(raw), encoding="utf-8")
    return path


def test_the_shipped_world_loads_and_has_exactly_the_four_latent_types():
    world = load_world(WORLD)

    assert tuple(world.demand.types) == LATENT_TYPES
    assert world.start.utcoffset() is not None
    assert sum(kind.share for kind in world.demand.types.values()) == pytest.approx(1.0)


def test_every_shipped_variant_loads_and_names_a_known_ranking():
    variants = sorted((CONFIGS / "variants").glob("*.yaml"))

    assert variants
    for path in variants:
        variant = load_variant(path)
        assert variant.name == path.stem
        assert variant.ranking in RANKINGS


def test_an_unknown_key_is_an_error_not_a_silent_default(tmp_path):
    def typo(raw):
        raw["supply"]["rides_per_dya"] = raw["supply"].pop("rides_per_day")

    with pytest.raises(ConfigError, match="rides_per_dya"):
        load_world(_world_with(tmp_path, typo))


def test_a_missing_key_is_an_error(tmp_path):
    with pytest.raises(ConfigError, match="hazard_multiplier"):
        load_world(_world_with(
            tmp_path, lambda raw: raw["demand"]["shock"].pop("hazard_multiplier")))


def test_latent_types_cannot_be_added_or_removed(tmp_path):
    def add(raw):
        raw["demand"]["types"]["tourist"] = copy.deepcopy(raw["demand"]["types"]["committed"])

    with pytest.raises(ConfigError, match="demand.types"):
        load_world(_world_with(tmp_path, add))
    with pytest.raises(ConfigError, match="demand.types"):
        load_world(_world_with(tmp_path, lambda raw: raw["demand"]["types"].pop("flexible")))


@pytest.mark.parametrize("change", [
    lambda raw: raw["demand"]["types"]["committed"].update(share=0.9),
    lambda raw: raw["supply"].update(accept_probability=1.2),
    lambda raw: raw["demand"]["types"]["flexible"].update(weibull_shape=0),
    lambda raw: raw["supply"].update(rides_per_day=0),
    lambda raw: raw["supply"].update(departure_hours={24: 1}),
    lambda raw: raw.update(start="2026-01-05T00:00:00"),
])
def test_nonsense_values_are_rejected(tmp_path, change):
    with pytest.raises(ConfigError):
        load_world(_world_with(tmp_path, change))
