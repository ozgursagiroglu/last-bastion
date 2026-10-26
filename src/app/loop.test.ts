import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../game/types';
import { MAX_STEPS_PER_FRAME, planSteps } from './loop';

function run(frames: number, dt: number, speed: 1 | 2): number {
  let carry = 0;
  let steps = 0;
  for (let i = 0; i < frames; i++) {
    const plan = planSteps(carry, dt, speed, false);
    carry = plan.carry;
    steps += plan.steps;
  }
  return steps;
}

describe('planSteps', () => {
  it('runs one step per 60 Hz frame', () => {
    expect(planSteps(0, FIXED_DT, 1, false).steps).toBe(1);
    expect(run(60, 1 / 60, 1)).toBe(60);
  });

  it('accumulates short frames into the carry', () => {
    const first = planSteps(0, 1 / 120, 1, false);
    expect(first.steps).toBe(0);
    expect(first.carry).toBeCloseTo(1 / 120);
    const second = planSteps(first.carry, 1 / 120, 1, false);
    expect(second.steps).toBe(1);
    expect(second.carry).toBeCloseTo(0);
    expect(run(120, 1 / 120, 1)).toBe(60);
    expect(run(144, 1 / 144, 1)).toBe(60);
  });

  it('keeps the remainder of a frame as carry', () => {
    const plan = planSteps(0, 2.5 * FIXED_DT, 1, false);
    expect(plan.steps).toBe(2);
    expect(plan.carry).toBeCloseTo(0.5 * FIXED_DT);
    expect(plan.carry).toBeLessThan(FIXED_DT);
  });

  it('runs twice as many steps at speed 2', () => {
    expect(planSteps(0, FIXED_DT, 2, false).steps).toBe(2);
    expect(run(60, 1 / 60, 2)).toBe(120);
    expect(run(30, 1 / 30, 2)).toBe(120);
  });

  it('runs nothing and keeps the carry while paused', () => {
    expect(planSteps(0.01, 0.05, 2, true)).toEqual({ steps: 0, carry: 0.01 });
  });

  it('caps the steps of a long frame and drops the excess time', () => {
    expect(MAX_STEPS_PER_FRAME).toBe(8);
    expect(planSteps(0, 0.1, 2, false)).toEqual({ steps: MAX_STEPS_PER_FRAME, carry: 0 });
    expect(planSteps(FIXED_DT * 0.9, 9 * FIXED_DT, 1, false)).toEqual({ steps: MAX_STEPS_PER_FRAME, carry: 0 });
    const full = planSteps(FIXED_DT * 0.9, 8 * FIXED_DT, 1, false);
    expect(full.steps).toBe(8);
    expect(full.carry).toBeCloseTo(FIXED_DT * 0.9);
  });

  it('treats negative and non-finite dt as no time', () => {
    expect(planSteps(0, -1, 1, false)).toEqual({ steps: 0, carry: 0 });
    expect(planSteps(0, Number.NaN, 1, false)).toEqual({ steps: 0, carry: 0 });
  });
});
