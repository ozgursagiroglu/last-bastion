import { describe, expect, it } from 'vitest';
import { dist, distToPolyline, distToSegment, inRect, samePoint, segmentCrossing, segmentHitsRect, segmentsOf, turnAngle } from './geometry';

const p = (x: number, y: number) => ({ x, y });

describe('geometry', () => {
  it('measures distances to points, segments and polylines', () => {
    expect(dist(p(0, 0), p(3, 4))).toBe(5);
    expect(distToSegment(p(5, 3), p(0, 0), p(10, 0))).toBe(3);
    expect(distToSegment(p(-4, 3), p(0, 0), p(10, 0))).toBe(5);
    expect(distToSegment(p(1, 1), p(0, 0), p(0, 0))).toBeCloseTo(Math.SQRT2);
    expect(distToPolyline(p(10, 5), [p(0, 0), p(10, 0), p(10, 10)])).toBe(0);
    expect(distToPolyline(p(2, 2), [p(0, 0)])).toBeCloseTo(2 * Math.SQRT2);
  });

  it('compares points exactly and splits polylines into segments', () => {
    expect(samePoint(p(1, 2), p(1, 2))).toBe(true);
    expect(samePoint(p(1, 2), p(1, 2.0001))).toBe(false);
    expect(segmentsOf([p(0, 0), p(1, 0), p(1, 1)])).toEqual([
      [p(0, 0), p(1, 0)],
      [p(1, 0), p(1, 1)],
    ]);
    expect(segmentsOf([p(0, 0)])).toEqual([]);
  });

  it('tests points and segments against rectangles', () => {
    const r = { x: 10, y: 10, w: 20, h: 20 };
    expect(inRect(p(10, 30), r)).toBe(true);
    expect(inRect(p(9, 20), r)).toBe(false);
    expect(segmentHitsRect(p(0, 0), p(40, 40), r)).toBe(true);
    expect(segmentHitsRect(p(15, 15), p(16, 16), r)).toBe(true);
    expect(segmentHitsRect(p(0, 0), p(40, 0), r)).toBe(false);
    expect(segmentHitsRect(p(0, 35), p(35, 0), r)).toBe(true);
    expect(segmentHitsRect(p(0, 50), p(50, 45), r)).toBe(false);
  });

  it('measures turns between segment directions in degrees', () => {
    expect(turnAngle(p(0, 0), p(10, 0), p(20, 0))).toBe(0);
    expect(turnAngle(p(0, 0), p(10, 0), p(10, 10))).toBeCloseTo(90);
    expect(turnAngle(p(0, 0), p(10, 0), p(10, -10))).toBeCloseTo(90);
    expect(turnAngle(p(0, 0), p(10, 0), p(0, 1))).toBeGreaterThan(170);
  });

  it('finds proper crossings only', () => {
    expect(segmentCrossing(p(0, 0), p(10, 10), p(0, 10), p(10, 0))).toEqual(p(5, 5));
    expect(segmentCrossing(p(0, 0), p(10, 0), p(10, 0), p(10, 10))).toBeNull();
    expect(segmentCrossing(p(0, 0), p(10, 0), p(0, 5), p(10, 5))).toBeNull();
  });
});
