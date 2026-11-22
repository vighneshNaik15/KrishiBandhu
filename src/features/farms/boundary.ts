import { area } from '@turf/area';

export interface BoundaryPoint {
  latitude: number;
  longitude: number;
}

export const MAX_BOUNDARY_POINTS = 100;
export const SQUARE_METRES_PER_UNIT = {
  acres: 4046.8564224,
  hectares: 10000,
  sqm: 1,
  guntha: 101.17141056,
  sqft: 0.09290304,
};

function cross(p: number[], q: number[], r: number[]) {
  return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
}

function intersects(a: number[], b: number[], c: number[], d: number[]) {
  return [0, 1].every(axis =>
    Math.max(a[axis], b[axis]) >= Math.min(c[axis], d[axis]) &&
    Math.max(c[axis], d[axis]) >= Math.min(a[axis], b[axis])
  ) && cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0;
}

export function boundaryArea(points: readonly BoundaryPoint[]): number {
  if (points.length < 3 || points.length > MAX_BOUNDARY_POINTS) {
    throw new Error('Draw a boundary with 3 to 100 corners.');
  }
  const ring = points.map(({ latitude, longitude }) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 85.05112878 || Math.abs(longitude) > 180) {
      throw new Error('Every corner must be within the map bounds.');
    }
    return [longitude, latitude];
  });
  if (new Set(ring.map(point => point.join(','))).size !== ring.length) {
    throw new Error('Each corner must be different.');
  }
  ring.push(ring[0]);
  for (let i = 0; i < points.length; i++) {
    if (Math.abs(ring[i][0] - ring[i + 1][0]) >= 180) {
      throw new Error('Draw the boundary without crossing the antimeridian.');
    }
    const previous = ring[(i + points.length - 1) % points.length];
    const next = ring[i + 1];
    const vertex = ring[i];
    const dot = (previous[0] - vertex[0]) * (next[0] - vertex[0]) +
      (previous[1] - vertex[1]) * (next[1] - vertex[1]);
    if (cross(previous, vertex, next) === 0 && dot > 0) {
      throw new Error('Boundary edges must not overlap.');
    }
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      if (intersects(ring[i], ring[i + 1], ring[j], ring[j + 1])) {
        throw new Error('Boundary edges must not cross or touch.');
      }
    }
  }
  const squareMetres = area({ type: 'Polygon', coordinates: [ring] });
  if (!Number.isFinite(squareMetres) || squareMetres < 0.01) {
    throw new Error('Draw a boundary with an area of at least 0.01 m².');
  }
  return squareMetres;
}
