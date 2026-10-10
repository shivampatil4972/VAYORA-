"""The ground-truth cancellation process.

A booking's hazard is Weibull in hours since it was accepted. An unobservable shock
may hit at some moment; from then on the hazard is multiplied. Cox PH and
gradient-boosted survival models cannot represent this exactly, which is deliberate
(research integrity rule 2).
"""

from __future__ import annotations


def cancellation_time(
    exposure: float,
    *,
    shape: float,
    scale: float,
    shock_time: float | None,
    shock_multiplier: float,
) -> float:
    """Hours after acceptance at which the booking would cancel.

    Inverse-transform sampling: `exposure` is a draw from Exp(1) and the result is the
    time at which the cumulative hazard reaches it. The caller compares the result with
    the time left until departure; a later time means the booking survives.

    Cumulative hazard is (t / scale) ** shape up to the shock and grows
    `shock_multiplier` times as fast after it.
    """
    if exposure < 0:
        raise ValueError("exposure must be non-negative")
    if shock_time is not None:
        at_shock = (shock_time / scale) ** shape
        if exposure > at_shock:
            exposure = at_shock + (exposure - at_shock) / shock_multiplier
    return scale * exposure ** (1.0 / shape)
