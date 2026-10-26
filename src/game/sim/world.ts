import { DIFFICULTY, ENEMIES, LEVEL_HP_GROWTH } from '../config';
import type {
  DamageType,
  Difficulty,
  EnemyKind,
  EnemyState,
  GameEvent,
  GameStatus,
  LevelDef,
  ProjectileKind,
  ProjectileState,
  SpawnGroup,
  TowerKind,
  TowerState,
  Vec2,
  WorldView,
} from '../types';
import { ENEMY_KINDS } from '../types';
import { buildPath, type PathInfo } from './path';

/** The mutable shape behind `Simulation.view`. */
export interface WorldState {
  level: LevelDef;
  difficulty: Difficulty;
  time: number;
  status: GameStatus;
  gold: number;
  lives: number;
  maxLives: number;
  waveIndex: number;
  waveCount: number;
  nextWaveIn: number | null;
  canCallWave: boolean;
  stars: 0 | 1 | 2 | 3;
  enemies: EnemyState[];
  towers: TowerState[];
  projectiles: ProjectileState[];
}

/** Per-kind enemy stats after difficulty and level scaling. */
export interface ScaledEnemy {
  maxHp: number;
  maxShield: number;
  speed: number;
  bounty: number;
}

export interface GroupRuntime {
  group: SpawnGroup;
  spawned: number;
  /** Steps the group clock has run since the wave started (it stops while the spawn cap is reached). */
  ticks: number;
}

export interface WaveRuntime {
  /** Groups of the most recently started wave that still have enemies to spawn. */
  groups: GroupRuntime[];
  /** The wave started inside this step's wave phase: its clock starts on the next step. */
  skipTick: boolean;
  /** Steps left in the countdown to the next wave, or null. */
  countdown: number | null;
}

/** What a projectile delivers, captured at launch so that upgrades or a sale do not change a shot in flight. */
export interface Payload {
  kind: ProjectileKind;
  source: TowerKind;
  damageType: DamageType;
  damage: number;
  splashRadius: number;
  airDamageMultiplier: number;
  hitsAir: boolean;
  hitsGround: boolean;
  speed: number;
  slow: { factor: number; duration: number } | null;
}

export interface World {
  readonly view: WorldState;
  readonly paths: readonly PathInfo[];
  readonly scaled: Readonly<Record<EnemyKind, ScaledEnemy>>;
  readonly enemyById: Map<number, EnemyState>;
  readonly aliveByKind: Record<EnemyKind, number>;
  readonly payloads: Map<number, Payload>;
  readonly waves: WaveRuntime;
  ticks: number;
  nextId: number;
  events: GameEvent[];
}

export const EPSILON = 1e-9;

export function scaleEnemies(levelId: number, difficulty: Difficulty): Record<EnemyKind, ScaledEnemy> {
  const diff = DIFFICULTY[difficulty];
  const hpScale = diff.hpMul * (1 + LEVEL_HP_GROWTH * (levelId - 1));
  const entries = ENEMY_KINDS.map((kind): [EnemyKind, ScaledEnemy] => {
    const def = ENEMIES[kind];
    return [
      kind,
      {
        maxHp: Math.round(def.hp * hpScale),
        maxShield: Math.round(def.shield * hpScale),
        speed: def.speed * diff.speedMul,
        bounty: Math.round(def.bounty * diff.bountyMul),
      },
    ];
  });
  return Object.fromEntries(entries) as Record<EnemyKind, ScaledEnemy>;
}

export function createWorld(level: LevelDef, difficulty: Difficulty): World {
  const diff = DIFFICULTY[difficulty];
  const view: WorldState = {
    level,
    difficulty,
    time: 0,
    status: 'ready',
    gold: Math.round(level.startGold * diff.goldMul),
    lives: diff.lives,
    maxLives: diff.lives,
    waveIndex: -1,
    waveCount: level.waves.length,
    nextWaveIn: null,
    canCallWave: true,
    stars: 0,
    enemies: [],
    towers: [],
    projectiles: [],
  };
  const aliveByKind = Object.fromEntries(ENEMY_KINDS.map((k) => [k, 0])) as Record<EnemyKind, number>;
  return {
    view,
    paths: level.paths.map(buildPath),
    scaled: scaleEnemies(level.id, difficulty),
    enemyById: new Map(),
    aliveByKind,
    payloads: new Map(),
    waves: { groups: [], skipTick: false, countdown: null },
    ticks: 0,
    nextId: 1,
    events: [],
  };
}

export function newId(world: World): number {
  return world.nextId++;
}

export function emit(world: World, event: GameEvent): void {
  world.events.push(event);
}

export function copyVec(v: Vec2): Vec2 {
  return { x: v.x, y: v.y };
}

export function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function pathOf(world: World, index: number): PathInfo {
  const path = world.paths[index];
  if (!path) throw new Error(`level ${world.view.level.id} has no path ${index}`);
  return path;
}

/** Compile-time check that the mutable state satisfies the public view contract. */
export const asView = (state: WorldState): WorldView => state;
