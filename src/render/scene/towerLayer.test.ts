import { describe, expect, it } from 'vitest';
import { muzzleWorld } from '../../art/towers/pose';
import type { LevelDef } from '../../game/types';
import { TowerLayer } from './towerLayer';
import { fakeTower, loadSprites, newEngine, stateOf } from './testSupport';

const level: LevelDef = {
  id: 1,
  name: 'Test',
  theme: 'meadow',
  paths: [[{ x: 0, y: 100 }, { x: 600, y: 100 }]],
  pads: [{ x: 100, y: 200 }, { x: 300, y: 260 }],
  startGold: 100,
  towers: ['rifle', 'cannon'],
  waves: [],
  decorSeed: 1,
};

function setup() {
  const engine = newEngine();
  const layer = new TowerLayer(engine, level);
  loadSprites(engine, layer.poolSprites().flat());
  return { engine, layer };
}

describe('TowerLayer', () => {
  it('pools one hidden instance per pad and allowed kind, on its pad', () => {
    const { engine, layer } = setup();
    expect(layer.poolSprites().map((pool) => pool.map((s) => s.rootId))).toEqual([
      ['tw.0.rifle', 'tw.1.rifle'],
      ['tw.0.cannon', 'tw.1.cannon'],
    ]);
    const s = stateOf(engine, 'tw.1.cannon');
    expect([s.visible, s.x, s.y]).toEqual([false, 300, 260]);
  });

  it('shows the pad instance of each built tower and hides the rest', () => {
    const { engine, layer } = setup();
    layer.sync([fakeTower(1, level, 1, 'cannon', { level: 2 })], 0, 0);
    const s = stateOf(engine, 'tw.1.cannon');
    expect([s.visible, s.x, s.y, s.zIndex]).toEqual([true, 300, 260, 260]);
    expect(layer.visibleIds()).toEqual(['tw.1.cannon']);
    const sprite = layer.sprite(1, 'cannon');
    const tier2 = sprite?.tierPartIds[2][0];
    if (tier2) expect(stateOf(engine, tier2).visible).toBe(true);
    layer.sync([], 0, 0);
    expect(stateOf(engine, 'tw.1.cannon').visible).toBe(false);
  });

  it('plays fire right after a shot and returns to idle afterwards', () => {
    const { engine, layer } = setup();
    const sprite = layer.sprite(0, 'cannon');
    const fire = sprite?.clips.fire;
    const track = fire?.tracks.find((t) => t.property === 'x' || t.property === 'scale_x' || t.property === 'y');
    if (!fire || !track) throw new Error('cannon fire clip has no transform track');
    const read = () => stateOf(engine, track.object_id)[track.property];
    layer.sync([fakeTower(1, level, 0, 'cannon')], 5, 0);
    const rest = read();
    let moved = false;
    for (let t = 0.02; t < fire.duration; t += 0.02) {
      layer.sync([fakeTower(1, level, 0, 'cannon', { lastFiredAt: 5 })], 5 + t, 0);
      if (read() !== rest) moved = true;
    }
    expect(moved).toBe(true);
    layer.sync([fakeTower(1, level, 0, 'cannon', { lastFiredAt: 5 })], 6, 0);
    expect(read()).toBeCloseTo(rest as number);
  });

  it('computes the muzzle from the instance and the tower state', () => {
    const { layer } = setup();
    const tower = fakeTower(1, level, 0, 'rifle', { aim: 2.5, level: 3 });
    const sprite = layer.sprite(0, 'rifle');
    if (!sprite) throw new Error('missing rifle');
    expect(layer.muzzle(tower)).toEqual(muzzleWorld(sprite, 3, 2.5, tower.pos));
    expect(layer.muzzle(fakeTower(2, level, 1, 'tesla'))).toEqual({ x: 300, y: 260 });
  });

  it('hides a sold pad at once and counts towers without an instance', () => {
    const { engine, layer } = setup();
    layer.sync([fakeTower(1, level, 0, 'rifle'), fakeTower(2, level, 1, 'tesla')], 0, 0);
    expect(layer.dropped).toBe(1);
    layer.hidePad(0);
    expect(stateOf(engine, 'tw.0.rifle').visible).toBe(false);
  });
});
