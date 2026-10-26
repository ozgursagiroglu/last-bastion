/** Timelines of the HUD's own animations, as pure functions of the seconds since they started. */

export const BANNER_TIME = 1.6;
export const SHAKE_TIME = 0.4;
export const FLASH_TIME = 0.4;
export const OVERLAY_IN_TIME = 0.25;
/** Seconds after the victory overlay opens when the first star lands, and between stars. */
export const STAR_FIRST = 0.45;
export const STAR_GAP = 0.4;
const STAR_POP = 0.3;
const PULSE_PERIOD = 1.1;

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function easeOutCubic(k: number): number {
  return 1 - (1 - clamp01(k)) ** 3;
}

export function easeOutBack(k: number): number {
  const c = 1.70158;
  const u = clamp01(k) - 1;
  return 1 + (c + 1) * u ** 3 + c * u ** 2;
}

export interface BannerPose {
  visible: boolean;
  /** Horizontal offset from the banner's resting place. */
  dx: number;
  opacity: number;
}

/** Slides in from the left (0.3 s), holds, then fades out drifting right. `t` starts at the wave start. */
export function bannerPose(t: number): BannerPose {
  if (t < 0 || t >= BANNER_TIME) return { visible: false, dx: 0, opacity: 0 };
  const enter = 0.3;
  const leave = 0.45;
  if (t < enter) {
    const k = easeOutCubic(t / enter);
    return { visible: true, dx: -140 * (1 - k), opacity: k };
  }
  const out = (t - (BANNER_TIME - leave)) / leave;
  if (out <= 0) return { visible: true, dx: 0, opacity: 1 };
  return { visible: true, dx: 60 * out * out, opacity: 1 - out };
}

/** Horizontal shake offset in px, decaying to 0 at SHAKE_TIME. */
export function shakeOffset(t: number): number {
  if (t < 0 || t >= SHAKE_TIME) return 0;
  return Math.sin(t * Math.PI * 2 * 9) * 8 * (1 - t / SHAKE_TIME);
}

/** Breathing scale of the START button. */
export function pulseScale(t: number): number {
  return 1 + 0.07 * (0.5 - 0.5 * Math.cos((t / PULSE_PERIOD) * Math.PI * 2));
}

function hexChannel(color: string, i: number): number {
  return parseInt(color.slice(1 + i * 2, 3 + i * 2), 16);
}

/** '#rrggbb' between a (k = 0) and b (k = 1). */
export function mixColor(a: string, b: string, k: number): string {
  const t = clamp01(k);
  let out = '#';
  for (let i = 0; i < 3; i++) {
    const v = Math.round(hexChannel(a, i) + (hexChannel(b, i) - hexChannel(a, i)) * t);
    out += v.toString(16).padStart(2, '0');
  }
  return out;
}

/** 0..1 strength of the red gold-counter flash: full for the first 0.12 s, then fading out. */
export function flashStrength(t: number): number {
  if (t < 0 || t >= FLASH_TIME) return 0;
  const hold = 0.12;
  return t < hold ? 1 : 1 - (t - hold) / (FLASH_TIME - hold);
}

/** Star i of the victory overlay: hidden (empty star) before it lands, then popping from large to its size. */
export function starPose(t: number, i: number): { filled: boolean; scale: number } {
  const start = STAR_FIRST + i * STAR_GAP;
  if (t < start) return { filled: false, scale: 1 };
  const k = (t - start) / STAR_POP;
  return { filled: true, scale: k >= 1 ? 1 : 1.9 - 0.9 * easeOutBack(k) };
}

/** Overlays fade the dim in and pop the panel from 0.85 to 1. */
export function overlayPose(t: number): { dim: number; scale: number } {
  const k = clamp01(t / OVERLAY_IN_TIME);
  return { dim: k, scale: 0.85 + 0.15 * easeOutBack(k) };
}
