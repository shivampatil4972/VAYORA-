import math
import random
import statistics

import pytest

from sim.hazard import cancellation_time


def _time(exposure, *, shock_time=None, multiplier=1.0, shape=1.5, scale=100.0):
    return cancellation_time(
        exposure, shape=shape, scale=scale, shock_time=shock_time, shock_multiplier=multiplier)


def test_without_a_shock_it_is_the_weibull_quantile():
    # S(t) = exp(-(t/scale)^shape); at t = scale the cumulative hazard is exactly 1.
    assert _time(1.0) == pytest.approx(100.0)
    assert _time(0.0) == 0.0
    assert _time(2.0 ** 1.5) == pytest.approx(200.0)


def test_sampled_times_have_the_weibull_median():
    rng = random.Random(1)
    times = [_time(rng.expovariate(1.0), shape=1.8, scale=110.0) for _ in range(40_000)]

    assert statistics.median(times) == pytest.approx(110.0 * math.log(2) ** (1 / 1.8), rel=0.02)


def test_a_shock_after_the_cancellation_changes_nothing():
    assert _time(1.0, shock_time=150.0, multiplier=15.0) == pytest.approx(_time(1.0))


def test_a_shock_before_the_cancellation_brings_it_forward_but_not_before_the_shock():
    unshocked = _time(1.0)
    shocked = _time(1.0, shock_time=40.0, multiplier=15.0)

    assert 40.0 < shocked < unshocked


def test_a_multiplier_of_one_is_no_shock_at_all():
    assert _time(1.0, shock_time=40.0, multiplier=1.0) == pytest.approx(_time(1.0))


def test_time_is_continuous_and_increasing_in_exposure_across_the_shock():
    at_shock = (40.0 / 100.0) ** 1.5
    just_before = _time(at_shock - 1e-9, shock_time=40.0, multiplier=15.0)
    just_after = _time(at_shock + 1e-9, shock_time=40.0, multiplier=15.0)

    assert just_before == pytest.approx(40.0, abs=1e-4)
    assert just_after == pytest.approx(40.0, abs=1e-4)
    assert just_before < just_after


def test_negative_exposure_is_rejected():
    with pytest.raises(ValueError):
        _time(-0.1)
