import { describe, expect, it } from 'vitest';
import type { LevelDef, SpawnGroup, Vec2, WaveDef } from '../types';
import { getLevel, LEVELS } from './index';
import { HUD_ZONES, validateLevel, validateLevels } from './validate';

function at<T>(items: readonly T[], i: number): T {
  const item = items[i];
  if (item === undefined) throw new Error(`no item ${i}`);
  return item;
}

/** A copy of a real (valid) level with one thing broken. */
function broken(id: number, mutate: (level: LevelDef) => void): LevelDef {
  const level = structuredClone(getLevel(id));
  mutate(level);
  return level;
}

const path0 = (level: LevelDef): Vec2[] => at(level.paths, 0);
const wave = (level: LevelDef, n: number): WaveDef => at(level.waves, n - 1);
const group = (level: LevelDef, n: number, g: number): SpawnGroup => at(wave(level, n).groups, g);

function expectError(level: LevelDef, pattern: RegExp): void {
  expect(validateLevel(level)).toContainEqual(expect.stringMatching(pattern));
}

describe('HUD_ZONES', () => {
  it('are the top strip and the bottom-right corner', () => {
    expect(HUD_ZONES).toEqual([
      { x: 0, y: 0, w: 1280, h: 70 },
      { x: 1080, y: 590, w: 200, h: 130 },
    ]);
  });
});

