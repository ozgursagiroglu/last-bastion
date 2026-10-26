import { describe, expect, it } from 'vitest';
import { makeArtboard, SpriteBuilder, validateSprite } from '../../art/exode';
import { createRng } from '../../art/world/rng';
import { THEMES } from '../../art/world/themes';
import { countPainted, pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { addPatches, addRoad, tuftPoints } from './ground';

describe('ground dressing', () => {
  it('builds valid patches, tufts and a road that paints the road colors', () => {
    const b = new SpriteBuilder('g');
    addPatches(b, 'patch', 'desert', { x0: 0, x1: 300, y0: 0, y1: 200 }, 4, createRng(1));
    b.path('tufts', tuftPoints({ x: 30, y: 30 }, 1), { stroke: { color: '#3f7a2a', width: 2 } });
    addRoad(b, 'road', [{ x: 0, y: 100 }, { x: 300, y: 100 }], 'meadow');
    const sprite = b.build();
    expect(validateSprite(sprite)).toEqual([]);
    const canvas = renderArtboard(makeArtboard('g', sprite.objects, { width: 300, height: 200, background: null }));
    expect(countPainted(canvas)).toBeGreaterThan(300 * 56);
    const [r, g, bl] = pixelAt(canvas, 150, 76);
    const fill = THEMES.meadow.road.fill;
    expect([r, g, bl]).toEqual([1, 3, 5].map((i) => Number.parseInt(fill.slice(i, i + 2), 16)));
  });

  it('keeps patches inside the area horizontally', () => {
    const b = new SpriteBuilder('p');
    addPatches(b, 'patch', 'snow', { x0: 100, x1: 400, y0: 0, y1: 100 }, 6, createRng(3));
    for (const o of b.build().objects.slice(1)) {
      const w = (o.geometry as { width: number }).width;
      expect(o.transform.x - w / 2).toBeGreaterThanOrEqual(100 - 1e-6);
      expect(o.transform.x + w / 2).toBeLessThanOrEqual(400 + 1e-6);
    }
  });
});
