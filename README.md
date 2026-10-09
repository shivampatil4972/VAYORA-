# JOURNEX

AI-powered intercity shared mobility for the Kolhapur to Pune corridor (~230 km).
Final-year B.Tech project, CSE (Data Science), DYPCET Kolhapur.

**The idea under test:** an early cancellation is a success. A seat released three days
before departure gets refilled; the same seat released two hours before departure is
destroyed capacity. We model booking durability as a survival curve over the seven-day
booking horizon and act on it while action still helps. The metric is completed rides
per 100 searches, never bookings.

Project rules, frozen parameters and research integrity rules are in
[CLAUDE.md](CLAUDE.md). They are binding.

## Quick start

Requires Docker with Compose v2. Nothing else needs to be installed on the host.

```sh
docker compose up -d --build --wait
sh infra/check-health.sh
```

The first run downloads a ~220 MB OpenStreetMap extract and builds the routing graph;
later runs reuse the `osrmdata` volume and start in seconds.

| Service  | Role                                   | Health endpoint                          |
|----------|----------------------------------------|------------------------------------------|
| core-api | Spring Boot 3 — transactions and truth | http://localhost:8080/actuator/health    |
| intel    | FastAPI — inference, stateless         | http://localhost:8000/health             |
| gateway  | Express + Socket.IO — ephemeral streams| http://localhost:3000/health             |
| web      | React — renders                        | http://localhost:5173/health             |

Backing services: PostgreSQL 16 + PostGIS 3.4 (`5432`), MongoDB 7 (`27017`),
Redis 7 (`6379`), OSRM (`5000`).

### Ports already in use?

Every host port is configurable. Copy `.env.example` to `.env` and change the
`*_PORT` values; `check-health.sh` reads the same variables:

```sh
cp .env.example .env
set -a; . ./.env; set +a; sh infra/check-health.sh
```

## Routing data

OSRM serves a **clipped bounding box**: `infra/osrm/prepare.sh` downloads the Geofabrik
western-zone India extract, clips it with osmium to the corridor box
(`OSRM_BBOX`, default `73.4,16.4,74.9,18.9`), and `osrm-build` runs
extract / partition / customize (MLD) on the result. Both steps are idempotent. To
rebuild from scratch: `docker compose down && docker volume rm journex_osrmdata`.

## Layout

| Path           | What                                                       |
|----------------|------------------------------------------------------------|
| `infra/`       | OSRM corridor preparation, stack health check              |
| `core-api/`    | Spring Boot 3, Java 21, `com.dypcet.journex`, Flyway       |
| `intel/`       | FastAPI, Python 3.11                                       |
| `gateway/`     | Express 4 + Socket.IO 4, JWT verification                  |
| `web/`         | Vite + React 18 + TypeScript + Tailwind                    |
| `journex_events/` | Python event-log writer and vocabulary                  |
| `sim/`         | Simulator                                                  |
| `experiments/` | Experiment configs — every tunable number lives here       |
| `docs/`        | Report material and figures                                |

## Event log

Every number in the report is a SQL aggregate over one table, `events`
(`core-api/src/main/resources/db/migration/V2__create_events.sql`). Two writers share
it and share a fixed 22-event vocabulary:

- `core-api` — `EventLogService.write(type, payload)`. Never throws into its caller.
- `journex_events` — Python `EventWriter`, batched with `COPY`. Fails loudly.

The metric queries are in `experiments/analysis/metrics.sql`; the headline one is
`primary_metric`, completed rides per 100 searches by seed.

## Tests

```sh
docker compose run --rm research          # Python: event writer + metric queries
docker compose run --rm core-api-tests    # Java: core-api, with Testcontainers
cd gateway && npm ci && npm test
```

The Python tests need the `postgres` service running; they work in a throwaway schema
and never touch real event rows.
