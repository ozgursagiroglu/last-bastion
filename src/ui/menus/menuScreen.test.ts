import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../game/levels';
import { makeArtboard, SpriteBuilder } from '../../art/exode';
import { countPainted, pixelAt } from '../../platform/nodeCanvas';
import { LevelSelectScreen } from './levelSelect';
import { StaticStages, type MenuScreen } from './menuScreen';
import { nodeCanvasLike, nodeLayers } from './nodeCanvasLike';
import { emptyProgress } from './progress';
import { TitleScreen } from './titleScreen';

describe('MenuScreen', () => {
  it('is implemented by both menu screens, which resize every layer', () => {
    const title = nodeLayers(['back', 'live', 'front'] as const, 1, 1);
    const levels = nodeLayers(['back', 'live'] as const, 1, 1);
    const screens: MenuScreen[] = [new TitleScreen(title), new LevelSelectScreen(levels, LEVELS, emptyProgress(LEVELS.length), 'normal')];
    for (const s of screens) {
      s.resize(640, 360, 2);
      s.render(0, true);
      expect(s.key('x')).toBeNull();
      expect(s.pointer('move', { x: -5, y: -5 })).toBeNull();
    }
    for (const layer of [...Object.values(title), ...Object.values(levels)]) expect([layer.width, layer.height]).toEqual([1280, 720]);
  });
});

describe('StaticStages', () => {
  it('draws each static artboard right after a resize and never otherwise', () => {
    const canvas = nodeCanvasLike(1, 1);
    const b = new SpriteBuilder('static');
    b.rect('box', 100, 100, { x: 50, y: 50, fill: '#ff0000' });
    const statics = new StaticStages([{ canvas, artboard: makeArtboard('static', b.build().objects, { background: null }) }]);
    expect(statics.draws).toBe(0);
    expect(countPainted(canvas.node)).toBe(0);
    statics.resize(1280, 720, 1);
    expect(statics.draws).toBe(1);
    expect(pixelAt(canvas.node, 50, 50)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(canvas.node, 200, 50)[3]).toBe(0);
    statics.resize(640, 360, 1);
    expect(statics.draws).toBe(2);
    expect(pixelAt(canvas.node, 20, 20)).toEqual([255, 0, 0, 255]);
  });

  it('skips the redraw when a resize keeps the backing-store size', () => {
    const canvas = nodeCanvasLike(1, 1);
    const b = new SpriteBuilder('static');
    b.rect('box', 100, 100, { x: 50, y: 50, fill: '#ff0000' });
    const statics = new StaticStages([{ canvas, artboard: makeArtboard('static', b.build().objects, { background: null }) }]);
    statics.resize(1280, 720, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(40, 40, 20, 20);
    statics.resize(1280, 720, 1);
    statics.resize(640, 360, 2);
    expect(statics.draws).toBe(1);
    expect(pixelAt(canvas.node, 50, 50)).toEqual([0, 0, 255, 255]);
    statics.resize(1280, 720, 2);
    expect(statics.draws).toBe(2);
    expect(pixelAt(canvas.node, 100, 100)).toEqual([255, 0, 0, 255]);
  });
});
