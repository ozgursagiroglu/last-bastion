import { describe, expect, it } from 'vitest';
import { EARLY_CALL_BONUS_PER_SECOND, WAVE_GAP } from '../config';
import { FIXED_DT, MAX_ALIVE_PER_KIND } from '../types';
import { removeDead } from './enemies';
import { createSimulation } from './simulation';
import { expectedEnemy, group, makeLevel, makeWorld, ofType, stepMany, stepUntil, waves } from './testLevels';
import { callWave, stepWaves } from './waves';

const GAP_STEPS = Math.round(WAVE_GAP / FIXED_DT);

const LONG_ROAD = [
  [
    { x: 0, y: 300 },
    { x: 100_000, y: 300 },
  ],
];

describe('wave spawning', () => {
  it('runs groups in parallel at delay + i × interval after the wave start', () => {
    const level = makeLevel({
      paths: LONG_ROAD,
      waves: waves([group('grunt', 3, { interval: 2 }), group('runner', 2, { interval: 1.5, delay: 1 })]),
    });
    const sim = createSimulation(level, 'normal');
    expect(sim.command({ type: 'callWave' })).toEqual({ ok: true });
    const spawns: { kind: string; time: number }[] = [];
    for (let i = 0; i < 300; i++) {
      for (const e of sim.step()) if (e.type === 'enemySpawned') spawns.push({ kind: e.kind, time: sim.view.time });
    }
    expect(spawns.map((s) => s.kind)).toEqual(['grunt', 'runner', 'grunt', 'runner', 'grunt']);
    const times = spawns.map((s) => s.time);
    [FIXED_DT, 1, 2, 2.5, 4].forEach((t, i) => expect(times[i]).toBeCloseTo(t, 9));
  });

  it('spawns at the first path point with distance 0 (then moves in the same step)', () => {
    const sim = createSimulation(makeLevel(), 'normal');
    sim.command({ type: 'callWave' });
    sim.step();
    const enemy = sim.view.enemies[0];
    expect(enemy?.distance).toBeCloseTo(expectedEnemy('grunt').speed * FIXED_DT);
    expect(enemy?.pos.y).toBe(300);
    expect(enemy?.heading).toBe(0);
  });

  it('pauses a group clock while its kind is at the spawn cap', () => {
    const level = makeLevel({ paths: LONG_ROAD, waves: waves([group('grunt', MAX_ALIVE_PER_KIND + 2, { interval: 0.5 }), group('runner', 3, { interval: 30 })]) });
    const world = makeWorld(level);
    callWave(world);
    // Enemy 39 is due at 19.5 s (step 1170); from then on the grunt clock stays at 19.5 s.
    for (let i = 0; i < 1171; i++) stepWaves(world);
    expect(world.aliveByKind.grunt).toBe(MAX_ALIVE_PER_KIND);
    for (let i = 0; i < 600; i++) stepWaves(world);
    expect(world.aliveByKind.grunt).toBe(MAX_ALIVE_PER_KIND);
    // The runner group keeps its own clock: runners at 0, 30 and 60 s (steps 1, 1800, 3600).
    expect(world.aliveByKind.runner).toBe(1);
    for (let i = 0; i < 30; i++) stepWaves(world);
    expect(world.aliveByKind.runner).toBe(2);

    const first = world.view.enemies.find((e) => e.kind === 'grunt');
    if (!first) throw new Error('no grunt');
    first.hp = 0;
    removeDead(world);
    // The clock was stopped at 19.5 s; enemy 40 is due at 20 s, so it needs 30 more running steps.
    for (let i = 0; i < 29; i++) stepWaves(world);
    expect(world.aliveByKind.grunt).toBe(MAX_ALIVE_PER_KIND - 1);
    stepWaves(world);
    expect(world.aliveByKind.grunt).toBe(MAX_ALIVE_PER_KIND);
  });
});

