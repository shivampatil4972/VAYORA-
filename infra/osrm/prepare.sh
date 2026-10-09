#!/bin/sh
# Produces /data/corridor.osm.pbf: the regional OSM extract clipped to the
# Kolhapur-Pune corridor bounding box. Idempotent — reruns are a no-op.
set -eu

OUT=/data/corridor.osm.pbf
REGION=/data/region.osm.pbf

if [ -f "$OUT" ]; then
  echo "corridor extract already present: $OUT"
  exit 0
fi

echo "downloading $OSRM_PBF_URL"
curl -fL --retry 5 --retry-delay 5 -C - -o "$REGION.part" "$OSRM_PBF_URL"
mv "$REGION.part" "$REGION"

echo "clipping to bbox $OSRM_BBOX"
osmium extract --bbox "$OSRM_BBOX" --strategy complete_ways -o "$OUT.tmp.osm.pbf" "$REGION"
mv "$OUT.tmp.osm.pbf" "$OUT"

# The regional file is only an input; drop it to keep the volume small.
rm -f "$REGION"
ls -lh "$OUT"
