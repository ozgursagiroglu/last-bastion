import { describe, expect, it } from 'vitest';
import { DIFFICULTY, ENEMIES, WAVE_GAP } from '../config';
import type { LevelDef, Vec2 } from '../types';
import { BOT_TIME_LIMIT, buildOrderKind, coverage, greedyCommand, playLevel, roadSamples } from './bot';
import { createSimulation } from './simulation';
import { group, makeLevel, towerLevel, waves } from './testLevels';

/** A short easy level: 30 grunts in three waves on a straight road, pads on both sides. */
function smallLevel(): LevelDef {
  const pads: Vec2[] = [];
  for (let x = 200; x <= 1000; x += 200) pads.push({ x, y: 260 }, { x, y: 460 });
  return makeLevel({
    paths: [
      [
        { x: -20, y: 360 },
        { x: 1300, y: 360 },
      ],
    ],
    pads,
    startGold: 200,
    waves: waves([group('grunt', 10)], [group('grunt', 10)], [group('grunt', 10, { interval: 0.8 })]),
  });
}

const EASY_LIVES = DIFFICULTY.easy.lives;

describe('playLevel', () => {
  it('wins a small easy level with the greedy strategy', () => {
    const result = playLevel(smallLevel(), 'easy', { strategy: 'greedy' });
    expect(result).toMatchObject({ status: 'won', maxLives: EASY_LIVES, wavesSpawned: 3 });
    expect(result.stars).toBeGreaterThan(0);
    expect(result.livesLeft).toBeGreaterThan(0);
    // It spends at least its starting gold.
    expect(result.goldSpent).toBeGreaterThanOrEqual(Math.round(200 * DIFFICULTY.easy.goldMul));
    // Two countdowns run between the three waves.
    expect(result.time).toBeGreaterThan(2 * WAVE_GAP);
  });

  it('defaults to greedy with a one second think interval', () => {
    expect(playLevel(smallLevel(), 'easy')).toEqual(playLevel(smallLevel(), 'easy', { strategy: 'greedy', thinkInterval: 1 }));
  });

  it('loses the same level when it never builds', () => {
    const result = playLevel(smallLevel(), 'easy', { strategy: 'none' });
    expect(result).toMatchObject({ status: 'lost', stars: 0, livesLeft: 0, maxLives: EASY_LIVES, goldSpent: 0, wavesSpawned: 3 });
  });

  it('counts only the waves that finished spawning', () => {
    const fatal = Math.ceil(EASY_LIVES / ENEMIES.brute.livesCost);
    const level = { ...smallLevel(), waves: waves([group('brute', fatal, { interval: 0.5 })], [group('brute', 20, { interval: 5 })]) };
    // Wave 0 alone empties the lives: lost during the countdown after it, or while wave 1 is spawning.
    const result = playLevel(level, 'easy', { strategy: 'none' });
    expect(result.status).toBe('lost');
    expect(result.wavesSpawned).toBe(1);
  });

  it('gives up after the time limit', () => {
    const level = makeLevel({
      paths: [
        [
          { x: 0, y: 300 },
          { x: 1_000_000, y: 300 },
        ],
      ],
    });
    const result = playLevel(level, 'easy', { strategy: 'none' });
    expect(result.status).toBe('lost');
    expect(result.livesLeft).toBe(EASY_LIVES);
    expect(result.time).toBeCloseTo(BOT_TIME_LIMIT, 6);
  });

  it('is deterministic', () => {
    expect(playLevel(smallLevel(), 'normal', { strategy: 'greedy', thinkInterval: 0.5 })).toEqual(
      playLevel(smallLevel(), 'normal', { strategy: 'greedy', thinkInterval: 0.5 }),
    );
  });
});

