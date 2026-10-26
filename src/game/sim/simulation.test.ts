import { describe, expect, it } from 'vitest';
import { DIFFICULTY, ENEMIES, SELL_REFUND } from '../config';
import type { Command, GameEvent, LevelDef, Vec2 } from '../types';
import { FIXED_DT, TOWER_KINDS } from '../types';
import { createSimulation } from './simulation';
import { group, makeLevel, ofType, stepMany, stepUntil, towerLevel, waves } from './testLevels';

describe('createSimulation', () => {
  it('advances time by FIXED_DT per step, also before the first wave', () => {
    const sim = createSimulation(makeLevel(), 'normal');
    expect(stepMany(sim, 3)).toEqual([]);
    expect(sim.view.time).toBeCloseTo(3 * FIXED_DT, 12);
    expect(sim.view.status).toBe('ready');
    expect(sim.view.waveIndex).toBe(-1);
  });

  it('delivers command events with the next step', () => {
    const sim = createSimulation(makeLevel(), 'normal');
    expect(sim.command({ type: 'build', pad: 0, kind: 'rifle' })).toEqual({ ok: true });
    expect(sim.command({ type: 'upgrade', towerId: 1 })).toEqual({ ok: true });
    expect(sim.command({ type: 'sell', towerId: 1 })).toEqual({ ok: true });
    expect(sim.step()).toEqual([
      { type: 'towerBuilt', towerId: 1, pad: 0, kind: 'rifle' },
      { type: 'towerUpgraded', towerId: 1, level: 2 },
      { type: 'towerSold', towerId: 1, pad: 0, refund: Math.floor((towerLevel('rifle', 1).cost + towerLevel('rifle', 2).cost) * SELL_REFUND + 1e-9) },
    ]);
    expect(sim.step()).toEqual([]);
  });

  it('accepts build, upgrade and sell while running', () => {
    const sim = createSimulation(makeLevel(), 'normal');
    sim.command({ type: 'callWave' });
    sim.step();
    expect(sim.view.status).toBe('running');
    expect(sim.command({ type: 'build', pad: 0, kind: 'rifle' })).toEqual({ ok: true });
    const id = sim.view.towers[0]?.id ?? -1;
    expect(sim.command({ type: 'upgrade', towerId: id })).toEqual({ ok: true });
    expect(sim.command({ type: 'sell', towerId: id })).toEqual({ ok: true });
    expect(sim.command({ type: 'upgrade', towerId: id })).toEqual({ ok: false, reason: 'noSuchTower' });
  });

  it('keeps one view object and entity identity across steps; ids are shared and never reused', () => {
    const level = makeLevel({ waves: waves([group('grunt', 3, { interval: 0.5 })]) });
    const sim = createSimulation(level, 'normal');
    const view = sim.view;
    sim.command({ type: 'build', pad: 0, kind: 'cannon' });
    sim.command({ type: 'callWave' });
    const tower = sim.view.towers[0];
    stepMany(sim, 2);
    const enemy = sim.view.enemies[0];
    const pos = enemy?.pos;
    stepMany(sim, 60);
    expect(sim.view).toBe(view);
    expect(sim.view.towers[0]).toBe(tower);
    expect(sim.view.enemies[0]).toBe(enemy);
    expect(sim.view.enemies[0]?.pos).toBe(pos);
    const events = stepUntil(sim, () => sim.view.status !== 'running');
    const ids = [
      tower?.id,
      ...sim.view.enemies.map((e) => e.id),
      ...ofType(events, 'enemyKilled').map((e) => e.id),
      ...ofType(events, 'enemyLeaked').map((e) => e.id),
      ...ofType(events, 'projectileHit').map((e) => e.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(tower?.id).toBe(1);
  });

  it('loses rather than wins when the last enemy takes the last lives', () => {
    const level = makeLevel({
      paths: [
        [
          { x: 0, y: 300 },
          { x: 50, y: 300 },
        ],
      ],
      waves: waves([group('boss', Math.ceil(DIFFICULTY.hard.lives / ENEMIES.boss.livesCost))]),
    });
    const sim = createSimulation(level, 'hard');
    sim.command({ type: 'callWave' });
    const events = stepUntil(sim, () => sim.view.status !== 'running');
    expect(sim.view.status).toBe('lost');
    expect(ofType(events, 'levelWon')).toEqual([]);
    expect(events.at(-1)).toEqual({ type: 'levelLost' });
  });
});

/** A winding road with pads on both sides; every tower kind and enemy kind takes part. */
function busyLevel(): LevelDef {
  const paths: Vec2[][] = [
    [
      { x: -20, y: 120 },
      { x: 1100, y: 120 },
      { x: 1100, y: 360 },
      { x: 180, y: 360 },
      { x: 180, y: 600 },
      { x: 1300, y: 600 },
    ],
    [
      { x: 640, y: -20 },
      { x: 640, y: 740 },
    ],
  ];
  const pads: Vec2[] = [];
  for (const y of [240, 480]) for (let x = 120; x <= 1200; x += 140) pads.push({ x, y });
  return makeLevel({
    id: 6,
    paths,
    pads,
    startGold: 10_000,
    waves: waves(
      [group('grunt', 40, { interval: 0.05 }), group('runner', 40, { interval: 0.05, path: 1 }), group('flyer', 40, { interval: 0.05 })],
      [group('brute', 40, { interval: 0.05 }), group('shield', 40, { interval: 0.05, path: 1 }), group('boss', 2, { interval: 3 })],
    ),
  });
}

function scriptedRun(): GameEvent[] {
  const sim = createSimulation(busyLevel(), 'normal');
  const script: Command[] = TOWER_KINDS.flatMap((kind, i) => [
    { type: 'build', pad: i * 3, kind },
    { type: 'build', pad: i * 3 + 1, kind },
  ]);
  for (const cmd of script) sim.command(cmd);
  sim.command({ type: 'callWave' });
  const log: GameEvent[] = [];
  for (let i = 0; i < 60 * 120 && sim.view.status === 'running'; i++) {
    if (i === 600) sim.command({ type: 'upgrade', towerId: 1 });
    if (i === 900) sim.command({ type: 'sell', towerId: 4 });
    if (i === 1200) sim.command({ type: 'callWave' });
    log.push(...sim.step());
  }
  return log;
}

describe('determinism and cost', () => {
  it('gives identical event logs for identical runs', () => {
    const a = scriptedRun();
    const b = scriptedRun();
    expect(a.length).toBeGreaterThan(1000);
    for (const type of ['towerFired', 'chainLightning', 'projectileHit', 'enemyKilled', 'enemyLeaked'] as const) {
      expect(ofType(a, type).length).toBeGreaterThan(0);
    }
    expect(b).toEqual(a);
  });

  it('steps 200 enemies and 16 towers well within a frame', () => {
    const sim = createSimulation({ ...busyLevel(), waves: waves([
      group('grunt', 40, { interval: 0.02 }),
      group('runner', 40, { interval: 0.02, path: 1 }),
      group('flyer', 40, { interval: 0.02 }),
      group('brute', 40, { interval: 0.02, path: 1 }),
      group('shield', 40, { interval: 0.02 }),
    ]) }, 'hard');
    for (let pad = 0; pad < 16; pad++) {
      const kind = TOWER_KINDS[pad % TOWER_KINDS.length] ?? 'rifle';
      sim.command({ type: 'build', pad, kind });
    }
    sim.command({ type: 'callWave' });
    stepUntil(sim, () => sim.view.enemies.length >= 200);
    const steps = 600;
    const start = performance.now();
    let enemySteps = 0;
    for (let i = 0; i < steps; i++) {
      sim.step();
      enemySteps += sim.view.enemies.length;
    }
    const perStep = (performance.now() - start) / steps;
    expect(enemySteps / steps).toBeGreaterThan(150);
    expect(sim.view.towers).toHaveLength(16);
    // Wall-clock budgets depend on machine load; they are enforced only on request (PERF_BUDGET=1), like the scene's.
    if (process.env.PERF_BUDGET === '1') expect(perStep).toBeLessThan(2);
  });
});
