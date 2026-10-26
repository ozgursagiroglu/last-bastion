import { describe, expect, it } from 'vitest';
import { earlyCallBonus, sellRefund, SELL_REFUND } from './rules';
import { TOWERS } from './towers';

describe('sellRefund', () => {
  it('refunds the rounded-down share of the gold spent', () => {
    expect(sellRefund(0)).toBe(0);
    expect(sellRefund(70)).toBe(49);
    expect(sellRefund(101)).toBe(70);
  });

  it('is not fooled by floating-point products just below an integer', () => {
    expect(180 * SELL_REFUND).toBeLessThan(126);
    expect(sellRefund(180)).toBe(126);
  });

  it('matches exact integer arithmetic for every tower at every level', () => {
    const tenths = Math.round(SELL_REFUND * 10);
    for (const tower of Object.values(TOWERS)) {
      let spent = 0;
      for (const level of tower.levels) {
        spent += level.cost;
        expect(sellRefund(spent)).toBe(Math.floor((spent * tenths) / 10));
      }
    }
  });
});

describe('earlyCallBonus', () => {
  it('rounds the remaining seconds up', () => {
    expect(earlyCallBonus(0)).toBe(0);
    expect(earlyCallBonus(0.2)).toBe(1);
    expect(earlyCallBonus(11.5)).toBe(12);
  });

  it('does not round a whole number of seconds up past itself', () => {
    expect(earlyCallBonus(3 * (1 / 60) * 60)).toBe(3);
    expect(earlyCallBonus(12.000000000001)).toBe(12);
  });
});
