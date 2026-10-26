import { describe, expect, it } from 'vitest';
import { buildPath, pathLength, pointAtDistance } from './path';

// Segments: 50 px down-right, 60 px down, 30 px left.
const POINTS = [
  { x: 0, y: 0 },
  { x: 30, y: 40 },
  { x: 30, y: 100 },
  { x: 0, y: 100 },
];

describe('path', () => {
  it('measures a multi-segment polyline', () => {
    const path = buildPath(POINTS);
    expect(path.cumulative).toEqual([0, 50, 110, 140]);
    expect(path.length).toBe(140);
    expect(pathLength(POINTS)).toBe(140);
  });

  it('interpolates position and heading on every segment', () => {
    const path = buildPath(POINTS);
    const a = pointAtDistance(path, 25);
    expect(a.pos.x).toBeCloseTo(15);
    expect(a.pos.y).toBeCloseTo(20);
    expect(a.heading).toBeCloseTo(Math.atan2(40, 30));
    const b = pointAtDistance(path, 80);
    expect(b.pos).toEqual({ x: 30, y: 70 });
    expect(b.heading).toBeCloseTo(Math.PI / 2);
    const c = pointAtDistance(path, 125);
    expect(c.pos).toEqual({ x: 15, y: 100 });
    expect(c.heading).toBeCloseTo(Math.PI);
  });

  it('uses the outgoing segment at a corner', () => {
    const corner = pointAtDistance(buildPath(POINTS), 50);
    expect(corner.pos).toEqual({ x: 30, y: 40 });
    expect(corner.heading).toBeCloseTo(Math.PI / 2);
  });

  it('clamps to the ends', () => {
    const path = buildPath(POINTS);
    const before = pointAtDistance(path, -10);
    expect(before.pos).toEqual({ x: 0, y: 0 });
    expect(before.heading).toBeCloseTo(Math.atan2(40, 30));
    const after = pointAtDistance(path, 1000);
    expect(after.pos).toEqual({ x: 0, y: 100 });
    expect(after.heading).toBeCloseTo(Math.PI);
  });

  it('skips zero-length segments for the heading', () => {
    const path = buildPath([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ]);
    expect(path.length).toBe(20);
    expect(pointAtDistance(path, 0).heading).toBeCloseTo(0);
    expect(pointAtDistance(path, 20).heading).toBeCloseTo(Math.PI / 2);
    expect(pointAtDistance(path, 20).pos).toEqual({ x: 10, y: 10 });
  });

  it('handles a single point', () => {
    const path = buildPath([{ x: 5, y: 6 }]);
    expect(path.length).toBe(0);
    expect(pointAtDistance(path, 3)).toEqual({ pos: { x: 5, y: 6 }, heading: 0 });
  });
});
