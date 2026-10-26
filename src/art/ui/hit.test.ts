import { describe, expect, it } from 'vitest';
import { circleRegion, hitTest, rectRegion, type HitRegion } from './hit';

describe('regions', () => {
  it('builds rects from their center', () => {
    expect(rectRegion('a', 100, 50, 40, 20)).toEqual({ id: 'a', kind: 'rect', x: 80, y: 40, w: 40, h: 20 });
    expect(circleRegion('b', 10, 20, 5)).toEqual({ id: 'b', kind: 'circle', x: 10, y: 20, r: 5 });
  });
});

describe('hitTest', () => {
  const regions: HitRegion[] = [rectRegion('panel', 100, 100, 200, 200), rectRegion('button', 100, 150, 80, 40), circleRegion('close', 190, 10, 12)];

  it('returns the topmost (last) region containing the point', () => {
    expect(hitTest(regions, { x: 100, y: 150 })).toBe('button');
    expect(hitTest(regions, { x: 30, y: 30 })).toBe('panel');
    expect(hitTest(regions, { x: 190, y: 5 })).toBe('close');
  });

  it('counts rect edges as inside and misses just outside', () => {
    expect(hitTest(regions, { x: 60, y: 130 })).toBe('button');
    expect(hitTest(regions, { x: 140, y: 170 })).toBe('button');
    expect(hitTest(regions, { x: 140.5, y: 170 })).toBe('panel');
    expect(hitTest(regions, { x: 0, y: 0 })).toBe('panel');
    expect(hitTest(regions, { x: 200, y: 200 })).toBe('panel');
    expect(hitTest(regions, { x: 200.01, y: 100 })).toBeNull();
    expect(hitTest(regions, { x: -1, y: 100 })).toBeNull();
  });

  it('tests circles by distance, not by their bounding box', () => {
    expect(hitTest(regions, { x: 202, y: 10 })).toBe('close');
    expect(hitTest(regions, { x: 200, y: -0.5 })).toBeNull();
    expect(hitTest(regions, { x: 199, y: 19 })).toBe('panel');
  });

  it('returns null for no regions', () => {
    expect(hitTest([], { x: 0, y: 0 })).toBeNull();
  });
});
