import { describe, expect, it } from 'vitest';
import {
  BANNER_TIME,
  bannerPose,
  easeOutBack,
  easeOutCubic,
  FLASH_TIME,
  flashStrength,
  mixColor,
  overlayPose,
  pulseScale,
  SHAKE_TIME,
  shakeOffset,
  STAR_FIRST,
  STAR_GAP,
  starPose,
} from './anim';

describe('easings', () => {
  it('run from 0 to 1', () => {
    for (const ease of [easeOutCubic, easeOutBack]) {
      expect(ease(0)).toBeCloseTo(0);
      expect(ease(1)).toBeCloseTo(1);
    }
    expect(easeOutBack(0.6)).toBeGreaterThan(1);
  });
});

describe('bannerPose', () => {
  it('slides in, holds and fades out within BANNER_TIME', () => {
    expect(bannerPose(-0.1).visible).toBe(false);
    const entering = bannerPose(0.1);
    expect(entering.dx).toBeLessThan(0);
    expect(entering.opacity).toBeGreaterThan(0);
    expect(entering.opacity).toBeLessThan(1);
    expect(bannerPose(0.8)).toEqual({ visible: true, dx: 0, opacity: 1 });
    expect(bannerPose(BANNER_TIME - 0.05).opacity).toBeLessThan(0.2);
    expect(bannerPose(BANNER_TIME).visible).toBe(false);
  });
});

describe('feedback', () => {
  it('shakes and settles at SHAKE_TIME', () => {
    expect(Math.abs(shakeOffset(0.03))).toBeGreaterThan(1);
    expect(shakeOffset(SHAKE_TIME)).toBe(0);
  });

  it('flashes at full strength first, then fades out by FLASH_TIME', () => {
    expect(flashStrength(0.05)).toBe(1);
    expect(flashStrength(0.3)).toBeGreaterThan(0);
    expect(flashStrength(0.3)).toBeLessThan(1);
    expect(flashStrength(FLASH_TIME)).toBe(0);
  });

  it('mixes #rrggbb colors', () => {
    expect(mixColor('#ffffff', '#ff0000', 0)).toBe('#ffffff');
    expect(mixColor('#ffffff', '#ff0000', 1)).toBe('#ff0000');
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('pulses between 1 and a little more', () => {
    expect(pulseScale(0)).toBeCloseTo(1);
    expect(pulseScale(0.55)).toBeGreaterThan(1.05);
  });
});

describe('overlay and stars', () => {
  it('fades the dim in and settles the panel at scale 1', () => {
    expect(overlayPose(0).dim).toBe(0);
    expect(overlayPose(1)).toEqual({ dim: 1, scale: 1 });
  });

  it('lands the stars one by one, popping from large', () => {
    expect(starPose(STAR_FIRST - 0.01, 0).filled).toBe(false);
    const landing = starPose(STAR_FIRST + 0.02, 0);
    expect(landing.filled).toBe(true);
    expect(landing.scale).toBeGreaterThan(1.2);
    expect(starPose(STAR_FIRST + 0.02, 1).filled).toBe(false);
    expect(starPose(STAR_FIRST + STAR_GAP + 0.01, 1).filled).toBe(true);
    expect(starPose(5, 2)).toEqual({ filled: true, scale: 1 });
  });
});
