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

-- name: intervention_volume
-- asked         reconfirmation requests sent
-- released      requests the passenger answered by giving the seat up
-- refilled      bookings that took a seat a passenger had released earlier
-- contact_rate  requests per accepted booking: the contact budget actually spent
-- A seed with no accepted booking has an undefined contact_rate, not zero.
SELECT seed,
  COUNT(*) FILTER (WHERE event_type = 'intervention_issued') AS asked,
  COUNT(*) FILTER (WHERE event_type = 'intervention_responded'
                     AND payload->>'response' = 'released') AS released,
  COUNT(*) FILTER (WHERE event_type = 'seat_refilled') AS refilled,
  1.0 * COUNT(*) FILTER (WHERE event_type = 'intervention_issued')
      / NULLIF(COUNT(*) FILTER (WHERE event_type = 'booking_accepted'), 0)
      AS contact_rate
FROM events
WHERE run_id = :run_id AND variant = :variant
GROUP BY seed
ORDER BY seed;

-- name: refill_additionality
-- Can a refilled seat have added a booking, or did it only move one?
--
-- searches_shown       searches, first or repeat, that got an answer
-- shown_nothing        of those, the ones offered no ride at all
-- empty_share          shown_nothing / searches_shown: how often seats are what is missing
-- refills              bookings that took a seat somebody had released
-- refills_only_option  of those, the ones whose search was offered that ride and no other
-- only_option_share    refills_only_option / refills; undefined with no refills
--
-- A passenger who was offered another ride as well would have asked for a ride anyway,
-- so only an only-option refill can be a booking that would otherwise not exist.
-- refills_only_option is therefore an upper bound on bookings added by released seats.
-- It is not the number added: the ride may have had other free seats too.
--
-- A booking is matched to the answer its own search got by search id and instant, since
-- a repeat search reuses the search id. Matching is by grouping, not joining: the keys
-- live inside the payload, where a join has no statistics to plan with.
WITH scoped AS (
  SELECT seed, sim_time, event_type, payload
  FROM events
  WHERE run_id = :run_id AND variant = :variant
    AND event_type IN ('candidates_returned', 'booking_requested', 'seat_refilled')
),
booked AS (
  -- One row per booking: the search that made it, when, and whether it took a released seat.
  SELECT seed,
         MAX(payload->>'search_id') AS search_id,
         MAX(sim_time) FILTER (WHERE event_type = 'booking_requested') AS requested_at,
         BOOL_OR(event_type = 'seat_refilled') AS refilled
  FROM scoped
  WHERE event_type IN ('booking_requested', 'seat_refilled')
  GROUP BY seed, payload->>'booking_id'
),
answers AS (
  -- One row per answer a search got, with whether the booking it led to was a refill.
  SELECT seed, MAX(offered) AS offered, BOOL_OR(refilled) AS refilled
  FROM (
    SELECT seed, payload->>'search_id' AS search_id, sim_time AS at,
           (payload->>'count')::int AS offered, FALSE AS refilled
    FROM scoped
    WHERE event_type = 'candidates_returned'
    UNION ALL
    SELECT seed, search_id, requested_at, NULL, TRUE
    FROM booked
    WHERE refilled
  ) both_kinds
  GROUP BY seed, search_id, at
)
SELECT seed,
  COUNT(*) FILTER (WHERE offered IS NOT NULL) AS searches_shown,
  COUNT(*) FILTER (WHERE offered = 0) AS shown_nothing,
  1.0 * COUNT(*) FILTER (WHERE offered = 0)
      / NULLIF(COUNT(*) FILTER (WHERE offered IS NOT NULL), 0) AS empty_share,
  COUNT(*) FILTER (WHERE refilled) AS refills,
  COUNT(*) FILTER (WHERE refilled AND offered = 1) AS refills_only_option,
  1.0 * COUNT(*) FILTER (WHERE refilled AND offered = 1)
      / NULLIF(COUNT(*) FILTER (WHERE refilled), 0) AS only_option_share
FROM answers
GROUP BY seed
ORDER BY seed;
