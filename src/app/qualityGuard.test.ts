import { describe, expect, it } from 'vitest';
import {
  BASELINE_FACTOR,
  BASELINE_FRAMES,
  DEFAULT_PACE_MS,
  GUARD_HOLD_MS,
  GUARD_LIMIT_MS,
  GUARD_WINDOW,
  MAX_SAMPLE_MS,
  MIN_BASELINE_FRAMES,
  QualityGuard,
} from './qualityGuard';

const HZ60 = 1000 / 60;
const HZ30 = 1000 / 30;

/** Feeds `count` intervals of `ms` (or ms(i) for the i-th); returns the 1-based index of the frame that reported, or null. */
function feed(guard: QualityGuard, ms: number | ((i: number) => number), count: number, level = true): number | null {
  let reported: number | null = null;
  for (let i = 1; i <= count; i++) if (guard.frame(typeof ms === 'number' ? ms : ms(i), level) && reported === null) reported = i;
  return reported;
}

/** A guard that has learned a device pace of `pace` ms from menu frames. */
function learned(pace: number): QualityGuard {
  const guard = new QualityGuard();
  feed(guard, pace, BASELINE_FRAMES, false);
  return guard;
}

describe('QualityGuard', () => {
  it('learns over 90 frames, averages 120 level frames, uses max(22 ms, 1.35 × pace) and a 3 s hold', () => {
    expect([BASELINE_FRAMES, GUARD_WINDOW, GUARD_LIMIT_MS, BASELINE_FACTOR, GUARD_HOLD_MS]).toEqual([90, 120, 22, 1.35, 3000]);
  });

  it("learns the device's pace as the median interval of the first 90 frames, spikes ignored", () => {
    const guard = new QualityGuard();
    expect(feed(guard, (i) => (i % 9 === 0 ? 500 : HZ60), BASELINE_FRAMES - 1, false)).toBeNull();
    expect(guard.baseline).toBeNull();
    expect(guard.threshold).toBeNull();
    guard.frame(HZ60, false);
    expect(guard.baseline).toBeCloseTo(HZ60);
    expect(guard.threshold).toBeCloseTo(BASELINE_FACTOR * HZ60);
    feed(guard, 100, 500, false);
    expect(guard.baseline).toBeCloseTo(HZ60);
    expect(learned(HZ30).threshold).toBeCloseTo(BASELINE_FACTOR * HZ30);
    // A 120 Hz display: 1.35 × its pace is under the 22 ms floor.
    expect(learned(1000 / 120).threshold).toBe(GUARD_LIMIT_MS);
  });

  it('takes the pace from the menu frames seen so far when a level starts early, never from level frames', () => {
    const guard = new QualityGuard();
    feed(guard, 20, MIN_BASELINE_FRAMES + 10, false);
    expect(feed(guard, 40, 60)).toBeNull();
    expect(guard.baseline).toBe(20);
  });

  it('assumes 60 Hz when a level starts before enough menu frames were seen', () => {
    const guard = new QualityGuard();
    feed(guard, 50, MIN_BASELINE_FRAMES - 1, false);
    guard.frame(50, true);
    expect(guard.baseline).toBe(DEFAULT_PACE_MS);
  });

  it('does not drop effects for one long stall in an otherwise smooth level', () => {
    const guard = learned(HZ60);
    feed(guard, HZ60, GUARD_WINDOW - 1);
    expect(guard.frame(1500, true)).toBe(false);
    expect(feed(guard, HZ60, 600)).toBeNull();
    expect(guard.dropped).toBe(false);
    expect(guard.average).toBeLessThan(GUARD_LIMIT_MS);
  });

  it('caps each sample at MAX_SAMPLE_MS in the average but counts the hold in real time', () => {
    const guard = learned(HZ60);
    feed(guard, 250, GUARD_WINDOW - 1);
    expect(guard.frame(250, true)).toBe(false);
    expect(guard.average).toBe(MAX_SAMPLE_MS);
  });

  it('drops effects on a 60 Hz device that slows to 30 fps in a level, once the slow average has lasted 3 s', () => {
    const guard = learned(HZ60);
    const reported = feed(guard, HZ30, 400);
    // The 120th level frame fills the window; from there, 90 frames of 33.3 ms make 3 s.
    expect(reported).toBeGreaterThanOrEqual(GUARD_WINDOW + 89);
    expect(reported).toBeLessThanOrEqual(GUARD_WINDOW + 90);
    expect(guard.dropped).toBe(true);
    expect(guard.average).toBeCloseTo(HZ30);
  });

  it('never drops effects on a 30 Hz-capped device that keeps its own pace', () => {
    const guard = new QualityGuard();
    const jitter = (i: number) => HZ30 + ((i * 7) % 5) - 2;
    feed(guard, jitter, BASELINE_FRAMES, false);
    expect(guard.threshold).toBeGreaterThan(44);
    expect(feed(guard, jitter, 5000)).toBeNull();
    expect(guard.average).toBeGreaterThan(GUARD_LIMIT_MS);
    // Clearly slower than its own pace (20 fps) is still too slow.
    expect(feed(guard, 50, 400)).not.toBeNull();
  });

  it('measures the 3 s hold in real time on a device slower than 10 fps (intervals are not capped)', () => {
    const guard = learned(HZ60);
    // 150 ms frames: the window fills on the 120th, and 20 of them make exactly 3 s.
    expect(feed(guard, 150, 400)).toBe(GUARD_WINDOW + 19);
  });

  it('decides nothing before the level window is full', () => {
    const guard = new QualityGuard();
    expect(feed(guard, 300, BASELINE_FRAMES - 1)).toBeNull();
    expect(guard.average).toBeNull();
    expect(guard.dropped).toBe(false);
  });

  it('measures each level from scratch after a reset, but keeps the pace and a drop already decided', () => {
    const guard = learned(16);
    // 32 ms frames: the window fills on the 120th, and 94 of them make 3 s.
    expect(feed(guard, 32, GUARD_WINDOW + 80)).toBeNull();
    guard.reset();
    expect(guard.average).toBeNull();
    expect(guard.baseline).toBe(16);
    expect(feed(guard, 32, GUARD_WINDOW + 80)).toBeNull();
    expect(feed(guard, 32, 20)).toBe(13);
    guard.reset();
    expect(guard.dropped).toBe(true);
    expect(feed(guard, 32, 400)).toBeNull();
  });

  it('reports only once and never takes it back', () => {
    const guard = learned(HZ60);
    expect(feed(guard, 50, 400)).not.toBeNull();
    expect(feed(guard, 50, 400)).toBeNull();
    expect(feed(guard, 5, 400)).toBeNull();
    expect(guard.dropped).toBe(true);
  });

  it('starts the hold again whenever the average dips back under the threshold', () => {
    const guard = learned(16);
    feed(guard, 16, GUARD_WINDOW);
    // Slow frames keep the average above 22 ms for 2 s (2.7 s by the time fast frames bring it back down), then 2.1 s
    // more of slow average: more than 3 s in all, but never 3 s in a row.
    expect(feed(guard, 40, 80)).toBeNull();
    expect(guard.average).toBeGreaterThan(GUARD_LIMIT_MS);
    expect(feed(guard, 10, GUARD_WINDOW)).toBeNull();
    expect(guard.average).toBeLessThan(GUARD_LIMIT_MS);
    expect(feed(guard, 40, 100)).toBeNull();
    expect(guard.average).toBeGreaterThan(GUARD_LIMIT_MS);
    expect(guard.dropped).toBe(false);
    expect(feed(guard, 40, 30)).not.toBeNull();
  });

  it('only level frames enter the window', () => {
    const guard = learned(HZ60);
    expect(feed(guard, 100, 1000, false)).toBeNull();
    expect(guard.average).toBeNull();
  });

  it('skips intervals that were not measured', () => {
    const guard = learned(HZ60);
    for (const ms of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(guard.frame(ms, true)).toBe(false);
    expect(feed(guard, 30, GUARD_WINDOW - 1)).toBeNull();
    expect(guard.average).toBeNull();
  });
});
