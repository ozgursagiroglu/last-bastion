import { describe, expect, it } from 'vitest';
import { validateSprite } from '../../art/exode';
import { buildTowerIcon } from '../../art/towers';
import { LEVELS } from '../../game/levels';
import { DIFFICULTIES, TOWER_KINDS } from '../../game/types';
import { pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { textWidth } from '../../art/ui/text';
import { buildLevelSelectArt, darken, LEVELS_MASCOT, PANEL, PANEL_PLAY, TAB, tabX, themeName } from './levelSelectArt';

const art = buildLevelSelectArt(LEVELS);

describe('buildLevelSelectArt', () => {
  it('has unique ids with every parent present on each layer', () => {
    for (const board of [art.backdrop, art.artboard]) {
      const ids = new Set<string>();
      for (const o of board.objects) {
        expect(ids.has(o.id)).toBe(false);
        ids.add(o.id);
      }
      for (const o of board.objects) if (o.parentId) expect(ids.has(o.parentId)).toBe(true);
    }
  });

  it('keeps canvas shadows on the static layer', () => {
    const shadowed = (objects: typeof art.artboard.objects) => objects.filter((o) => (o.style as { shadow?: unknown } | undefined)?.shadow !== undefined).length;
    expect(shadowed(art.artboard.objects)).toBe(0);
    expect(shadowed(art.backdrop.objects)).toBeGreaterThan(0);
  });

  it('puts the mascot portrait over the panel corner, clear of the nodes, tabs and panel header', () => {
    const r = LEVELS_MASCOT.size / 2;
    expect(Math.abs(LEVELS_MASCOT.x - (PANEL.x - PANEL.w / 2))).toBeLessThan(10);
    expect(LEVELS_MASCOT.y - r).toBeGreaterThanOrEqual(0);
    for (const n of art.nodes) expect(Math.hypot(n.pos.x - LEVELS_MASCOT.x, n.pos.y - LEVELS_MASCOT.y)).toBeGreaterThan(r + 40);
    expect(LEVELS_MASCOT.x - r).toBeGreaterThan(tabX(2) + TAB.w / 2);
    const longest = Math.max(...LEVELS.map((l) => textWidth(l.name, 30)));
    expect(PANEL.x + 30 - longest / 2).toBeGreaterThan(LEVELS_MASCOT.x + r);
  });

  it('builds one node per level, a tab pair per difficulty, an icon per tower kind and the hit regions', () => {
    expect(art.nodes.map((n) => n.levelId)).toEqual(LEVELS.map((l) => l.id));
    for (const n of art.nodes) expect(n.stars.filledIds).toHaveLength(3);
    for (const d of DIFFICULTIES) expect(art.tabs[d].on.groupId).not.toBe(art.tabs[d].off.groupId);
    expect(Object.keys(art.panel.iconIds).sort()).toEqual([...TOWER_KINDS].sort());
    expect(art.panel.slotIds).toHaveLength(TOWER_KINDS.length);
    const ids = art.regions.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['back', 'play', 'tab:easy', 'tab:normal', 'tab:hard', 'node:1', 'node:10']));
    for (const kind of TOWER_KINDS) expect(validateSprite(buildTowerIcon(kind, `t-${kind}`))).toEqual([]);
  });

  it('paints the themed map, the nodes and the green PLAY button', () => {
    const canvas = renderArtboard(art.backdrop);
    canvas.getContext('2d').drawImage(renderArtboard(art.artboard), 0, 0);
    const node1 = art.nodes[0]?.pos ?? { x: 0, y: 0 };
    const [r, g] = pixelAt(canvas, node1.x, node1.y + 12);
    expect(r).toBeGreaterThan(150);
    expect(g).toBeGreaterThan(90);
    const play = pixelAt(canvas, PANEL.x - 100, PANEL.y + PANEL_PLAY.dy);
    expect(play[1]).toBeGreaterThan(play[0] + 40);
    const snow = pixelAt(canvas, 640, 700);
    expect(Math.min(snow[0], snow[1], snow[2])).toBeGreaterThan(180);
  });
});

describe('helpers', () => {
  it('darkens colors and names themes', () => {
    expect(darken('#ff8040', 0.5)).toBe('#804020');
    expect(themeName('volcano')).toBe('Volcano');
  });
});
