import { describe, expect, it } from 'vitest';
import { SELL_REFUND } from '../config';
import { build, sell, upgrade, upgradeCost } from './economy';
import { makeWorld, makeLevel, takeEvents, towerLevel } from './testLevels';
import type { World } from './world';

const RIFLE = [towerLevel('rifle', 1).cost, towerLevel('rifle', 2).cost, towerLevel('rifle', 3).cost] as const;
const refund = (spent: number) => Math.floor(spent * SELL_REFUND + 1e-9);

function worldWithGold(gold: number, ...args: Parameters<typeof makeLevel>): World {
  const world = makeWorld(makeLevel(...args));
  world.view.gold = gold;
  return world;
}

describe('build', () => {
  it('creates a level 1 tower at the pad center and charges its cost', () => {
    const world = worldWithGold(RIFLE[0] + 30);
    expect(build(world, 1, 'rifle')).toEqual({ ok: true });
    expect(world.view.gold).toBe(30);
    const [tower] = world.view.towers;
    expect(tower).toEqual({ id: 1, kind: 'rifle', level: 1, pad: 1, pos: { x: 800, y: 400 }, aim: 0, cooldown: 0, lastFiredAt: -Infinity, spent: RIFLE[0] });
    expect(tower?.pos).not.toBe(world.view.level.pads[1]);
    expect(takeEvents(world)).toEqual([{ type: 'towerBuilt', towerId: 1, pad: 1, kind: 'rifle' }]);
  });

  it('refuses invalid pads', () => {
    const world = makeWorld();
    expect(build(world, -1, 'rifle')).toEqual({ ok: false, reason: 'invalidPad' });
    expect(build(world, 4, 'rifle')).toEqual({ ok: false, reason: 'invalidPad' });
    expect(build(world, 0.5, 'rifle')).toEqual({ ok: false, reason: 'invalidPad' });
  });

  it('refuses an occupied pad', () => {
    const world = makeWorld();
    build(world, 0, 'rifle');
    expect(build(world, 0, 'cannon')).toEqual({ ok: false, reason: 'padOccupied' });
  });

  it('refuses kinds the level does not allow', () => {
    const world = makeWorld(makeLevel({ towers: ['rifle', 'cannon'] }));
    expect(build(world, 0, 'tesla')).toEqual({ ok: false, reason: 'towerNotAllowed' });
  });

  it('refuses when gold is short, and charges nothing', () => {
    const cost = towerLevel('cannon').cost;
    const world = worldWithGold(cost - 1);
    expect(build(world, 0, 'cannon')).toEqual({ ok: false, reason: 'insufficientGold' });
    expect(world.view.gold).toBe(cost - 1);
    expect(world.view.towers).toEqual([]);
    expect(takeEvents(world)).toEqual([]);
    world.view.gold = cost;
    expect(build(world, 0, 'cannon')).toEqual({ ok: true });
    expect(world.view.gold).toBe(0);
  });
});

describe('upgrade', () => {
  it('raises the level, charges the next cost and keeps the cooldown', () => {
    const world = worldWithGold(1000 + RIFLE[0]);
    build(world, 0, 'rifle');
    const tower = world.view.towers[0];
    if (!tower) throw new Error('no tower');
    tower.cooldown = 0.3;
    takeEvents(world);
    expect(upgradeCost(tower)).toBe(RIFLE[1]);
    expect(upgrade(world, tower.id)).toEqual({ ok: true });
    expect(tower).toMatchObject({ level: 2, spent: RIFLE[0] + RIFLE[1], cooldown: 0.3 });
    expect(world.view.gold).toBe(1000 - RIFLE[1]);
    expect(upgradeCost(tower)).toBe(RIFLE[2]);
    expect(upgrade(world, tower.id)).toEqual({ ok: true });
    expect(tower).toMatchObject({ level: 3, spent: RIFLE[0] + RIFLE[1] + RIFLE[2] });
    expect(world.view.gold).toBe(1000 - RIFLE[1] - RIFLE[2]);
    expect(upgradeCost(tower)).toBeUndefined();
    expect(takeEvents(world)).toEqual([
      { type: 'towerUpgraded', towerId: tower.id, level: 2 },
      { type: 'towerUpgraded', towerId: tower.id, level: 3 },
    ]);
    expect(upgrade(world, tower.id)).toEqual({ ok: false, reason: 'maxLevel' });
    expect(world.view.gold).toBe(1000 - RIFLE[1] - RIFLE[2]);
  });

  it('refuses unknown towers and short gold', () => {
    const world = worldWithGold(RIFLE[0] + RIFLE[1] - 1);
    build(world, 0, 'rifle');
    expect(upgrade(world, 99)).toEqual({ ok: false, reason: 'noSuchTower' });
    expect(upgrade(world, 1)).toEqual({ ok: false, reason: 'insufficientGold' });
    expect(world.view.towers[0]?.level).toBe(1);
    expect(world.view.gold).toBe(RIFLE[1] - 1);
  });
});

describe('sell', () => {
  it('refunds floor(spent × SELL_REFUND) and frees the pad', () => {
    const world = worldWithGold(1000);
    const frost = towerLevel('frost').cost;
    build(world, 0, 'rifle');
    build(world, 1, 'frost');
    upgrade(world, 1);
    takeEvents(world);
    const rifleRefund = refund(RIFLE[0] + RIFLE[1]);
    const frostRefund = refund(frost);
    expect(sell(world, 1)).toEqual({ ok: true });
    expect(world.view.gold).toBe(1000 - RIFLE[0] - RIFLE[1] - frost + rifleRefund);
    expect(sell(world, 2)).toEqual({ ok: true });
    expect(world.view.gold).toBe(1000 - RIFLE[0] - RIFLE[1] - frost + rifleRefund + frostRefund);
    expect(world.view.towers).toEqual([]);
    expect(takeEvents(world)).toEqual([
      { type: 'towerSold', towerId: 1, pad: 0, refund: rifleRefund },
      { type: 'towerSold', towerId: 2, pad: 1, refund: frostRefund },
    ]);
    expect(build(world, 0, 'cannon')).toEqual({ ok: true });
    expect(world.view.towers[0]?.id).toBe(3);
  });

  it('rounds the refund down', () => {
    const world = worldWithGold(1000);
    build(world, 0, 'rifle');
    const tower = world.view.towers[0];
    if (!tower) throw new Error('no tower');
    // A spend whose refund has a fractional part.
    let spent = 75;
    while (spent < 100 && Number.isInteger(spent * SELL_REFUND)) spent++;
    tower.spent = spent;
    sell(world, tower.id);
    expect(world.view.gold).toBe(1000 - RIFLE[0] + Math.floor(spent * SELL_REFUND));
  });

  it('refuses unknown towers', () => {
    expect(sell(makeWorld(), 1)).toEqual({ ok: false, reason: 'noSuchTower' });
  });
});
