/**
 * Node-only helpers for the scene's tests and gallery: engines for one layer, Node canvases behind CanvasLike, fake
 * view entities, and scripted runs of a real simulation.
 */
import { ExodeUIEngine } from 'exodeui';
import { clipsOf, makeArtboard, type SpriteInstance } from '../../art/exode';
import { context2d, createNodeCanvas, installNodeCanvas } from '../../platform/nodeCanvas';
import {
  FIXED_DT,
  type EnemyKind,
  type EnemyState,
  type GameEvent,
  type LevelDef,
  type ProjectileState,
  type Simulation,
  type TowerState,
  type WorldView,
} from '../../game/types';
import type { CanvasLike } from '../stage';

/** An engine set up like a Stage, before load (layers take the engine first, then their sprites are loaded). */
export function newEngine(): ExodeUIEngine {
  installNodeCanvas();
  const engine = new ExodeUIEngine();
  engine.setLayout('Contain', 'Center');
  return engine;
}

export function loadSprites(engine: ExodeUIEngine, sprites: readonly SpriteInstance[]): void {
  engine.load(makeArtboard('test', sprites.flatMap((s) => s.objects), { background: null, animations: clipsOf(sprites) }));
}

/** Engine state of an object (the engine types it as any). */
export function stateOf(engine: ExodeUIEngine, id: string): Record<string, unknown> {
  const state: unknown = engine.getObjectState(id);
  if (typeof state !== 'object' || state === null) throw new Error(`No state for ${id}`);
  return state as Record<string, unknown>;
}

export type NodeCanvasLike = CanvasLike & { node: ReturnType<typeof createNodeCanvas> };

export function nodeCanvasLike(w: number, h: number): NodeCanvasLike {
  const node = createNodeCanvas(w, h);
  return {
    node,
    get width() {
      return node.width;
    },
    set width(v: number) {
      node.width = v;
    },
    get height() {
      return node.height;
    },
    set height(v: number) {
      node.height = v;
    },
    getContext: () => context2d(node),
  };
}

/**
 * A canvas whose 2D context draws nothing (every call is a no-op, transforms stay identity): rendering into it times
 * the engine's own JS without any rasterizer, which is what the frame budgets are about. Also for long runs whose
 * tests assert no pixels on that canvas (scene, session and shell tests).
 */
