#!/usr/bin/env bash
# Rebuilds every current research result from the configuration in experiments/configs
# and fails unless each one comes out exactly as committed.
#
#   scripts/reproduce.sh            everything: tests, model, ladder, sweeps (about an hour)
#   scripts/reproduce.sh --no-sweeps   tests, model and ladder only
#
# Needs only Docker. It deletes and re-creates the events of the runs it rebuilds, and
# nothing else. Runs made with earlier code (ladders ...001 and ...002, sweeps ...001 and
# ...002) are history: the code that made them has changed, so they are not rebuilt.
set -euo pipefail
cd "$(dirname "$0")/.."

SWEEPS=true
[[ "${1:-}" == "--no-sweeps" ]] && SWEEPS=false

research() { docker compose --profile research run --rm research "$@"; }
sql() { docker compose exec -T postgres psql -U "${POSTGRES_USER:-journex}" -d "${POSTGRES_DB:-journex}" -v ON_ERROR_STOP=1 -qc "$1"; }
forget() { sql "DELETE FROM events WHERE run_id = '$1'"; }

LADDER=7a1c0de0-0000-4000-8000-000000000003
SWEEP_RUNS=(
  "contact_budget 5eeb0000-0000-4000-8000-000000000003"
  "departure_tolerance 5eeb0000-0000-4000-8000-000000000004"
  "publish_lead 5eeb0000-0000-4000-8000-000000000005"
)

echo "== starting the database"
docker compose up -d --wait postgres core-api

echo "== 1. tests"
research pytest -q

echo "== 2. the durability model"
research python -m experiments.hazard.train

echo "== 3. the variant ladder"
forget "$LADDER"
for variant in B0 B3 B4 B5 ORACLE; do
  research python -m sim.run --variant "experiments/configs/variants/$variant.yaml" --run-id "$LADDER"
done
research python -m experiments.analysis.compare --run-id "$LADDER" --baseline B0 B3 B4 B5 ORACLE > /dev/null

if $SWEEPS; then
  echo "== 4. the sweeps"
  for entry in "${SWEEP_RUNS[@]}"; do
    read -r name run_id <<< "$entry"
    forget "$run_id"
    research python -m experiments.sweep "experiments/configs/sweeps/$name.yaml" --run-id "$run_id" > /dev/null
  done
fi

echo "== 5. the what-if explorer's copy of the sweeps"
research python -m experiments.analysis.export_web $(for entry in "${SWEEP_RUNS[@]}"; do echo "${entry#* }"; done) > /dev/null

echo "== checking every rebuilt file against the committed one"
if git diff --exit-code --stat -- intel/app/hazard/models experiments/reports web/src/data; then
  echo "Every result reproduced exactly."
else
  echo "Something came out differently: see the diff above." >&2
  exit 1
fi
