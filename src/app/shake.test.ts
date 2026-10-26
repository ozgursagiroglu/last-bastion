import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../game/types';
import { BOSS_SHAKE, LEAK_SHAKE, Shaker, shakeAt, shakeFor } from './shake';

const at = { x: 0, y: 0 };
const bossKilled: GameEvent = { type: 'enemyKilled', id: 1, kind: 'boss', pos: at, bounty: 50 };
const gruntKilled: GameEvent = { type: 'enemyKilled', id: 2, kind: 'grunt', pos: at, bounty: 5 };
const leaked: GameEvent = { type: 'enemyLeaked', id: 3, kind: 'grunt', livesLost: 1 };

function peak(kind: typeof BOSS_SHAKE, from: number, to: number): number {
  let max = 0;
  for (let t = from; t < to; t += 0.001) {
    const o = shakeAt(kind, t);
    max = Math.max(max, Math.abs(o.x), Math.abs(o.y));
  }
  return max;
}

describe('shakeAt', () => {
  it('is a damped sine bounded by the amplitude and gone after the duration', () => {
    expect(BOSS_SHAKE).toEqual({ duration: 0.5, amplitude: 8 });
    expect(LEAK_SHAKE).toEqual({ duration: 0.25, amplitude: 3 });
    expect(peak(BOSS_SHAKE, 0, 0.1)).toBeGreaterThan(6);
    expect(peak(BOSS_SHAKE, 0, 0.5)).toBeLessThanOrEqual(8);
    expect(peak(BOSS_SHAKE, 0.4, 0.5)).toBeLessThan(0.4);
    expect(peak(LEAK_SHAKE, 0, 0.25)).toBeLessThanOrEqual(3);
    expect(peak(LEAK_SHAKE, 0, 0.05)).toBeGreaterThan(2);
    expect(shakeAt(BOSS_SHAKE, 0.5)).toEqual({ x: 0, y: 0 });
    expect(shakeAt(BOSS_SHAKE, -0.1)).toEqual({ x: 0, y: 0 });
    expect(shakeAt(BOSS_SHAKE, Number.NaN)).toEqual({ x: 0, y: 0 });
  });

  it('changes sign, so the board wobbles around its place', () => {
    const xs = Array.from({ length: 50 }, (_, i) => shakeAt(BOSS_SHAKE, i * 0.004).x);
    expect(Math.min(...xs)).toBeLessThan(-1);
    expect(Math.max(...xs)).toBeGreaterThan(1);
  });
});

describe('shakeFor', () => {
  it('shakes hard on a boss death, lightly on a leak, not otherwise', () => {
    expect(shakeFor([])).toBeNull();
    expect(shakeFor([gruntKilled])).toBeNull();
    expect(shakeFor([leaked])).toBe(LEAK_SHAKE);
    expect(shakeFor([leaked, bossKilled])).toBe(BOSS_SHAKE);
  });
});

describe('Shaker', () => {
  it('runs a shake on its clock and settles at zero', () => {
    const s = new Shaker();
    expect(s.offset).toEqual({ x: 0, y: 0 });
    s.start(BOSS_SHAKE);
    s.advance(0.013);
    expect(Math.hypot(s.offset.x, s.offset.y)).toBeGreaterThan(1);
    s.advance(0.5);
    expect(s.offset).toEqual({ x: 0, y: 0 });
  });

  it('keeps a stronger shake over a weaker one, and lets a weak one replace a faded one', () => {
    const s = new Shaker();
    s.start(BOSS_SHAKE);
    s.advance(0.05);
    s.start(LEAK_SHAKE);
    s.advance(0.3);
    expect(s.offset).not.toEqual({ x: 0, y: 0 });
    s.advance(0.1);
    s.start(LEAK_SHAKE);
    s.advance(0.1);
    expect(s.offset).not.toEqual({ x: 0, y: 0 });
    s.advance(0.16);
    expect(s.offset).toEqual({ x: 0, y: 0 });
  });
});
