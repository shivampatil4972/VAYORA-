import dataclasses
import uuid

import pytest
import yaml

from experiments.sweep import (
    CONFIGS, build_report, cell_label, cells, run_sweep, to_markdown, with_parameter)
from sim.config import load_variant, load_world

WORLD = load_world(CONFIGS / "world.yaml")
RELEASE = "demand.intervention_response.early_release_probability"
ANNOYED = "demand.intervention_response.annoyed_cancel_probability"


def test_a_dotted_path_replaces_one_value_and_leaves_the_original_alone():
    changed = with_parameter(WORLD, RELEASE, 0.9)

    assert changed.demand.intervention_response.early_release_probability == 0.9
    assert WORLD.demand.intervention_response.early_release_probability == 0.5
    assert changed.supply == WORLD.supply
    assert changed.demand.types == WORLD.demand.types
    assert with_parameter(WORLD, "supply.rides_per_day", 3).supply.rides_per_day == 3


def test_an_unknown_parameter_is_an_error():
    with pytest.raises(KeyError, match="no such world parameter"):
        with_parameter(WORLD, "demand.intervention_response.early_relase_probability", 0.9)
    with pytest.raises(KeyError):
        with_parameter(WORLD, "weather.rain", 1)


def test_the_grid_is_every_combination_with_a_name_that_spells_it_out():
    grid = cells({RELEASE: [0.25, 1.0], ANNOYED: [0.0, 0.05]})

    assert len(grid) == 4
    assert grid[0] == {RELEASE: 0.25, ANNOYED: 0.0}
    assert grid[-1] == {RELEASE: 1.0, ANNOYED: 0.05}
    assert cell_label("B4", grid[-1]) == \
        "B4[early_release_probability=1.0,annoyed_cancel_probability=0.05]"


def test_a_parameter_that_changes_the_baseline_gets_a_baseline_of_its_own(pg_conn, sa_conn):
    run_id = uuid.uuid4()
    world = dataclasses.replace(
        WORLD, demand=dataclasses.replace(WORLD.demand, searches_per_day=20))
    config = {"name": "t", "baseline": "variants/B3.yaml", "variant": "variants/B4.yaml",
              "baseline_per_cell": True, "parameters": {"supply.rides_per_day": [4, 12]}}

    labelled = run_sweep(pg_conn, config, world, range(1, 4), run_id)
    report = build_report(sa_conn, config, labelled, run_id)

    scarce, plenty = report["cells"]
    # More rides, more completed trips: the two baselines must differ, and each cell is
    # compared with its own.
    assert scarce["measures"]["per_100"]["baseline_mean"] < plenty["measures"]["per_100"]["baseline_mean"]
    assert report["baseline_means"] == {}
    variants = {row[0] for row in pg_conn.execute(
        "SELECT DISTINCT variant FROM events WHERE run_id = %s", (run_id,)).fetchall()}
    assert variants == {"B3[rides_per_day=4]", "B4[rides_per_day=4]",
                        "B3[rides_per_day=12]", "B4[rides_per_day=12]"}
    assert "on the same world" in to_markdown(report)


def test_every_shipped_sweep_names_real_variants_and_real_parameters():
    sweeps = sorted((CONFIGS / "sweeps").glob("*.yaml"))

    assert sweeps
    for path in sweeps:
        config = yaml.safe_load(path.read_text(encoding="utf-8"))
        load_variant(CONFIGS / config["baseline"])
        load_variant(CONFIGS / config["variant"])
        for parameter, values in config["parameters"].items():
            for value in values:
                with_parameter(WORLD, parameter, value)


def test_a_sweep_runs_each_cell_and_reports_it_against_the_baseline(pg_conn, sa_conn):
    run_id = uuid.uuid4()
    # A quieter world keeps this quick; the grid's two cells are the extremes.
    world = dataclasses.replace(
        WORLD, demand=dataclasses.replace(WORLD.demand, searches_per_day=20))
    config = {"name": "t", "baseline": "variants/B3.yaml", "variant": "variants/B4.yaml",
              "parameters": {RELEASE: [0.0, 1.0], ANNOYED: [0.0]}}

    labelled = run_sweep(pg_conn, config, world, range(1, 4), run_id)
    report = build_report(sa_conn, config, labelled, run_id)

    never, always = report["cells"]
    assert never["parameters"] == {RELEASE: 0.0, ANNOYED: 0.0}
    # Nobody ever releases: asking changes no outcome, so the cell equals the baseline.
    assert never["measures"]["per_100"]["vs_baseline"]["mean_difference"] == 0.0
    assert never["measures"]["late_share"]["vs_baseline"]["mean_difference"] == 0.0
    # Everyone destined to cancel releases when asked: fewer cancellations are late.
    assert always["measures"]["late_share"]["vs_baseline"]["mean_difference"] < 0
    assert always["measures"]["contact_rate"]["mean"] > 0
    assert report["baseline_means"]["contact_rate"] == 0.0

    markdown = to_markdown(report)
    assert "| early_release_probability | annoyed_cancel_probability | B3 | Mean |" in markdown
    assert "B3: " in markdown
