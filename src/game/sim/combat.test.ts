import { describe, expect, it } from 'vitest';
import { CANNON_FLIGHT_TIME } from '../config';
import { FIXED_DT, MAX_PROJECTILES } from '../types';
import { findTarget, stepTowers } from './combat';
import { afterArmor, expectedEnemy, makeLevel, makeWorld, ofType, placeEnemy, placeTower, takeEvents, towerLevel } from './testLevels';

const BOTH = { hitsAir: true, hitsGround: true };

describe('findTarget', () => {
  it('picks the enemy in range with the least distance left to the exit', () => {
    const world = makeWorld();
    placeEnemy(world, 'grunt', 450);
    const front = placeEnemy(world, 'grunt', 600);
    placeEnemy(world, 'grunt', 520);
    placeEnemy(world, 'grunt', 700); // out of range of (500, 400) with range 150
    expect(findTarget(world, BOTH, { x: 500, y: 400 }, 150)).toBe(front);
  });

  it('compares the distance left on each enemy own path', () => {
    const level = makeLevel({
      paths: [
        [
          { x: 0, y: 300 },
          { x: 2000, y: 300 },
        ],
        [
          { x: 1000, y: 500 },
          { x: 0, y: 500 },
        ],
      ],
    });
    const world = makeWorld(level);
    placeEnemy(world, 'grunt', 520); // 1480 left, at (520, 300)
    const onShort = placeEnemy(world, 'grunt', 500, 1); // 500 left, at (500, 500)
    expect(findTarget(world, BOTH, { x: 500, y: 400 }, 150)).toBe(onShort);
  });

  it('breaks ties on the distance left by the lower id', () => {
    const level = makeLevel({
      paths: [
        [
          { x: 0, y: 300 },
          { x: 2000, y: 300 },
        ],
        [
          { x: 1000, y: 500 },
          { x: 0, y: 500 },
          { x: 0, y: -500 },
        ],
      ],
    });
    const world = makeWorld(level);
    const first = placeEnemy(world, 'grunt', 500, 1); // 1500 left, at (500, 500)
    const second = placeEnemy(world, 'grunt', 500); // 1500 left, at (500, 300)
    world.view.enemies.reverse();
    expect(findTarget(world, BOTH, { x: 500, y: 400 }, 150)).toBe(first);
    expect(first.id).toBeLessThan(second.id);
  });

  it('respects air and ground filters and skips the dead', () => {
    const world = makeWorld();
    const grunt = placeEnemy(world, 'grunt', 500);
    const flyer = placeEnemy(world, 'flyer', 550);
    const at = { x: 500, y: 400 };
    expect(findTarget(world, BOTH, at, 150)).toBe(flyer);
    expect(findTarget(world, { hitsAir: false, hitsGround: true }, at, 150)).toBe(grunt);
    expect(findTarget(world, { hitsAir: true, hitsGround: false }, at, 150)).toBe(flyer);
    flyer.hp = 0;
    expect(findTarget(world, BOTH, at, 150)).toBe(grunt);
  });

  it('includes enemies exactly at the range', () => {
    const world = makeWorld();
    const edge = placeEnemy(world, 'grunt', 500);
    expect(findTarget(world, BOTH, { x: 500, y: 400 }, 100)).toBe(edge);
    expect(findTarget(world, BOTH, { x: 500, y: 400 }, 99.9)).toBeUndefined();
  });
});

