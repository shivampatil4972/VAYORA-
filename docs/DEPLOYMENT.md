# Running and deploying

How to run JOURNEX on one machine, which is the only way it has ever been run. Nothing
here describes a production deployment, because there has not been one; the last
section lists what one would need.

## What you need

Docker Desktop (or Docker Engine with Compose v2). Nothing else: Java, Python and Node
all run inside containers. Node on the host is needed only to run the web tests or the
development server.

## Start everything

```sh
docker compose up -d --wait
```

The first start downloads an OpenStreetMap extract for western India (about 220 MB) and builds a
road graph for the corridor, which takes several minutes. Later starts reuse it.

| Service | Address | What it is |
|---|---|---|
| web | http://localhost:5173 | The app |
| core-api | http://localhost:8080 | The API; health at `/actuator/health` |
| gateway | http://localhost:3000 | Chat and live position; health at `/health` |
| intel | http://localhost:8000 | The model and scheduler; health at `/health` |
| osrm | http://localhost:5000 | Road routing |
| postgres | localhost:5432 | Database `journex`, user `journex` |
| mongo | localhost:27017 | |
| redis | localhost:6379 | |

To start without road routing (routes become straight lines, labelled as such):

```sh
docker compose up -d --wait postgres mongo redis core-api intel gateway web
```

## Configuration

Every setting has a working default in `docker-compose.yml`. To change one, copy
`.env.example` to `.env` and edit it. `.env` is ignored by git; do not commit one.

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET` | a public development value | At least 32 bytes. core-api signs with it and the gateway verifies with it, so both must have the same one. **Change it** |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | empty | Set both to have an administrator created when core-api starts. The password needs 12 characters or more. There is no other way to make one |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | `journex` | |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Where the browser app is served from. Change it together with `WEB_PORT` |
| `*_PORT` | see the table above | Change one if the port is taken |
| `OSRM_PBF_URL`, `OSRM_BBOX` | western India, clipped to the corridor | |

The web app's addresses for core-api and the gateway are fixed when its image is built
(`VITE_API_URL`, `VITE_GATEWAY_URL`). Changing `CORE_API_PORT` or `GATEWAY_PORT` means
rebuilding it: `docker compose up -d --build web`.

Application settings that are not secrets (refund tiers, service fee, hold length, code
expiry, search radius) are in `core-api/src/main/resources/application.yml`. Research
settings are in `experiments/configs/`.

## The database

Flyway applies the migrations in `core-api/src/main/resources/db/migration/` when
core-api starts. There is nothing to run by hand. A migration that has been applied is
never edited; a change is a new numbered file.

Data lives in Docker volumes (`pgdata`, `mongodata`, `osrmdata`) and survives
`docker compose down`. To start from nothing:

```sh
docker compose down -v
```

This deletes every account, ride, booking and experiment run, and the road graph.

## Developing the web app

```sh
docker compose up -d --wait postgres mongo redis core-api gateway
cd web
npm ci
npm run dev
```

## Tests

See TESTING.md. In short:

```sh
docker compose --profile test run --rm core-api-tests
docker compose up -d --wait postgres core-api
docker compose --profile research run --rm research
cd web && npm ci && npm test
cd gateway && npm ci && npm test
```

## Experiments

See EXPERIMENT_PROTOCOL.md section 4. Runs write to the same PostgreSQL as the
platform, in the `events` table, kept apart by `run_id`.

## When something does not start

| Symptom | Likely cause |
|---|---|
| `failed to connect to the docker API` | Docker Desktop is not running. Start it and wait for the engine |
| core-api exits at once | `JWT_SECRET` is shorter than 32 bytes, or `ADMIN_PASSWORD` is shorter than 12 characters |
| A port is already allocated | Something else is using it; change the matching `*_PORT` in `.env` |
| The app loads but every request fails | `CORS_ALLOWED_ORIGINS` does not match the address the app is opened at |
| Sign-in works but chat does not connect | The gateway has a different `JWT_SECRET` from core-api |
| Routes are straight lines | OSRM is not running, or still building its graph. Check `docker compose logs osrm-build` |
| No administrator | `ADMIN_EMAIL` and `ADMIN_PASSWORD` were not set when core-api started. Set them and restart it |

## What a real deployment would need

None of this exists.

- HTTPS, and a reverse proxy in front of web, core-api and the gateway.
- Secrets from a secret store, not from a file or a default.
- Databases on a private network with their own credentials, backups, and a tested
  restore.
- intel reachable only from core-api.
- More than one core-api instance would need the simulated outbox gone (it is in
  memory) and has not been tried.
- More than one gateway instance would need a Socket.IO adapter so that a message
  reaches clients connected to another instance.
- Logs and metrics collected somewhere. Today they are container output.
- A build pipeline. Images are built on the machine that runs them.
- The work listed at the end of SECURITY.md.
