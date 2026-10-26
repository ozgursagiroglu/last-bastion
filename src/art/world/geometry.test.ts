import { describe, expect, it } from 'vitest';
import { PATH_WIDTH } from '../../game/types';
import {
  distanceToPaths,
  distanceToSegment,
  exitPoints,
  MAX_CORNER_RADIUS,
  pointAlong,
  roundedRoadPoints,
  spawnMarkerPoint,
  withRunoff,
} from './geometry';

function cubic(t: number, a: number, b: number, c: number, d: number): number {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
}

describe('geometry', () => {
  it('measures distances to segments and polylines', () => {
    expect(distanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3);
    expect(distanceToSegment({ x: -4, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    expect(distanceToPaths({ x: 0, y: 0 }, [])).toBe(Infinity);
    expect(distanceToPaths({ x: 12, y: 5 }, [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]])).toBe(2);
  });

  it('extends the road past the spawn point', () => {
    const road = withRunoff([{ x: 0, y: 100 }, { x: 200, y: 100 }]);
    expect(road[0]?.x).toBeLessThan(-50);
    expect(road[0]?.y).toBe(100);
    expect(road[1]).toEqual({ x: 200, y: 100 });
  });

  it('rounds corners within the radius so the raw polyline stays on the drawn road', () => {
    const path = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 400, y: 200 }];
    const pts = roundedRoadPoints(path);
    expect(pts).toHaveLength(2 + 2 * 2);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[pts.length - 1]).toEqual({ x: 400, y: 200 });
    const a = pts[1];
    const b = pts[2];
    if (!a || !b || a.outX === undefined || a.outY === undefined || b.inX === undefined || b.inY === undefined) throw new Error('missing corner');
    expect(Math.hypot(a.x - 200, a.y)).toBeCloseTo(MAX_CORNER_RADIUS);
    for (let t = 0; t <= 1; t += 0.1) {
      const p = { x: cubic(t, a.x, a.outX, b.inX, b.x), y: cubic(t, a.y, a.outY, b.inY, b.y) };
      expect(distanceToPaths(p, [path])).toBeLessThan(PATH_WIDTH / 2);
    }
    const short = roundedRoadPoints([{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 100 }]);
    expect(short[1]?.x).toBeCloseTo(12);
  });

  it('finds distinct exits and points along a path', () => {
    const exits = exitPoints([
      [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      [{ x: 0, y: 50 }, { x: 100, y: 100 }],
      [{ x: 0, y: 90 }, { x: 300, y: 100 }],
    ]);
    expect(exits).toEqual([{ x: 100, y: 100 }, { x: 300, y: 100 }]);
    const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    expect(pointAlong(path, 150)).toEqual({ at: { x: 100, y: 50 }, dir: { x: 0, y: 1 } });
    expect(pointAlong(path, 999).at).toEqual({ x: 100, y: 100 });
  });

  it('puts a spawn marker beside the road inside the board, above the road when possible', () => {
    const path = [{ x: -20, y: 300 }, { x: 600, y: 300 }];
    const spot = spawnMarkerPoint(path, [withRunoff(path)]);
    expect(spot).not.toBeNull();
    if (!spot) return;
    expect(spot.y).toBeLessThan(300);
    expect(spot.x).toBeGreaterThan(0);
    expect(distanceToPaths(spot, [path])).toBeGreaterThanOrEqual(PATH_WIDTH / 2 + 16);
  });
});
