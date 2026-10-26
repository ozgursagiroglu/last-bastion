import { describe, expect, it } from 'vitest';
import { context2d, countPainted, createNodeCanvas, loadEngine, renderEngine } from '../../platform/nodeCanvas';
import { makeArtboard, validateSprite } from '../exode';
import { buildEffectSample, EFFECT_CASES, effectBoard, type EffectCase } from './engineEffects';

/** Mean ms of engine.render and engine.advance per frame for `count` samples moving 3 px per frame (1280×720). */
function measure(kind: EffectCase, count: number, frames = 60, warm = 30): { render: number; advance: number } {
  const { artboard, samples } = effectBoard(kind, count);
  const engine = loadEngine(artboard);
  const ctx = context2d(createNodeCanvas(1280, 720));
  let render = 0;
  let advance = 0;
  for (let f = 0; f < warm + frames; f++) {
    samples.forEach((s, i) => {
      const x = 40 + (i % 10) * 120 + ((f * 3) % 60);
      engine.updateObjectProperty(s.rootId, 'x', x);
      if (kind === 'trailAnchored') {
        engine.updateObjectProperty(`${s.rootId}.ball`, 'left', x);
        engine.updateObjectProperty(`${s.rootId}.ball`, 'top', 0);
      }
    });
    const a0 = performance.now();
    engine.advance(1 / 60);
    const a1 = performance.now();
    engine.render(ctx, 1280, 720);
    const a2 = performance.now();
    if (f >= warm) {
      advance += a1 - a0;
      render += a2 - a1;
    }
  }
  return { render: render / frames, advance: advance / frames };
}

describe('engine effect samples', () => {
  it('builds every case as a valid sprite that paints', () => {
    for (const kind of EFFECT_CASES) {
      const sample = buildEffectSample(kind, `s-${kind}`, 40, 40);
      expect(validateSprite(sample), kind).toEqual([]);
      const canvas = renderEngine(loadEngine(makeArtboard(kind, sample.objects, { width: 80, height: 80, background: null })), 80, 80);
      expect(countPainted(canvas), kind).toBeGreaterThan(300);
    }
  });

  it('confirms the emitter caveats: hidden emitters keep emitting, at the root position', () => {
    const sample = buildEffectSample('emitter', 'e', 100, 50);
    const engine = loadEngine(makeArtboard('e', sample.objects, { width: 200, height: 100, background: null }));
    engine.updateObjectProperty('e', 'visible', false);
    for (let i = 0; i < 20; i++) engine.advance(1 / 60);
    const canvas = renderEngine(engine, 200, 100);
    expect(countPainted(canvas)).toBeGreaterThan(0);
    expect(countPainted(canvas, { x: 0, y: 0, w: 40, h: 100 })).toBe(0);
  });

  it('measures the cost of each effect for 1, 10 and 40 instances', () => {
    const rows = EFFECT_CASES.map((kind) => {
      const cells = [1, 10, 40].map((n) => {
        const m = measure(kind, n);
        return `${n}: render ${m.render.toFixed(3)} advance ${m.advance.toFixed(3)}`;
      });
      return `${kind.padEnd(15)} ${cells.join(' | ')}`;
    });
    console.log(`ms per frame, 1280×720 Node canvas\n${rows.join('\n')}`);
    expect(rows).toHaveLength(EFFECT_CASES.length);
    // Hang guard: 20–67 s in the full suite on a laptop under load; CI runners are about half as fast.
  }, 360_000);
});
