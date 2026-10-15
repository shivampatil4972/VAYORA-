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

## Using the app

Open http://localhost:5173 and create an account as a passenger or as a driver.

- **Driver:** add a vehicle, publish a ride with its stops, move each meeting point on
  the map, take suggested prices from the road route, accept or decline requests, start
  the ride, mark anyone who did not board, complete it, see earnings.
- **Passenger:** search by town or by exact points on a map, sort the results, see a
  ride's route and meeting point, book or request, chat with the driver, see where the
  driver is once the ride is under way, cancel, rate the driver afterwards.
- **Every member:** an account page for profile, travel preferences, confirming an
  email or phone by code, and emergency contacts; an emergency button. No email or SMS
  is really sent: codes appear in the administrator's simulated outbox, and the
  emergency button alerts administrators only. In danger, call 112.
- **Administrator:** an overview, the reports queue (dismiss, warn or suspend), the
  emergency queue and simulated outbox, members,
  the model's durability estimates, and the audit log. Administrators cannot sign up; set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12
  characters or more) in `.env` and restart core-api to create one.

The interface is in English, Hindi and Marathi; choose in the header. The Hindi and
Marathi have not been reviewed by a native speaker.

Payments are simulated: no money moves. What is missing
is listed in [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

## Tests

```sh
docker compose --profile test run --rm core-api-tests      # core-api, Java 21
docker compose --profile research run --rm research        # simulator, model, experiments
(cd web && npm ci && npm test)
(cd gateway && npm ci && npm test)
```

What each suite covers is in [docs/TESTING.md](docs/TESTING.md).

## Research

```sh
# Train and evaluate the booking-durability model (writes experiments/reports/hazard-h1.json)
docker compose --profile research run --rm research python -m experiments.hazard.train

# Run a variant on the 30 experiment seeds
docker compose --profile research run --rm research     python -m sim.run --variant experiments/configs/variants/B0.yaml
```

All data is synthetic. The method is in
[docs/AI_ML_METHODOLOGY.md](docs/AI_ML_METHODOLOGY.md), the protocol and the first
results in [docs/EXPERIMENT_PROTOCOL.md](docs/EXPERIMENT_PROTOCOL.md), and the status of
each of the 95 backlog features in [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md).

## Routing data

OSRM serves a **clipped bounding box**: `infra/osrm/prepare.sh` downloads the Geofabrik
western-zone India extract, clips it with osmium to the corridor box
(`OSRM_BBOX`, default `73.4,16.4,74.9,18.9`), and `osrm-build` runs
extract / partition / customize (MLD) on the result. Both steps are idempotent. To
rebuild from scratch: `docker compose down && docker volume rm journex_osrmdata`.

## Documents

| Document | What it answers |
|---|---|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | What the parts are and why things live where they do |
| [DATABASE_DESIGN](docs/DATABASE_DESIGN.md) | Every table, collection and key |
| [API_DOCUMENTATION](docs/API_DOCUMENTATION.md) | Every endpoint and who may call it |
| [SECURITY](docs/SECURITY.md) | What is protected, how it is checked, and what is missing |
| [DEPLOYMENT](docs/DEPLOYMENT.md) | Running it, configuring it, and what breaks |
| [FEATURE_MATRIX](docs/FEATURE_MATRIX.md) | The state of each of the 95 features |
| [TESTING](docs/TESTING.md) | What is tested, and what is not |
| [KNOWN_LIMITATIONS](docs/KNOWN_LIMITATIONS.md) | Everything that does not work or is simulated |
| [AI_ML_METHODOLOGY](docs/AI_ML_METHODOLOGY.md) | The survival model and the contact scheduler |
| [EXPERIMENT_PROTOCOL](docs/EXPERIMENT_PROTOCOL.md) | How variants are compared, and every result |
| [Figures](docs/figures/README.md) | The report's five figures, with captions |
| [PROGRESS](docs/PROGRESS.md) | What was built when, and the decisions made |
| [DECISIONS](docs/DECISIONS.md) | Every design decision, why, and what it costs |
| [IMPLEMENTATION_ROADMAP](docs/IMPLEMENTATION_ROADMAP.md) | What is left, what it needs, and a proposed order |
| [DATASET_DOCUMENTATION](docs/DATASET_DOCUMENTATION.md) | Where every dataset comes from; all of it synthetic |

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
