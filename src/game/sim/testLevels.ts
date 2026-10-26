/** Synthetic levels and helpers for the sim tests (the real levels live in another lane). */
import { DIFFICULTY, ENEMIES, LEVEL_HP_GROWTH, TOWERS } from '../config';
import type {
  Difficulty,
  EnemyKind,
  EnemyState,
  GameEvent,
  LevelDef,
  Simulation,
  SpawnGroup,
  TowerKind,
  TowerLevel,
  TowerLevelStats,
  TowerState,
  WaveDef,
} from '../types';
import { TOWER_KINDS } from '../types';
import { build } from './economy';
import { spawnEnemy } from './enemies';
import { samplePath } from './path';
import { createWorld, pathOf, type World } from './world';

/** Tower stats straight from the config, so expectations follow balance changes. */
export function towerLevel(kind: TowerKind, level: TowerLevel = 1): TowerLevelStats {
  const stats = TOWERS[kind].levels[level - 1];
  if (!stats) throw new Error(`${kind} has no level ${level}`);
  return stats;
}

/** Expected enemy stats, computed from the config with the rule formulas (independently of world.ts). */
export function expectedEnemy(kind: EnemyKind, levelId = 1, difficulty: Difficulty = 'normal') {
  const def = ENEMIES[kind];
  const diff = DIFFICULTY[difficulty];
  const growth = 1 + LEVEL_HP_GROWTH * (levelId - 1);
  return {
    hp: Math.round(def.hp * diff.hpMul * growth),
    shield: Math.round(def.shield * diff.hpMul * growth),
    speed: def.speed * diff.speedMul,
    bounty: Math.round(def.bounty * diff.bountyMul),
  };
}

/** Physical damage after the enemy's armor. */
export function afterArmor(kind: EnemyKind, damage: number): number {
  return damage * (1 - ENEMIES[kind].armor);
}

/** Slow factor after the enemy's slowResist. */
export function resistedSlow(kind: EnemyKind, factor: number): number {
  return 1 - (1 - factor) * (1 - ENEMIES[kind].slowResist);
}

/** A straight road along y = 300 from x = 0 to x = 2000, with pads above and below it. */
export function makeLevel(overrides: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 1,
    name: 'Test Field',
    theme: 'meadow',
    paths: [
      [
        { x: 0, y: 300 },
        { x: 2000, y: 300 },
      ],
    ],
    pads: [
      { x: 500, y: 400 },
      { x: 800, y: 400 },
      { x: 1100, y: 200 },
      { x: 1400, y: 400 },
    ],
    startGold: 1000,
    towers: [...TOWER_KINDS],
    waves: [{ groups: [group('grunt', 1)] }],
    decorSeed: 1,
    ...overrides,
  };
}

export function group(enemy: EnemyKind, count: number, extra: Partial<SpawnGroup> = {}): SpawnGroup {
  return { enemy, count, interval: 1, delay: 0, path: 0, ...extra };
}

export function waves(...groups: SpawnGroup[][]): WaveDef[] {
  return groups.map((g) => ({ groups: g }));
}

export function makeWorld(level: LevelDef = makeLevel(), difficulty: Difficulty = 'normal'): World {
  return createWorld(level, difficulty);
}

/** Spawns an enemy and moves it to `distance` along its path. */
export function placeEnemy(world: World, kind: EnemyKind, distance: number, path = 0): EnemyState {
  const enemy = spawnEnemy(world, kind, path);
  enemy.distance = distance;
  enemy.heading = samplePath(pathOf(world, path), distance, enemy.pos);
  return enemy;
}

export function placeTower(world: World, pad: number, kind: TowerKind, level: TowerLevel = 1): TowerState {
  world.view.gold += 10_000;
  const result = build(world, pad, kind);
  world.view.gold -= 10_000;
  const tower = world.view.towers.find((t) => t.pad === pad);
  if (!result.ok || !tower) throw new Error(`could not build ${kind} on pad ${pad}`);
  tower.level = level;
  return tower;
}

/** Drains and returns the events collected so far. */
export function takeEvents(world: World): GameEvent[] {
  const events = world.events;
  world.events = [];
  return events;
}

export function ofType<T extends GameEvent['type']>(events: readonly GameEvent[], type: T): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

/** Steps `count` times and returns every event. */
export function stepMany(sim: Simulation, count: number): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < count; i++) events.push(...sim.step());
  return events;
}

/** Steps until `done` holds (checked after each step) or `limit` steps; returns every event. */
export function stepUntil(sim: Simulation, done: (events: GameEvent[]) => boolean, limit = 100_000): GameEvent[] {
  const all: GameEvent[] = [];
  for (let i = 0; i < limit; i++) {
    const events = sim.step();
    all.push(...events);
    if (done(events)) return all;
  }
  throw new Error(`condition not reached in ${limit} steps`);
}
