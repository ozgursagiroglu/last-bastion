/**
 * Shared game contracts. Every module (sim, levels, art, render, ui, app) codes against these types.
 * Coordinates are design-space pixels on a DESIGN_WIDTH × DESIGN_HEIGHT board (y points down).
 * Angles are radians unless a name says otherwise.
 */

export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;
/** Simulation tick in seconds. `Simulation.step()` always advances by exactly this much. */
export const FIXED_DT = 1 / 60;
/** Road width in design px. Visual and logical: build pads must stay clear of it. */
export const PATH_WIDTH = 56;
/** Build pad radius in design px. */
export const PAD_RADIUS = 34;
/** The sim never has more live enemies of one kind than this; spawns wait for a free slot. Renderer pools rely on it. */
export const MAX_ALIVE_PER_KIND = 40;
/** The sim never has more live projectiles than this; a projectile tower holds its shot while the cap is reached. */
export const MAX_PROJECTILES = 96;

export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const satisfies readonly Difficulty[];

export type TowerKind = 'rifle' | 'cannon' | 'frost' | 'tesla' | 'rocket';
export const TOWER_KINDS = ['rifle', 'cannon', 'frost', 'tesla', 'rocket'] as const satisfies readonly TowerKind[];
export type TowerLevel = 1 | 2 | 3;

export type EnemyKind = 'grunt' | 'runner' | 'brute' | 'flyer' | 'shield' | 'boss';
export const ENEMY_KINDS = ['grunt', 'runner', 'brute', 'flyer', 'shield', 'boss'] as const satisfies readonly EnemyKind[];

export type ProjectileKind = 'cannonball' | 'iceShard' | 'rocket';
export const PROJECTILE_KINDS = ['cannonball', 'iceShard', 'rocket'] as const satisfies readonly ProjectileKind[];

export type ThemeId = 'meadow' | 'desert' | 'snow' | 'volcano';
export const THEME_IDS = ['meadow', 'desert', 'snow', 'volcano'] as const satisfies readonly ThemeId[];

export type DamageType = 'physical' | 'energy';

