import { describe, expect, it } from 'vitest';
import { DIFFICULTY, ENEMIES, STAR_THRESHOLDS, WAVE_GAP } from '../config';
import { removeDead, removeEnemies } from './enemies';
import { checkEnd, starsFor } from './outcome';
import { createSimulation } from './simulation';
import { group, makeLevel, makeWorld, ofType, stepMany, stepUntil, waves } from './testLevels';
import { callWave, stepWaves } from './waves';

describe('starsFor', () => {
  it.each([
    [10, 10, 3],
    [9, 10, 3],
    [8, 10, 2],
    [5, 10, 2],
    [4, 10, 1],
    [1, 10, 1],
    [23, 25, 3],
    [22, 25, 2],
    [13, 25, 2],
    [12, 25, 1],
  ] as const)('%i of %i lives → %i stars', (lives, max, stars) => {
    expect(starsFor(lives, max)).toBe(stars);
  });
});

describe('end of the level', () => {
  it('is lost once at 0 lives and freezes afterwards', () => {
    // Five more grunts than it takes to empty the normal lives leak on a short road.
    const fatal = Math.ceil(DIFFICULTY.normal.lives / ENEMIES.grunt.livesCost);
    const level = makeLevel({
      paths: [
        [
          { x: 0, y: 300 },
          { x: 100, y: 300 },
        ],
      ],
      waves: waves([group('grunt', fatal + 5, { interval: 0.1 })]),
    });
    const sim = createSimulation(level, 'normal');
    sim.command({ type: 'callWave' });
    const events = stepUntil(sim, () => sim.view.status !== 'running');
    expect(sim.view.status).toBe('lost');
    expect(sim.view.lives).toBe(0);
    expect(sim.view.stars).toBe(0);
    expect(sim.view.canCallWave).toBe(false);
    expect(ofType(events, 'levelLost')).toHaveLength(1);
    expect(ofType(events, 'enemyLeaked')).toHaveLength(fatal);

    const time = sim.view.time;
    const enemies = sim.view.enemies.map((e) => ({ ...e, pos: { ...e.pos } }));
    expect(stepMany(sim, 120)).toEqual([]);
    expect(sim.view.time).toBe(time);
    expect(sim.view.enemies).toEqual(enemies);
    expect(sim.command({ type: 'callWave' })).toEqual({ ok: false, reason: 'gameOver' });
    expect(sim.command({ type: 'build', pad: 0, kind: 'rifle' })).toEqual({ ok: false, reason: 'gameOver' });
    expect(sim.command({ type: 'upgrade', towerId: 1 })).toEqual({ ok: false, reason: 'gameOver' });
    expect(sim.command({ type: 'sell', towerId: 1 })).toEqual({ ok: false, reason: 'gameOver' });
  });

  it('is won when the last wave has spawned and nothing is left, with stars from the lives left', () => {
    const level = makeLevel({
      paths: [
        [
          { x: 0, y: 300 },
          { x: 100, y: 300 },
        ],
      ],
      waves: waves([group('grunt', 1)], [group('grunt', 1)]),
    });
    const sim = createSimulation(level, 'hard');
    sim.command({ type: 'callWave' });
    const events = stepUntil(sim, () => sim.view.status !== 'running');
    // Two leaks on hard. The second wave started after the countdown.
    const max = DIFFICULTY.hard.lives;
    const lives = max - 2 * ENEMIES.grunt.livesCost;
    const ratio = lives / max;
    const stars = ratio >= STAR_THRESHOLDS.three ? 3 : ratio >= STAR_THRESHOLDS.two ? 2 : 1;
    expect(sim.view.status).toBe('won');
    expect(sim.view.lives).toBe(lives);
    expect(sim.view.stars).toBe(stars);
    expect(sim.view.time).toBeGreaterThan(WAVE_GAP);
    expect(events.at(-1)).toEqual({ type: 'levelWon', stars });
    expect(sim.command({ type: 'build', pad: 0, kind: 'rifle' })).toEqual({ ok: false, reason: 'gameOver' });
    expect(sim.step()).toEqual([]);
  });

  it('is not won while the last wave is still spawning, even with no enemy alive', () => {
    const world = makeWorld(makeLevel({ waves: waves([group('grunt', 1), group('runner', 1, { delay: 5 })]) }));
    callWave(world);
    stepWaves(world);
    const grunt = world.view.enemies[0];
    if (!grunt) throw new Error('no grunt');
    grunt.hp = 0;
    removeDead(world);
    checkEnd(world);
    expect(world.view.status).toBe('running');
    for (let i = 0; i < 300; i++) stepWaves(world);
    expect(world.view.enemies.map((e) => e.kind)).toEqual(['runner']);
    removeEnemies(world, () => true);
    checkEnd(world);
    expect(world.view.status).toBe('won');
    expect(world.view.stars).toBe(3);
  });
});
