import { describe, expect, it } from 'vitest';
import { SpriteBuilder, type SpriteInstance } from '../../art/exode';
import { animatedIds, bySlot, orderObjects } from './objectOrder';

function sprite(prefix: string): SpriteInstance {
  const b = new SpriteBuilder(prefix);
  b.rect('still', 4, 4, { fill: '#ffffff' });
  b.rect('legs', 4, 4, { fill: '#ffffff' });
  b.rect('body', 4, 4, { fill: '#ffffff' });
  b.clip('walk', 1, { legs: { x: [[0, 0], [1, 2]] } });
  b.clip('die', 1, { body: { opacity: [[0, 1], [1, 0]] } });
  return b.build();
}

describe('objectOrder', () => {
  it('lists the parts each clip animates', () => {
    const s = sprite('a');
    expect([...animatedIds(s, new Set(['walk']))]).toEqual(['a.legs']);
    expect([...animatedIds(s, new Set(['walk', 'die']))].sort()).toEqual(['a.body', 'a.legs']);
  });

  it('interleaves pools by slot', () => {
    expect(bySlot([[1, 2, 3], [10], [20, 21]])).toEqual([1, 10, 20, 2, 21, 3]);
  });

  it('puts tier parts first, slot by slot, then everything else once', () => {
    const a = [sprite('a0'), sprite('a1')];
    const b = [sprite('b0')];
    const all = [...a, ...b];
    const ids = orderObjects(all, [
      { pools: [a, b], clips: new Set(['walk']) },
      { pools: [a, b], clips: new Set(['walk', 'die']) },
    ]).map((o) => o.id);
    expect(ids.slice(0, 6)).toEqual(['a0.legs', 'b0.legs', 'a1.legs', 'a0.body', 'b0.body', 'a1.body']);
    expect(ids).toHaveLength(all.reduce((n, s) => n + s.objects.length, 0));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(6)).toEqual(['a0', 'a0.still', 'a1', 'a1.still', 'b0', 'b0.still']);
  });
});