describe('stepTowers', () => {
  it('fires a hitscan shot, then waits fireInterval', () => {
    const world = makeWorld();
    const rifle = placeTower(world, 0, 'rifle');
    const { damage, fireInterval } = towerLevel('rifle');
    const hit = afterArmor('grunt', damage);
    const grunt = placeEnemy(world, 'grunt', 600);
    grunt.hp = 10 * hit;
    takeEvents(world);
    world.view.time = 2;
    stepTowers(world);
    expect(grunt.hp).toBeCloseTo(9 * hit);
    expect(rifle.aim).toBeCloseTo(Math.atan2(-100, 100));
    expect(rifle.cooldown).toBe(fireInterval);
    expect(rifle.lastFiredAt).toBe(2);
    expect(takeEvents(world)).toEqual([
      { type: 'towerFired', towerId: rifle.id, kind: 'rifle', targetId: grunt.id, from: { x: 500, y: 400 }, to: { x: 600, y: 300 } },
      { type: 'enemyHit', id: grunt.id, amount: expect.closeTo(hit, 9), damageType: 'physical', source: 'rifle' },
    ]);
    const wait = Math.round(fireInterval / FIXED_DT) - 1;
    for (let i = 0; i < wait; i++) stepTowers(world);
    expect(grunt.hp).toBeCloseTo(9 * hit);
    expect(rifle.cooldown).toBeCloseTo(fireInterval - wait * FIXED_DT);
    stepTowers(world);
    expect(grunt.hp).toBeCloseTo(8 * hit);
  });

  it('keeps the last aim and counts the cooldown down without a target', () => {
    const world = makeWorld();
    const rifle = placeTower(world, 0, 'rifle');
    rifle.aim = 1.25;
    rifle.cooldown = 0.5;
    stepTowers(world);
    expect(rifle.aim).toBe(1.25);
    expect(rifle.cooldown).toBeCloseTo(0.5 - FIXED_DT);
    rifle.cooldown = FIXED_DT / 2;
    stepTowers(world);
    expect(rifle.cooldown).toBe(0);
    expect(takeEvents(world).filter((e) => e.type !== 'towerBuilt')).toEqual([]);
  });

  it('uses the stats of the current level', () => {
    const world = makeWorld();
    placeTower(world, 0, 'rifle', 3);
    const rifle1 = towerLevel('rifle');
    const rifle3 = towerLevel('rifle', 3);
    // Halfway between the level 1 and level 3 ranges from the pad at (500, 400), on the road at y = 300.
    const reach = (rifle1.range + rifle3.range) / 2;
    const grunt = placeEnemy(world, 'grunt', 500 + Math.sqrt(reach * reach - 100 * 100));
    stepTowers(world);
    expect(grunt.hp).toBeCloseTo(expectedEnemy('grunt').hp - afterArmor('grunt', rifle3.damage));
  });

  it('chains to the nearest unhit enemy within jump range, with falloff per jump', () => {
    const world = makeWorld();
    const tesla = placeTower(world, 0, 'tesla');
    tesla.pos = { x: 550, y: 380 };
    const a = placeEnemy(world, 'brute', 600); // the target: closest to the exit
    const b = placeEnemy(world, 'brute', 540); // 60 from a
    const c = placeEnemy(world, 'brute', 470); // 70 from b, 130 from a
    const d = placeEnemy(world, 'brute', 680); // 80 from a, but b is nearer
    const e = placeEnemy(world, 'brute', 395); // 75 from c, but the chain is full at 3
    takeEvents(world);
    stepTowers(world);
    const events = takeEvents(world);
    expect(events[0]).toMatchObject({ type: 'towerFired', targetId: a.id, to: { x: 600, y: 300 } });
    expect(ofType(events, 'chainLightning')).toEqual([
      {
        type: 'chainLightning',
        towerId: tesla.id,
        points: [
          { x: 550, y: 380 },
          { x: 600, y: 300 },
          { x: 540, y: 300 },
          { x: 470, y: 300 },
        ],
      },
    ]);
    const hits = ofType(events, 'enemyHit');
    expect(hits.map((h) => h.id)).toEqual([a.id, b.id, c.id]);
    expect(hits.map((h) => h.damageType)).toEqual(['energy', 'energy', 'energy']);
    // Energy ignores the brute armor.
    const { damage, chain } = towerLevel('tesla');
    const keep = 1 - (chain?.falloff ?? 0);
    const hp = expectedEnemy('brute').hp;
    expect(a.hp).toBeCloseTo(hp - damage);
    expect(b.hp).toBeCloseTo(hp - damage * keep);
    expect(c.hp).toBeCloseTo(hp - damage * keep * keep);
    expect(d.hp).toBe(hp);
    expect(e.hp).toBe(hp);
  });

  it('ends the chain when no enemy qualifies', () => {
    const world = makeWorld();
    const tesla = placeTower(world, 0, 'tesla', 3);
    const tesla3 = towerLevel('tesla', 3);
    const hp = expectedEnemy('grunt').hp;
    const a = placeEnemy(world, 'grunt', 560);
    const far = placeEnemy(world, 'grunt', 560 - ((tesla3.chain?.range ?? 0) + 1));
    stepTowers(world);
    const lightning = ofType(takeEvents(world), 'chainLightning')[0];
    expect(lightning?.points).toHaveLength(2);
    expect(a.hp).toBeLessThan(hp);
    expect(far.hp).toBe(hp);
    expect(tesla.cooldown).toBe(tesla3.fireInterval);
  });

  it('launches a cannonball toward the predicted point, ground only', () => {
    const world = makeWorld();
    const cannon = placeTower(world, 0, 'cannon');
    placeEnemy(world, 'flyer', 620);
    const grunt = placeEnemy(world, 'grunt', 500);
    grunt.slowFactor = 0.5;
    takeEvents(world);
    stepTowers(world);
    const [shot] = world.view.projectiles;
    const to = { x: expect.closeTo(500 + expectedEnemy('grunt').speed * 0.5 * CANNON_FLIGHT_TIME, 9), y: 300 };
    expect(shot).toMatchObject({ kind: 'cannonball', towerId: cannon.id, from: { x: 500, y: 400 }, to, progress: 0, height: 0, targetId: null });
    expect(takeEvents(world)).toEqual([{ type: 'towerFired', towerId: cannon.id, kind: 'cannon', targetId: grunt.id, from: { x: 500, y: 400 }, to }]);
  });

  it('holds projectile fire at the projectile cap, hitscan still fires', () => {
    const world = makeWorld();
    const cannon = placeTower(world, 0, 'cannon');
    const rifle = placeTower(world, 1, 'rifle');
    rifle.pos = { x: 600, y: 400 };
    const grunt = placeEnemy(world, 'grunt', 550);
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      cannon.cooldown = 0;
      stepTowers(world);
    }
    expect(world.view.projectiles).toHaveLength(MAX_PROJECTILES);
    cannon.cooldown = 0;
    rifle.cooldown = 0;
    grunt.hp = 1000;
    takeEvents(world);
    world.view.time = 7;
    stepTowers(world);
    expect(world.view.projectiles).toHaveLength(MAX_PROJECTILES);
    expect(cannon.cooldown).toBe(0);
    expect(cannon.lastFiredAt).not.toBe(7);
    expect(rifle.lastFiredAt).toBe(7);
    expect(ofType(takeEvents(world), 'towerFired').map((e) => e.towerId)).toEqual([rifle.id]);
    world.view.projectiles.pop();
    stepTowers(world);
    expect(world.view.projectiles).toHaveLength(MAX_PROJECTILES);
    expect(cannon.lastFiredAt).toBe(7);
  });

  it('launches homing shards and rockets at the target', () => {
    const world = makeWorld();
    const frost = placeTower(world, 0, 'frost');
    const rocket = placeTower(world, 1, 'rocket');
    rocket.pos = { x: 700, y: 400 };
    const grunt = placeEnemy(world, 'grunt', 580);
    stepTowers(world);
    expect(world.view.projectiles).toMatchObject([
      { kind: 'iceShard', towerId: frost.id, targetId: grunt.id, from: { x: 500, y: 400 }, to: { x: 580, y: 300 }, progress: 0, height: 0 },
      { kind: 'rocket', towerId: rocket.id, targetId: grunt.id, from: { x: 700, y: 400 }, to: { x: 580, y: 300 }, progress: 0, height: 0 },
    ]);
    expect(world.view.projectiles[1]?.heading).toBeCloseTo(Math.atan2(-100, -120));
  });
});
