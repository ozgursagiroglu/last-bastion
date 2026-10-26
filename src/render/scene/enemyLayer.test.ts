import { describe, expect, it, vi } from 'vitest';
import { buildEnemySprite } from '../../art/enemies';
import type { EnemyKind, EnemyState } from '../../game/types';
import { EnemyLayer, FLYER_Z } from './enemyLayer';
import { fakeEnemy, loadSprites, newEngine, stateOf } from './testSupport';

function setup(sizes: Partial<Record<EnemyKind, number>>) {
  const engine = newEngine();
  const layer = new EnemyLayer(engine, sizes);
  loadSprites(engine, layer.poolSprites().flat());
  return { engine, layer };
}

const grunt = buildEnemySprite('grunt', 'en.grunt.0');
const part = (name: string) => `en.grunt.0.${name}`;
const DIE = grunt.clips.die?.duration ?? 0.5;
const HIT = grunt.clips.hit?.duration ?? 0.18;

describe('EnemyLayer', () => {
  it('shows a spawned enemy at its view position on the next sync', () => {
    const { engine, layer } = setup({ grunt: 2, flyer: 1 });
    layer.spawn(1, 'grunt', 0);
    expect(stateOf(engine, 'en.grunt.0').visible).toBe(false);
    layer.sync([fakeEnemy(1, 'grunt', { pos: { x: 320, y: 240 } }), fakeEnemy(2, 'flyer', { pos: { x: 100, y: 50 } })], 0, 0);
    const g = stateOf(engine, 'en.grunt.0');
    expect([g.visible, g.x, g.y, g.zIndex]).toEqual([true, 320, 240, 240]);
    expect(stateOf(engine, 'en.flyer.0').zIndex).toBe(FLYER_Z + 50);
  });

  it('turns around with hysteresis', () => {
    const { engine, layer } = setup({ grunt: 1 });
    const flip = () => stateOf(engine, grunt.facePartId).flip_x;
    const at = (cos: number) => [fakeEnemy(1, 'grunt', { heading: Math.acos(cos) })];
    layer.sync(at(1), 0, 0);
    expect(flip()).toBe(false);
    layer.sync(at(-0.15), 0, 0);
    expect(flip()).toBe(false);
    layer.sync(at(-0.3), 0, 0);
    expect(flip()).toBe(true);
    layer.sync(at(0.15), 0, 0);
    expect(flip()).toBe(true);
    layer.sync(at(0.3), 0, 0);
    expect(flip()).toBe(false);
  });

  it('shows the health bar when hurt or shield-damaged, and frost while slowed', () => {
    const { engine, layer } = setup({ grunt: 1 });
    layer.sync([fakeEnemy(1, 'grunt')], 0, 0);
    expect(stateOf(engine, grunt.hpBar.groupId).visible).toBe(false);
    expect(stateOf(engine, grunt.frostOverlayId).visible).toBe(false);
    layer.sync([fakeEnemy(1, 'grunt', { hp: 5, slowTimer: 1 })], 0, 0);
    expect(stateOf(engine, grunt.hpBar.groupId).visible).toBe(true);
    expect(stateOf(engine, grunt.hpBar.fillId).scale_x).toBeCloseTo(0.5);
    expect(stateOf(engine, grunt.frostOverlayId).visible).toBe(true);
    layer.sync([fakeEnemy(1, 'grunt', { shield: 1, maxShield: 2 })], 0, 0);
    expect(stateOf(engine, grunt.hpBar.groupId).visible).toBe(true);
  });

  it('plays one walk cycle per stride travelled', () => {
    const { engine, layer } = setup({ grunt: 1 });
    const walk = grunt.clips.walk;
    const track = walk?.tracks[0];
    if (!track) throw new Error('grunt walk has no tracks');
    const read = (distance: number) => {
      layer.sync([fakeEnemy(1, 'grunt', { distance })], 0, 0);
      return stateOf(engine, track.object_id)[track.property];
    };
    const d = grunt.stride * 0.3;
    expect(read(d + grunt.stride)).toBeCloseTo(read(d) as number);
    expect(read(d + grunt.stride * 0.5)).not.toBeCloseTo(read(d) as number);
  });

  it('flashes on a recent hit and returns to rest after it', () => {
    const { engine, layer } = setup({ grunt: 1 });
    layer.sync([fakeEnemy(1, 'grunt', { lastHitAt: 9.95 })], 10, 0);
    expect(stateOf(engine, part('flash')).visible).toBe(true);
    layer.sync([fakeEnemy(1, 'grunt', { lastHitAt: 9.95 })], 10 + HIT, 0);
    expect(stateOf(engine, part('flash')).visible).toBe(false);
    expect(stateOf(engine, grunt.bodyPartId).scale_x).toBe(1);
  });

  it('plays die after a kill using dt, then hides and frees the slot', () => {
    const { engine, layer } = setup({ grunt: 1 });
    layer.sync([fakeEnemy(1, 'grunt', { hp: 2 })], 0, 0);
    layer.kill(1, 'grunt', { x: 400, y: 300 });
    expect(stateOf(engine, grunt.hpBar.groupId).visible).toBe(false);
    expect(stateOf(engine, 'en.grunt.0').x).toBe(400);
    layer.sync([], 0, 0);
    expect(layer.dyingIds()).toEqual(new Map([[1, 'en.grunt.0']]));
    layer.sync([], 0, DIE * 0.5);
    expect(stateOf(engine, 'en.grunt.0').visible).toBe(true);
    expect(stateOf(engine, grunt.bodyPartId).rotation).toBeGreaterThan(45);
    // Without a free slot the next enemy is dropped until the body is gone.
    layer.sync([fakeEnemy(2, 'grunt')], 0, 0);
    expect(layer.dropped).toBe(1);
    layer.sync([], 0, DIE * 0.6);
    expect(stateOf(engine, 'en.grunt.0').visible).toBe(false);
    expect(layer.dyingIds().size).toBe(0);
    layer.sync([fakeEnemy(2, 'grunt')], 0, 0);
    expect(layer.dropped).toBe(0);
    expect(stateOf(engine, 'en.grunt.0').visible).toBe(true);
    expect(stateOf(engine, grunt.bodyPartId).rotation).toBe(0);
    expect(stateOf(engine, grunt.bodyPartId).opacity).toBe(1);
  });

  it('shows a body for an enemy killed before it was ever drawn', () => {
    const { engine, layer } = setup({ grunt: 1 });
    layer.spawn(1, 'grunt', 0);
    layer.kill(1, 'grunt', { x: 50, y: 60 });
    const s = stateOf(engine, 'en.grunt.0');
    expect([s.visible, s.x, s.y]).toEqual([true, 50, 60]);
  });

  it('hides a leaked enemy at once and remembers its path', () => {
    const { engine, layer } = setup({ grunt: 1 });
    layer.spawn(1, 'grunt', 0);
    layer.sync([fakeEnemy(1, 'grunt', { path: 2 })], 0, 0);
    expect(layer.pathOf(1)).toBe(2);
    expect(layer.leak(1)).toBe(2);
    expect(stateOf(engine, 'en.grunt.0').visible).toBe(false);
    expect(layer.leak(1)).toBeUndefined();
  });

  for (const freed of ['leak', 'vanish'] as const) {
    it(`resets a slot to the rest pose when a hit enemy is freed by a ${freed}`, () => {
      const { engine, layer } = setup({ grunt: 1 });
      layer.spawn(1, 'grunt', 0);
      layer.sync([fakeEnemy(1, 'grunt', { lastHitAt: 9.95 })], 10, 0);
      expect(stateOf(engine, part('flash')).visible).toBe(true);
      if (freed === 'leak') layer.leak(1);
      else layer.sync([], 10, 0);
      layer.spawn(2, 'grunt', 0);
      layer.sync([fakeEnemy(2, 'grunt')], 10.01, 0);
      expect(layer.rootOf(2)).toBe('en.grunt.0');
      expect(stateOf(engine, part('flash')).visible).toBe(false);
      expect(stateOf(engine, grunt.bodyPartId).scale_x).toBe(1);
      expect(stateOf(engine, grunt.bodyPartId).scale_y).toBe(1);
    });
  }

  it('rewrites the pose only when it changes', () => {
    const { engine, layer } = setup({ grunt: 1 });
    const writes = vi.spyOn(engine, 'updateObjectProperty');
    const poseWrites = () => writes.mock.calls.filter(([id]) => id === grunt.hpBar.fillId || id === grunt.frostOverlayId || id === grunt.facePartId).length;
    layer.sync([fakeEnemy(1, 'grunt', { hp: 5 })], 0, 0);
    expect(poseWrites()).toBeGreaterThan(0);
    writes.mockClear();
    layer.sync([fakeEnemy(1, 'grunt', { hp: 5, distance: 10 })], 0, 0);
    expect(poseWrites()).toBe(0);
    layer.sync([fakeEnemy(1, 'grunt', { hp: 4, distance: 20 })], 0, 0);
    expect(poseWrites()).toBeGreaterThan(0);
    expect(stateOf(engine, grunt.hpBar.fillId).scale_x).toBeCloseTo(0.4);
  });

  it('frees enemies that vanish from the view without an event', () => {
    const { engine, layer } = setup({ grunt: 1 });
    layer.sync([fakeEnemy(1, 'grunt')], 0, 0);
    layer.sync([], 0, 0);
    expect(stateOf(engine, 'en.grunt.0').visible).toBe(false);
    expect(layer.aliveIds().size).toBe(0);
  });

  it('counts enemies without a pool or a free slot as dropped', () => {
    const { layer } = setup({ grunt: 1 });
    const view: EnemyState[] = [fakeEnemy(1, 'grunt'), fakeEnemy(2, 'grunt'), fakeEnemy(3, 'boss')];
    layer.sync(view, 0, 0);
    expect(layer.dropped).toBe(2);
    expect(layer.heightOf('grunt')).toBe(grunt.height);
    expect(layer.heightOf('boss')).toBe(0);
  });
});
