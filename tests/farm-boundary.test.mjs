import assert from 'node:assert/strict';
import test from 'node:test';
import { boundaryArea, SQUARE_METRES_PER_UNIT } from '../src/features/farms/boundary.ts';

const point = (latitude, longitude) => ({ latitude, longitude });
const corners = [point(0, 0), point(0, .001), point(.001, .001), point(.001, 0)];

test('measures a 0.001 degree square at the equator and converts area units', () => {
  const area = boundaryArea(corners);
  assert.ok(Math.abs(area - 12364.35) < 1);
  assert.ok(Math.abs(area / SQUARE_METRES_PER_UNIT.hectares - 1.2364) < 0.001);
  assert.ok(Math.abs(area / SQUARE_METRES_PER_UNIT.acres - 3.0554) < 0.001);
  assert.equal(area, boundaryArea([...corners].reverse()));
});

test('rejects incomplete, duplicate, crossed, overlapping and invalid boundaries', () => {
  assert.throws(() => boundaryArea(corners.slice(0, 2)), /3 to 100/);
  assert.throws(() => boundaryArea([...corners, corners[0]]), /different/);
  assert.throws(() => boundaryArea([corners[0], corners[2], corners[1], corners[3]]), /cross/);
  assert.throws(() => boundaryArea([point(0, 0), point(0, 2), point(0, 1), point(1, 0)]), /overlap|cross/);
  assert.throws(() => boundaryArea([point(0, 0), point(0, 1), point(0, 2)]), /overlap/);
  assert.throws(() => boundaryArea([point(90, 0), ...corners]), /bounds/);
  assert.throws(() => boundaryArea([point(1, -179), point(1, 179), point(2, 178)]), /antimeridian/);
});
