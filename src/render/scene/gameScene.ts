/**
 * The world rendering adapter: a static terrain stage, a world stage of pooled towers, enemies, projectiles and
 * effects that mirrors the simulation's view every frame, and engine particles drawn over the world canvas.
 */
import { clipsOf, makeArtboard, type SpriteInstance } from '../../art/exode';
import { effectsOf, trailPartIds } from '../../art/world/effects';
import { buildTerrainArtboard } from '../../art/world/terrain';
import type { GameEvent, LevelDef, WorldView } from '../../game/types';
import { setVisible } from '../exodeRuntime';
import { Stage, type CanvasLike } from '../stage';
import { clearTrail, setEffectEnabled } from './engineFx';
import { EnemyLayer } from './enemyLayer';
import { effectsFor, type EffectContext } from './eventEffects';
import { FxLayer } from './fxLayer';
import { orderObjects } from './objectOrder';
import { ParticleLayer, burstsFor } from './particleLayer';
import { enemyPoolSizes, fxPoolSizes, projectilePoolSizes } from './pools';
import { ProjectileLayer } from './projectileLayer';
import { TowerLayer } from './towerLayer';

export interface SceneStats {
  /** Objects in the world artboard. */
  objects: number;
  /** Milliseconds of the last sync (view → engine state) and of the last world render (particles included). */
  syncMs: number;
  renderMs: number;
  /** Entities that had no free pool slot this frame (should stay 0). */
  dropped: number;
}

export interface GameSceneOptions {
  /**
   * The engine's built-in effects (glows, light trails and their carrier shapes, particles). Default true. The same
   * switch as setEngineEffects, applied at construction.
   */
  engineEffects?: boolean;
}

/** One authored entry of an object's `style.effects`. */
interface EffectEntry {
  id: string;
  index: number;
}

export class GameScene {
  readonly background: Stage;
  readonly world: Stage;
  readonly towers: TowerLayer;
  readonly enemies: EnemyLayer;
  readonly projectiles: ProjectileLayer;
  readonly fx: FxLayer;
  readonly particles: ParticleLayer;
  readonly stats: SceneStats = { objects: 0, syncMs: 0, renderMs: 0, dropped: 0 };
  /** Sum of every dt passed to render (drives idle and flame loops). */
  private sceneTime = 0;
  private lightningSeed = 0;
  /** Backing-store size the terrain was last drawn at ('' before the first draw). */
  private terrainSize = '';
  /** Every effect entry but light trails, which are switched by hiding their carrier parts. */
  private readonly effectEntries: EffectEntry[];
  private readonly trailIds: string[];
  private effectsOn = true;

  constructor(bgCanvas: CanvasLike, worldCanvas: CanvasLike, readonly level: LevelDef, options: GameSceneOptions = {}) {
    this.background = new Stage(bgCanvas);
    this.background.load(buildTerrainArtboard(level));
    this.world = new Stage(worldCanvas);
    const engine = this.world.engine;
    this.towers = new TowerLayer(engine, level);
    this.enemies = new EnemyLayer(engine, enemyPoolSizes(level));
    this.projectiles = new ProjectileLayer(engine, projectilePoolSizes(level));
    this.fx = new FxLayer(engine, fxPoolSizes(level));
    // Effects are the only clips applied through the engine (startFx/fxFrame); the others are baked (bakedClips.ts).
    const fxPools = this.fx.poolSprites();
    const sprites: SpriteInstance[] = [
      ...fxPools.flat(),
      ...this.enemies.poolSprites().flat(),
      ...this.projectiles.poolSprites().flat(),
      ...this.towers.poolSprites().flat(),
    ];
    const objects = orderObjects(sprites, [{ pools: fxPools, clips: new Set(['play']) }]);
    this.trailIds = sprites.flatMap(trailPartIds);
    const trails = new Set(this.trailIds);
    this.effectEntries = objects.flatMap((o) =>
      trails.has(o.id) ? [] : effectsOf(o).map((_, index): EffectEntry => ({ id: o.id, index })),
    );
    this.stats.objects = objects.length;
    this.world.load(makeArtboard(`world-${level.id}`, objects, { background: null, animations: clipsOf(sprites) }));
    this.particles = new ParticleLayer(worldCanvas, level);
    this.setEngineEffects(options.engineEffects ?? true);
  }

