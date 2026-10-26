import { describe, expect, it } from 'vitest';
import { THEME_IDS } from '../../game/types';
import { makeArtboard, SpriteBuilder, validateSprite } from '../exode';
import { countPainted, renderArtboard } from '../../platform/nodeCanvas';
import { addSpawnMarker } from './spawnMarker';

describe('addSpawnMarker', () => {
  it('builds a valid upright marker for every theme (banner or totem)', () => {
    const kinds = new Set<string>();
    for (const theme of THEME_IDS) {
      const b = new SpriteBuilder('s');
      expect(addSpawnMarker(b, 'marker', 40, 80, theme)).toBe('s.marker');
      const sprite = b.build();
      expect(validateSprite(sprite)).toEqual([]);
      kinds.add(sprite.objects.some((o) => o.id === 's.marker.cloth') ? 'banner' : 'totem');
      const c = renderArtboard(makeArtboard('s', sprite.objects, { width: 80, height: 100, background: null }));
      expect(countPainted(c, { x: 25, y: 20, w: 30, h: 60 })).toBeGreaterThan(300);
    }
    expect(kinds).toEqual(new Set(['banner', 'totem']));
  });
});
