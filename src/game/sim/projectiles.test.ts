import { describe, expect, it } from 'vitest';
import { CANNON_ARC_HEIGHT, CANNON_FLIGHT_TIME, ROCKET_RETARGET_RADIUS, TOWERS } from '../config';
import { FIXED_DT } from '../types';
import { stepTowers } from './combat';
import { removeDead } from './enemies';
import { moveEnemies } from './movement';
import { stepProjectiles } from './projectiles';
import {
  afterArmor,
  expectedEnemy,
  makeLevel,
  makeWorld,
  ofType,
  placeEnemy,
  placeTower,
  resistedSlow,
  takeEvents,
  towerLevel,
} from './testLevels';
import type { World } from './world';

/** Steps projectiles until one ends; returns the events of that step and the number of steps. */
function flyUntilHit(world: World, limit = 200): { events: ReturnType<typeof takeEvents>; steps: number } {
  for (let steps = 1; steps <= limit; steps++) {
    stepProjectiles(world);
    const events = takeEvents(world);
    if (events.some((e) => e.type === 'projectileHit')) return { events, steps };
  }
  throw new Error('no projectile hit');
}

const GRUNT = expectedEnemy('grunt');
const CANNON = towerLevel('cannon');
const CANNON_SPLASH = CANNON.splashRadius ?? 0;
const FLIGHT_STEPS = Math.round(CANNON_FLIGHT_TIME / FIXED_DT);
/** Where a cannonball fired at an unslowed grunt at distance 500 lands. */
const LANDING_X = 500 + GRUNT.speed * CANNON_FLIGHT_TIME;

describe('cannonball', () => {
  it('arcs for CANNON_FLIGHT_TIME and splashes ground enemies at the landing point', () => {
    const world = makeWorld();
    const cannon = placeTower(world, 0, 'cannon');
    cannon.pos = { x: 420, y: 400 };
    const target = placeEnemy(world, 'grunt', 500);
    const near = placeEnemy(world, 'grunt', LANDING_X + CANNON_SPLASH - 5);
    const outside = placeEnemy(world, 'grunt', LANDING_X + CANNON_SPLASH + 10);
    const flyer = placeEnemy(world, 'flyer', LANDING_X + 5);
    stepTowers(world);
    takeEvents(world);
    const shot = world.view.projectiles[0];
    if (!shot) throw new Error('no cannonball');
    expect(shot.heading).toBeCloseTo(Math.atan2(-100, LANDING_X - 420));

    const half = Math.floor(FLIGHT_STEPS / 2);
    for (let i = 0; i < half; i++) stepProjectiles(world);
    const p = (half * FIXED_DT) / CANNON_FLIGHT_TIME;
    expect(shot.progress).toBeCloseTo(p);
    expect(shot.height).toBeCloseTo(4 * CANNON_ARC_HEIGHT * p * (1 - p));
    expect(shot.pos.x).toBeCloseTo(420 + (LANDING_X - 420) * p);
    expect(shot.pos.y).toBeCloseTo(400 - 100 * p);
    expect(takeEvents(world)).toEqual([]);

    const { events, steps } = flyUntilHit(world);
    expect(steps).toBe(FLIGHT_STEPS - half);
    expect(shot.height).toBe(0);
    expect(world.view.projectiles).toEqual([]);
    expect(world.payloads.size).toBe(0);
    expect(ofType(events, 'projectileHit')).toEqual([
      { type: 'projectileHit', id: shot.id, kind: 'cannonball', pos: { x: expect.closeTo(LANDING_X, 9), y: 300 }, splashRadius: CANNON_SPLASH },
    ]);
    expect(ofType(events, 'enemyHit').map((e) => e.id)).toEqual([target.id, near.id]);
    expect(target.hp).toBeCloseTo(GRUNT.hp - afterArmor('grunt', CANNON.damage));
    expect(near.hp).toBeCloseTo(GRUNT.hp - afterArmor('grunt', CANNON.damage));
    expect(outside.hp).toBe(GRUNT.hp);
    expect(flyer.hp).toBe(expectedEnemy('flyer').hp);
  });

  it('lands where a moving target arrives', () => {
    const world = makeWorld();
    placeTower(world, 0, 'cannon');
    const target = placeEnemy(world, 'grunt', 500);
    stepTowers(world);
    for (let i = 0; i < FLIGHT_STEPS; i++) {
      moveEnemies(world);
      stepProjectiles(world);
    }
    expect(world.view.projectiles).toEqual([]);
    expect(target.hp).toBeCloseTo(GRUNT.hp - afterArmor('grunt', CANNON.damage));
    expect(target.pos.x).toBeCloseTo(LANDING_X, 0);
  });

  it('kills once when two shells land in the same step', () => {
    const world = makeWorld();
    placeTower(world, 0, 'cannon');
    const second = placeTower(world, 1, 'cannon');
    second.pos = { x: 520, y: 400 };
    const grunt = placeEnemy(world, 'grunt', 500);
    grunt.hp = 10;
    const gold = world.view.gold;
    stepTowers(world);
    expect(world.view.projectiles).toHaveLength(2);
    takeEvents(world);
    const { events } = flyUntilHit(world);
    expect(ofType(events, 'projectileHit')).toHaveLength(2);
    expect(ofType(events, 'enemyHit')).toHaveLength(1);
    expect(ofType(events, 'enemyKilled')).toHaveLength(1);
    expect(world.view.gold).toBe(gold + GRUNT.bounty);
    removeDead(world);
    expect(world.view.enemies).toEqual([]);
  });
});

