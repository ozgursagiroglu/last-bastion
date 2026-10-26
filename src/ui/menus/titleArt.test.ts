import { describe, expect, it } from 'vitest';
import { validateSprite } from '../../art/exode';
import { distanceToPaths } from '../../art/world/geometry';
import { PAD_RADIUS, PATH_WIDTH } from '../../game/types';
import { countPainted, pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { buildTitleArt, MARCH, PLAY_BUTTON, TITLE_MASCOT, TITLE_ROAD } from './titleArt';

const art = buildTitleArt();

describe('buildTitleArt', () => {
  it('has unique ids with every parent present on each layer', () => {
    for (const board of [art.backdrop, art.artboard, art.front]) {
      const ids = new Set<string>();
      for (const o of board.objects) {
        expect(ids.has(o.id)).toBe(false);
        ids.add(o.id);
      }
      for (const o of board.objects) if (o.parentId) expect(ids.has(o.parentId)).toBe(true);
    }
  });

  it('keeps canvas shadows off the live layer', () => {
    const shadowed = (objects: typeof art.artboard.objects) => objects.filter((o) => (o.style as { shadow?: unknown } | undefined)?.shadow !== undefined).length;
    expect(shadowed(art.artboard.objects)).toBe(0);
    expect(shadowed(art.backdrop.objects) + shadowed(art.front.objects)).toBeGreaterThan(0);
  });

  it('keeps the mascot portrait clear of the title, PLAY, the towers and the road', () => {
    const r = TITLE_MASCOT.size / 2;
    expect(TITLE_MASCOT.x - r).toBeGreaterThanOrEqual(0);
    expect(TITLE_MASCOT.x + r).toBeLessThan(PLAY_BUTTON.x - PLAY_BUTTON.w / 2);
    expect(distanceToPaths(TITLE_MASCOT, [[...TITLE_ROAD]])).toBeGreaterThan(r + PATH_WIDTH);
    for (const t of art.towers) expect(distanceToPaths(TITLE_MASCOT, [[t.pos]])).toBeGreaterThan(r + 40);
  });

  it('uses valid tower and enemy sprites with the clips the screen plays', () => {
    expect(art.towers.length).toBeGreaterThanOrEqual(2);
    for (const t of art.towers) {
      expect(validateSprite(t.sprite)).toEqual([]);
      expect(t.sprite.clips.idle).toBeDefined();
    }
    expect(art.enemies.map((e) => e.kind)).toEqual(MARCH);
    expect(MARCH.filter((k) => k === 'brute')).toHaveLength(1);
    for (const e of art.enemies) {
      expect(validateSprite(e)).toEqual([]);
      expect(e.clips.walk).toBeDefined();
    }
    const clipIds = art.artboard.animations.map((a) => a.id);
    for (const s of [...art.towers.map((t) => t.sprite), ...art.enemies]) for (const c of Object.values(s.clips)) expect(clipIds).toContain(c.id);
  });

  it('keeps the tower pads off the road', () => {
    for (const t of art.towers) expect(distanceToPaths(t.pos, [[...TITLE_ROAD]])).toBeGreaterThan(PATH_WIDTH / 2 + PAD_RADIUS * 0.62);
  });

  it('paints the backdrop opaque, the gate on the front layer and the gold PLAY button on the live layer', () => {
    const back = renderArtboard(art.backdrop);
    expect(pixelAt(back, 2, 2)[3]).toBe(255);
    expect(countPainted(back)).toBe(1280 * 720);
    const front = renderArtboard(art.front);
    expect(pixelAt(front, 1120, 520)[3]).toBe(255);
    expect(pixelAt(front, 640, 300)[3]).toBe(0);
    const canvas = renderArtboard(art.artboard);
    expect(pixelAt(canvas, 2, 2)[3]).toBe(0);
    const [r, g, b] = pixelAt(canvas, PLAY_BUTTON.x - 110, PLAY_BUTTON.y + 10);
    expect(r).toBeGreaterThan(180);
    expect(g).toBeGreaterThan(110);
    expect(b).toBeLessThan(90);
  });
});
