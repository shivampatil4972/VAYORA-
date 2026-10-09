-- The research event log. Every number in the report is a SQL aggregate over this table.
--
-- sim_time is the simulated clock, not the wall clock: live platform writes use wall
-- clock, simulator writes use the SimPy clock. Same column.
-- run_id, variant and seed are NULL for live platform writes.
CREATE TABLE events (
    id          BIGSERIAL PRIMARY KEY,
    run_id      UUID,
    variant     TEXT,
    seed        INT,
    sim_time    TIMESTAMPTZ NOT NULL,
    actor_type  TEXT,
    actor_id    BIGINT,
    event_type  TEXT NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_events_run ON events(run_id, variant, event_type);
CREATE INDEX idx_events_payload ON events USING GIN(payload);
CREATE INDEX idx_events_type_time ON events(event_type, sim_time);
