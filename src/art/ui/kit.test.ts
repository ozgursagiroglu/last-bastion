import { describe, expect, it } from 'vitest';
import { DYNAMIC_PATH_BOX, makeArtboard, SpriteBuilder, validateSprite, type SpriteInstance } from '../exode';
import { countPainted, loadEngine, pixelAt, renderArtboard, renderEngine } from '../../platform/nodeCanvas';
import { setPathPoints } from '../../render/exodeRuntime';
import { addButton, addCostTag, addCounter, addPanel, addRing, addRoundButton, addStars, RING_POINTS, ringPoints, TEXT, type ButtonVariant, type PanelVariant } from './kit';

const BUTTONS: readonly ButtonVariant[] = ['green', 'blue', 'red', 'gold', 'stone'];
const PANELS: readonly PanelVariant[] = ['wood', 'stone', 'dark'];

function board(sprite: SpriteInstance, width: number, height: number) {
  return makeArtboard('t', sprite.objects, { width, height, background: null });
}

function objectOf(sprite: SpriteInstance, id: string) {
  const o = sprite.objects.find((x) => x.id === id);
  if (!o) throw new Error(`missing ${id}`);
  return o;
}

describe('addPanel', () => {
  it.each(PANELS)('%s panel is valid at two sizes and fills its box', (variant) => {
    for (const [w, h] of [[360, 240], [200, 110]] as const) {
      const b = new SpriteBuilder('p');
      expect(addPanel(b, 'panel', { w, h, x: w / 2 + 20, y: h / 2 + 20, variant })).toBe('p.panel');
      const sprite = b.build();
      expect(validateSprite(sprite)).toEqual([]);
      expect(sprite.objects.filter((o) => o.style.shadow).length).toBeLessThanOrEqual(1);
      const c = renderArtboard(board(sprite, w + 40, h + 40));
      expect(pixelAt(c, 20 + w / 2, 20 + h / 2)[3]).toBeGreaterThan(variant === 'dark' ? 180 : 250);
      expect(pixelAt(c, 20 + w / 2, 20)[3]).toBe(255);
      expect(pixelAt(c, 20 + w - 1, 20 + h / 2)[3]).toBe(255);
      const belowShadow = countPainted(c, { x: 20, y: h + 22, w, h: 16 });
      if (variant === 'dark') expect(belowShadow).toBe(0);
      else expect(belowShadow).toBeGreaterThan(w);
    }
  });

  it('nests content under the panel group', () => {
    const b = new SpriteBuilder('p');
    addPanel(b, 'panel', { w: 200, h: 100, variant: 'wood' });
    addButton(b, 'panel.ok', { w: 100, h: 40, variant: 'green', label: 'OK' }, 'panel');
    const sprite = b.build();
    expect(objectOf(sprite, 'p.panel.ok').parentId).toBe('p.panel');
    expect(validateSprite(sprite)).toEqual([]);
  });
});

