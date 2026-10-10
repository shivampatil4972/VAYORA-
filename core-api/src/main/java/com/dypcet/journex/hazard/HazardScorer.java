package com.dypcet.journex.hazard;

import java.util.Map;
import java.util.Optional;

/** Estimates how likely a booking is to last. Implemented by a call to the intel service. */
public interface HazardScorer {

    /**
     * @param survivalProbability estimate that the passenger will not cancel before the
     *                            horizon, given no cancellation so far
     */
    record Score(double survivalProbability, String modelVersion, String featureVersion) {
    }

    /**
     * Both times are hours since the booking was accepted. Returns empty when no estimate
     * could be obtained; the caller must carry on without one.
     */
    Optional<Score> score(Map<String, Double> features, double elapsedHours, double horizonHours);
}
