import { describe, expect, it } from 'vitest';
import { pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { setVisible } from '../../render/exodeRuntime';
import { makeArtboard, placeRoot } from '../exode';
import { buildEnemy } from './kit';
import { SHIELD } from './shield';

describe('SHIELD', () => {
  const sprite = placeRoot(buildEnemy(SHIELD, 's'), 50, 60);
  const bubble = sprite.objects.find((o) => o.id === sprite.shieldBubbleId);

  it('has a translucent radial energy bubble around the body', () => {
    expect(bubble?.style.fill).toMatchObject({ type: 'RadialGradient' });
    expect(bubble?.style.compositeOperation).toBe('lighter');
    expect(bubble?.parentId).toBe(sprite.bodyPartId);
    expect(SHIELD.bubble?.ry).toBeGreaterThanOrEqual(SHIELD.height / 2);
  });

  it('holds a wooden shield with an iron rim in front of the body', () => {
    const c = renderArtboard(makeArtboard('s', sprite.objects, { width: 100, height: 70, background: null }), {
      prepare: (engine) => setVisible(engine, 's.bubble', false),
    });
    const [r, g, b] = pixelAt(c, 50 + 9 - 5, 60 - 13 + 3);
    expect(r).toBeGreaterThan(b + 40);
    expect(g).toBeLessThan(r);
    const rim = pixelAt(c, 50 + 9 + 10, 60 - 13);
    expect(Math.abs((rim[0] ?? 0) - (rim[2] ?? 0))).toBeLessThan(50);
  });
});
