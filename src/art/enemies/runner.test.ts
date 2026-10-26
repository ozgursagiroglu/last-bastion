import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../game/config/enemies';
import { pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { makeArtboard, placeRoot } from '../exode';
import { GRUNT } from './grunt';
import { buildEnemy } from './kit';
import { RUNNER } from './runner';

describe('RUNNER', () => {
  const sprite = buildEnemy(RUNNER, 'r');

  it('leans forward', () => {
    expect(sprite.objects.find((o) => o.id === 'r.bob')?.transform.rotation).toBeGreaterThan(0);
  });

  it('takes quicker, longer strides than the goblin', () => {
    expect(RUNNER.stride).toBeGreaterThan(GRUNT.stride);
    expect(ENEMIES.runner.speed / RUNNER.stride).toBeGreaterThan(ENEMIES.grunt.speed / GRUNT.stride);
    expect(RUNNER.walk(1)['leg-front']?.rotation?.[0]?.[1]).toBeGreaterThan(25);
  });

  it('wears a red bandana on top of its head', () => {
    placeRoot(sprite, 50, 60);
    const [r, g, b] = pixelAt(renderArtboard(makeArtboard('r', sprite.objects, { width: 100, height: 70, background: null })), 52, 60 - 22);
    expect(r).toBeGreaterThan(g + 60);
    expect(r).toBeGreaterThan(b + 60);
  });
});
