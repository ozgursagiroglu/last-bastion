import { describe, expect, it } from 'vitest';
import { clipTimeSince, FLIP_COS, initialFacingLeft, nextFacingLeft, walkTime } from './motion';

const headingWithCos = (c: number) => Math.acos(c);

describe('facing hysteresis', () => {
  it('starts facing the direction of travel', () => {
    expect(initialFacingLeft(0)).toBe(false);
    expect(initialFacingLeft(Math.PI)).toBe(true);
    expect(initialFacingLeft(Math.PI / 2 + 0.01)).toBe(true);
  });

  it('flips left only below -0.2 and back right only above +0.2', () => {
    expect(nextFacingLeft(false, headingWithCos(-0.1))).toBe(false);
    expect(nextFacingLeft(false, headingWithCos(-FLIP_COS - 0.01))).toBe(true);
    expect(nextFacingLeft(true, headingWithCos(0.1))).toBe(true);
    expect(nextFacingLeft(true, headingWithCos(FLIP_COS + 0.01))).toBe(false);
  });

  it('holds its facing on a vertical road', () => {
    expect(nextFacingLeft(true, Math.PI / 2)).toBe(true);
    expect(nextFacingLeft(false, -Math.PI / 2)).toBe(false);
  });
});

describe('walk phase', () => {
  it('plays one walk cycle per stride travelled', () => {
    expect(walkTime(0, 30, 0.5)).toBe(0);
    expect(walkTime(15, 30, 0.5)).toBeCloseTo(0.25);
    expect(walkTime(90, 30, 0.5)).toBeCloseTo(1.5);
  });

  it('stays at 0 without a stride', () => {
    expect(walkTime(50, 0, 0.5)).toBe(0);
  });
});

describe('clipTimeSince', () => {
  it('is the time since the start while within the clip', () => {
    expect(clipTimeSince(10.1, 10, 0.2)).toBeCloseTo(0.1);
    expect(clipTimeSince(10, 10, 0.2)).toBe(0);
  });

  it('is null before, after, and for -Infinity', () => {
    expect(clipTimeSince(10.3, 10, 0.2)).toBeNull();
    expect(clipTimeSince(9, 10, 0.2)).toBeNull();
    expect(clipTimeSince(10, -Infinity, 0.2)).toBeNull();
  });
});
