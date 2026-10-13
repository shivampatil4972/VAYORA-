import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';

export interface MapPoint {
  lat: number;
  lon: number;
  label: string;
  /** Drawn larger and in a different colour, e.g. where the passenger boards. */
  emphasis?: boolean;
}

function FitTo({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join(';');
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 13);
    else if (points.length > 1) map.fitBounds(points, { padding: [24, 24] });
    // Refit only when the points themselves change, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function Clicks({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) });
  return null;
}

/**
 * A map of a route and the places on it. Purely a picture: everything it shows is also
 * given in text next to it, so nobody needs the map to use the page.
 */
export function RouteMap({ path = [], points, onPick, describe }: {
  /** The line to draw, as [lat, lon] pairs. */
  path?: [number, number][];
  points: MapPoint[];
  /** If given, a click on the map reports where. */
  onPick?: (lat: number, lon: number) => void;
  /** What the map shows, for screen readers. */
  describe: string;
}) {
  const all: [number, number][] = [...path, ...points.map((p): [number, number] => [p.lat, p.lon])];
  return (
    <div role="img" aria-label={describe} className="h-72 overflow-hidden rounded-md border border-slate-200">
      <MapContainer center={[17.6, 74.05]} zoom={8} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {path.length > 1 && <Polyline positions={path} pathOptions={{ color: '#0f766e', weight: 4 }} />}
        {points.map((point) => (
          <CircleMarker
            key={`${point.label}-${point.lat}-${point.lon}`}
            center={[point.lat, point.lon]}
            radius={point.emphasis ? 9 : 6}
            pathOptions={{ color: point.emphasis ? '#b45309' : '#0f766e', fillOpacity: 0.9 }}
          >
            <Tooltip>{point.label}</Tooltip>
          </CircleMarker>
        ))}
        <FitTo points={all} />
        {onPick && <Clicks onPick={onPick} />}
      </MapContainer>
    </div>
  );
}
