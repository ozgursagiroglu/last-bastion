import { describe, expect, it } from 'vitest';
import { SHIELD_PHYSICAL_EFFICIENCY } from '../config';
import { applySlow, damageAgainst, damageEnemy } from './damage';
import { afterArmor, expectedEnemy, makeWorld, ofType, placeEnemy, resistedSlow, takeEvents } from './testLevels';

const EFF = SHIELD_PHYSICAL_EFFICIENCY;

describe('damageEnemy', () => {
  it('reduces physical damage by armor', () => {
    const world = makeWorld();
    const brute = placeEnemy(world, 'brute', 100);
    takeEvents(world);
    damageEnemy(world, brute, 100, 'physical', 'rifle');
    expect(brute.hp).toBeCloseTo(expectedEnemy('brute').hp - afterArmor('brute', 100));
    expect(takeEvents(world)).toEqual([
      { type: 'enemyHit', id: brute.id, amount: expect.closeTo(afterArmor('brute', 100), 9), damageType: 'physical', source: 'rifle' },
    ]);
  });

  it('lets energy damage ignore armor', () => {
    const world = makeWorld();
    const brute = placeEnemy(world, 'brute', 100);
    damageEnemy(world, brute, 100, 'energy', 'tesla');
    expect(brute.hp).toBe(expectedEnemy('brute').hp - 100);
  });

  it('counts physical damage at reduced efficiency against a shield', () => {
    const world = makeWorld();
    const { hp, shield } = expectedEnemy('shield');
    const orc = placeEnemy(world, 'shield', 100);
    takeEvents(world);
    // Enough to strip all of the shield at full efficiency, but not at the physical rate.
    damageEnemy(world, orc, shield, 'physical', 'cannon');
    expect(orc.shield).toBeCloseTo(shield - shield * EFF);
    expect(orc.hp).toBe(hp);
    expect(ofType(takeEvents(world), 'enemyHit')[0]?.amount).toBeCloseTo(shield * EFF);
  });

  it('carries shield overflow into HP (physical through armor, energy in full)', () => {
    const world = makeWorld();
    const { hp, shield } = expectedEnemy('shield');
    const a = placeEnemy(world, 'shield', 100);
    takeEvents(world);
    // shield / EFF damage strips the shield; the 40 left go through armor.
    damageEnemy(world, a, shield / EFF + 40, 'physical', 'rocket');
    expect(a.shield).toBe(0);
    expect(a.hp).toBeCloseTo(hp - afterArmor('shield', 40));
    expect(ofType(takeEvents(world), 'enemyHit')[0]?.amount).toBeCloseTo(shield + afterArmor('shield', 40));

    const b = placeEnemy(world, 'shield', 100);
    takeEvents(world);
    damageEnemy(world, b, shield + 20, 'energy', 'frost');
    expect(b.shield).toBe(0);
    expect(b.hp).toBe(hp - 20);
    expect(ofType(takeEvents(world), 'enemyHit')[0]?.amount).toBe(shield + 20);
  });

  it('records lastHitAt', () => {
    const world = makeWorld();
    const grunt = placeEnemy(world, 'grunt', 100);
    expect(grunt.lastHitAt).toBe(-Infinity);
    world.view.time = 4.5;
    damageEnemy(world, grunt, 1, 'physical', 'rifle');
    expect(grunt.lastHitAt).toBe(4.5);
  });

  it('kills once: bounty and enemyKilled on the first lethal hit, later hits ignored', () => {
    const world = makeWorld();
    const { hp, bounty } = expectedEnemy('grunt');
    const grunt = placeEnemy(world, 'grunt', 100);
    takeEvents(world);
    const gold = world.view.gold;
    damageEnemy(world, grunt, hp - 10, 'energy', 'tesla');
    damageEnemy(world, grunt, 50, 'energy', 'frost');
    damageEnemy(world, grunt, 50, 'physical', 'cannon');
    const events = takeEvents(world);
    expect(ofType(events, 'enemyHit').map((e) => e.amount)).toEqual([hp - 10, 10]);
    expect(ofType(events, 'enemyKilled')).toEqual([{ type: 'enemyKilled', id: grunt.id, kind: 'grunt', pos: { x: 100, y: 300 }, bounty }]);
    expect(world.view.gold).toBe(gold + bounty);
  });
});

describe('damageAgainst', () => {
  it('applies the air multiplier to flying enemies only', () => {
    const world = makeWorld();
    expect(damageAgainst(placeEnemy(world, 'flyer', 0), 60, 1.5)).toBe(90);
    expect(damageAgainst(placeEnemy(world, 'grunt', 0), 60, 1.5)).toBe(60);
  });
});

describe('applySlow', () => {
  it('reduces the slow by slowResist and keeps the strongest, longest slow', () => {
    const world = makeWorld();
    const boss = placeEnemy(world, 'boss', 0);
    applySlow(boss, { factor: 0.65, duration: 2 });
    expect(boss.slowFactor).toBeCloseTo(resistedSlow('boss', 0.65));
    expect(boss.slowTimer).toBe(2);
    applySlow(boss, { factor: 0.9, duration: 1 });
    expect(boss.slowFactor).toBeCloseTo(resistedSlow('boss', 0.65));
    expect(boss.slowTimer).toBe(2);
    applySlow(boss, { factor: 0.45, duration: 2.5 });
    expect(boss.slowFactor).toBeCloseTo(resistedSlow('boss', 0.45));
    expect(boss.slowTimer).toBe(2.5);

    const grunt = placeEnemy(world, 'grunt', 0);
    applySlow(grunt, { factor: 0.65, duration: 2 });
    expect(grunt.slowFactor).toBeCloseTo(resistedSlow('grunt', 0.65));
  });
});
