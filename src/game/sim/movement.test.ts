import { describe, expect, it } from 'vitest';
import { DIFFICULTY, ENEMIES } from '../config';
import { FIXED_DT } from '../types';
import { moveEnemies, tickSlows } from './movement';
import { expectedEnemy, makeLevel, makeWorld, placeEnemy, takeEvents } from './testLevels';

describe('moveEnemies', () => {
  it('advances by speed × slowFactor × FIXED_DT and follows the path', () => {
    const level = makeLevel({
      paths: [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 500 },
        ],
      ],
    });
    const world = makeWorld(level, 'easy');
    const speed = expectedEnemy('grunt', 1, 'easy').speed;
    const step = speed * FIXED_DT;
    // Just before the corner, so this step turns it.
    const grunt = placeEnemy(world, 'grunt', 100 - step / 2);
    const slowed = placeEnemy(world, 'grunt', 10);
    slowed.slowFactor = 0.5;
    moveEnemies(world);
    expect(grunt.distance).toBeCloseTo(100 + step / 2);
    expect(grunt.pos.x).toBe(100);
    expect(grunt.pos.y).toBeCloseTo(step / 2);
    expect(grunt.heading).toBeCloseTo(Math.PI / 2);
    expect(slowed.distance).toBeCloseTo(10 + speed * 0.5 * FIXED_DT);
    expect(slowed.heading).toBe(0);
  });

  it('removes enemies that reach the exit and takes their lives', () => {
    const world = makeWorld();
    const brute = placeEnemy(world, 'brute', 1999.9);
    const grunt = placeEnemy(world, 'grunt', 1999.9);
    const far = placeEnemy(world, 'grunt', 100);
    takeEvents(world);
    moveEnemies(world);
    expect(world.view.lives).toBe(DIFFICULTY.normal.lives - ENEMIES.brute.livesCost - ENEMIES.grunt.livesCost);
    expect(world.view.enemies).toEqual([far]);
    expect(world.enemyById.has(brute.id)).toBe(false);
    expect(world.aliveByKind).toMatchObject({ brute: 0, grunt: 1 });
    expect(takeEvents(world)).toEqual([
      { type: 'enemyLeaked', id: brute.id, kind: 'brute', livesLost: ENEMIES.brute.livesCost },
      { type: 'enemyLeaked', id: grunt.id, kind: 'grunt', livesLost: ENEMIES.grunt.livesCost },
    ]);
  });

  it('never takes lives below 0', () => {
    const world = makeWorld();
    world.view.lives = 1;
    placeEnemy(world, 'boss', 1999.99);
    moveEnemies(world);
    expect(world.view.lives).toBe(0);
  });
});

describe('tickSlows', () => {
  it('counts the slow down and restores the speed at 0', () => {
    const world = makeWorld();
    const grunt = placeEnemy(world, 'grunt', 0);
    grunt.slowFactor = 0.65;
    grunt.slowTimer = 0.5;
    for (let i = 0; i < 29; i++) tickSlows(world);
    expect(grunt.slowTimer).toBeCloseTo(0.5 - 29 * FIXED_DT);
    expect(grunt.slowFactor).toBe(0.65);
    tickSlows(world);
    expect(grunt.slowTimer).toBe(0);
    expect(grunt.slowFactor).toBe(1);
  });
});
