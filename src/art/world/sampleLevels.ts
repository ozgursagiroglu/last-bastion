/**
 * Synthetic levels, one per theme, for the world gallery and tests (the real levels live in src/game/levels).
 * They cover roads with corners, two spawns sharing an exit (desert) and two exits (volcano).
 */
import type { LevelDef, ThemeId, Vec2 } from '../../game/types';

function level(id: number, theme: ThemeId, paths: [number, number][][], pads: [number, number][], decorSeed: number): LevelDef {
  const v = ([x, y]: [number, number]): Vec2 => ({ x, y });
  return { id, name: `Sample ${theme}`, theme, paths: paths.map((p) => p.map(v)), pads: pads.map(v), startGold: 200, towers: ['rifle'], waves: [], decorSeed };
}

export const SAMPLE_LEVELS: Readonly<Record<ThemeId, LevelDef>> = {
  meadow: level(
    101,
    'meadow',
    [[[-20, 180], [320, 180], [320, 470], [720, 470], [720, 300], [1170, 300]]],
    [[200, 260], [420, 300], [230, 400], [520, 380], [620, 580], [820, 400], [900, 200], [1000, 400], [600, 240]],
    1234,
  ),
  desert: level(
    102,
    'desert',
    [
      [[1300, 160], [900, 160], [900, 400], [500, 400], [500, 250], [130, 250]],
      [[1300, 600], [700, 600], [700, 400], [500, 400], [500, 250], [130, 250]],
    ],
    [[1000, 260], [800, 280], [800, 500], [600, 320], [400, 330], [300, 160], [250, 350], [1100, 500], [600, 520]],
    2024,
  ),
  snow: level(
    103,
    'snow',
    [[[380, -20], [380, 260], [160, 260], [160, 520], [620, 520], [620, 300], [950, 300], [950, 560], [1180, 560]]],
    [[280, 170], [260, 400], [480, 420], [520, 240], [720, 400], [790, 200], [850, 440], [1060, 440], [380, 620]],
    77,
  ),
  volcano: level(
    104,
    'volcano',
    [
      [[-20, 420], [260, 420], [260, 200], [640, 200], [640, 380], [1170, 380]],
      [[700, 740], [700, 580], [1170, 580]],
    ],
    [[160, 320], [360, 300], [450, 300], [760, 280], [900, 480], [560, 480], [820, 680], [1060, 480], [450, 120]],
    9001,
  ),
};