describe('ice shard', () => {
  const frost = towerLevel('frost');
  const shardStep = (TOWERS.frost.projectileSpeed ?? 0) * FIXED_DT;

  it('homes in on its target, damages it and slows it by the resisted amount', () => {
    const world = makeWorld();
    placeTower(world, 0, 'frost');
    const boss = placeEnemy(world, 'boss', 500);
    stepTowers(world);
    takeEvents(world);
    const shard = world.view.projectiles[0];
    if (!shard) throw new Error('no shard');
    stepProjectiles(world);
    expect(shard.pos.y).toBeCloseTo(400 - shardStep);
    boss.pos.x = 510;
    stepProjectiles(world);
    expect(shard.to).toEqual({ x: 510, y: 300 });
    expect(shard.heading).toBeCloseTo(Math.atan2(300 - (400 - shardStep), 10));
    const { events } = flyUntilHit(world);
    expect(ofType(events, 'enemyHit')).toEqual([{ type: 'enemyHit', id: boss.id, amount: frost.damage, damageType: 'energy', source: 'frost' }]);
    expect(ofType(events, 'projectileHit')).toEqual([{ type: 'projectileHit', id: shard.id, kind: 'iceShard', pos: { x: 510, y: 300 }, splashRadius: 0 }]);
    expect(boss.hp).toBe(expectedEnemy('boss').hp - frost.damage);
    expect(boss.slowFactor).toBeCloseTo(resistedSlow('boss', frost.slow?.factor ?? 1));
    expect(boss.slowTimer).toBe(frost.slow?.duration);
  });

  it('applies the slow of the tower level', () => {
    const world = makeWorld();
    placeTower(world, 0, 'frost', 3);
    const grunt = placeEnemy(world, 'grunt', 500);
    stepTowers(world);
    flyUntilHit(world);
    const slow = towerLevel('frost', 3).slow;
    expect(grunt.slowFactor).toBeCloseTo(resistedSlow('grunt', slow?.factor ?? 1));
    expect(grunt.slowTimer).toBe(slow?.duration);
  });

  it('flies on to the last position and vanishes when its target is gone', () => {
    const world = makeWorld();
    placeTower(world, 0, 'frost');
    const target = placeEnemy(world, 'grunt', 500);
    stepTowers(world);
    const shard = world.view.projectiles[0];
    if (!shard) throw new Error('no shard');
    stepProjectiles(world);
    target.hp = 0;
    removeDead(world);
    const bystander = placeEnemy(world, 'grunt', 500);
    takeEvents(world);
    stepProjectiles(world);
    expect(shard.targetId).toBeNull();
    const { events } = flyUntilHit(world);
    expect(ofType(events, 'enemyHit')).toEqual([]);
    expect(ofType(events, 'projectileHit')[0]?.pos).toEqual({ x: 500, y: 300 });
    expect(bystander.hp).toBe(GRUNT.hp);
    expect(bystander.slowFactor).toBe(1);
  });
});

