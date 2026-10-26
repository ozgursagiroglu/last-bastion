import { describe, expect, it } from 'vitest';
import { OUTLINE, PALETTE } from '../palette';
import { CAST_SHADOW, CONTACT_SHADOW, glowFill, HIGHLIGHT, litBall, outline, rampFill } from './paint';

describe('paint shorthands', () => {
  it('outlines in the shared dark brown with round joins', () => {
    expect(outline()).toEqual({ color: OUTLINE, width: 2.5, join: 'round', cap: 'round' });
    expect(outline(3).width).toBe(3);
  });

  it('fills ramps top → bottom and lights balls from the top-left', () => {
    expect(rampFill(PALETTE.wood)).toMatchObject({ type: 'LinearGradient', start: [0.5, 0], end: [0.5, 1] });
    expect(rampFill(PALETTE.wood).stops?.map((s) => s.color)).toEqual([PALETTE.wood.light, PALETTE.wood.dark]);
    expect(litBall(PALETTE.gold, '#ffffff')).toMatchObject({ type: 'RadialGradient', center: [0.35, 0.3] });
    expect(litBall(PALETTE.gold, '#ffffff').stops).toHaveLength(3);
  });

  it('keeps shadows and highlights translucent', () => {
    expect(CONTACT_SHADOW.opacity).toBeGreaterThanOrEqual(0.25);
    expect(CONTACT_SHADOW.opacity).toBeLessThanOrEqual(0.35);
    expect(HIGHLIGHT.opacity).toBeGreaterThanOrEqual(0.25);
    expect(HIGHLIGHT.opacity).toBeLessThanOrEqual(0.35);
    expect(CAST_SHADOW.opacity).toBeLessThan(1);
    expect(glowFill('#ff0000', 0.5).stops).toEqual([
      { offset: 0, color: '#ff0000', opacity: 0.5 },
      { offset: 1, color: '#ff0000', opacity: 0 },
    ]);
  });
});
