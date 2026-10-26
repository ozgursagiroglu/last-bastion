import { describe, expect, it } from 'vitest';
import { countPainted, loadEngine, renderEngine } from '../../platform/nodeCanvas';
import { loopClip, playClip } from '../../render/exodeRuntime';
import { makeArtboard, placeRoot } from '../exode';
import { buildTowerSprite } from './index';
import { poseTower } from './pose';

function setup() {
  const sprite = placeRoot(buildTowerSprite('rifle', 'r'), 60, 110);
  const engine = loadEngine(makeArtboard('r', sprite.objects, { width: 120, height: 130, background: null }));
  const clip = (name: string) => {
    const c = sprite.clips[name];
    if (!c) throw new Error(`no ${name}`);
    return c;
  };
  const get = (part: string) => engine.getObjectState(`r.${part}`) as Record<string, unknown>;
  return { sprite, engine, clip, get };
}

describe('rifle tower', () => {
  it('recoils the rifle about 3 px and flashes the muzzle within 0.12 s', () => {
    const { engine, clip, get } = setup();
    const fire = clip('fire');
    expect(fire.duration).toBeLessThanOrEqual(0.12);
    playClip(engine, fire, 0.03);
    expect(get('gun').x).toBeCloseTo(-3);
    playClip(engine, fire, 0.015);
    expect(get('flash').opacity).toBeCloseTo(1);
    playClip(engine, fire, 0.08);
    expect(get('flash').opacity).toBeCloseTo(0);
    playClip(engine, fire, fire.duration);
    expect(get('gun').x).toBeCloseTo(0);
  });

  it('breathes: torso scale_y 1 → 1.03 → 1 over 1.6 s', () => {
    const { engine, clip, get } = setup();
    const idle = clip('idle');
    expect(idle.duration).toBeCloseTo(1.6);
    loopClip(engine, idle, 0.8);
    expect(get('torso').scale_y).toBeCloseTo(1.03);
    loopClip(engine, idle, 1.6);
    expect(get('torso').scale_y).toBeCloseTo(1);
  });

  it('draws the soldier on the right when aiming right and on the left when mirrored', () => {
    const { sprite, engine } = setup();
    poseTower(engine, sprite, 1, 0);
    const right = renderEngine(engine, 120, 130);
    const head = { y: 110 - 62, h: 24, w: 12 };
    const rightSide = countPainted(right, { x: 63, y: head.y, w: head.w, h: head.h });
    const leftSide = countPainted(right, { x: 45, y: head.y, w: head.w, h: head.h });
    poseTower(engine, sprite, 1, Math.PI);
    const left = renderEngine(engine, 120, 130);
    expect(countPainted(left, { x: 45, y: head.y, w: head.w, h: head.h })).toBe(rightSide);
    expect(countPainted(left, { x: 63, y: head.y, w: head.w, h: head.h })).toBe(leftSide);
  });

  it('swaps the nest and helmet per level', () => {
    const { sprite } = setup();
    expect(sprite.tierPartIds[1]).toEqual(expect.arrayContaining(['r.sandFront', 'r.helmet1']));
    expect(sprite.tierPartIds[2]).toEqual(expect.arrayContaining(['r.stakesFront', 'r.helmet2']));
    expect(sprite.tierPartIds[3]).toEqual(expect.arrayContaining(['r.bunkerFront', 'r.goldTrim', 'r.banner', 'r.helmet3']));
  });
});