describe('addButton', () => {
  it.each(BUTTONS)('%s buttons build with a label, label + icon and icon only', (variant) => {
    const b = new SpriteBuilder('b');
    const label = addButton(b, 'label', { w: 160, h: 54, x: 90, y: 40, variant, label: 'PLAY' });
    const both = addButton(b, 'both', { w: 190, h: 54, x: 300, y: 40, variant, label: 'RETRY', icon: 'retry' });
    const icon = addButton(b, 'icon', { w: 64, h: 54, x: 460, y: 40, variant, icon: 'pause' });
    const sprite = b.build();
    expect(validateSprite(sprite)).toEqual([]);
    expect(label).toMatchObject({ groupId: 'b.label', iconId: null, disabledId: 'b.label.disabled', w: 160, h: 54 });
    expect(label.labelIds.length).toBeGreaterThanOrEqual(2);
    expect(label.labelIds.at(-1)).toBe('b.label.label.text.fill');
    expect(both.labelIds.length).toBeGreaterThanOrEqual(2);
    expect(both.labelIds.at(-1)).toBe('b.both.label.text.fill');
    expect(both.iconId).toBe('b.both.icon');
    expect(icon.labelIds).toEqual([]);
    expect(icon.iconId).toBe('b.icon.icon');
    for (const parts of [label, both, icon]) expect(objectOf(sprite, parts.disabledId).visible).toBe(false);
    const c = renderArtboard(board(sprite, 520, 80));
    expect(pixelAt(c, 90, 40)[3]).toBe(255);
    expect(pixelAt(c, 90 + 78, 40)[3]).toBe(255);
    expect(pixelAt(c, 90 + 83, 40)[3]).toBe(0);
    expect(pixelAt(c, 11, 14)[3]).toBe(0);
  });

  it('renders the label inside the face, with white glyph pixels', () => {
    const b = new SpriteBuilder('b');
    addButton(b, 'ok', { w: 160, h: 54, x: 100, y: 40, variant: 'blue', label: 'OK' });
    const c = renderArtboard(board(b.build(), 200, 80));
    let white = 0;
    for (let x = 80; x < 120; x++) for (let y = 25; y < 52; y++) if (pixelAt(c, x, y).slice(0, 3).every((v) => v > 240)) white++;
    expect(white).toBeGreaterThan(60);
  });

  it('sizes labels to the button and honours labelSize', () => {
    const b = new SpriteBuilder('b');
    addButton(b, 'small', { w: 100, h: 30, variant: 'green', label: 'GO' });
    addButton(b, 'big', { w: 200, h: 60, variant: 'green', label: 'GO', labelSize: 30 });
    const sprite = b.build();
    const size = (id: string) => (objectOf(sprite, id).geometry as { fontSize: number }).fontSize;
    expect(size('b.small.label.text.fill')).toBeLessThan(TEXT.button.size);
    expect(size('b.big.label.text.fill')).toBe(30);
  });
});

describe('addRoundButton', () => {
  it.each(BUTTONS)('%s round button is valid and round', (variant) => {
    const b = new SpriteBuilder('r');
    const parts = addRoundButton(b, 'pause', { r: 28, x: 40, y: 40, variant, icon: 'pause' });
    const sprite = b.build();
    expect(validateSprite(sprite)).toEqual([]);
    expect(parts).toMatchObject({ groupId: 'r.pause', labelIds: [], iconId: 'r.pause.icon', w: 56, h: 56 });
    expect(objectOf(sprite, parts.disabledId).visible).toBe(false);
    const c = renderArtboard(board(sprite, 80, 80));
    expect(pixelAt(c, 40, 40)[3]).toBe(255);
    expect(pixelAt(c, 40, 13)[3]).toBe(255);
    expect(pixelAt(c, 18, 18)[3]).toBe(0);
  });
});

describe('icon + text widgets', () => {
  it('cost tag and counter put the icon left of the text, centered on (x, y)', () => {
    const b = new SpriteBuilder('w');
    const cost = addCostTag(b, 'cost', { value: 125, x: 100, y: 30 });
    const lives = addCounter(b, 'lives', { icon: 'heart', text: '20', x: 100, y: 90 });
    expect(cost.groupId).toBe('w.cost');
    expect(cost.textIds.length).toBeGreaterThanOrEqual(2);
    expect(cost.textIds.at(-1)).toBe('w.cost.label.text.fill');
    expect(lives.textIds.length).toBeGreaterThanOrEqual(2);
    expect(lives.textIds.at(-1)).toBe('w.lives.label.text.fill');
    const sprite = b.build();
    expect(validateSprite(sprite)).toEqual([]);
    expect((objectOf(sprite, 'w.cost.label.text.fill').geometry as { text: string }).text).toBe('125');
    const c = renderArtboard(board(sprite, 200, 120));
    for (const y of [30, 90]) {
      const left = countPainted(c, { x: 40, y: y - 20, w: 60, h: 40 });
      const right = countPainted(c, { x: 100, y: y - 20, w: 60, h: 40 });
      expect(left).toBeGreaterThan(200);
      expect(right).toBeGreaterThan(200);
      expect(Math.abs(left - right) / (left + right)).toBeLessThan(0.35);
      expect(countPainted(c, { x: 0, y: y - 20, w: 40, h: 40 })).toBe(0);
      expect(countPainted(c, { x: 160, y: y - 20, w: 40, h: 40 })).toBe(0);
    }
  });
});

