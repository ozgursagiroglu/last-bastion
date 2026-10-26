import type { EnemyKind, ThemeId, TowerKind } from '../types';

/** One row of the level design table: what each LevelDef must match. */
export interface LevelSpec {
  name: string;
  theme: ThemeId;
  roads: number;
  pads: number;
  waves: number;
  towers: readonly TowerKind[];
  /** Kinds this level introduces → the wave (1-based) they first appear in. Kinds of earlier levels may appear in any wave. */
  introduces: Partial<Readonly<Record<EnemyKind, number>>>;
  /** Where bosses appear (each boss is a group of count 1). `alone`: the boss is the last group and spawns after everything else. */
  bosses?: { wave: number; count: number; alone?: boolean };
  /** Starting gold on normal difficulty, tuned with the balance bot (src/game/balance). */
  startGold: number;
}

const BASIC = ['rifle', 'cannon'] as const satisfies readonly TowerKind[];
const WITH_FROST = [...BASIC, 'frost'] as const satisfies readonly TowerKind[];
const WITH_TESLA = [...WITH_FROST, 'tesla'] as const satisfies readonly TowerKind[];
const ALL_TOWERS = [...WITH_TESLA, 'rocket'] as const satisfies readonly TowerKind[];

/** The design table, indexed by level id − 1. */
export const LEVEL_SPECS: readonly LevelSpec[] = [
  { name: 'Green Meadow', theme: 'meadow', roads: 1, pads: 8, waves: 6, towers: BASIC, introduces: { grunt: 1, runner: 4 }, startGold: 250 },
  { name: 'River Bend', theme: 'meadow', roads: 1, pads: 9, waves: 7, towers: WITH_FROST, introduces: { brute: 5 }, startGold: 270 },
  { name: 'Twin Woods', theme: 'meadow', roads: 2, pads: 10, waves: 8, towers: WITH_FROST, introduces: { flyer: 3 }, startGold: 300 },
  { name: 'Dune Road', theme: 'desert', roads: 1, pads: 10, waves: 9, towers: WITH_TESLA, introduces: { shield: 4 }, startGold: 320 },
  {
    name: 'Oasis Siege',
    theme: 'desert',
    roads: 2,
    pads: 12,
    waves: 10,
    towers: WITH_TESLA,
    introduces: {},
    bosses: { wave: 10, count: 1, alone: true },
    startGold: 450,
  },
  { name: 'Canyon Pass', theme: 'desert', roads: 1, pads: 12, waves: 10, towers: ALL_TOWERS, introduces: {}, startGold: 380 },
  { name: 'Frozen Lake', theme: 'snow', roads: 2, pads: 13, waves: 11, towers: ALL_TOWERS, introduces: {}, startGold: 600 },
  { name: 'Glacier Gate', theme: 'snow', roads: 1, pads: 14, waves: 12, towers: ALL_TOWERS, introduces: {}, bosses: { wave: 12, count: 1 }, startGold: 420 },
  { name: 'Ember Fields', theme: 'volcano', roads: 2, pads: 14, waves: 13, towers: ALL_TOWERS, introduces: {}, bosses: { wave: 13, count: 1 }, startGold: 700 },
  { name: 'The Last Bastion', theme: 'volcano', roads: 3, pads: 16, waves: 15, towers: ALL_TOWERS, introduces: {}, bosses: { wave: 15, count: 2 }, startGold: 700 },
];

/** The design row of a level id, or undefined for an id outside 1..10. */
export function specOf(id: number): LevelSpec | undefined {
  return Number.isInteger(id) ? LEVEL_SPECS[id - 1] : undefined;
}

/** Non-boss kinds a level may use: everything introduced by it or an earlier level. */
export function kindsOf(id: number): EnemyKind[] {
  const kinds = new Set<EnemyKind>();
  LEVEL_SPECS.slice(0, Math.max(0, id)).forEach((spec) => {
    for (const kind of Object.keys(spec.introduces) as EnemyKind[]) kinds.add(kind);
  });
  return [...kinds];
}

/** Target base HP of wave k (1-based) of level n before the sim's scaling; every wave stays within ±25 % of it. */
export function targetWaveHp(levelId: number, wave: number): number {
  return 360 * 1.16 ** (wave - 1) * (1 + 0.15 * (levelId - 1));
}

/** Spawn interval range (seconds) per kind. A boss is a group of count 1, so it has no range. */
export const SPAWN_INTERVALS: Readonly<Record<Exclude<EnemyKind, 'boss'>, readonly [number, number]>> = {
  grunt: [1.0, 1.4],
  runner: [0.6, 0.9],
  brute: [2.5, 4],
  flyer: [1.0, 1.5],
  shield: [1.4, 2],
};
