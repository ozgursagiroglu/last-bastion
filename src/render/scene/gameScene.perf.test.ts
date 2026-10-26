import { describe, expect, it, vi } from 'vitest';
import { getLevel } from '../../game/levels';
import { buildPath, pointAtDistance } from '../../game/sim';
import {
  ENEMY_KINDS,
  TOWER_KINDS,
  type EnemyKind,
  type EnemyState,
  type GameEvent,
  type LevelDef,
  type TowerLevel,
  type WorldView,
} from '../../game/types';
import { GameScene } from './gameScene';
import { enemyPoolSizes } from './pools';
import { fakeEnemy, fakeProjectile, fakeTower, fakeView, nodeCanvasLike, nullCanvasLike, perfBudgetEnforced } from './testSupport';

const LIVE = 120;
/** Engine-JS milliseconds the effects may add to a level 10 frame, median (measured 0.15–1.27 ms), with PERF_BUDGET=1. */
const EFFECTS_BUDGET_MS = 2;
/** Frames of the effects comparison: a budget needs a stable median; without one the test checks that both scenes render. */
const EFFECTS_FRAMES = perfBudgetEnforced() ? { warmup: 30, measured: 90 } : { warmup: 10, measured: 30 };

/** LIVE enemies dealt one kind at a time over the level's kinds, never more of a kind than its pool holds. */
function enemyMix(level: LevelDef): [EnemyKind, number][] {
  const room = enemyPoolSizes(level);
  const mix = ENEMY_KINDS.map((kind): [EnemyKind, number] => [kind, 0]);
  for (let total = 0, dealt = true; dealt && total < LIVE; ) {
    dealt = false;
    for (const entry of mix) {
      if (total < LIVE && entry[1] < (room[entry[0]] ?? 0)) {
        entry[1]++;
        total++;
        dealt = true;
      }
    }
  }
  return mix;
}

/** Level 10 with a tower on every pad, LIVE walking enemies and 30 flying projectiles; `frame(f)` moves it all. */
function levelTenFixture() {
  const level = getLevel(10);
  const paths = level.paths.map(buildPath);
  const towers = level.pads.map((_, pad) =>
    fakeTower(pad + 1, level, pad, TOWER_KINDS[pad % TOWER_KINDS.length] ?? 'rifle', { level: ((pad % 3) + 1) as TowerLevel }),
  );
  const projectiles = Array.from({ length: 30 }, (_, i) => fakeProjectile(i + 1, (['cannonball', 'iceShard', 'rocket'] as const)[i % 3] ?? 'rocket'));
  const enemies: EnemyState[] = [];
  for (const [kind, count] of enemyMix(level)) {
    for (let i = 0; i < count; i++) {
      const path = enemies.length % paths.length;
      enemies.push(fakeEnemy(enemies.length + 1, kind, { path, distance: (enemies.length * 13) % 900, hp: 5, shield: 2, maxShield: 4, slowTimer: i % 2 }));
    }
  }
  const frame = (f: number): WorldView => {
    const time = f / 60;
    for (const e of enemies) {
      e.distance += 1;
      const info = paths[e.path];
      if (info) {
        const at = pointAtDistance(info, e.distance);
        e.pos = at.pos;
        e.heading = at.heading;
      }
      e.lastHitAt = e.id % 5 === f % 5 ? time - 0.05 : -Infinity;
    }
    for (const t of towers) t.lastFiredAt = t.id % 4 === f % 4 ? time - 0.05 : -Infinity;
    projectiles.forEach((p, i) => {
      const a = i * 0.7 + f * 0.02;
      p.pos = { x: 640 + Math.cos(a) * (200 + i * 8), y: 360 + Math.sin(a) * (120 + i * 4) };
      p.heading = a + Math.PI / 2;
      p.height = p.kind === 'cannonball' ? 20 : 0;
    });
    return fakeView(level, { time, enemies, towers, projectiles });
  };
  /** Impacts and bolts of a frame, as the sim reports them. */
  const events = (f: number): GameEvent[] => {
    const out: GameEvent[] = [];
    if (f % 6 === 0) out.push({ type: 'projectileHit', id: f, kind: 'rocket', pos: { x: 400 + (f % 7) * 60, y: 300 }, splashRadius: 50 });
    if (f % 8 === 0) out.push({ type: 'projectileHit', id: f, kind: 'iceShard', pos: { x: 700, y: 450 }, splashRadius: 0 });
    if (f % 10 === 0) out.push({ type: 'chainLightning', towerId: 4, points: [{ x: 300, y: 320 }, { x: 380, y: 360 }, { x: 450, y: 330 }] });
    return out;
  };
  return { level, frame, events, enemies };
}

