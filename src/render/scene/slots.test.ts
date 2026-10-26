import { describe, expect, it } from 'vitest';
import { SlotPool } from './slots';

describe('SlotPool', () => {
  it('assigns the lowest free slot and keeps it per id', () => {
    const pool = new SlotPool(3);
    expect(pool.acquire(10)).toBe(0);
    expect(pool.acquire(11)).toBe(1);
    expect(pool.acquire(10)).toBe(0);
    expect(pool.get(11)).toBe(1);
    expect(pool.used).toBe(2);
  });

  it('reuses released slots, lowest first', () => {
    const pool = new SlotPool(3);
    pool.acquire(1);
    pool.acquire(2);
    pool.acquire(3);
    expect(pool.release(2)).toBe(1);
    expect(pool.release(1)).toBe(0);
    expect(pool.acquire(4)).toBe(0);
    expect(pool.acquire(5)).toBe(1);
    expect(pool.ids().sort()).toEqual([3, 4, 5]);
  });

  it('refuses ids when full and ignores unknown releases', () => {
    const pool = new SlotPool(1);
    expect(pool.acquire(1)).toBe(0);
    expect(pool.acquire(2)).toBeUndefined();
    expect(pool.get(2)).toBeUndefined();
    expect(pool.release(2)).toBeUndefined();
    expect(pool.used).toBe(1);
  });
});
