import { describe, expect, it, vi } from 'vitest';
import { FX_DURATION } from '../../art/world/fx';
import { ENEMIES } from '../../game/config';
import { getLevel, LEVELS } from '../../game/levels';
import { createSimulation } from '../../game/sim';
import type { WorldView } from '../../game/types';
import { countPainted, pixelAt } from '../../platform/nodeCanvas';
import { FLYER_Z } from './enemyLayer';
import { GameScene } from './gameScene';
import { buildDemoTowers, firstSpawnStep, isDemoGap, nodeCanvasLike, nullCanvasLike, playSteps, richLevel, stateOf } from './testSupport';

const DIE = 0.5;
const MAX_FX = Math.max(...Object.values(FX_DURATION));
const STEPS = 1500;
/** Steps past the first flyer spawn, so a few rendered frames show it. */
const FLYER_MARGIN = 30;

/** The level whose first flyer spawns earliest in a scripted run, and that step. */
const FLYER = LEVELS.reduce<{ id: number; step: number } | null>((best, level) => {
  const step = firstSpawnStep(level, 'flyer');
  return step !== null && (best === null || step < best.step) ? { id: level.id, step } : best;
}, null);

describe('GameScene', () => {
  it('renders the opaque terrain on the first frame and again only when a resize changes its backing store', () => {
    const bg = nodeCanvasLike(320, 180);
    const world = nodeCanvasLike(320, 180);
    const level = getLevel(1);
    const scene = new GameScene(bg, world, level);
    const draws = vi.spyOn(scene.background, 'render');
    expect(draws).toHaveBeenCalledTimes(0);
    scene.render(createSimulation(level, 'normal').view, 1 / 60);
    expect(draws).toHaveBeenCalledTimes(1);
    expect(pixelAt(bg.node, 160, 90)[3]).toBe(255);
    scene.resize(640, 360, 1.5);
    expect([bg.width, bg.height, world.width, world.height]).toEqual([960, 540, 960, 540]);
    expect(draws).toHaveBeenCalledTimes(2);
    expect(pixelAt(bg.node, 900, 500)[3]).toBe(255);
    scene.resize(640, 360, 1.5);
    scene.resize(640.2, 360.2, 1.5);
    scene.render(createSimulation(level, 'normal').view, 1 / 60);
    expect(draws).toHaveBeenCalledTimes(2);
    scene.resize(640, 360, 2);
    expect(draws).toHaveBeenCalledTimes(3);
    expect(scene.stats.objects).toBeGreaterThan(1000);
  });

  it('draws the terrain once when the first resize comes before the first frame', () => {
    const bg = nodeCanvasLike(300, 150);
    const level = getLevel(1);
    const scene = new GameScene(bg, nodeCanvasLike(300, 150), level);
    const draws = vi.spyOn(scene.background, 'render');
    scene.resize(1280, 720, 1);
    scene.render(createSimulation(level, 'normal').view, 1 / 60);
    expect(draws).toHaveBeenCalledTimes(1);
  });

  it('runs engine effects by default and switches them off (glows disabled, trail carriers hidden) when asked', () => {
    const level = getLevel(10);
    const on = new GameScene(nodeCanvasLike(32, 18), nodeCanvasLike(32, 18), level);
    const off = new GameScene(nodeCanvasLike(32, 18), nodeCanvasLike(32, 18), level, { engineEffects: false });
    const effectsOf = (scene: GameScene, id: string) => (stateOf(scene.world.engine, id).style as { effects?: unknown[] }).effects;
    expect([on.engineEffects, off.engineEffects]).toEqual([true, false]);
    expect(on.particles.emitterIds().length).toBeGreaterThan(0);
    expect(effectsOf(on, 'fx.explosion.0.core')).toEqual([expect.objectContaining({ type: 'Glow' })]);
    expect(effectsOf(on, 'fx.explosion.0.core')).not.toEqual([expect.objectContaining({ isEnabled: false })]);
    expect(effectsOf(off, 'fx.explosion.0.core')).toEqual([expect.objectContaining({ type: 'Glow', isEnabled: false })]);
    expect(stateOf(on.world.engine, 'pr.rocket.0.lightTrail').visible).toBe(true);
    expect(stateOf(off.world.engine, 'pr.rocket.0.lightTrail').visible).toBe(false);
    expect(on.stats.objects).toBe(off.stats.objects);
  });

  it('switches engine effects off and on again at runtime: glow passes, trail carriers and particles', () => {
    const level = getLevel(10);
    const inner = nullCanvasLike(320, 180);
    const ctx = inner.getContext('2d');
    if (!ctx) throw new Error('no context');
    let passes = 0;
    const counting = new Proxy(ctx, {
      set(target, prop, value) {
        if (prop === 'shadowBlur' && typeof value === 'number' && value > 0) passes++;
        return Reflect.set(target, prop, value);
      },
    });
    const world = { width: 320, height: 180, getContext: () => counting };
    const scene = new GameScene(nullCanvasLike(320, 180), world, level);
    const view = createSimulation(level, 'normal').view;
    const explode = (x: number) => scene.onEvents([{ type: 'projectileHit', id: x, kind: 'rocket', pos: { x, y: 360 }, splashRadius: 50 }], view);
    const frame = () => {
      passes = 0;
      scene.render(view, 1 / 60);
      return passes;
    };
    const spark = () => stateOf(scene.particles.stage.engine, 'pt.spark.0').x;
    const carrier = () => stateOf(scene.world.engine, 'pr.rocket.0.lightTrail').visible;

    explode(640);
    expect(frame()).toBeGreaterThan(0);
    expect(spark()).toBe(640);
    scene.setEngineEffects(false);
    expect(scene.engineEffects).toBe(false);
    explode(200);
    expect(scene.fx.runningIds('explosion')).toHaveLength(2);
    expect(frame()).toBe(0);
    expect(spark()).toBe(640);
    expect(carrier()).toBe(false);
    scene.setEngineEffects(true);
    expect(frame()).toBeGreaterThan(0);
    expect(carrier()).toBe(true);
  });

  it('throws particles from explosions it is told about', () => {
    const level = getLevel(10);
    const world = nodeCanvasLike(320, 180);
    const scene = new GameScene(nodeCanvasLike(320, 180), world, level);
    const view = createSimulation(level, 'normal').view;
    scene.onEvents([{ type: 'projectileHit', id: 1, kind: 'rocket', pos: { x: 640, y: 360 }, splashRadius: 50 }], view);
    expect(scene.fx.runningIds('explosion')).toHaveLength(1);
    scene.render(view, 1 / 60);
    expect(scene.particles.dropped).toBe(0);
    expect(stateOf(scene.particles.stage.engine, 'pt.spark.0').x).toBe(640);
  });

  it('draws nothing on the world stage before anything happens', () => {
    const level = getLevel(1);
    const world = nodeCanvasLike(320, 180);
    const scene = new GameScene(nodeCanvasLike(320, 180), world, level);
    const sim = createSimulation(level, 'normal');
    scene.render(sim.view, 1 / 60);
    expect(countPainted(world.node)).toBe(0);
    expect(scene.stats.dropped).toBe(0);
  });

  it('has a level with flyers', () => {
    expect(FLYER).not.toBeNull();
  });

  for (const id of new Set([1, 6, 10, ...(FLYER ? [FLYER.id] : [])])) {
    const flyers = FLYER?.id === id;
    it(`mirrors a real run of level ${id}${flyers ? ', flyers above ground units' : ''}`, () => {
      const level = richLevel(getLevel(id));
      const world = nodeCanvasLike(320, 180);
      const scene = new GameScene(nullCanvasLike(320, 180), world, level);
      const engine = scene.world.engine;
      const sim = createSimulation(level, 'normal');
      buildDemoTowers(sim, level);
      const state = (rootId: string) => stateOf(engine, rootId);

      let sceneTime = 0;
      let firedFx = 0;
      let kills = 0;
      let flyersSeen = 0;
      let enemiesSeen = 0;
      let mixedFrames = 0;
      const bodies: { id: number; root: string; at: number }[] = [];

      const check = (view: WorldView, dt: number) => {
        expect(scene.stats.dropped).toBe(0);
        for (const tower of view.towers) {
          const s = state(`tw.${tower.pad}.${tower.kind}`);
          expect([s.visible, s.x, s.y]).toEqual([true, level.pads[tower.pad]?.x, level.pads[tower.pad]?.y]);
          expect(s.zIndex).toBeLessThan(FLYER_Z);
        }
        let groundZ = -Infinity;
        let flyerZ = Infinity;
        for (const enemy of view.enemies) {
          const root = scene.enemies.rootOf(enemy.id);
          expect(root).toBeDefined();
          const s = state(root ?? '');
          expect([s.visible, s.x, s.y]).toEqual([true, enemy.pos.x, enemy.pos.y]);
          const z = s.zIndex as number;
          if (ENEMIES[enemy.kind].flying) flyerZ = Math.min(flyerZ, z);
          else groundZ = Math.max(groundZ, z);
          enemiesSeen++;
          if (ENEMIES[enemy.kind].flying) flyersSeen++;
        }
        expect(flyerZ).toBeGreaterThan(groundZ);
        if (flyerZ < Infinity && groundZ > -Infinity) mixedFrames++;
        const dying = scene.enemies.dyingIds();
        const inUse = new Set([...scene.enemies.aliveIds().values(), ...dying.values()]);
        for (const body of bodies) {
          if (sceneTime - body.at < DIE + dt) continue;
          expect(dying.has(body.id)).toBe(false);
          if (!inUse.has(body.root)) expect(state(body.root).visible).toBe(false);
        }
      };

      playSteps(
        sim,
        (events, view) => {
          scene.onEvents(events, view);
          for (const e of events) {
            if (e.type === 'towerFired' && (e.kind === 'rifle' || e.kind === 'tesla')) {
              firedFx++;
              expect(scene.fx.runningIds(e.kind === 'rifle' ? 'tracer' : 'lightning').length).toBeGreaterThan(0);
            }
            if (e.type === 'enemyKilled') {
              kills++;
              const root = scene.enemies.rootOf(e.id);
              if (root) bodies.push({ id: e.id, root, at: sceneTime });
            }
          }
        },
        {
          steps: flyers && FLYER ? Math.max(STEPS, FLYER.step + FLYER_MARGIN) : STEPS,
          every: 3,
          frame: (dt) => {
            sceneTime += dt;
            scene.render(sim.view, dt);
            check(sim.view, dt);
          },
        },
      );

      expect(scene.towers.visibleIds()).toHaveLength(level.pads.filter((_, pad) => !isDemoGap(pad)).length);
      expect(enemiesSeen).toBeGreaterThan(0);
      expect(firedFx).toBeGreaterThan(0);
      expect(kills).toBeGreaterThan(0);
      if (flyers) {
        expect(flyersSeen).toBeGreaterThan(0);
        expect(mixedFrames).toBeGreaterThan(0);
      }
      expect(countPainted(world.node)).toBeGreaterThan(1000);

      // Freeze the sim: every effect and body finishes and hides.
      for (let i = 0; i < Math.ceil((Math.max(MAX_FX, DIE) + 0.1) * 60); i++) scene.render(sim.view, 1 / 60);
      expect(scene.fx.runningIds()).toEqual([]);
      expect(scene.enemies.dyingIds().size).toBe(0);
      // Hang guard: thousands of real sim steps rendered on a CPU canvas, 16–67 s in the full suite on a laptop under
      // load (level 1 slowest); CI runners are about half as fast.
    }, 360_000);
  }

  it('hides a sold tower and puffs dust at its pad', () => {
    const level = richLevel(getLevel(1));
    const scene = new GameScene(nodeCanvasLike(32, 18), nodeCanvasLike(32, 18), level);
    const sim = createSimulation(level, 'normal');
    sim.command({ type: 'build', pad: 0, kind: 'rifle' });
    scene.onEvents(sim.step(), sim.view);
    scene.render(sim.view, 1 / 60);
    expect(stateOf(scene.world.engine, 'tw.0.rifle').visible).toBe(true);
    const tower = sim.view.towers[0];
    if (!tower) throw new Error('no tower');
    sim.command({ type: 'sell', towerId: tower.id });
    scene.onEvents(sim.step(), sim.view);
    expect(stateOf(scene.world.engine, 'tw.0.rifle').visible).toBe(false);
    expect(scene.fx.runningIds('deathPuff').length).toBeGreaterThan(0);
  });
});
