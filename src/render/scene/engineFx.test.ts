import { describe, expect, it } from 'vitest';
import { makeArtboard, SpriteBuilder } from '../../art/exode';
import { buildEmitter, lightTrail, outerGlow } from '../../art/world/effects';
import { countPainted, loadEngine, pixelAt } from '../../platform/nodeCanvas';
import { Stage } from '../stage';
import { anchorTrail, clearTrail, overlayCanvas, setEffectEnabled, setEmitterRate } from './engineFx';
import { nodeCanvasLike, stateOf } from './testSupport';

function trailEngine() {
  const b = new SpriteBuilder('p', { x: 20, y: 50 });
  b.circle('dot', 6, { fill: '#ffffff', effects: [lightTrail(8)] });
  return loadEngine(makeArtboard('trail', b.build().objects, { width: 200, height: 100, background: null }));
}

/** Flies the dot right by 10 px per frame from x0, anchoring its trail, and returns the painted pixel count. */
function fly(engine: ReturnType<typeof trailEngine>, canvas: ReturnType<typeof nodeCanvasLike>, x0: number, frames: number, anchored = true): number {
  const ctx = canvas.getContext('2d');
  for (let f = 0; f < frames; f++) {
    const x = x0 + f * 10;
    engine.updateObjectProperty('p', 'x', x);
    if (anchored) anchorTrail(engine, 'p.dot', x, 50, 0);
    if (ctx) engine.render(ctx, canvas.width, canvas.height);
  }
  return countPainted(canvas.node);
}

describe('engine effect writes', () => {
  it('anchors a light trail so it draws behind a moving part (and draws none without anchors)', () => {
    const canvas = nodeCanvasLike(200, 100);
    const engine = trailEngine();
    const plain = fly(engine, canvas, 20, 6, false);
    const trailed = fly(trailEngine(), canvas, 20, 6);
    expect(stateOf(engine, 'p.dot').left).toBeUndefined();
    expect(trailed).toBeGreaterThan(plain * 2);
    expect(pixelAt(canvas.node, 50, 50)[3]).toBeGreaterThan(0);
  });

  it('forgets a trail history, so a reused part draws no copies at its old place', () => {
    const canvas = nodeCanvasLike(200, 100);
    const ghost = trailEngine();
    fly(ghost, canvas, 20, 6);
    fly(ghost, canvas, 160, 1);
    expect(pixelAt(canvas.node, 60, 50)[3]).toBeGreaterThan(0);
    const clean = trailEngine();
    fly(clean, canvas, 20, 6);
    clearTrail(clean, 'p.dot');
    fly(clean, canvas, 160, 1);
    expect(countPainted(canvas.node, { x: 0, y: 0, w: 140, h: 100 })).toBe(0);
  });

  it('switches an authored glow off and on again per effect entry', () => {
    const b = new SpriteBuilder('g', { x: 50, y: 50 });
    b.circle('dot', 20, { fill: '#ffffff', effects: [outerGlow('#ff0000', 12)] });
    const engine = loadEngine(makeArtboard('glow', b.build().objects, { width: 100, height: 100, background: null }));
    const canvas = nodeCanvasLike(100, 100);
    const painted = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) engine.render(ctx, 100, 100);
      return countPainted(canvas.node);
    };
    const glowing = painted();
    setEffectEnabled(engine, 'g.dot', 0, false);
    const plain = painted();
    expect(plain).toBeLessThan(glowing * 0.6);
    expect(pixelAt(canvas.node, 50, 50)).toEqual([255, 255, 255, 255]);
    expect((stateOf(engine, 'g.dot').style as { effects: unknown[] }).effects).toHaveLength(1);
    setEffectEnabled(engine, 'g.dot', 0, true);
    expect(painted()).toBe(glowing);
  });

  it('switches an emitter on for one step through its rate input', () => {
    const canvas = nodeCanvasLike(200, 100);
    const stage = new Stage(canvas);
    const emitter = buildEmitter('spark', 'pt.spark.0');
    stage.load(makeArtboard('pt', emitter.objects, { width: 200, height: 100, background: null }));
    setEmitterRate(stage.engine, 'pt.spark.0', 0);
    stage.advance(1 / 60);
    stage.render();
    expect(countPainted(canvas.node)).toBe(0);
    stage.engine.updateObjectProperty('pt.spark.0', 'x', 100);
    stage.engine.updateObjectProperty('pt.spark.0', 'y', 50);
    setEmitterRate(stage.engine, 'pt.spark.0', 10.5 * 60);
    stage.advance(1 / 60);
    setEmitterRate(stage.engine, 'pt.spark.0', 0);
    stage.render();
    expect(countPainted(canvas.node)).toBeGreaterThan(20);
  });

  it('draws over the canvas contents instead of clearing them', () => {
    const canvas = nodeCanvasLike(40, 40);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no context');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 10, 10);
    const b = new SpriteBuilder('o', { x: 30, y: 30 });
    b.circle('c', 5, { fill: '#00ff00' });
    const overlay = new Stage(overlayCanvas(canvas));
    overlay.load(makeArtboard('o', b.build().objects, { width: 40, height: 40, background: null }));
    overlay.render();
    expect(pixelAt(canvas.node, 5, 5)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(canvas.node, 30, 30)[1]).toBe(255);
    expect(overlayCanvas(canvas).width).toBe(40);
  });
});
