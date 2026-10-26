import { describe, expect, it } from 'vitest';
import { moltenSurfaces } from '../../art/world/terrain';
import { getLevel, LEVELS } from '../../game/levels';
import { countPainted } from '../../platform/nodeCanvas';
import { BURST_EMITTERS, burstsFor, ParticleLayer } from './particleLayer';
import { nodeCanvasLike, stateOf } from './testSupport';

const volcano = LEVELS.find((l) => l.theme === 'volcano' && moltenSurfaces(l).length > 0) ?? getLevel(10);
const calm = LEVELS.find((l) => moltenSurfaces(l).length === 0 && l.towers.includes('cannon') && l.towers.includes('frost')) ?? getLevel(1);

describe('burstsFor', () => {
  it('throws sparks and debris from explosions (more for bigger splashes) and ice from frost bursts', () => {
    const at = { x: 1, y: 2 };
    const small = burstsFor({ kind: 'explosion', spec: { at, radius: 45 } });
    const big = burstsFor({ kind: 'explosion', spec: { at, radius: 75 } });
    expect(small.map((b) => b.kind)).toEqual(['spark', 'debris']);
    expect(big[0]?.count).toBeGreaterThan(small[0]?.count ?? 0);
    expect(burstsFor({ kind: 'frostBurst', spec: { at, radius: 30 } })).toEqual([{ kind: 'frost', at, count: 10 }]);
    expect(burstsFor({ kind: 'hitSpark', spec: { at } })).toEqual([]);
  });
});

describe('ParticleLayer', () => {
  it('draws a burst over the canvas after one step, then lets it fade', () => {
    const canvas = nodeCanvasLike(320, 180);
    const layer = new ParticleLayer(canvas, calm);
    expect(layer.burst({ kind: 'spark', at: { x: 640, y: 360 }, count: 12 })).toBe(true);
    layer.render();
    expect(countPainted(canvas.node)).toBe(0);
    layer.advance(0);
    layer.render();
    expect(countPainted(canvas.node)).toBe(0);
    layer.advance(1 / 60);
    layer.render();
    expect(countPainted(canvas.node, { x: 140, y: 70, w: 40, h: 40 })).toBeGreaterThan(0);
    for (let i = 0; i < 60; i++) layer.advance(1 / 60);
    canvas.getContext('2d')?.clearRect(0, 0, 320, 180);
    layer.render();
    expect(countPainted(canvas.node)).toBe(0);
  });

  it('gives each burst of a frame its own emitter and counts the ones that find none', () => {
    const layer = new ParticleLayer(nodeCanvasLike(32, 18), calm);
    for (let i = 0; i < BURST_EMITTERS; i++) expect(layer.burst({ kind: 'frost', at: { x: i * 100, y: 0 }, count: 5 })).toBe(true);
    expect(layer.burst({ kind: 'frost', at: { x: 0, y: 0 }, count: 5 })).toBe(false);
    expect(layer.dropped).toBe(1);
    layer.advance(1 / 60);
    expect(stateOf(layer.stage.engine, 'pt.frost.3').x).toBe(300);
    expect(layer.burst({ kind: 'frost', at: { x: 0, y: 0 }, count: 5 })).toBe(true);
  });

  it('only builds emitters a level can use: no embers without molten surfaces', () => {
    const ids = new ParticleLayer(nodeCanvasLike(32, 18), calm).emitterIds();
    expect(ids.some((id) => id.startsWith('pt.ember.'))).toBe(false);
    const meadowOnlyRifles = { ...calm, towers: ['rifle' as const] };
    expect(new ParticleLayer(nodeCanvasLike(32, 18), meadowOnlyRifles).emitterIds()).toEqual([]);
  });

  it('raises embers from every molten surface of a volcano level', () => {
    const canvas = nodeCanvasLike(1280, 720);
    const layer = new ParticleLayer(canvas, volcano);
    const surfaces = moltenSurfaces(volcano);
    expect(layer.emitterIds().filter((id) => id.startsWith('pt.ember.'))).toHaveLength(surfaces.length);
    for (let i = 0; i < 120; i++) layer.advance(1 / 60);
    layer.render();
    const first = surfaces[0];
    if (!first) throw new Error('no molten surface');
    expect(countPainted(canvas.node, { x: Math.max(0, Math.round(first.x - 60)), y: Math.max(0, Math.round(first.y - 80)), w: 120, h: 100 })).toBeGreaterThan(0);
  });
});
