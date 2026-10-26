import { describe, expect, it } from 'vitest';
import { textWidth } from '../../art/ui/text';
import { TOWERS } from '../../game/config';
import { getLevel } from '../../game/levels';
import { createSimulation } from '../../game/sim';
import { TOWER_KINDS, type TowerState } from '../../game/types';
import { buildCost, earlyCallBonus, levelStats, sellRefund, statsInfo, upgradeCost, upgradeHeading, waveHasBoss, waveText, wrapTwoLines } from './info';

function tower(level: 1 | 2 | 3, spent: number): TowerState {
  return { id: 1, kind: 'cannon', level, pad: 0, pos: { x: 0, y: 0 }, aim: 0, cooldown: 0, lastFiredAt: -Infinity, spent };
}

describe('costs', () => {
  it('reads build and upgrade costs from the stat table', () => {
    expect(buildCost('rocket')).toBe(TOWERS.rocket.levels[0].cost);
    expect(upgradeCost(tower(1, 0))).toBe(TOWERS.cannon.levels[1].cost);
    expect(upgradeCost(tower(2, 0))).toBe(TOWERS.cannon.levels[2].cost);
    expect(upgradeCost(tower(3, 0))).toBeNull();
    expect(levelStats('frost', 3)).toBe(TOWERS.frost.levels[2]);
  });

  it('refunds the floor of 70% of what was spent', () => {
    expect(sellRefund(tower(1, 125))).toBe(87);
  });

  it('rounds the early-call bonus up like the sim', () => {
    expect(earlyCallBonus(7.2)).toBe(8);
    expect(earlyCallBonus(12)).toBe(12);
    expect(earlyCallBonus(0.01)).toBe(1);
  });
});

describe('texts', () => {
  it('formats the wave counter from the view', () => {
    const sim = createSimulation(getLevel(1), 'normal');
    expect(waveText(sim.view)).toBe(`0/${sim.view.waveCount}`);
    sim.command({ type: 'callWave' });
    expect(waveText(sim.view)).toBe(`1/${sim.view.waveCount}`);
  });

  it('finds boss waves', () => {
    const level = getLevel(5);
    const boss = level.waves.findIndex((w) => w.groups.some((g) => g.enemy === 'boss'));
    expect(waveHasBoss(level, boss)).toBe(true);
    expect(waveHasBoss(level, 0)).toBe(false);
    expect(waveHasBoss(level, 99)).toBe(false);
  });

  it('wraps every description into two lines that fit', () => {
    for (const kind of TOWER_KINDS) {
      const [a, b] = wrapTwoLines(TOWERS[kind].description, 15, 268);
      expect(`${a} ${b}`.trim()).toBe(TOWERS[kind].description);
      expect(textWidth(a, 15)).toBeLessThanOrEqual(268);
      expect(textWidth(b, 15)).toBeLessThanOrEqual(268);
    }
  });

  it('builds tooltip stats for a level', () => {
    const info = statsInfo('rifle', 2, 'Rifleman', 15, 268);
    expect(info).toMatchObject({ title: 'Rifleman', damage: '20', range: '165', rate: '2' });
    expect(statsInfo('cannon', 1, 'Cannon', 15, 268).rate).toBe('0.6');
  });

  it('heads the tower tooltip with the next level or MAX', () => {
    expect(upgradeHeading(tower(1, 0))).toBe('Cannon  LV 2');
    expect(upgradeHeading(tower(3, 0))).toBe('Cannon  MAX');
  });
});
