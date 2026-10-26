/**
 * Engine facts the contracts rely on, checked by rendering real artboards (see CLAUDE.md "ExodeUI facts").
 */
import { describe, expect, it } from 'vitest';
import { linear, makeArtboard, solid, SpriteBuilder } from '../art/exode';
import { loopClip, playClip, setFlipX, setPathPoints, setText, setVisible, setZ } from '../render/exodeRuntime';
import { countPainted, loadEngine, pixelAt, renderArtboard, renderEngine, renderFrames } from './nodeCanvas';

const W = 200;
const H = 100;

function board(build: (b: SpriteBuilder) => void) {
  const b = new SpriteBuilder('t');
  build(b);
  return { sprite: b.build(), artboard: makeArtboard('t', b.build().objects, { width: W, height: H, background: null }) };
}

describe('node rendering', () => {
  it('draws shapes centered on their position, children relative to the parent', () => {
    const { artboard } = board((b) => {
      b.group('g', { x: 50, y: 50 });
      b.rect('r', 20, 20, { fill: '#ff0000' }, 'g');
      b.rect('r2', 10, 10, { x: 40, fill: '#00ff00' }, 'g');
    });
    const c = renderArtboard(artboard);
    expect(pixelAt(c, 50, 50)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(c, 90, 50)).toEqual([0, 255, 0, 255]);
    expect(pixelAt(c, 10, 10)[3]).toBe(0);
  });

  it('multiplies group opacity into children and mirrors children with flip_x', () => {
    const { artboard } = board((b) => {
      b.group('faint', { x: 30, y: 50, opacity: 0.5 });
      b.rect('r', 20, 20, { fill: '#ffffff' }, 'faint');
      b.group('mirror', { x: 120, y: 50, flipX: true });
      b.rect('m', 10, 10, { x: 30, fill: '#0000ff' }, 'mirror');
    });
    const c = renderArtboard(artboard);
    expect(pixelAt(c, 30, 50)[3]).toBeGreaterThan(100);
    expect(pixelAt(c, 30, 50)[3]).toBeLessThan(160);
    expect(pixelAt(c, 90, 50)).toEqual([0, 0, 255, 255]);
    expect(pixelAt(c, 150, 50)[3]).toBe(0);
  });

  it('hides a whole subtree with visible=false and orders roots by zIndex', () => {
    const red = new SpriteBuilder('red', { x: 100, y: 50 });
    red.rect('r', 40, 40, { fill: '#ff0000' });
    const blue = new SpriteBuilder('blue', { x: 110, y: 50 });
    blue.rect('r', 40, 40, { fill: '#0000ff' });
    const hidden = new SpriteBuilder('hidden', { x: 30, y: 50 });
    hidden.rect('r', 20, 20, { fill: '#00ff00' });
    const engine = loadEngine(makeArtboard('z', [...red.build().objects, ...blue.build().objects, ...hidden.build().objects], { width: W, height: H, background: null }));
    expect(pixelAt(renderEngine(engine, W, H), 105, 50)).toEqual([0, 0, 255, 255]);
    setZ(engine, 'red', 2);
    setZ(engine, 'blue', 1);
    setZ(engine, 'hidden', 0);
    setVisible(engine, 'hidden', false);
    const c = renderEngine(engine, W, H);
    expect(pixelAt(c, 105, 50)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(c, 30, 50)[3]).toBe(0);
  });

  it('renders gradients and the game font', () => {
    const { artboard } = board((b) => {
      b.rect('g', 100, 40, { x: 60, y: 30, fill: linear([[0, '#000000'], [1, '#ffffff']], [0, 0.5], [1, 0.5]) });
      b.text('label', 'Wave 10', { size: 24, x: 100, y: 80, fill: '#ffffff' });
    });
    const c = renderArtboard(artboard);
    expect(pixelAt(c, 15, 30)[0]).toBeLessThan(40);
    expect(pixelAt(c, 105, 30)[0]).toBeGreaterThan(200);
    expect(countPainted(c, { x: 40, y: 66, w: 120, h: 28 })).toBeGreaterThan(150);
  });

  it('updates text at runtime through setText', () => {
    const { artboard } = board((b) => {
      b.text('label', 'I', { size: 30, x: 100, y: 50, width: 190 });
    });
    const engine = loadEngine(artboard);
    const before = countPainted(renderEngine(engine, W, H));
    setText(engine, 't.label', 'IIIIIIII');
    const after = countPainted(renderEngine(engine, W, H));
    expect(after).toBeGreaterThan(before * 4);
  });

  it('moves a dynamic path with setPathPoints without rescaling it', () => {
    const { artboard } = board((b) => {
      b.path('bolt', [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }], { dynamic: true, stroke: { color: '#ffffff', width: 4 } });
    });
    const engine = loadEngine(artboard);
    setPathPoints(engine, 't.bolt', [{ x: 120, y: 20 }, { x: 150, y: 50 }, { x: 180, y: 20 }]);
    const c = renderEngine(engine, W, H);
    expect(pixelAt(c, 150, 50)[3]).toBeGreaterThan(0);
    expect(pixelAt(c, 135, 35)[3]).toBeGreaterThan(0);
    expect(countPainted(c, { x: 0, y: 0, w: 110, h: H })).toBe(0);
    expect(countPainted(c, { x: 0, y: 60, w: W, h: 40 })).toBe(0);
  });

  it('applies clips at a given time (playClip clamps, loopClip wraps)', () => {
    const b = new SpriteBuilder('m', { x: 20, y: 50 });
    b.rect('box', 10, 10, { fill: '#ffffff' });
    const slide = b.clip('slide', 1, { box: { x: [[0, 0], [1, 100]] } });
    const engine = loadEngine(makeArtboard('m', b.build().objects, { width: W, height: H, background: null }));
    playClip(engine, slide, 0.5);
    expect(pixelAt(renderEngine(engine, W, H), 70, 50)[3]).toBe(255);
    playClip(engine, slide, 5);
    expect(pixelAt(renderEngine(engine, W, H), 120, 50)[3]).toBe(255);
    loopClip(engine, slide, 2.25);
    expect(pixelAt(renderEngine(engine, W, H), 45, 50)[3]).toBe(255);
  });

  it('renders labelled filmstrips', () => {
    const b = new SpriteBuilder('f', { x: 50, y: 50 });
    b.circle('dot', 10, { fill: solid('#ffcc00') });
    const sheet = renderFrames(makeArtboard('f', b.build().objects, { width: 100, height: 100 }), [
      { label: 'a', apply: () => {} },
      { label: 'b', apply: (e) => setFlipX(e, 'f', true) },
      { label: 'c', apply: () => {} },
    ], { columns: 2 });
    expect(sheet.width).toBe(200);
    expect(sheet.height).toBe(2 * (100 + 22));
  });
});