export function nullCanvasLike(w: number, h: number): CanvasLike {
  installNodeCanvas();
  const canvas = { width: w, height: h };
  const gradient = { addColorStop: () => undefined };
  const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, is2D: true, isIdentity: true };
  const state: Record<PropertyKey, unknown> = {
    canvas,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    shadowColor: 'rgba(0, 0, 0, 0)',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    letterSpacing: '0px',
    filter: 'none',
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
    getTransform: () => identity,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    createConicGradient: () => gradient,
    createPattern: () => gradient,
    measureText: (text: string) => ({ width: text.length * 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
  };
  const noop = () => undefined;
  const ctx = new Proxy(state, {
    get: (target, prop) => (prop in target ? target[prop] : noop),
    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return {
    get width() {
      return canvas.width;
    },
    set width(v: number) {
      canvas.width = v;
    },
    get height() {
      return canvas.height;
    },
    set height(v: number) {
      canvas.height = v;
    },
    getContext: () => ctx,
  };
}

/**
 * Whether perf tests assert their time budgets: only with PERF_BUDGET=1, since timings on shared CI runners depend on
 * machine load. Without it they still measure, print and check that every frame rendered.
 */
export function perfBudgetEnforced(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.PERF_BUDGET === '1';
}

export function fakeEnemy(id: number, kind: EnemyKind, over: Partial<EnemyState> = {}): EnemyState {
  return {
    id,
    kind,
    path: 0,
    distance: 0,
    pos: { x: 100, y: 100 },
    heading: 0,
    hp: 10,
    maxHp: 10,
    shield: 0,
    maxShield: 0,
    slowFactor: 1,
    slowTimer: 0,
    lastHitAt: -Infinity,
    ...over,
  };
}

export function fakeTower(id: number, level: LevelDef, pad: number, kind: TowerState['kind'], over: Partial<TowerState> = {}): TowerState {
  const p = level.pads[pad] ?? { x: 0, y: 0 };
  return { id, kind, level: 1, pad, pos: { x: p.x, y: p.y }, aim: 0, cooldown: 0, lastFiredAt: -Infinity, spent: 0, ...over };
}

export function fakeProjectile(id: number, kind: ProjectileState['kind'], over: Partial<ProjectileState> = {}): ProjectileState {
  return {
    id,
    kind,
    towerId: 1,
    pos: { x: 200, y: 200 },
    heading: 0,
    from: { x: 200, y: 200 },
    to: { x: 300, y: 200 },
    progress: 0,
    targetId: null,
    height: 0,
    ...over,
  };
}

/** A copy of a level with gold for towers on most pads (scripted runs only; nothing visual depends on gold). */
export function richLevel(level: LevelDef): LevelDef {
  return { ...level, startGold: 1_000_000 };
}

/** Pad left empty in scripted runs (every fourth), so empty pads show too. */
export const isDemoGap = (pad: number): boolean => pad % 4 === 3;

/** Builds the allowed kinds in turn on every pad but the gaps, upgraded to level (pad % 3) + 1. */
export function buildDemoTowers(sim: Simulation, level: LevelDef): void {
  level.pads.forEach((_, pad) => {
    const kind = level.towers[pad % level.towers.length];
    if (isDemoGap(pad) || !kind || !sim.command({ type: 'build', pad, kind }).ok) return;
    const tower = sim.view.towers.find((t) => t.pad === pad);
    for (let l = 1; tower && l < (pad % 3) + 1; l++) sim.command({ type: 'upgrade', towerId: tower.id });
  });
}

export interface PlayOptions {
  steps: number;
  /** Sync or render every this many steps, with dt = every × FIXED_DT. */
  every: number;
  frame: (dt: number) => void;
  onEvents?: (events: readonly GameEvent[]) => void;
}

/** Steps the sim, feeding each step's events to `feed`; calls every wave as soon as it can be called. */
export function playSteps(sim: Simulation, feed: (events: readonly GameEvent[], view: WorldView) => void, opts: PlayOptions): void {
  for (let step = 1; step <= opts.steps; step++) {
    if (sim.view.canCallWave) sim.command({ type: 'callWave' });
    const events = sim.step();
    feed(events, sim.view);
    opts.onEvents?.(events);
    if (step % opts.every === 0) opts.frame(opts.every * FIXED_DT);
  }
}

/** Ticks a group clock needs to reach `seconds` (the first tick runs on the step a wave starts). */
const ticksTo = (seconds: number): number => Math.max(1, Math.ceil(seconds / FIXED_DT - 1e-6));

/**
 * The step of playSteps on which the first enemy of `kind` spawns, read from the waves (null when the level never
 * spawns it). Each wave is called on the step after its last spawn; holding spawns at MAX_ALIVE_PER_KIND is ignored.
 */
export function firstSpawnStep(level: LevelDef, kind: EnemyKind): number | null {
  let start = 0;
  for (const wave of level.waves) {
    const delays = wave.groups.filter((g) => g.enemy === kind).map((g) => g.delay);
    if (delays.length > 0) return start + ticksTo(Math.min(...delays));
    start += ticksTo(Math.max(0, ...wave.groups.map((g) => g.delay + (g.count - 1) * g.interval)));
  }
  return null;
}

export function fakeView(level: LevelDef, over: Partial<WorldView> = {}): WorldView {
  return {
    level,
    difficulty: 'normal',
    time: 0,
    status: 'running',
    gold: 0,
    lives: 20,
    maxLives: 20,
    waveIndex: 0,
    waveCount: level.waves.length,
    nextWaveIn: null,
    canCallWave: false,
    stars: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    ...over,
  };
}
