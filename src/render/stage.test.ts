import { describe, expect, it } from 'vitest';
import { makeArtboard, SpriteBuilder } from '../art/exode';
import { context2d, createNodeCanvas, pixelAt } from '../platform/nodeCanvas';
import { containFit, MAX_PIXEL_RATIO, Stage, type CanvasLike } from './stage';

function nodeCanvasLike(w: number, h: number): CanvasLike & { node: ReturnType<typeof createNodeCanvas> } {
  const node = createNodeCanvas(w, h);
  return {
    node,
    get width() {
      return node.width;
    },
    set width(v: number) {
      node.width = v;
    },
    get height() {
      return node.height;
    },
    set height(v: number) {
      node.height = v;
    },
    getContext: () => context2d(node),
  };
}

describe('containFit', () => {
  it('letterboxes wide and tall viewports', () => {
    expect(containFit(1280, 720)).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
    expect(containFit(1920, 720)).toEqual({ scale: 1, offsetX: 320, offsetY: 0 });
    expect(containFit(640, 720)).toEqual({ scale: 0.5, offsetX: 0, offsetY: 180 });
  });
});

describe('Stage', () => {
  it('maps CSS points to design coords and back', () => {
    const stage = new Stage(nodeCanvasLike(10, 10));
    stage.resize(1920, 720, 1);
    expect(stage.toDesign(320, 0)).toEqual({ x: 0, y: 0 });
    expect(stage.toDesign(960, 360)).toEqual({ x: 640, y: 360 });
    expect(stage.toCss({ x: 1280, y: 720 })).toEqual({ x: 1600, y: 720 });
  });

  it('sizes the backing store by the pixel ratio, capped', () => {
    const canvas = nodeCanvasLike(10, 10);
    const stage = new Stage(canvas);
    stage.resize(800, 450, 1.5);
    expect([canvas.width, canvas.height]).toEqual([1200, 675]);
    stage.resize(800, 450, 4);
    expect([canvas.width, canvas.height]).toEqual([800 * MAX_PIXEL_RATIO, 450 * MAX_PIXEL_RATIO]);
  });

  it('renders the loaded artboard contain-fitted into the backing store', () => {
    const canvas = nodeCanvasLike(10, 10);
    const stage = new Stage(canvas);
    const b = new SpriteBuilder('dot', { x: 1280, y: 720 });
    b.rect('r', 40, 40, { fill: '#ff0000' });
    stage.load(makeArtboard('a', b.build().objects, { background: '#000000' }));
    stage.resize(640, 360, 2);
    stage.render();
    expect(pixelAt(canvas.node, 1275, 715)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(canvas.node, 600, 300)).toEqual([0, 0, 0, 255]);
  });
});
