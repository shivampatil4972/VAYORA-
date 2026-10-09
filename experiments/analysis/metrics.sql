-- JOURNEX metric queries. Every number in the report comes from one of these.
--
-- Each query starts with a `-- name:` line and binds :run_id and :variant
-- (see experiments/analysis/queries.py). All queries return one row per seed.
--
-- Payload contract these queries rely on:
--   booking_cancelled.payload.departure_time  ISO-8601 timestamp with offset —
--   the scheduled departure of the ride whose seat was released.

-- name: primary_metric
-- Completed rides per 100 searches. The only headline number.
SELECT seed,
  COUNT(*) FILTER (WHERE event_type = 'search_issued')   AS searches,
  COUNT(*) FILTER (WHERE event_type = 'trip_completed')  AS completed,
  100.0 * COUNT(*) FILTER (WHERE event_type = 'trip_completed')
        / NULLIF(COUNT(*) FILTER (WHERE event_type = 'search_issued'), 0)
        AS per_100
FROM events
WHERE run_id = :run_id AND variant = :variant
GROUP BY seed
ORDER BY seed;

-- name: late_cancellation_share
-- Cancellations made less than 24 hours before departure, as a fraction of all
-- cancellations. Exactly 24 hours before departure is not late.
-- A seed with no cancellations returns no row.
-- missing_departure_time must be 0: such rows sit in the denominator but can
-- never count as late, so any non-zero value means late_share is understated.
SELECT seed,
  COUNT(*) AS cancellations,
  COUNT(*) FILTER (
    WHERE CAST(payload->>'departure_time' AS timestamptz) - sim_time < INTERVAL '24 hours'
  ) AS late,
  COUNT(*) FILTER (WHERE payload->>'departure_time' IS NULL) AS missing_departure_time,
  1.0 * COUNT(*) FILTER (
    WHERE CAST(payload->>'departure_time' AS timestamptz) - sim_time < INTERVAL '24 hours'
  ) / COUNT(*) AS late_share
FROM events
WHERE run_id = :run_id AND variant = :variant
  AND event_type = 'booking_cancelled'
GROUP BY seed
ORDER BY seed;

-- name: funnel_rates
-- booking_rate           booking requests per search
-- acceptance_rate        accepted requests as a fraction of all requests
--                        (a request never answered counts as not accepted)
-- recovery_success_rate  recovery searches that ended in a booking
SELECT seed,
  1.0 * COUNT(*) FILTER (WHERE event_type = 'booking_requested')
      / NULLIF(COUNT(*) FILTER (WHERE event_type = 'search_issued'), 0)
      AS booking_rate,
  1.0 * COUNT(*) FILTER (WHERE event_type = 'booking_accepted')
      / NULLIF(COUNT(*) FILTER (WHERE event_type = 'booking_requested'), 0)
      AS acceptance_rate,
  1.0 * COUNT(*) FILTER (WHERE event_type = 'recovery_booked')
      / NULLIF(COUNT(*) FILTER (WHERE event_type = 'recovery_search'), 0)
      AS recovery_success_rate
FROM events
WHERE run_id = :run_id AND variant = :variant
GROUP BY seed
ORDER BY seed;
