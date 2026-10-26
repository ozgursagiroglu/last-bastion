import { describe, expect, it } from 'vitest';
import { makeArtboard, SpriteBuilder } from '../exode';
import { pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { blobPoints, ellipsePoints, polyPoints, strokePoints } from './shapes';

describe('shape points', () => {
  it('builds closed sub-paths that can be concatenated', () => {
    for (const pts of [ellipsePoints(0, 0, 5), polyPoints([[0, 0], [4, 0], [2, 3]]), blobPoints(0, 0, 10, 6, 5)]) {
      expect(pts[0]?.moveTo).toBe(true);
      expect(pts[pts.length - 1]?.close).toBe(true);
      expect(pts.filter((p) => p.moveTo)).toHaveLength(1);
    }
    expect(blobPoints(0, 0, 10, 6, 7)).toHaveLength(7);
    const line = strokePoints([[0, 0], [3, 4]]);
    expect(line[0]?.moveTo).toBe(true);
    expect(line.some((p) => p.close)).toBe(false);
  });

  it('varies a blob with its random source and keeps it near the ellipse', () => {
    const r = [0.1, 0.9, 0.3, 0.7, 0.5];
    let i = 0;
    const jittered = blobPoints(0, 0, 20, 20, 5, 0.4, () => r[i++ % r.length] ?? 0.5);
    expect(jittered).not.toEqual(blobPoints(0, 0, 20, 20, 5));
    for (const p of jittered) expect(Math.hypot(p.x, p.y)).toBeLessThan(26);
  });

  it('draws several sub-paths from one path object', () => {
    const b = new SpriteBuilder('s');
    b.path('dots', [...ellipsePoints(20, 20, 6), ...ellipsePoints(60, 20, 6)], { fill: '#ff0000' });
    const c = renderArtboard(makeArtboard('s', b.build().objects, { width: 80, height: 40, background: null }));
    expect(pixelAt(c, 20, 20)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(c, 60, 20)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(c, 40, 20)[3]).toBe(0);
  });
});