export interface Vec2 {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Level data (src/game/levels)
// ---------------------------------------------------------------------------

export interface SpawnGroup {
  enemy: EnemyKind;
  count: number;
  /** Seconds between two spawns of this group. */
  interval: number;
  /** Seconds after the wave starts before this group's first spawn. */
  delay: number;
  /** Index into `LevelDef.paths`. */
  path: number;
}

export interface WaveDef {
  groups: SpawnGroup[];
}

export interface LevelDef {
  /** 1..10 */
  id: number;
  /** English display name. */
  name: string;
  theme: ThemeId;
  /**
   * One or more polylines in design coords. The first point is the spawn point
   * (on or just outside a screen edge), the last point is the exit (the castle gate).
   */
  paths: Vec2[][];
  /** Build pad centers. */
  pads: Vec2[];
  /** Starting gold on normal difficulty (scaled by `DifficultyDef.goldMul`). */
  startGold: number;
  /** Tower kinds buildable in this level. */
  towers: TowerKind[];
  waves: WaveDef[];
  /** Seed for decorative scatter (art only, never affects gameplay). */
  decorSeed: number;
}

// ---------------------------------------------------------------------------
// Static stats (src/game/config)
// ---------------------------------------------------------------------------

export interface TowerLevelStats {
  /** Build cost for level 1, upgrade cost for levels 2 and 3. */
  cost: number;
  range: number;
  damage: number;
  /** Seconds between shots. */
  fireInterval: number;
  /** Cannon and rocket: every valid enemy within this radius of the impact takes full damage. */
  splashRadius?: number;
  /** Frost: `factor` is the speed multiplier while slowed (0.65 = 35% slower). */
  slow?: { factor: number; duration: number };
  /** Tesla: total targets hit (including the first), jump range from the previous target, damage lost per jump. */
  chain?: { targets: number; range: number; falloff: number };
}

/**
 * How a tower delivers damage.
 * - hitscan: instant damage to the target (rifle)
 * - cannonball: lobbed shell that lands after CANNON_FLIGHT_TIME at the predicted target position, splash
 * - iceShard: homing shard at `projectileSpeed`, damage + slow on hit
 * - rocket: homing missile at `projectileSpeed`, splash on hit
 * - chain: instant lightning that jumps between targets (tesla)
 */
export type AttackMode = 'hitscan' | 'cannonball' | 'iceShard' | 'rocket' | 'chain';

export interface TowerDef {
  kind: TowerKind;
  /** English display name. */
  name: string;
  /** English one-line description. */
  description: string;
  damageType: DamageType;
  hitsAir: boolean;
  hitsGround: boolean;
  attack: AttackMode;
  /** px/s for homing projectiles (iceShard, rocket). */
  projectileSpeed?: number;
  /** Damage multiplier against flying enemies (rocket). */
  airDamageMultiplier?: number;
  levels: readonly [TowerLevelStats, TowerLevelStats, TowerLevelStats];
}

export interface EnemyDef {
  kind: EnemyKind;
  /** English display name. */
  name: string;
  /** Base HP before difficulty and level scaling. */
  hp: number;
  /** px/s before difficulty scaling. */
  speed: number;
  /** Fraction (0..1) of physical damage blocked. Energy damage ignores armor. */
  armor: number;
  /** Base shield pool before scaling. Absorbs damage before HP; physical damage counts half against it. */
  shield: number;
  /** Gold on kill before difficulty scaling. */
  bounty: number;
  /** Lives lost when it reaches the exit. */
  livesCost: number;
  flying: boolean;
  /** Body radius in px (selection and visuals; targeting uses the center point). */
  radius: number;
  /** 0..1: fraction of a slow effect ignored (0.5 = a 40% slow becomes 20%). */
  slowResist: number;
}

export interface DifficultyDef {
  id: Difficulty;
  /** English display name. */
  name: string;
  hpMul: number;
  speedMul: number;
  goldMul: number;
  bountyMul: number;
  lives: number;
}

// ---------------------------------------------------------------------------
// Live world. Owned and mutated only by the sim; render and ui read it.
// ---------------------------------------------------------------------------

export interface EnemyState {
  /** Unique within one simulation, never reused. */
  id: number;
  kind: EnemyKind;
  /** Index into `LevelDef.paths`. */
  path: number;
  /** Distance travelled along the path polyline in px. */
  distance: number;
  pos: Vec2;
  /** Direction of travel, radians (atan2 of the current segment). */
  heading: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  /** Current speed multiplier from slows (1 = not slowed). */
  slowFactor: number;
  /** Seconds of slow remaining (0 = not slowed). */
  slowTimer: number;
  /** World time of the last damage taken, or -Infinity. */
  lastHitAt: number;
}

export interface TowerState {
  /** Unique within one simulation, never reused. */
  id: number;
  kind: TowerKind;
  level: TowerLevel;
  /** Index into `LevelDef.pads`. */
  pad: number;
  /** Pad center. */
  pos: Vec2;
  /** Aim angle in radians toward the current or last target (0 = +x). */
  aim: number;
  /** Seconds until the tower may fire again. */
  cooldown: number;
  /** World time of the last shot, or -Infinity. */
  lastFiredAt: number;
  /** Total gold spent on this tower (build + upgrades). */
  spent: number;
}

export interface ProjectileState {
  /** Unique within one simulation, never reused. */
  id: number;
  kind: ProjectileKind;
  towerId: number;
  /** Ground position (for a cannonball: the point under the shell). */
  pos: Vec2;
  /** Direction of flight, radians. */
  heading: number;
  /** Launch point. */
  from: Vec2;
  /** Cannonball: landing point. Homing projectiles: last known target position. */
  to: Vec2;
  /** Cannonball: flight progress 0..1. Homing projectiles: 0. */
  progress: number;
  /** Homing target, or null once the target is gone. */
  targetId: number | null;
  /** Cannonball: visual height above the ground in px (arc). Others: 0. */
  height: number;
}

/** ready = before the first wave (player builds, then calls the wave); running; won; lost. */
export type GameStatus = 'ready' | 'running' | 'won' | 'lost';

export interface WorldView {
  readonly level: LevelDef;
  readonly difficulty: Difficulty;
  /** Simulated seconds since creation. */
  readonly time: number;
  readonly status: GameStatus;
  readonly gold: number;
  readonly lives: number;
  readonly maxLives: number;
  /** Index of the most recently started wave, -1 before the first. */
  readonly waveIndex: number;
  readonly waveCount: number;
  /** Seconds until the next wave starts by itself; null while a wave is still spawning, in 'ready', or after the last wave. */
  readonly nextWaveIn: number | null;
  /** True when a `callWave` command would succeed. */
  readonly canCallWave: boolean;
  /** 1..3 once won, else 0. */
  readonly stars: 0 | 1 | 2 | 3;
  readonly enemies: readonly EnemyState[];
  readonly towers: readonly TowerState[];
  readonly projectiles: readonly ProjectileState[];
}

export type GameEvent =
  | { type: 'waveStarted'; wave: number; early: boolean; bonus: number }
  | { type: 'enemySpawned'; id: number; kind: EnemyKind }
  | { type: 'enemyHit'; id: number; amount: number; damageType: DamageType; source: TowerKind }
  | { type: 'enemyKilled'; id: number; kind: EnemyKind; pos: Vec2; bounty: number }
  | { type: 'enemyLeaked'; id: number; kind: EnemyKind; livesLost: number }
  | { type: 'towerBuilt'; towerId: number; pad: number; kind: TowerKind }
  | { type: 'towerUpgraded'; towerId: number; level: TowerLevel }
  | { type: 'towerSold'; towerId: number; pad: number; refund: number }
  /** Every shot. For hitscan the damage is already applied; for projectiles the projectile now exists in the view. */
  | { type: 'towerFired'; towerId: number; kind: TowerKind; targetId: number; from: Vec2; to: Vec2 }
  /** Tesla: tower position, then each target hit in order. */
  | { type: 'chainLightning'; towerId: number; points: Vec2[] }
  | { type: 'projectileHit'; id: number; kind: ProjectileKind; pos: Vec2; splashRadius: number }
  | { type: 'levelWon'; stars: 1 | 2 | 3 }
  | { type: 'levelLost' };

export type Command =
  | { type: 'build'; pad: number; kind: TowerKind }
  | { type: 'upgrade'; towerId: number }
  | { type: 'sell'; towerId: number }
  /** Starts the first wave in 'ready', or calls the next wave early during the countdown. */
  | { type: 'callWave' };

export type CommandFailure =
  | 'insufficientGold'
  | 'padOccupied'
  | 'invalidPad'
  | 'towerNotAllowed'
  | 'maxLevel'
  | 'noSuchTower'
  | 'cannotCallWave'
  | 'gameOver';

export type CommandResult = { ok: true } | { ok: false; reason: CommandFailure };

export interface Simulation {
  /** Live view, mutated in place by `step()` and `command()`. Never mutate it from outside the sim. */
  readonly view: WorldView;
  /** Advance by exactly FIXED_DT. Returns the events of this step (empty once won or lost). */
  step(): GameEvent[];
  command(cmd: Command): CommandResult;
}

export type CreateSimulation = (level: LevelDef, difficulty: Difficulty) => Simulation;

// ---------------------------------------------------------------------------
// Player progress (persisted by the app, displayed by the menus)
// ---------------------------------------------------------------------------

export interface ProgressData {
  /** Highest level id the player may start (1..10). Winning level n on any difficulty unlocks n + 1. */
  unlocked: number;
  /** Best stars per level id per difficulty (0 = not won). */
  stars: Record<number, Record<Difficulty, 0 | 1 | 2 | 3>>;
}