describe('validateLevel', () => {
  it('returns no errors for an untouched copy', () => {
    expect(validateLevel(broken(1, () => {}))).toEqual([]);
  });

  describe('roads', () => {
    it('rejects a level without roads and a road without an exit', () => {
      expectError(broken(1, (l) => (l.paths = [])), /no road/);
      expectError(broken(1, (l) => (l.paths = [[{ x: -40, y: 220 }]])), /path 0 needs at least 2 points/);
    });

    it('rejects a spawn on the top edge', () => {
      expectError(broken(1, (l) => (path0(l)[0] = { x: 120, y: -30 })), /path 0 spawn \(120, -30\) is on the top edge/);
    });

    it('rejects a spawn inside the board', () => {
      expectError(broken(1, (l) => (path0(l)[0] = { x: 60, y: 220 })), /path 0 spawn \(60, 220\) is not on or outside the left, right or bottom edge/);
    });

    it('rejects a spawn far outside the board', () => {
      expectError(broken(1, (l) => (path0(l)[0] = { x: -300, y: 220 })), /spawn \(-300, 220\) is more than 80 px outside/);
    });

    it('rejects a point outside the board or above y = 90', () => {
      expectError(broken(1, (l) => (path0(l)[1] = { x: 240, y: 80 })), /point 1 \(240, 80\) is outside the board or above y = 90/);
      expectError(broken(1, (l) => (path0(l)[4] = { x: 1300, y: 520 })), /point 4 \(1300, 520\) is outside the board/);
    });

    it('rejects consecutive points closer than 60 px', () => {
      expectError(broken(1, (l) => path0(l).splice(2, 0, { x: 270, y: 220 })), /points 1 and 2 are 30\.0 px apart \(minimum 60\)/);
    });

    it('rejects a hairpin turn over 120°', () => {
      expectError(broken(1, (l) => (path0(l)[2] = { x: 100, y: 260 })), /path 0 turns 164\.1° at point 1 \(240, 220\) \(hairpin/);
    });

    it('rejects a road segment through a HUD zone', () => {
      expectError(broken(1, (l) => (path0(l)[5] = { x: 1150, y: 650 })), /path 0 segment 4 \(540, 520\)–\(1150, 650\) passes through HUD zone 1/);
      expectError(broken(1, (l) => (path0(l)[0] = { x: -40, y: 40 })), /segment 0 .* passes through HUD zone 0/);
    });

    it('rejects an exit outside x ∈ [60, 1220], y ∈ [110, 660]', () => {
      expectError(broken(1, (l) => (path0(l)[9] = { x: 1240, y: 240 })), /path 0 exit \(1240, 240\) is outside x ∈ \[60, 1220\]/);
    });
  });

  describe('merging roads', () => {
    it('rejects merging roads whose exits are close but not identical', () => {
      expectError(
        broken(3, (l) => (at(l.paths, 1)[7] = { x: 1170, y: 335 })),
        /paths 0 and 1 end 5\.0 px apart: merging paths must end on the identical exit/,
      );
    });

    it('rejects a road that joins another without sharing identical points from there on', () => {
      expectError(
        broken(3, (l) => (at(l.paths, 1)[3] = { x: 680, y: 400 })),
        /path 1 point 3 \(680, 400\) joins path 0 without sharing identical points from there to the exit/,
      );
    });

    it('rejects identical roads', () => {
      expectError(broken(3, (l) => (l.paths[1] = structuredClone(path0(l)))), /paths 0 and 1 are identical/);
    });
  });

  describe('pads', () => {
    it('rejects a pad outside the pad area', () => {
      expectError(broken(1, (l) => (l.pads[0] = { x: 40, y: 300 })), /pad 0 \(40, 300\) is outside x ∈ \[50, 1230\], y ∈ \[100, 680\]/);
    });

    it('rejects a pad inside a HUD zone', () => {
      expectError(broken(1, (l) => (l.pads[4] = { x: 1150, y: 650 })), /pad 4 \(1150, 650\) is inside HUD zone 1/);
    });

    it('rejects a pad closer than 68 px to a road', () => {
      expectError(broken(1, (l) => (l.pads[0] = { x: 160, y: 270 })), /pad 0 \(160, 270\) is 50\.0 px from a road \(minimum 68\)/);
    });

    it('rejects a pad more than 140 px from every road', () => {
      expectError(broken(1, (l) => (l.pads[4] = { x: 650, y: 670 })), /pad 4 \(650, 670\) is 150\.0 px from the nearest road \(maximum 140\)/);
    });

    it('rejects a pad closer than 90 px to an exit', () => {
      expectError(broken(1, (l) => (l.pads[7] = { x: 1170, y: 320 })), /pad 7 \(1170, 320\) is 80\.0 px from the exit \(1170, 240\) \(minimum 90\)/);
    });

    it('rejects pads closer than 76 px to each other', () => {
      expectError(broken(1, (l) => (l.pads[1] = { x: 160, y: 370 })), /pads 0 and 1 are 70\.0 px apart \(minimum 76\)/);
    });
  });

  describe('waves', () => {
    it('rejects a group on a road that does not exist', () => {
      expectError(broken(1, (l) => (group(l, 1, 0).path = 1)), /wave 1 group 0 \(grunt\) uses path 1, which does not exist/);
    });

    it('rejects a count below 1', () => {
      expectError(broken(1, (l) => (group(l, 2, 0).count = 0)), /wave 2 group 0 \(grunt\) has count 0/);
    });

    it('rejects an interval that is not positive', () => {
      expectError(broken(1, (l) => (group(l, 2, 0).interval = 0)), /wave 2 group 0 \(grunt\) has interval 0 \(must be > 0\)/);
    });

    it('rejects a negative delay', () => {
      expectError(broken(1, (l) => (group(l, 3, 1).delay = -1)), /wave 3 group 1 \(grunt\) has delay -1/);
    });

    it('rejects a wave without groups', () => {
      expectError(broken(1, (l) => (wave(l, 2).groups = [])), /wave 2 has no group/);
    });

    it('rejects a wave that spawns past 45 s', () => {
      expectError(broken(1, (l) => (group(l, 4, 1).delay = 42)), /wave 4 group 1 \(runner\) spawns its last enemy at 45\.6 s \(maximum 45 s\)/);
    });
  });

  describe('design table', () => {
    it('rejects an id outside 1..10', () => {
      expectError(broken(1, (l) => (l.id = 11)), /id 11 is not a level of the design table/);
    });

    it('rejects a wrong name or theme', () => {
      expectError(broken(1, (l) => (l.name = 'Meadow')), /name is 'Meadow', the table says 'Green Meadow'/);
      expectError(broken(1, (l) => (l.theme = 'snow')), /theme is snow, the table says meadow/);
    });

    it('rejects a wrong road, pad or wave count', () => {
      expectError(broken(2, (l) => l.paths.push(structuredClone(at(getLevel(1).paths, 0)))), /has 2 road\(s\), the table says 1/);
      expectError(broken(1, (l) => l.pads.pop()), /has 7 pads, the table says 8/);
      expectError(broken(1, (l) => l.waves.pop()), /has 5 waves, the table says 6/);
    });

    it('rejects towers that differ from the table', () => {
      expectError(broken(1, (l) => l.towers.push('frost')), /towers are \[rifle, cannon, frost\], the table says \[rifle, cannon\]/);
      expectError(broken(1, (l) => (l.towers = ['rifle', 'rifle'])), /towers are \[rifle, rifle\]/);
    });

    it('rejects a kind before its introduction wave', () => {
      expectError(
        broken(1, (l) => wave(l, 2).groups.push({ enemy: 'runner', count: 2, interval: 0.8, delay: 0, path: 0 })),
        /runner first appears in wave 2, the table introduces it in wave 4/,
      );
    });

    it('rejects a kind introduced late', () => {
      expectError(
        broken(1, (l) => (wave(l, 4).groups = wave(l, 4).groups.filter((g) => g.enemy !== 'runner'))),
        /runner first appears in wave 5, the table introduces it in wave 4/,
      );
    });

    it('rejects a kind the level does not have yet', () => {
      expectError(
        broken(1, (l) => wave(l, 6).groups.push({ enemy: 'brute', count: 1, interval: 3, delay: 0, path: 0 })),
        /wave 6 uses brute, which level 1 does not have yet/,
      );
    });

    it('rejects a level where a listed kind never appears', () => {
      expectError(
        broken(6, (l) => l.waves.forEach((w) => (w.groups = w.groups.map((g) => (g.enemy === 'runner' ? { ...g, enemy: 'grunt' } : g))))),
        /runner never appears/,
      );
    });

    it('rejects a boss in a level without one', () => {
      expectError(
        broken(6, (l) => wave(l, 10).groups.push({ enemy: 'boss', count: 1, interval: 1, delay: 30, path: 0 })),
        /wave 10 has a boss, but level 6 has none/,
      );
    });

    it('rejects a boss in the wrong wave', () => {
      expectError(
        broken(8, (l) => {
          const boss = wave(l, 12).groups.pop();
          if (boss) wave(l, 11).groups.push(boss);
        }),
        /wave 11 has a boss; bosses belong in wave 12 only/,
      );
    });

    it('rejects a boss group of more than one', () => {
      expectError(broken(8, (l) => (group(l, 12, 2).count = 2)), /wave 12 group 2 is a boss group of count 2/);
    });

    it('rejects the wrong number of bosses', () => {
      expectError(broken(10, (l) => wave(l, 15).groups.pop()), /level has 1 boss\(es\), the table wants 2 in wave 15/);
    });

    it('rejects a boss that does not come alone at the end when the table says so', () => {
      expectError(broken(5, (l) => (group(l, 10, 1).delay = 1)), /wave 10: the boss spawns at 1\.0 s, before the other groups finish \(2\.4 s\)/);
      expectError(broken(5, (l) => wave(l, 10).groups.reverse()), /wave 10: the boss must be the last group/);
    });

    it('rejects a decor seed that is not an integer', () => {
      expectError(broken(1, (l) => (l.decorSeed = 0.5)), /decorSeed 0\.5 is not an integer/);
    });
  });
});

describe('validateLevels', () => {
  it('accepts the real levels', () => {
    expect(validateLevels(LEVELS)).toEqual([]);
  });

  it('rejects ids out of order and shared decor seeds', () => {
    const swapped = [at(LEVELS, 1), at(LEVELS, 0)];
    expect(validateLevels(swapped)).toContainEqual(expect.stringMatching(/LEVELS\[0\] has id 2, expected 1/));
    const twins = [at(LEVELS, 0), { ...at(LEVELS, 1), decorSeed: at(LEVELS, 0).decorSeed }];
    expect(validateLevels(twins)).toContainEqual(expect.stringMatching(/levels 1 and 2 share decorSeed 1847/));
  });

  it('prefixes per-level messages with the level id', () => {
    expect(validateLevels([broken(1, (l) => l.pads.pop())])).toContainEqual('level 1: has 7 pads, the table says 8');
  });
});
