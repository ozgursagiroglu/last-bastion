import { describe, expect, it } from 'vitest';
import type { ProjectileKind } from '../../game/types';
import { PROJECTILE_Z, ProjectileLayer } from './projectileLayer';
import { fakeProjectile, loadSprites, newEngine, stateOf } from './testSupport';

function setup(sizes: Partial<Record<ProjectileKind, number>>) {
  const engine = newEngine();
  const layer = new ProjectileLayer(engine, sizes);
  loadSprites(engine, layer.poolSprites().flat());
  return { engine, layer };
}

describe('ProjectileLayer', () => {
  it('anchors light trails to the flight and forgets them when a slot is reused', () => {
    const { engine, layer } = setup({ cannonball: 1, rocket: 1 });
    const histories = (engine as unknown as { trailHistories: Map<string, unknown> }).trailHistories;
    layer.sync([fakeProjectile(1, 'rocket', { pos: { x: 40, y: 50 }, heading: Math.PI / 2 }), fakeProjectile(2, 'cannonball', { pos: { x: 10, y: 90 }, height: 30 })], 0);
    const rocket = stateOf(engine, 'pr.rocket.0.lightTrail');
    expect([rocket.left, rocket.top, rocket.angle]).toEqual([40, 50, 90]);
    const ball = stateOf(engine, 'pr.cannonball.0.lightTrail');
    expect([ball.left, ball.top, ball.angle]).toEqual([10, 60, 0]);
    histories.set('pr.rocket.0.lightTrail', [{ left: 0, top: 0 }]);
    layer.sync([fakeProjectile(1, 'rocket', { pos: { x: 45, y: 50 } })], 0);
    expect(histories.has('pr.rocket.0.lightTrail')).toBe(true);
    layer.sync([fakeProjectile(3, 'rocket', { pos: { x: 400, y: 50 } })], 0);
    expect(histories.has('pr.rocket.0.lightTrail')).toBe(false);
    expect(stateOf(engine, 'pr.rocket.0.lightTrail').left).toBe(400);
  });

  it('gives new ids a slot, poses them, and frees vanished ids', () => {
    const { engine, layer } = setup({ cannonball: 2, rocket: 1 });
    layer.sync([fakeProjectile(5, 'cannonball', { pos: { x: 40, y: 50 }, height: 30 }), fakeProjectile(6, 'rocket', { heading: Math.PI / 2 })], 0);
    expect(layer.rootOf('cannonball', 5)).toBe('pr.cannonball.0');
    const ball = stateOf(engine, 'pr.cannonball.0');
    expect([ball.visible, ball.x, ball.y, ball.zIndex]).toEqual([true, 40, 50, PROJECTILE_Z + 50]);
    expect(stateOf(engine, 'pr.cannonball.0.lift').y).toBe(-30);
    expect(stateOf(engine, 'pr.rocket.0.heading').rotation).toBeCloseTo(90);

    layer.sync([fakeProjectile(6, 'rocket'), fakeProjectile(7, 'cannonball')], 0.1);
    expect(stateOf(engine, 'pr.cannonball.0').visible).toBe(true);
    expect(layer.rootOf('cannonball', 5)).toBeUndefined();
    expect(layer.rootOf('cannonball', 7)).toBe('pr.cannonball.0');

    layer.sync([], 0.2);
    expect(stateOf(engine, 'pr.cannonball.0').visible).toBe(false);
    expect(stateOf(engine, 'pr.rocket.0').visible).toBe(false);
  });

  it('does not draw projectiles beyond the pool and counts them', () => {
    const { layer } = setup({ iceShard: 1 });
    layer.sync([fakeProjectile(1, 'iceShard'), fakeProjectile(2, 'iceShard'), fakeProjectile(3, 'rocket')], 0);
    expect(layer.dropped).toBe(2);
    layer.sync([fakeProjectile(2, 'iceShard')], 0);
    expect(layer.dropped).toBe(0);
    expect(layer.rootOf('iceShard', 2)).toBe('pr.iceShard.0');
  });
});
