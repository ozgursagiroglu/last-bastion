/** Fixed-step accounting between real frame time and simulation steps. Pure. */
import { FIXED_DT } from '../game/types';

export interface StepPlan {
  steps: number;
  /** Game seconds not yet simulated, carried into the next frame (always < FIXED_DT). */
  carry: number;
}

/** Frames that would need more steps than this drop the excess time instead of spiralling. */
export const MAX_STEPS_PER_FRAME = 8;

/** Rounding slack, so that 60 frames of 1/60 s give 60 steps rather than 59. */
const EPSILON = 1e-9;

/** Sim steps for this frame: (carry + realDt × speed) / FIXED_DT, at most MAX_STEPS_PER_FRAME; 0 while paused. */
export function planSteps(carry: number, realDt: number, speed: 1 | 2, paused: boolean): StepPlan {
  const pending = Math.max(0, carry);
  if (paused) return { steps: 0, carry: pending };
  const total = pending + (Number.isFinite(realDt) ? Math.max(0, realDt) : 0) * speed;
  const steps = Math.floor(total / FIXED_DT + EPSILON);
  if (steps > MAX_STEPS_PER_FRAME) return { steps: MAX_STEPS_PER_FRAME, carry: 0 };
  return { steps, carry: Math.max(0, total - steps * FIXED_DT) };
}
