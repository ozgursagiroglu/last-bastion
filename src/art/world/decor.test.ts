import { describe, expect, it } from 'vitest';
import { THEME_IDS } from '../../game/types';
import { makeArtboard, SpriteBuilder, validateSprite } from '../exode';
import { countPainted, renderArtboard } from '../../platform/nodeCanvas';
import { addDecor, DECOR_KINDS } from './decor';

describe('decor', () => {
  it('has at least five kinds per theme, all prefixed with the theme', () => {
    for (const theme of THEME_IDS) {
      expect(DECOR_KINDS[theme].length).toBeGreaterThanOrEqual(5);
      for (const kind of DECOR_KINDS[theme]) expect(kind.startsWith(`${theme}.`)).toBe(true);
    }
  });

  it('builds every kind as a valid group that stands on its ground point', () => {
    for (const theme of THEME_IDS) {
      for (const kind of DECOR_KINDS[theme]) {
        const b = new SpriteBuilder('d');
        const id = addDecor(b, 'prop', kind, 60, 80, 1.1);
        const sprite = b.build();
        expect(id).toBe('d.prop');
        expect(validateSprite(sprite)).toEqual([]);
        expect(sprite.objects.length).toBeLessThanOrEqual(10);
        const c = renderArtboard(makeArtboard('d', sprite.objects, { width: 120, height: 100, background: null }));
        expect(countPainted(c, { x: 30, y: 40, w: 60, h: 44 }), kind).toBeGreaterThan(150);
        expect(countPainted(c, { x: 0, y: 96, w: 120, h: 4 }), kind).toBe(0);
      }
    }
  });

  it('draws the same placement identically and refuses unknown kinds', () => {
    const build = (x: number) => {
      const b = new SpriteBuilder('d');
      addDecor(b, 'tree', 'meadow.tree', x, 50);
      return b.build().objects.map((o) => o.geometry);
    };
    expect(build(40)).toEqual(build(40));
    expect(build(40)).not.toEqual(build(41));
    expect(() => addDecor(new SpriteBuilder('d'), 'x', 'meadow.castle', 0, 0)).toThrow(/Unknown decor/);
    expect(() => addDecor(new SpriteBuilder('d'), 'x', 'tree', 0, 0)).toThrow(/Unknown decor/);
  });
});
