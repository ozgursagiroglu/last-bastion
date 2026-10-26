import { describe, expect, it } from 'vitest';
import { canHit, removeDead, spawnEnemy } from './enemies';
import { expectedEnemy, makeLevel, makeWorld, placeEnemy, takeEvents } from './testLevels';

describe('spawnEnemy', () => {
  it('creates a scaled enemy at the first path point with the first segment heading', () => {
    const level = makeLevel({
      id: 3,
      paths: [
        [
          { x: 10, y: 20 },
          { x: 10, y: 500 },
        ],
      ],
    });
    const world = makeWorld(level, 'hard');
    const enemy = spawnEnemy(world, 'shield', 0);
    const { hp, shield } = expectedEnemy('shield', 3, 'hard');
    expect(enemy).toMatchObject({
      kind: 'shield',
      path: 0,
      distance: 0,
      pos: { x: 10, y: 20 },
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      slowFactor: 1,
      slowTimer: 0,
      lastHitAt: -Infinity,
    });
    expect(enemy.heading).toBeCloseTo(Math.PI / 2);
    expect(world.view.enemies).toEqual([enemy]);
    expect(world.aliveByKind.shield).toBe(1);
    expect(takeEvents(world)).toEqual([{ type: 'enemySpawned', id: enemy.id, kind: 'shield' }]);
  });

  it('rejects a missing path', () => {
    expect(() => spawnEnemy(makeWorld(), 'grunt', 3)).toThrow();
  });
});

describe('canHit', () => {
  it('filters air and ground and skips the dead', () => {
    const world = makeWorld();
    const grunt = placeEnemy(world, 'grunt', 0);
    const flyer = placeEnemy(world, 'flyer', 0);
    expect(canHit({ hitsAir: false, hitsGround: true }, grunt)).toBe(true);
    expect(canHit({ hitsAir: false, hitsGround: true }, flyer)).toBe(false);
    expect(canHit({ hitsAir: true, hitsGround: false }, grunt)).toBe(false);
    expect(canHit({ hitsAir: true, hitsGround: false }, flyer)).toBe(true);
    grunt.hp = 0;
    expect(canHit({ hitsAir: true, hitsGround: true }, grunt)).toBe(false);
  });
});

describe('removeDead', () => {
  it('drops dead enemies from the list, the id map and the live counts', () => {
    const world = makeWorld();
    const a = placeEnemy(world, 'grunt', 0);
    const b = placeEnemy(world, 'grunt', 10);
    const c = placeEnemy(world, 'grunt', 20);
    b.hp = -3;
    removeDead(world);
    expect(world.view.enemies).toEqual([a, c]);
    expect(world.enemyById.has(b.id)).toBe(false);
    expect(world.aliveByKind.grunt).toBe(2);
  });
});
