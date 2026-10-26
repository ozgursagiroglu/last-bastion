/**
 * Adaptive quality (pure): watches the real interval between displayed frames and decides once, for good, that the
 * engine's built-in effects cost more than the machine can pay. The interval includes what the browser does after our
 * JS (rasterizing shadow glows and trails, compositing), which is where effects cost the most. To leave alone a
 * browser that simply runs slower (a 30 Hz cap, power saving), the guard first learns the device's own pace and only
 * reacts to frames clearly slower than that.
 */

/** Menu frames whose median interval is the device's own pace (level frames never set it). */
export const BASELINE_FRAMES = 90;
/** Fewest menu frames a pace is taken from when a level starts early; with fewer, the device is taken as 60 Hz. */
export const MIN_BASELINE_FRAMES = 20;
/** The pace assumed when a level starts before MIN_BASELINE_FRAMES menu frames were seen. */
export const DEFAULT_PACE_MS = 1000 / 60;
/** Most one frame may add to the moving average (ms): a single stall (a GC pause, a slow level load) is not a trend. */
export const MAX_SAMPLE_MS = 100;
/** Level frames in the moving average. */
export const GUARD_WINDOW = 120;
/** The threshold never goes below this (ms). */
export const GUARD_LIMIT_MS = 22;
/** The threshold is at least this many times the device's own pace. */
export const BASELINE_FACTOR = 1.35;
/** Milliseconds of real time the average must stay above the threshold before effects are dropped. */
export const GUARD_HOLD_MS = 3000;

export class QualityGuard {
  private readonly firstIntervals: number[] = [];
  private pace: number | null = null;
  private readonly samples = new Float64Array(GUARD_WINDOW);
  private count = 0;
  private next = 0;
  private sum = 0;
  /** Real milliseconds since the average last went above the threshold (0 while at or below it). */
  private slowFor = 0;
  private decided = false;

  /** True once effects have been dropped. */
  get dropped(): boolean {
    return this.decided;
  }

  /** The device's own frame interval (median of the first BASELINE_FRAMES), or null while it is being learned. */
  get baseline(): number | null {
    return this.pace;
  }

  /** The average interval (ms) above which level frames are too slow, or null while the baseline is being learned. */
  get threshold(): number | null {
    return this.pace === null ? null : Math.max(GUARD_LIMIT_MS, BASELINE_FACTOR * this.pace);
  }

  /** The moving average over the last GUARD_WINDOW level frames (ms), or null until the window is full. */
  get average(): number | null {
    return this.count < GUARD_WINDOW ? null : this.sum / GUARD_WINDOW;
  }

  /** Starts the level window and its hold from scratch (a new level); the baseline and a decision already made stand. */
  reset(): void {
    this.samples.fill(0);
    this.count = 0;
    this.next = 0;
    this.sum = 0;
    this.slowFor = 0;
  }

  /**
   * Feed the real interval (ms, uncapped) between the previous frame and this one; `level` tells whether a level was
   * on screen. Intervals ≤ 0 or not finite are skipped. Returns true exactly once: on the level frame the effects
   * should be dropped.
   */
  frame(intervalMs: number, level: boolean): boolean {
    if (this.decided || !(intervalMs > 0) || !Number.isFinite(intervalMs)) return false;
    if (!level) {
      this.learn(intervalMs);
      return false;
    }
    if (this.pace === null) this.settle();
    const sample = Math.min(intervalMs, MAX_SAMPLE_MS);
    this.sum += sample - (this.samples[this.next] ?? 0);
    this.samples[this.next] = sample;
    this.next = (this.next + 1) % GUARD_WINDOW;
    this.count = Math.min(GUARD_WINDOW, this.count + 1);
    const average = this.average;
    const threshold = this.threshold;
    this.slowFor = average !== null && threshold !== null && average > threshold ? this.slowFor + intervalMs : 0;
    if (this.slowFor < GUARD_HOLD_MS) return false;
    this.decided = true;
    return true;
  }

  private learn(intervalMs: number): void {
    if (this.pace !== null) return;
    this.firstIntervals.push(intervalMs);
    if (this.firstIntervals.length >= BASELINE_FRAMES) this.settle();
  }

  /** Fixes the pace from the menu frames seen so far, or DEFAULT_PACE_MS when there are too few of them. */
  private settle(): void {
    if (this.firstIntervals.length < MIN_BASELINE_FRAMES) {
      this.pace = DEFAULT_PACE_MS;
      return;
    }
    const sorted = [...this.firstIntervals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    this.pace = sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
  }
}
