import { describe, expect, it } from 'vitest';
import { pixelAt } from '../../platform/nodeCanvas';
import { drawPortraitStandIn, flatten, nodeCanvasLike, nodeLayers } from './nodeCanvasLike';

describe('nodeCanvasLike', () => {
  it('forwards size changes to the Node canvas and hands out its context', () => {
    const c = nodeCanvasLike(10, 20);
    c.width = 64;
    c.height = 32;
    expect([c.node.width, c.node.height]).toEqual([64, 32]);
    expect([c.width, c.height]).toEqual([64, 32]);
    expect(c.getContext('2d')).not.toBeNull();
  });

  it('makes named layers and flattens them bottom to top', () => {
    const layers = nodeLayers(['back', 'live'] as const, 4, 4);
    const back = layers.back.getContext('2d');
    const live = layers.live.getContext('2d');
    if (!back || !live) throw new Error('no context');
    back.fillStyle = '#ff0000';
    back.fillRect(0, 0, 4, 4);
    live.fillStyle = '#0000ff';
    live.fillRect(0, 0, 2, 4);
    const out = flatten([layers.back, layers.live]);
    expect([out.width, out.height]).toEqual([4, 4]);
    expect(pixelAt(out, 0, 0)).toEqual([0, 0, 255, 255]);
    expect(pixelAt(out, 3, 0)).toEqual([255, 0, 0, 255]);
  });

  it('draws the portrait stand-in as a blue disc in a gold ring', () => {
    const c = nodeCanvasLike(100, 100);
    drawPortraitStandIn(c.node, { x: 50, y: 50, size: 60 });
    expect(pixelAt(c.node, 50, 50)).toEqual([0x1d, 0x3b, 0x78, 255]);
    expect(pixelAt(c.node, 78, 50).slice(0, 3)).toEqual([0xff, 0xd9, 0x5a]);
    expect(pixelAt(c.node, 5, 5)[3]).toBe(0);
  });
});