describe('greedyCommand', () => {
  const level = makeLevel({
    paths: [
      [
        { x: 0, y: 300 },
        { x: 600, y: 300 },
      ],
    ],
    pads: [
      { x: 300, y: 520 },
      { x: 300, y: 380 },
      { x: 300, y: 430 },
    ],
    towers: ['rifle', 'rocket'],
    startGold: 1000,
  });
  const samples = roadSamples(level);

  it('builds the next kind on the free pad with the most coverage', () => {
    const sim = createSimulation(level, 'normal');
    expect(greedyCommand(sim.view, samples, 0)).toEqual({ type: 'build', pad: 1, kind: 'rifle' });
    sim.command({ type: 'build', pad: 1, kind: 'rifle' });
    expect(greedyCommand(sim.view, samples, 1)).toEqual({ type: 'build', pad: 2, kind: 'rifle' });
    sim.command({ type: 'build', pad: 2, kind: 'rifle' });
    expect(greedyCommand(sim.view, samples, 3)).toEqual({ type: 'build', pad: 0, kind: 'rocket' });
  });

  it('upgrades the affordable tower with the most coverage when it cannot build', () => {
    const sim = createSimulation(level, 'normal');
    sim.command({ type: 'build', pad: 2, kind: 'rifle' });
    sim.command({ type: 'build', pad: 1, kind: 'rifle' });
    const [mid, near] = sim.view.towers;
    // Pad 0 is free but the next kind is a rocket and the gold falls just short of it: upgrade the rifle nearest the road.
    const shortOfRocket = towerLevel('rocket').cost - 1;
    expect(shortOfRocket).toBeGreaterThanOrEqual(towerLevel('rifle', 2).cost);
    expect(greedyCommand({ ...sim.view, gold: shortOfRocket }, samples, 3)).toEqual({ type: 'upgrade', towerId: near?.id });
    // No free pad: upgrade even though a build would be affordable.
    sim.command({ type: 'build', pad: 0, kind: 'rocket' });
    expect(greedyCommand(sim.view, samples, 4)).toEqual({ type: 'upgrade', towerId: near?.id });
    // A maxed tower is skipped; the next best coverage gets the upgrade.
    sim.command({ type: 'upgrade', towerId: near?.id ?? -1 });
    sim.command({ type: 'upgrade', towerId: near?.id ?? -1 });
    expect(greedyCommand(sim.view, samples, 4)).toEqual({ type: 'upgrade', towerId: mid?.id });
    const cheapestUpgrade = Math.min(towerLevel('rifle', 2).cost, towerLevel('rocket', 2).cost);
    expect(greedyCommand({ ...sim.view, gold: cheapestUpgrade - 1 }, samples, 4)).toBeUndefined();
  });
});

describe('buildOrderKind', () => {
  it('opens with two rifles, then cycles the allowed kinds in the fixed order', () => {
    const level = makeLevel({ towers: ['rocket', 'frost', 'rifle', 'cannon'] });
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => buildOrderKind(level, n))).toEqual(['rifle', 'rifle', 'rifle', 'cannon', 'frost', 'rocket', 'rifle']);
  });

  it('opens with cannons when rifles are not allowed', () => {
    const level = makeLevel({ towers: ['tesla', 'cannon'] });
    expect([0, 1, 2, 3, 4].map((n) => buildOrderKind(level, n))).toEqual(['cannon', 'cannon', 'cannon', 'tesla', 'cannon']);
  });

  it('opens with the first allowed kind when neither is allowed', () => {
    expect(buildOrderKind(makeLevel({ towers: ['rocket', 'frost'] }), 0)).toBe('frost');
  });
});

describe('road coverage', () => {
  it('samples every 8 px along every path', () => {
    const level = makeLevel({
      paths: [
        [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
        ],
        [
          { x: 0, y: 100 },
          { x: 0, y: 117 },
        ],
      ],
    });
    const samples = roadSamples(level);
    expect(samples).toHaveLength(11 + 3);
    expect(samples[10]).toEqual({ x: 80, y: 0 });
    expect(samples[13]).toEqual({ x: 0, y: 116 });
  });

  it('counts the samples within range', () => {
    const samples = roadSamples(
      makeLevel({
        paths: [
          [
            { x: 0, y: 0 },
            { x: 80, y: 0 },
          ],
        ],
      }),
    );
    expect(coverage(samples, { x: 40, y: 0 }, 16)).toBe(5);
    expect(coverage(samples, { x: 40, y: 30 }, 16)).toBe(0);
    expect(coverage(samples, { x: 40, y: 0 }, 1000)).toBe(11);
  });

  it('builds on the free pad with the most coverage first', () => {
    const rifle = towerLevel('rifle').cost;
    const level = makeLevel({
      paths: [
        [
          { x: 0, y: 300 },
          { x: 600, y: 300 },
        ],
      ],
      pads: [
        { x: 300, y: 520 },
        { x: 300, y: 380 },
      ],
      startGold: Math.ceil(rifle / DIFFICULTY.normal.goldMul),
      waves: waves([group('grunt', 1)]),
    });
    // The gold only buys one rifle; it goes on pad 1, so the grunt dies before it leaks.
    expect(playLevel(level, 'normal')).toMatchObject({ status: 'won', livesLeft: DIFFICULTY.normal.lives, goldSpent: rifle });
  });
});
