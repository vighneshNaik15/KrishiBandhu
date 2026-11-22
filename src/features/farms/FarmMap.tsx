'use client';

import { useEffect } from 'react';
import { latLngBounds, type LatLngTuple } from 'leaflet';
import { CircleMarker, MapContainer, Polygon, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { BoundaryPoint } from './boundary';

interface Shape {
  id: string;
  name: string;
  points: readonly BoundaryPoint[];
  onSelect?: () => void;
}

const position = ({ latitude, longitude }: BoundaryPoint): LatLngTuple => [latitude, longitude];

function MapControls({ initialPoints, onCorner }: {
  initialPoints: readonly BoundaryPoint[];
  onCorner?: (point: BoundaryPoint) => void;
}) {
  const map = useMap();
  useMapEvents({
    click({ latlng }) {
      const point = latlng.wrap();
      onCorner?.({ latitude: point.lat, longitude: point.lng });
    },
  });
  useEffect(() => {
    if (initialPoints.length) {
      map.fitBounds(latLngBounds(initialPoints.map(position)), { padding: [24, 24], maxZoom: 17 });
    }
  }, [initialPoints, map]);
  return null;
}

export default function FarmMap({ shapes, initialPoints, draft = [], onCorner }: {
  shapes: readonly Shape[];
  initialPoints: readonly BoundaryPoint[];
  draft?: readonly BoundaryPoint[];
  onCorner?: (point: BoundaryPoint) => void;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-xl border border-neutral-200">
      <MapContainer center={[15.4, 74.05]} zoom={9} maxZoom={19}
        className="h-[min(55vh,26rem)] min-h-64 w-full" doubleClickZoom={!onCorner}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        <MapControls initialPoints={initialPoints} onCorner={onCorner} />
        {shapes.filter(shape => shape.points.length >= 3).map(shape => (
          <Polygon key={shape.id} positions={shape.points.map(position)} pathOptions={{ color: '#15803d' }}>
            <Popup>{shape.onSelect ? <button type="button" className="underline" onClick={shape.onSelect}>{shape.name}</button> : shape.name}</Popup>
          </Polygon>
        ))}
        {draft.length >= 3 ? (
          <Polygon positions={draft.map(position)} interactive={false} pathOptions={{ color: '#15803d' }} />
        ) : (
          <Polyline positions={draft.map(position)} interactive={false} />
        )}
        {draft.map((point, index) => (
          <CircleMarker key={index} center={position(point)} radius={5} interactive={false} />
        ))}
      </MapContainer>
    </div>
  );
}
