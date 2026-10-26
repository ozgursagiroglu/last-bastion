import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../game/config/enemies';
import { pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { makeArtboard, placeRoot } from '../exode';
import { BOSS } from './boss';
import { buildEnemy } from './kit';

describe('BOSS', () => {
  it('is a large warlord within the standard part budget', () => {
    expect([BOSS.height, BOSS.barWidth]).toEqual([80, 64]);
    expect(buildEnemy(BOSS, 'b').objects.length).toBeLessThanOrEqual(30);
  });

  it('takes slow heavy steps and sways its cape', () => {
    expect(ENEMIES.boss.speed / BOSS.stride).toBeLessThan(1.2);
    expect(BOSS.walk(1).cape?.rotation?.length).toBeGreaterThan(2);
  });

  it('wears red armor', () => {
    const sprite = placeRoot(buildEnemy(BOSS, 'b'), 60, 100);
    const [r, g, b] = pixelAt(renderArtboard(makeArtboard('b', sprite.objects, { width: 120, height: 110, background: null })), 60 + 8, 100 - 34);
    expect(r).toBeGreaterThan(g + 80);
    expect(r).toBeGreaterThan(b + 80);
  });
});
