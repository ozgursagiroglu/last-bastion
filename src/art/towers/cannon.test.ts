import { describe, expect, it } from 'vitest';
import { loadEngine } from '../../platform/nodeCanvas';
import { loopClip, playClip } from '../../render/exodeRuntime';
import { makeArtboard } from '../exode';
import { buildTowerSprite } from './index';

function setup() {
  const sprite = buildTowerSprite('cannon', 'c');
  const engine = loadEngine(makeArtboard('c', sprite.objects, { width: 100, height: 130, background: null }));
  const clip = (name: string) => {
    const c = sprite.clips[name];
    if (!c) throw new Error(`no ${name}`);
    return c;
  };
  const get = (part: string) => engine.getObjectState(`c.${part}`) as Record<string, unknown>;
  return { sprite, engine, clip, get };
}

describe('cannon tower', () => {
  it('recoils the barrel 6 px along local −x with a flash and a smoke puff', () => {
    const { engine, clip, get } = setup();
    const fire = clip('fire');
    playClip(engine, fire, 0.05);
    expect(get('barrel').x).toBeCloseTo(-6);
    playClip(engine, fire, 0.02);
    expect(get('flash').opacity).toBeCloseTo(1);
    playClip(engine, fire, 0.04);
    expect(Number(get('smoke').opacity)).toBeGreaterThan(0.5);
    playClip(engine, fire, fire.duration);
    expect(get('barrel').x).toBeCloseTo(0);
    expect(get('smoke').opacity).toBeCloseTo(0);
  });

  it('sways the pennant in idle', () => {
    const { engine, clip, get } = setup();
    const idle = clip('idle');
    loopClip(engine, idle, 0);
    const a = Number(get('pennant').rotation);
    loopClip(engine, idle, 1);
    expect(Number(get('pennant').rotation) - a).toBeGreaterThan(8);
  });

  it('aims the turret around the tower top and lengthens the barrel at level 3', () => {
    const { sprite } = setup();
    expect(sprite.aimPartId).toBe('c.turret');
    expect(sprite.facePartId).toBeNull();
    expect(sprite.muzzle[3].x).toBeGreaterThan(sprite.muzzle[1].x + 4);
    expect(sprite.muzzle[1].y).toBe(sprite.aimPivot.y);
    expect(sprite.tierPartIds[3]).toEqual(expect.arrayContaining(['c.barrel3', 'c.rimGold', 'c.caps3']));
  });
});