function summary(samples: readonly number[]): { mean: number; median: number; p95: number } {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    mean: sorted.reduce((s, x) => s + x, 0) / Math.max(1, sorted.length),
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
  };
}

describe('GameScene performance', () => {
  it(`syncs level 10 with ${LIVE} live enemies within the frame budget`, () => {
    const { level, frame, enemies } = levelTenFixture();
    const scene = new GameScene(nodeCanvasLike(16, 9), nodeCanvasLike(16, 9), level);
    expect(enemies).toHaveLength(LIVE);
    const samples: number[] = [];
    for (let f = 0; f < 180; f++) {
      const view = frame(f);
      if (f % 6 === 0) scene.fx.start('explosion', { at: { x: 400, y: 300 }, radius: 50 });
      if (f % 3 === 0) scene.fx.start('tracer', { at: { x: 400, y: 300 }, points: [{ x: 400, y: 300 }, { x: 500, y: 320 }] });
      scene.sync(view, 1 / 60);
      expect(scene.stats.dropped).toBe(0);
      if (f >= 60) samples.push(scene.stats.syncMs);
    }
    const sync = summary(samples);
    console.log(`level 10, ${LIVE} enemies, ${scene.stats.objects} objects: syncMs mean ${sync.mean.toFixed(2)}, median ${sync.median.toFixed(2)}, p95 ${sync.p95.toFixed(2)}`);
    if (perfBudgetEnforced()) expect(sync.mean).toBeLessThanOrEqual(6);
  });

  it('measures what the engine effects add to a level 10 frame (sync + render, effects on vs off)', () => {
    const { level, frame, events } = levelTenFixture();
    const on = new GameScene(nullCanvasLike(1280, 720), nullCanvasLike(1280, 720), level);
    const off = new GameScene(nullCanvasLike(1280, 720), nullCanvasLike(1280, 720), level, { engineEffects: false });
    const renders = [vi.spyOn(on.world, 'render'), vi.spyOn(off.world, 'render')];
    const cost = (scene: GameScene, view: WorldView, f: number) => {
      scene.onEvents(events(f), view);
      scene.render(view, 1 / 60);
      return scene.stats.syncMs + scene.stats.renderMs;
    };
    const diffs: number[] = [];
    const offCosts: number[] = [];
    const { warmup } = EFFECTS_FRAMES;
    const frames = warmup + EFFECTS_FRAMES.measured;
    for (let f = 0; f < frames; f++) {
      const view = frame(f);
      // Alternate which scene goes first, so neither always pays for the other's garbage.
      let withFx: number;
      let without: number;
      if (f % 2 === 0) {
        withFx = cost(on, view, f);
        without = cost(off, view, f);
      } else {
        without = cost(off, view, f);
        withFx = cost(on, view, f);
      }
      if (f >= warmup) {
        diffs.push(withFx - without);
        offCosts.push(without);
      }
    }
    const d = summary(diffs);
    const base = summary(offCosts);
    console.log(
      `level 10 engine effects: +${d.median.toFixed(2)} ms median (mean ${d.mean.toFixed(2)}) per frame over ${base.median.toFixed(1)} ms without them ` +
        `(engine JS only: no-op 2D context; particle emitters ${on.particles.emitterIds().length}, bursts dropped ${on.particles.dropped})`,
    );
    expect(on.particles.dropped).toBe(0);
    for (const render of renders) expect(render).toHaveBeenCalledTimes(frames);
    expect(diffs).toHaveLength(frames - warmup);
    for (const diff of diffs) expect(Number.isFinite(diff)).toBe(true);
    if (perfBudgetEnforced()) expect(d.median).toBeLessThanOrEqual(EFFECTS_BUDGET_MS);
    // Hang guard: 20–52 s in the full suite on a laptop under load; CI runners are about half as fast.
  }, 300_000);
});
