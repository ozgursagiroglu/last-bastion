import { describe, expect, it } from 'vitest';
import { PAD_RADIUS, PATH_WIDTH, THEME_IDS } from '../../game/types';
import { distance, distanceToPaths, exitPoints } from './geometry';
import { SAMPLE_LEVELS } from './sampleLevels';

describe('SAMPLE_LEVELS', () => {
  it('has one playable-looking level per theme: cornered roads, 8–10 pads clear of the roads', () => {
    for (const theme of THEME_IDS) {
      const level = SAMPLE_LEVELS[theme];
      expect(level.theme).toBe(theme);
      expect(level.paths.length).toBeGreaterThanOrEqual(1);
      expect(level.paths.length).toBeLessThanOrEqual(2);
      for (const path of level.paths) expect(path.length).toBeGreaterThanOrEqual(3);
      expect(level.pads.length).toBeGreaterThanOrEqual(8);
      expect(level.pads.length).toBeLessThanOrEqual(10);
      for (const pad of level.pads) expect(distanceToPaths(pad, level.paths)).toBeGreaterThanOrEqual(PATH_WIDTH / 2 + PAD_RADIUS);
      level.pads.forEach((a, i) => level.pads.slice(i + 1).forEach((b) => expect(distance(a, b)).toBeGreaterThan(PAD_RADIUS * 2)));
    }
  });

  it('covers shared and separate exits', () => {
    expect(exitPoints(SAMPLE_LEVELS.desert.paths)).toHaveLength(1);
    expect(exitPoints(SAMPLE_LEVELS.volcano.paths)).toHaveLength(2);
  });
});