  get engineEffects(): boolean {
    return this.effectsOn;
  }

  /**
   * Turns the engine's built-in effects on or off at runtime: authored effect entries are disabled one by one (object
   * state merges arrays by index, so they cannot be removed), trail carriers are hidden (their history is cleared
   * when they come back), and particles stop being thrown and drawn.
   */
  setEngineEffects(on: boolean): void {
    if (on === this.effectsOn) return;
    this.effectsOn = on;
    const engine = this.world.engine;
    for (const { id, index } of this.effectEntries) setEffectEnabled(engine, id, index, on);
    for (const id of this.trailIds) {
      if (on) clearTrail(engine, id);
      setVisible(engine, id, on);
    }
  }

  /** Size both stages (Stage.resize); the static terrain is redrawn only when its backing store changed size. */
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.background.resize(cssWidth, cssHeight, devicePixelRatio);
    this.world.resize(cssWidth, cssHeight, devicePixelRatio);
    this.drawTerrain();
  }

  /** Feed the events of every sim step, in order, right after that step. */
  onEvents(events: readonly GameEvent[], view: WorldView): void {
    const ctx: EffectContext = {
      level: this.level,
      towers: view.towers,
      muzzle: (tower) => this.towers.muzzle(tower),
      enemyHeight: (kind) => this.enemies.heightOf(kind),
      enemyPath: (id) => this.enemies.pathOf(id),
      nextSeed: () => ++this.lightningSeed,
    };
    for (const event of events) {
      if (event.type === 'enemySpawned') {
        const enemy = view.enemies.find((e) => e.id === event.id);
        this.enemies.spawn(event.id, event.kind, enemy?.path ?? 0);
      }
      for (const req of effectsFor(event, ctx)) {
        this.fx.start(req.kind, req.spec);
        if (this.effectsOn) for (const burst of burstsFor(req)) this.particles.burst(burst);
      }
      if (event.type === 'enemyKilled') this.enemies.kill(event.id, event.kind, event.pos);
      else if (event.type === 'enemyLeaked') this.enemies.leak(event.id);
      else if (event.type === 'towerSold') this.towers.hidePad(event.pad);
    }
  }

  /**
   * Sync every entity from the view, advance effects, death animations and particles by dt (game seconds: the app
   * passes real dt × speed, or 0 while paused), and render the world stage with the particles over it.
   */
  render(view: WorldView, dt: number): void {
    this.drawTerrain();
    this.sync(view, dt);
    const start = performance.now();
    this.world.render();
    if (this.effectsOn) {
      this.particles.advance(Math.max(0, dt));
      this.particles.render();
    }
    this.stats.renderMs = performance.now() - start;
  }

  /** The view → engine state half of render, without rasterizing. */
  sync(view: WorldView, dt: number): void {
    const start = performance.now();
    const step = Math.max(0, dt);
    this.sceneTime += step;
    this.towers.sync(view.towers, view.time, this.sceneTime);
    this.enemies.sync(view.enemies, view.time, step);
    this.projectiles.sync(view.projectiles, this.sceneTime);
    this.fx.advance(step);
    this.stats.dropped = this.towers.dropped + this.enemies.dropped + this.projectiles.dropped;
    this.stats.syncMs = performance.now() - start;
  }

  /** Renders the terrain unless it is already drawn at the current backing-store size (resizing clears a canvas). */
  private drawTerrain(): void {
    const { width, height } = this.background.canvas;
    const size = `${width}x${height}`;
    if (size === this.terrainSize) return;
    this.terrainSize = size;
    this.background.render();
  }
}