describe('wave countdown', () => {
  const twoWaves = () =>
    makeLevel({ paths: LONG_ROAD, waves: waves([group('grunt', 2, { interval: 1 })], [group('runner', 1)], [group('brute', 1)]) });

  it('starts the countdown once the wave has spawned and auto-starts the next wave at 0', () => {
    const sim = createSimulation(twoWaves(), 'normal');
    sim.command({ type: 'callWave' });
    sim.step();
    expect(sim.view.nextWaveIn).toBeNull();
    expect(sim.view.canCallWave).toBe(false);
    stepUntil(sim, (events) => events.some((e) => e.type === 'enemySpawned'));
    expect(sim.view.time).toBeCloseTo(1, 9);
    expect(sim.view.nextWaveIn).toBeCloseTo(WAVE_GAP, 9);
    expect(sim.view.canCallWave).toBe(true);
    stepMany(sim, 60);
    expect(sim.view.nextWaveIn).toBeCloseTo(WAVE_GAP - 1, 9);
    stepMany(sim, GAP_STEPS - 61);
    expect(sim.view.waveIndex).toBe(0);
    const events = sim.step();
    expect(sim.view.time).toBeCloseTo(1 + WAVE_GAP, 9);
    expect(events.slice(0, 2)).toEqual([
      { type: 'waveStarted', wave: 1, early: false, bonus: 0 },
      { type: 'enemySpawned', id: expect.any(Number), kind: 'runner' },
    ]);
    expect(sim.view.waveIndex).toBe(1);
    // That wave spawned everything in the same step, so the next countdown starts at once.
    expect(sim.view.nextWaveIn).toBeCloseTo(WAVE_GAP, 9);
  });

  it('keeps nextWaveIn null after the last wave has spawned', () => {
    const sim = createSimulation(twoWaves(), 'normal');
    sim.command({ type: 'callWave' });
    stepUntil(sim, (events) => events.some((e) => e.type === 'enemySpawned' && e.kind === 'brute'));
    expect(sim.view.waveIndex).toBe(2);
    expect(sim.view.nextWaveIn).toBeNull();
    stepMany(sim, 1000);
    expect(sim.view.nextWaveIn).toBeNull();
    expect(sim.view.canCallWave).toBe(false);
    expect(sim.command({ type: 'callWave' })).toEqual({ ok: false, reason: 'cannotCallWave' });
  });

  it('pays ceil(nextWaveIn × bonus rate) for an early call and starts the wave at once', () => {
    const sim = createSimulation(twoWaves(), 'normal');
    sim.command({ type: 'callWave' });
    stepUntil(sim, () => sim.view.nextWaveIn !== null);
    stepMany(sim, 270);
    expect(sim.view.nextWaveIn).toBeCloseTo(WAVE_GAP - 4.5, 9);
    const bonus = Math.ceil((WAVE_GAP - 4.5) * EARLY_CALL_BONUS_PER_SECOND);
    const gold = sim.view.gold;
    expect(sim.command({ type: 'callWave' })).toEqual({ ok: true });
    expect(sim.view.gold).toBe(gold + bonus);
    expect(sim.view.waveIndex).toBe(1);
    expect(sim.view.nextWaveIn).toBeNull();
    expect(sim.view.canCallWave).toBe(false);
    const events = sim.step();
    expect(events.slice(0, 2)).toEqual([
      { type: 'waveStarted', wave: 1, early: true, bonus },
      { type: 'enemySpawned', id: expect.any(Number), kind: 'runner' },
    ]);
  });

  it('pays the full gap for a call right when the countdown starts', () => {
    const sim = createSimulation(twoWaves(), 'normal');
    sim.command({ type: 'callWave' });
    stepUntil(sim, () => sim.view.nextWaveIn !== null);
    const gold = sim.view.gold;
    sim.command({ type: 'callWave' });
    expect(sim.view.gold).toBe(gold + Math.ceil(WAVE_GAP * EARLY_CALL_BONUS_PER_SECOND));
  });

  it('refuses callWave while a wave is still spawning', () => {
    const sim = createSimulation(twoWaves(), 'normal');
    expect(sim.view.canCallWave).toBe(true);
    expect(sim.command({ type: 'callWave' })).toEqual({ ok: true });
    expect(sim.view.status).toBe('running');
    expect(sim.view.canCallWave).toBe(false);
    expect(sim.command({ type: 'callWave' })).toEqual({ ok: false, reason: 'cannotCallWave' });
    sim.step();
    expect(sim.command({ type: 'callWave' })).toEqual({ ok: false, reason: 'cannotCallWave' });
    expect(ofType(sim.step(), 'waveStarted')).toEqual([]);
  });

  it('starts the first wave with a non-early waveStarted event', () => {
    const sim = createSimulation(twoWaves(), 'normal');
    sim.command({ type: 'callWave' });
    expect(sim.view.waveIndex).toBe(0);
    expect(sim.step()[0]).toEqual({ type: 'waveStarted', wave: 0, early: false, bonus: 0 });
  });
});
