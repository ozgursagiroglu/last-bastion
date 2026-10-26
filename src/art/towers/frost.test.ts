import { describe, expect, it } from 'vitest';
import { loadEngine, pixelAt, renderEngine } from '../../platform/nodeCanvas';
import { loopClip, playClip } from '../../render/exodeRuntime';
import { makeArtboard, placeRoot } from '../exode';
import { buildTowerSprite } from './index';
import { poseTower } from './pose';

function setup() {
  const sprite = placeRoot(buildTowerSprite('frost', 'f'), 50, 110);
  const engine = loadEngine(makeArtboard('f', sprite.objects, { width: 100, height: 130, background: null }));
  const clip = (name: string) => {
    const c = sprite.clips[name];
    if (!c) throw new Error(`no ${name}`);
    return c;
  };
  const get = (part: string) => engine.getObjectState(`f.${part}`) as Record<string, unknown>;
  return { sprite, engine, clip, get };
}

describe('frost tower', () => {
  it('bobs the crystal ±3 px over 2 s and pulses its glow', () => {
    const { sprite, engine, clip, get } = setup();
    const idle = clip('idle');
    expect(idle.duration).toBe(2);
    const rest = sprite.aimPivot.y;
    loopClip(engine, idle, 0.5);
    expect(get('crystal').y).toBeCloseTo(rest - 3);
    loopClip(engine, idle, 1.5);
    expect(get('crystal').y).toBeCloseTo(rest + 3);
    loopClip(engine, idle, 1);
    expect(get('glow').opacity).toBeCloseTo(1);
    loopClip(engine, idle, 0);
    expect(get('glow').opacity).toBeCloseTo(0.75);
  });

  it('flashes the crystal (scale 1.1, flare) and settles within 0.25 s', () => {
    const { engine, clip, get } = setup();
    const fire = clip('fire');
    expect(fire.duration).toBeLessThanOrEqual(0.25);
    playClip(engine, fire, 0.07);
    expect(get('crystal').scale_x).toBeCloseTo(1.1);
    expect(Number(get('flare').opacity)).toBeGreaterThan(0.5);
    playClip(engine, fire, fire.duration);
    expect(get('crystal').scale_x).toBeCloseTo(1);
    expect(get('flare').opacity).toBeCloseTo(0);
  });

  it('puts the muzzle on the crystal tip, higher for the bigger level-3 core', () => {
    const { sprite, engine } = setup();
    expect(sprite.aimPartId).toBeNull();
    expect(sprite.facePartId).toBeNull();
    expect(sprite.muzzle[3].y).toBeLessThan(sprite.muzzle[1].y);
    for (const level of [1, 3] as const) {
      poseTower(engine, sprite, level, 0);
      const canvas = renderEngine(engine, 100, 130);
      const m = sprite.muzzle[level];
      expect(pixelAt(canvas, 50 + m.x, 110 + m.y + 3)[3]).toBe(255);
    }
  });
});
