#!/bin/sh
# Stage 1 acceptance: all four service health endpoints respond, and OSRM
# routes the corridor. Run from the host after `docker compose up`.
set -u

fail=0
check() {
  name=$1; url=$2
  if body=$(curl -fsS --max-time 10 "$url"); then
    echo "ok    $name  $url  $(echo "$body" | cut -c1-80)"
  else
    echo "FAIL  $name  $url"
    fail=1
  fi
}

check core-api "http://localhost:${CORE_API_PORT:-8080}/actuator/health"
check intel    "http://localhost:${INTEL_PORT:-8000}/health"
check gateway  "http://localhost:${GATEWAY_PORT:-3000}/health"
check web      "http://localhost:${WEB_PORT:-5173}/health"
# Kolhapur (74.2433,16.7050) to Pune (73.8567,18.5204), lon,lat order
check osrm     "http://localhost:${OSRM_PORT:-5000}/route/v1/driving/74.2433,16.7050;73.8567,18.5204?overview=false"

exit $fail
