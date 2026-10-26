import { describe, expect, it } from 'vitest';
import { validateSprite } from '../../art/exode';
import { pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { getLevel, LEVELS } from './index';
import { buildLayoutPreview, gallery } from './levels.gallery';

describe('layout previews', () => {
  it('has one valid entry per level, levels-01 … levels-10', () => {
    expect(gallery.map((e) => e.name)).toEqual(LEVELS.map((l) => `levels-${String(l.id).padStart(2, '0')}`));
    for (const level of LEVELS) expect(validateSprite(buildLayoutPreview(level))).toEqual([]);
  });

  it('paints road, pads and the HUD zones where the level puts them', () => {
    const entry = gallery[0];
    if (!entry || !('artboard' in entry)) throw new Error('levels-01 is not an artboard entry');
    const canvas = renderArtboard(entry.artboard);
    const level = getLevel(1);
    const [r, g, b] = pixelAt(canvas, 100, 236);
    expect([r, g, b]).toEqual([0xcf, 0xae, 0x74]);
    const pad = level.pads[0];
    if (!pad) throw new Error('level 1 has no pads');
    const [pr, pg, pb] = pixelAt(canvas, pad.x - 20, pad.y + 20);
    expect(Math.abs(pr - pg)).toBeLessThan(12);
    expect(Math.abs(pg - pb)).toBeLessThan(12);
    const [hr, hg] = pixelAt(canvas, 1200, 680);
    expect(hr).toBeGreaterThan(hg);
  });
});
