"""The report's figures are drawn from the committed results alone."""

from experiments.analysis import figures


def test_every_figure_is_drawn_from_the_committed_files(tmp_path, monkeypatch):
    monkeypatch.setattr(figures, "OUT", tmp_path)
    figures.main()
    drawn = sorted(p.name for p in tmp_path.glob("*.png"))
    assert drawn == ["fig1-ladder.png", "fig2-refill-timing.png", "fig3-sweeps.png",
                     "fig4-survival.png", "fig5-calibration.png", "fig6-cancellation-timing.png",
                     "fig7-robustness.png"]
    assert all((tmp_path / name).stat().st_size > 10_000 for name in drawn)


def test_the_figures_use_the_results_reproduce_rebuilds():
    script = (figures.ROOT / "scripts" / "reproduce.sh").read_text(encoding="utf-8")
    assert f"LADDER={figures.LADDER}" in script
    assert f"ROBUSTNESS={figures.ROBUSTNESS}" in script
    assert "experiments.analysis.timing --run-id \"$LADDER\"" in script
    for name, run_id in figures.SWEEPS:
        assert f"{name.replace('-', '_')} {run_id}" in script
