import { describe, expect, it } from 'vitest';
import { makeArtboard, SpriteBuilder, validateSprite } from '../exode';
import { countPainted, pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { PALETTE } from '../palette';
import { addCastleGate } from './gate';

describe('addCastleGate', () => {
  it('builds a valid upright gatehouse about 110 × 100 standing on its door point', () => {
    const b = new SpriteBuilder('g');
    const id = addCastleGate(b, 'gate', 80, 120);
    const sprite = b.build();
    expect(id).toBe('g.gate');
    expect(validateSprite(sprite)).toEqual([]);
    expect(sprite.objects.length).toBeLessThan(40);
    const c = renderArtboard(makeArtboard('g', sprite.objects, { width: 160, height: 140, background: null }));
    expect(countPainted(c, { x: 22, y: 20, w: 116, h: 100 })).toBeGreaterThan(110 * 100 * 0.6);
    expect(countPainted(c, { x: 0, y: 0, w: 160, h: 12 }), 'nothing far above the battlements').toBe(0);
    expect(pixelAt(c, 80, 105)[3], 'door').toBe(255);
    const banners = sprite.objects.find((o) => o.id === 'g.gate.banners');
    expect(banners?.style.fill?.stops?.map((s) => s.color)).toEqual([PALETTE.blue.light, PALETTE.blue.dark]);
    const bannerPixel = pixelAt(c, 80 - 38, 120 - 74);
    expect(bannerPixel[2]).toBeGreaterThan(bannerPixel[0] + 40);
  });
});
