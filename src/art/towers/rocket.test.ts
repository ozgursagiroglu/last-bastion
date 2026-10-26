import { describe, expect, it } from 'vitest';
import { countPainted, loadEngine, renderEngine } from '../../platform/nodeCanvas';
import { loopClip, playClip } from '../../render/exodeRuntime';
import { makeArtboard, placeRoot } from '../exode';
import { buildTowerSprite } from './index';
import { poseTower } from './pose';

function setup() {
  const sprite = placeRoot(buildTowerSprite('rocket', 'k'), 50, 110);
  const engine = loadEngine(makeArtboard('k', sprite.objects, { width: 100, height: 130, background: null }));
  const clip = (name: string) => {
    const c = sprite.clips[name];
    if (!c) throw new Error(`no ${name}`);
    return c;
  };
  const get = (part: string) => engine.getObjectState(`k.${part}`) as Record<string, unknown>;
  return { sprite, engine, clip, get };
}

describe('rocket tower', () => {
  it('kicks the launcher back and flashes the rear exhaust', () => {
    const { engine, clip, get } = setup();
    const fire = clip('fire');
    playClip(engine, fire, 0.04);
    expect(get('kick').x).toBeCloseTo(-4);
    playClip(engine, fire, 0.03);
    expect(get('exhaust').opacity).toBeCloseTo(1);
    playClip(engine, fire, fire.duration);
    expect(get('kick').x).toBeCloseTo(0);
    expect(get('exhaust').opacity).toBeCloseTo(0);
  });

  it('turns the radar dish in idle', () => {
    const { engine, clip, get } = setup();
    const idle = clip('idle');
    loopClip(engine, idle, idle.duration / 2);
    expect(get('dish').scale_x).toBeCloseTo(0.2);
    loopClip(engine, idle, 0);
    expect(get('dish').scale_x).toBeCloseTo(1);
  });

  it('adds a tube per level (wider launcher)', () => {
    const { sprite, engine } = setup();
    expect(sprite.aimPartId).toBe('k.launcher');
    const aboveDeck = { x: 50 - 16, y: 110 - 55, w: 32, h: 21 };
    const launcherRows = ([1, 2, 3] as const).map((level) => {
      poseTower(engine, sprite, level, -Math.PI / 2);
      return countPainted(renderEngine(engine, 100, 130), aboveDeck);
    });
    expect(launcherRows[1]).toBeGreaterThan(launcherRows[0] ?? 0);
    expect(launcherRows[2]).toBeGreaterThan(launcherRows[1] ?? 0);
  });
});
