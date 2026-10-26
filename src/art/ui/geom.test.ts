import { describe, expect, it } from 'vitest';
import { arcPoints, starPoints } from './geom';

describe('arcPoints', () => {
  it('runs clockwise from the start angle with tangent handles of the circle', () => {
    const pts = arcPoints(10, 20, 8, -90, 180, 5);
    expect(pts).toHaveLength(5);
    expect(pts[0]).toMatchObject({ x: expect.closeTo(10), y: expect.closeTo(12) });
    expect(pts[2]).toMatchObject({ x: expect.closeTo(18), y: expect.closeTo(20) });
    expect(pts[4]).toMatchObject({ x: expect.closeTo(10), y: expect.closeTo(28) });
    const k = (4 / 3) * Math.tan(Math.PI / 4 / 4) * 8;
    expect(pts[0]?.outX).toBeCloseTo(10 + k);
    expect(pts[0]?.inX).toBeCloseTo(10 - k);
    expect(pts[2]?.outY).toBeCloseTo(20 + k);
  });

  it('collapses to one point for an empty sweep and refuses fewer than two points', () => {
    for (const p of arcPoints(0, 0, 5, 0, 0, 3)) expect(p).toMatchObject({ x: 5, y: 0, outX: 5, inX: 5 });
    expect(() => arcPoints(0, 0, 5, 0, 90, 1)).toThrow();
  });
});

describe('starPoints', () => {
  it('alternates outer and inner radii with the first point up', () => {
    const pts = starPoints(0, 0, 10, 4, 5);
    expect(pts).toHaveLength(10);
    expect(pts[0]).toMatchObject({ x: expect.closeTo(0), y: expect.closeTo(-10) });
    expect(Math.hypot(pts[1]?.x ?? 0, pts[1]?.y ?? 0)).toBeCloseTo(4);
  });
});