describe('rocket', () => {
  const level10 = () => makeLevel({ id: 10 });
  const rocket1 = towerLevel('rocket');
  const splash = rocket1.splashRadius ?? 0;
  const grunt10 = expectedEnemy('grunt', 10);
  const hitGrunt = grunt10.hp - afterArmor('grunt', rocket1.damage);

  it('homes in, splashes at the target and deals the air multiplier to flyers', () => {
    const world = makeWorld(level10());
    placeTower(world, 0, 'rocket');
    const flyer = placeEnemy(world, 'flyer', 600);
    const near = placeEnemy(world, 'grunt', 600 - (splash - 5));
    const far = placeEnemy(world, 'grunt', 450);
    stepTowers(world);
    takeEvents(world);
    const rocket = world.view.projectiles[0];
    if (!rocket) throw new Error('no rocket');
    expect(rocket.targetId).toBe(flyer.id);
    for (let i = 0; i < 5; i++) {
      flyer.pos.x += 2;
      near.pos.x += 2;
      stepProjectiles(world);
      expect(rocket.to).toEqual(flyer.pos);
    }
    const { events } = flyUntilHit(world);
    expect(ofType(events, 'projectileHit')).toEqual([{ type: 'projectileHit', id: rocket.id, kind: 'rocket', pos: { x: 610, y: 300 }, splashRadius: splash }]);
    const air = TOWERS.rocket.airDamageMultiplier ?? 1;
    expect(flyer.hp).toBeCloseTo(expectedEnemy('flyer', 10).hp - afterArmor('flyer', rocket1.damage * air));
    expect(near.hp).toBeCloseTo(hitGrunt);
    expect(far.hp).toBe(grunt10.hp);
  });

  it('retargets to the hittable enemy nearest to the last position when its target is gone', () => {
    const world = makeWorld(level10());
    placeTower(world, 0, 'rocket');
    const target = placeEnemy(world, 'grunt', 600);
    stepTowers(world);
    const rocket = world.view.projectiles[0];
    if (!rocket) throw new Error('no rocket');
    stepProjectiles(world);
    target.hp = 0;
    removeDead(world);
    const further = placeEnemy(world, 'grunt', 600 + ROCKET_RETARGET_RADIUS - 10);
    const nearerX = 600 - (ROCKET_RETARGET_RADIUS - 30);
    const nearer = placeEnemy(world, 'grunt', nearerX);
    takeEvents(world);
    stepProjectiles(world);
    expect(rocket.targetId).toBe(nearer.id);
    expect(rocket.to).toEqual({ x: nearerX, y: 300 });
    const { events } = flyUntilHit(world);
    expect(ofType(events, 'projectileHit')[0]?.pos).toEqual({ x: nearerX, y: 300 });
    expect(nearer.hp).toBeCloseTo(hitGrunt);
    expect(further.hp).toBe(grunt10.hp);
  });

  it('explodes at the last position when nothing is left within the retarget radius', () => {
    const world = makeWorld(level10());
    placeTower(world, 0, 'rocket');
    const target = placeEnemy(world, 'grunt', 600);
    stepTowers(world);
    const rocket = world.view.projectiles[0];
    if (!rocket) throw new Error('no rocket');
    target.hp = 0;
    removeDead(world);
    const outside = placeEnemy(world, 'grunt', 600 + ROCKET_RETARGET_RADIUS + 10);
    takeEvents(world);
    stepProjectiles(world);
    expect(rocket.targetId).toBeNull();
    const { events } = flyUntilHit(world);
    expect(ofType(events, 'projectileHit')).toEqual([{ type: 'projectileHit', id: rocket.id, kind: 'rocket', pos: { x: 600, y: 300 }, splashRadius: splash }]);
    expect(ofType(events, 'enemyHit')).toEqual([]);
    expect(outside.hp).toBe(grunt10.hp);
  });

  it('keeps the launch payload when the tower is upgraded or sold in flight', () => {
    const world = makeWorld(level10());
    const tower = placeTower(world, 0, 'rocket');
    const grunt = placeEnemy(world, 'grunt', 600);
    stepTowers(world);
    tower.level = 3;
    world.view.towers.length = 0;
    flyUntilHit(world);
    expect(grunt.hp).toBeCloseTo(hitGrunt);
  });
});
