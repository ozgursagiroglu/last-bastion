import { describe, expect, it } from 'vitest';
import { countPainted, pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { makeArtboard, pathCenter, SpriteBuilder } from '../exode';
import { box, closed, frustum, halfArc, halfArcBack, levels, loop, mix, onEllipse, rimArc, seg, vgrad } from './parts';

describe('mix', () => {
  it('blends #rrggbb colors', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#ff0000', '#0000ff', 0)).toBe('#ff0000');
    expect(mix('#ff0000', '#0000ff', 1)).toBe('#0000ff');
  });
});

describe('point helpers', () => {
  it('puts angles on the ellipse with 90° at the front', () => {
    const p = onEllipse(10, 20, 30, 12, 90);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(32);
    expect(onEllipse(0, 0, 30, 12, 180).x).toBeCloseTo(-30);
  });

  it('builds a frustum whose points span both rims', () => {
    const pts = frustum(10, 20, 6, -30, 0);
    expect(pts).toHaveLength(6);
    expect(pts[5]?.close).toBe(true);
    expect(pathCenter(pts)).toEqual({ x: 0, y: (-30 - 3 + 6) / 2 });
    expect(Math.min(...pts.map((p) => p.y))).toBe(-33);
    expect(Math.max(...pts.map((p) => p.y))).toBe(6);
  });

  it('builds arcs through their front or back point, and closes paths', () => {
    expect(halfArc(0, 0, 10, 3, 1, true).map((p) => [p.x, p.y])).toEqual([[-10, 0], [0, 3], [10, 0]]);
    expect(halfArc(0, 0, 10, 3, 1, true)[0]?.moveTo).toBe(true);
    expect(halfArcBack(0, 0, 10, 3, -1).map((p) => [p.x, p.y])).toEqual([[10, 0], [0, -3], [-10, 0]]);
    expect(closed([{ x: 0, y: 0 }, { x: 1, y: 1 }])[1]?.close).toBe(true);
  });

  it('gives gradient fills of crescents a real height', () => {
    const b = new SpriteBuilder('c', { x: 40, y: 20 });
    b.path('band', [...halfArc(0, 0, 26, 9, 1), ...halfArcBack(0, 0, 19, 4.5, 1)], { closed: true, fill: vgrad({ light: '#ffffff', dark: '#ff0000' }) });
    const canvas = renderArtboard(makeArtboard('c', b.build().objects, { width: 80, height: 40, background: null }));
    expect(pixelAt(canvas, 40, 26.5)[3]).toBe(255);
  });

  it('builds rims, loops, boxes and segments as sub-paths', () => {
    expect(rimArc(0, 0, 10, 4, 180, 0, 4, 2)).toHaveLength(5);
    expect(rimArc(0, 0, 10, 4, 180, 0, 4, 2, true)).toHaveLength(9);
    expect(loop(0, 0, 5, 5)[0]?.moveTo).toBe(true);
    expect(loop(0, 0, 5, 5)[3]?.close).toBe(true);
    expect(box(1, 2, 3, 4).map((p) => [p.x, p.y])).toEqual([[1, 2], [4, 2], [4, 6], [1, 6]]);
    expect(seg({ x: 0, y: 0 }, { x: 1, y: 1 })[0]?.moveTo).toBe(true);
    expect(levels('a', 'b', 'c')).toEqual({ 1: 'a', 2: 'b', 3: 'c' });
  });

  it('renders multi-shape paths with holes left empty between shapes', () => {
    const b = new SpriteBuilder('h', { x: 50, y: 30 });
    b.path('two', [...loop(-20, 0, 8, 8), ...box(12, -6, 12, 12)], { fill: '#ff0000' });
    const canvas = renderArtboard(makeArtboard('h', b.build().objects, { width: 100, height: 60, background: null }));
    expect(pixelAt(canvas, 30, 30)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(canvas, 68, 30)).toEqual([255, 0, 0, 255]);
    expect(countPainted(canvas, { x: 42, y: 20, w: 16, h: 20 })).toBe(0);
  });
});
