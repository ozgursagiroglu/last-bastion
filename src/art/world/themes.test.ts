import { describe, expect, it } from 'vitest';
import { THEME_IDS } from '../../game/types';
import { THEMES } from './themes';

const HEX6 = /^#[0-9a-f]{6}$/i;

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

describe('THEMES', () => {
  it('defines every theme with #rrggbb colors', () => {
    for (const id of THEME_IDS) {
      const t = THEMES[id];
      const colors = [t.ground.light, t.ground.dark, t.pad.light, t.pad.dark, t.accent, ...Object.values(t.road)];
      for (const c of colors) expect(c).toMatch(HEX6);
    }
  });

  it('runs ramps light → dark and gives roads a darker edge', () => {
    for (const id of THEME_IDS) {
      const t = THEMES[id];
      expect(luminance(t.ground.light)).toBeGreaterThan(luminance(t.ground.dark));
      expect(luminance(t.pad.light)).toBeGreaterThan(luminance(t.pad.dark));
      expect(luminance(t.road.edge)).toBeLessThan(luminance(t.road.fill));
      expect(luminance(t.road.center)).toBeGreaterThan(luminance(t.road.fill));
    }
  });
});
