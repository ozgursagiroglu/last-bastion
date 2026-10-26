/** Screen shake of the bg and world layers (pure): a damped sine started by boss deaths and leaks. */
import type { GameEvent, Vec2 } from '../game/types';

export interface ShakeKind {
  /** Seconds until the shake settles. */
  readonly duration: number;
  /** Peak offset in CSS pixels. */
  readonly amplitude: number;
}

export const BOSS_SHAKE: ShakeKind = { duration: 0.5, amplitude: 8 };
export const LEAK_SHAKE: ShakeKind = { duration: 0.25, amplitude: 3 };

/** Oscillations per second on each axis (different, so the board wobbles instead of sliding on a line). */
const FREQ_X = 23;
const FREQ_Y = 17;

const ZERO: Vec2 = { x: 0, y: 0 };

/** Offset `t` seconds into a shake: the sine under a quadratic decay, 0 outside 0..duration. */
export function shakeAt(kind: ShakeKind, t: number): Vec2 {
  if (!(t >= 0) || t >= kind.duration) return ZERO;
  const decay = (1 - t / kind.duration) ** 2;
  return {
    x: kind.amplitude * decay * Math.sin(2 * Math.PI * FREQ_X * t),
    y: kind.amplitude * decay * 0.6 * Math.sin(2 * Math.PI * FREQ_Y * t + Math.PI / 3),
  };
}

/** The shake one step of events asks for: a boss death beats a leak, nothing else shakes. */
export function shakeFor(events: readonly GameEvent[]): ShakeKind | null {
  let kind: ShakeKind | null = null;
  for (const e of events) {
    if (e.type === 'enemyKilled' && e.kind === 'boss') return BOSS_SHAKE;
    if (e.type === 'enemyLeaked') kind = LEAK_SHAKE;
  }
  return kind;
}

/** The running shake on a real-time clock. A new shake replaces the current one unless that one is still stronger. */
export class Shaker {
  private clock = 0;
  private current: { kind: ShakeKind; start: number } | null = null;

  /** Peak amplitude still left in the current shake. */
  private remaining(): number {
    const c = this.current;
    if (!c) return 0;
    const t = this.clock - c.start;
    return t >= c.kind.duration ? 0 : c.kind.amplitude * (1 - t / c.kind.duration) ** 2;
  }

  start(kind: ShakeKind): void {
    if (this.remaining() > kind.amplitude) return;
    this.current = { kind, start: this.clock };
  }

  advance(dt: number): void {
    this.clock += Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (this.current && this.clock - this.current.start >= this.current.kind.duration) this.current = null;
  }

  get offset(): Vec2 {
    const c = this.current;
    return c ? shakeAt(c.kind, this.clock - c.start) : ZERO;
  }
}
