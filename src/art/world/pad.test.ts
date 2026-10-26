import { describe, expect, it } from 'vitest';
import { PAD_RADIUS, THEME_IDS } from '../../game/types';
import { makeArtboard, SpriteBuilder, validateSprite } from '../exode';
import { countPainted, pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { addPad } from './pad';
import { THEMES } from './themes';

describe('addPad', () => {
  it('builds a valid 3/4 platform for every theme, centered on the pad point', () => {
    for (const theme of THEME_IDS) {
      const b = new SpriteBuilder('p');
      b.group('layer');
      const id = addPad(b, 'pad', 60, 50, theme, 'layer');
      const sprite = b.build();
      expect(id).toBe('p.pad');
      expect(sprite.objects.find((o) => o.id === id)?.parentId).toBe('p.layer');
      expect(validateSprite(sprite)).toEqual([]);
      const top = sprite.objects.find((o) => o.id === 'p.pad.top');
      expect(top?.geometry).toMatchObject({ type: 'Ellipse', width: PAD_RADIUS * 2 });
      expect(top?.style.fill?.stops?.[0]?.color).toBe(THEMES[theme].pad.light);
      const c = renderArtboard(makeArtboard('p', sprite.objects, { width: 120, height: 100, background: null }));
      expect(pixelAt(c, 60, 50)[3]).toBe(255);
      expect(pixelAt(c, 60, 50 + 24)[3], 'front band below the top face').toBe(255);
      expect(countPainted(c, { x: 60 - PAD_RADIUS, y: 50 - 18, w: PAD_RADIUS * 2, h: 36 })).toBeGreaterThan(PAD_RADIUS * 2 * 30);
      expect(pixelAt(c, 60, 50 - PAD_RADIUS)[3], 'the top face is squashed').toBe(0);
    }
  });
});
