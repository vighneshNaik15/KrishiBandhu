'use client';

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';

export interface GoaMapPoint {
  id: string;
  name: string;
  summary: string;
  latitude: number;
  longitude: number;
  directionsQuery: string;
}

export function GoaMap({ points }: { points: GoaMapPoint[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <MapContainer
        center={[15.4, 74.0]}
        zoom={8}
        scrollWheelZoom={false}
        className="h-[420px] w-full"
        aria-label="Map of verified Goa service locations"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.latitude, point.longitude]}
            radius={8}
            pathOptions={{ color: '#166534', fillColor: '#22c55e', fillOpacity: 0.9 }}
          >
            <Popup>
              <strong>{point.name}</strong>
              <p>{point.summary}</p>
              <a
                href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(point.directionsQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Directions
              </a>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