describe('addStars', () => {
  it('builds count stars with the empty version visible and the filled one hidden', () => {
    const b = new SpriteBuilder('s');
    const stars = addStars(b, 'stars', { count: 3, size: 32, x: 100, y: 30 });
    const sprite = b.build();
    expect(validateSprite(sprite)).toEqual([]);
    expect(stars.groupIds).toEqual(['s.stars.star0', 's.stars.star1', 's.stars.star2']);
    expect(stars.filledIds).toHaveLength(3);
    expect(stars.emptyIds).toHaveLength(3);
    for (const id of stars.filledIds) expect(objectOf(sprite, id).visible).toBe(false);
    for (const id of stars.emptyIds) expect(objectOf(sprite, id).visible).toBe(true);
    const xs = stars.groupIds.map((id) => objectOf(sprite, id).transform.x);
    expect(xs[1]).toBe(0);
    expect((xs[2] ?? 0) - (xs[1] ?? 0)).toBeGreaterThan(32);
    expect(xs[0]).toBe(-(xs[2] ?? 0));
  });
});

describe('ringPoints', () => {
  it('has RING_POINTS points starting at 12 o\'clock on the circle', () => {
    for (const p of [0, 0.25, 0.6, 1]) {
      const pts = ringPoints(50, 40, 20, p);
      expect(pts).toHaveLength(RING_POINTS);
      expect(pts[0]).toMatchObject({ x: expect.closeTo(50), y: expect.closeTo(20) });
      for (const q of pts) expect(Math.hypot(q.x - 50, q.y - 40)).toBeCloseTo(20);
    }
  });

  it('ends at the angle of the progress, clockwise', () => {
    const end = (p: number) => {
      const pts = ringPoints(0, 0, 10, p);
      return pts[pts.length - 1];
    };
    expect(end(0.25)).toMatchObject({ x: expect.closeTo(10), y: expect.closeTo(0) });
    expect(end(0.5)).toMatchObject({ x: expect.closeTo(0), y: expect.closeTo(10) });
    expect(end(0.75)).toMatchObject({ x: expect.closeTo(-10), y: expect.closeTo(0) });
    expect(end(0.6)).toMatchObject({ x: expect.closeTo(10 * Math.sin(1.2 * Math.PI)), y: expect.closeTo(-10 * Math.cos(1.2 * Math.PI)) });
    expect(end(1)).toMatchObject({ x: expect.closeTo(0), y: expect.closeTo(-10) });
    expect(end(0)).toMatchObject({ x: expect.closeTo(0), y: expect.closeTo(-10) });
    expect(end(1.5)).toEqual(end(1));
    expect(end(-1)).toEqual(end(0));
  });
});

describe('addRing', () => {
  it('builds a dynamic path that setPathPoints redraws to the progress', () => {
    const b = new SpriteBuilder('r');
    const id = addRing(b, 'ring', { radius: 30, width: 6, color: '#ffd95a', x: 50, y: 50 });
    const sprite = b.build();
    expect(id).toBe('r.ring');
    expect(validateSprite(sprite)).toEqual([]);
    expect(objectOf(sprite, id).geometry).toMatchObject({ type: 'Path', width: DYNAMIC_PATH_BOX, height: DYNAMIC_PATH_BOX });
    const engine = loadEngine(board(sprite, 100, 100));
    const full = renderEngine(engine, 100, 100);
    expect(pixelAt(full, 20, 50)[3]).toBe(255);
    setPathPoints(engine, id, ringPoints(50, 50, 30, 0.25));
    const quarter = renderEngine(engine, 100, 100);
    expect(pixelAt(quarter, 71, 29)[3]).toBe(255);
    expect(countPainted(quarter, { x: 0, y: 0, w: 49, h: 100 })).toBe(0);
    expect(countPainted(quarter, { x: 0, y: 52, w: 100, h: 48 })).toBe(0);
    setPathPoints(engine, id, ringPoints(50, 50, 30, 0));
    expect(countPainted(renderEngine(engine, 100, 100))).toBe(0);
  });
});
