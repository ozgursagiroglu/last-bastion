import { describe, expect, it } from 'vitest';
import { loadEngine, pixelAt, renderEngine } from '../../platform/nodeCanvas';
import { loopClip, playClip } from '../../render/exodeRuntime';
import { makeArtboard, placeRoot } from '../exode';
import { buildTowerSprite } from './index';
import { poseTower } from './pose';

function setup() {
  const sprite = placeRoot(buildTowerSprite('tesla', 't'), 50, 110);
  const engine = loadEngine(makeArtboard('t', sprite.objects, { width: 100, height: 130, background: null }));
  const clip = (name: string) => {
    const c = sprite.clips[name];
    if (!c) throw new Error(`no ${name}`);
    return c;
  };
  const get = (part: string) => engine.getObjectState(`t.${part}`) as Record<string, unknown>;
  return { sprite, engine, clip, get };
}

describe('tesla tower', () => {
  it('pulses the glow and flickers the level-3 arcs in idle', () => {
    const { engine, clip, get } = setup();
    const idle = clip('idle');
    const glow = new Set<number>();
    const arcs = new Set<number>();
    for (let t = 0; t < idle.duration; t += 0.1) {
      loopClip(engine, idle, t);
      glow.add(Math.round(Number(get('glow').opacity) * 100));
      arcs.add(Number(get('arcL').opacity));
    }
    expect(glow.size).toBeGreaterThan(3);
    expect(arcs.has(0)).toBe(true);
    expect(arcs.has(1)).toBe(true);
  });

  it('flashes the sphere on fire', () => {
    const { sprite, engine, clip, get } = setup();
    const fire = clip('fire');
    poseTower(engine, sprite, 1, 0);
    const m = sprite.muzzle[1];
    const before = pixelAt(renderEngine(engine, 100, 130), 50 + m.x + 9, 110 + m.y);
    playClip(engine, fire, 0.04);
    expect(get('flare').opacity).toBeCloseTo(1);
    const during = pixelAt(renderEngine(engine, 100, 130), 50 + m.x + 9, 110 + m.y);
    expect(during[0] + during[1] + during[2]).toBeGreaterThan(before[0] + before[1] + before[2]);
  });

  it('puts the muzzle at the sphere center', () => {
    const { sprite, engine } = setup();
    for (const level of [1, 2, 3] as const) {
      poseTower(engine, sprite, level, 0);
      const m = sprite.muzzle[level];
      const [r, g, b, a] = pixelAt(renderEngine(engine, 100, 130), 50 + m.x, 110 + m.y);
      expect(a).toBe(255);
      expect(r + g + b).toBeGreaterThan(600);
    }
  });
});
