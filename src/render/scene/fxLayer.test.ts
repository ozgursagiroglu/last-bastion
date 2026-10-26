import { describe, expect, it } from 'vitest';
import { FX_DURATION } from '../../art/world/fx';
import { renderEngine, countPainted } from '../../platform/nodeCanvas';
import { FX_LINE_Z, FX_Z, FxLayer } from './fxLayer';
import type { SceneFxKind } from './pools';
import { loadSprites, newEngine, stateOf } from './testSupport';

function setup(sizes: Partial<Record<SceneFxKind, number>>) {
  const engine = newEngine();
  const layer = new FxLayer(engine, sizes);
  loadSprites(engine, layer.poolSprites().flat());
  return { engine, layer };
}

describe('FxLayer', () => {
  it('builds hidden instances with prefixed ids', () => {
    const { engine, layer } = setup({ explosion: 2, leak: 1 });
    expect(layer.poolSprites().flat().map((s) => s.rootId)).toEqual(['fx.explosion.0', 'fx.explosion.1', 'fx.leak.0']);
    expect(stateOf(engine, 'fx.explosion.0').visible).toBe(false);
  });

  it('shows a started effect at its point, drawn above the world by y', () => {
    const { engine, layer } = setup({ explosion: 1, tracer: 1 });
    expect(layer.start('explosion', { at: { x: 300, y: 200 }, radius: 50 })).toBe(true);
    const s = stateOf(engine, 'fx.explosion.0');
    expect([s.visible, s.x, s.y, s.zIndex]).toEqual([true, 300, 200, FX_Z + 200]);
    layer.start('tracer', { at: { x: 10, y: 20 }, points: [{ x: 10, y: 20 }, { x: 90, y: 60 }] });
    expect(stateOf(engine, 'fx.tracer.0').zIndex).toBe(FX_LINE_Z + 20);
    layer.advance(0.1);
    expect(countPainted(renderEngine(engine, 640, 360))).toBeGreaterThan(500);
  });

  it('hides an effect once its clip has run for its duration', () => {
    const { engine, layer } = setup({ hitSpark: 1 });
    layer.start('hitSpark', { at: { x: 50, y: 50 } });
    layer.advance(FX_DURATION.hitSpark * 0.5);
    expect(layer.runningIds()).toEqual(['fx.hitSpark.0']);
    layer.advance(FX_DURATION.hitSpark * 0.6);
    expect(layer.runningIds()).toEqual([]);
    expect(stateOf(engine, 'fx.hitSpark.0').visible).toBe(false);
  });

  it('does not advance while paused (dt = 0)', () => {
    const { layer } = setup({ deathPuff: 1 });
    layer.start('deathPuff', { at: { x: 50, y: 50 } });
    for (let i = 0; i < 100; i++) layer.advance(0);
    expect(layer.runningIds()).toEqual(['fx.deathPuff.0']);
  });

  it('recycles the oldest running instance when the pool is full', () => {
    const { engine, layer } = setup({ coinPopup: 3 });
    layer.start('coinPopup', { at: { x: 1, y: 1 }, text: '+1' });
    layer.advance(0.1);
    layer.start('coinPopup', { at: { x: 2, y: 2 }, text: '+2' });
    layer.start('coinPopup', { at: { x: 3, y: 3 }, text: '+3' });
    layer.advance(0.1);
    layer.start('coinPopup', { at: { x: 4, y: 4 }, text: '+4' });
    expect(layer.runningIds('coinPopup')).toHaveLength(3);
    expect(stateOf(engine, 'fx.coinPopup.0').x).toBe(4);
    expect(stateOf(engine, 'fx.coinPopup.1').x).toBe(2);
    layer.start('coinPopup', { at: { x: 5, y: 5 }, text: '+5' });
    expect(stateOf(engine, 'fx.coinPopup.1').x).toBe(5);
    expect(stateOf(engine, 'fx.coinPopup.2').x).toBe(3);
    expect(stateOf(engine, 'fx.coinPopup.2.label.fill').text).toBe('+3');
  });

  it('refuses kinds without a pool', () => {
    const { layer } = setup({ leak: 1 });
    expect(layer.start('lightning', { at: { x: 0, y: 0 }, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] })).toBe(false);
  });
});
