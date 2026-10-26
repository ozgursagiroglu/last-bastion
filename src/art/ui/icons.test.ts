import { describe, expect, it } from 'vitest';
import { makeArtboard, SpriteBuilder, validateSprite } from '../exode';
import { countPainted, renderArtboard } from '../../platform/nodeCanvas';
import { addIcon, ICON_NAMES, type IconName } from './icons';

const ALL: Record<IconName, true> = {
  heart: true,
  coin: true,
  skull: true,
  star: true,
  starEmpty: true,
  swords: true,
  pause: true,
  play: true,
  fast: true,
  lock: true,
  upgrade: true,
  sell: true,
  close: true,
  retry: true,
  home: true,
  soundOn: true,
  soundOff: true,
  check: true,
};

describe('icons', () => {
  it('lists every icon once', () => {
    expect([...ICON_NAMES].sort()).toEqual(Object.keys(ALL).sort());
  });

  it.each(ICON_NAMES)('%s builds a valid sprite and paints inside its box', (icon) => {
    const b = new SpriteBuilder('i');
    const id = addIcon(b, 'icon', icon, { size: 32, x: 30, y: 30 });
    expect(id).toBe('i.icon');
    const sprite = b.build();
    expect(validateSprite(sprite)).toEqual([]);
    const canvas = renderArtboard(makeArtboard('i', sprite.objects, { width: 60, height: 60, background: null }));
    const total = countPainted(canvas);
    const inBox = countPainted(canvas, { x: 14, y: 14, w: 32, h: 32 });
    expect(inBox).toBeGreaterThan(32 * 32 * 0.2);
    // Outlines may spill a pixel or two past the box edge, nothing more.
    expect(countPainted(canvas, { x: 12, y: 12, w: 36, h: 36 })).toBe(total);
  });

  it('scales to the requested size', () => {
    const b = new SpriteBuilder('i');
    addIcon(b, 'small', 'coin', { size: 24, x: 20, y: 20 });
    addIcon(b, 'big', 'coin', { size: 64, x: 80, y: 40 });
    const sprite = b.build();
    expect(sprite.objects.find((o) => o.id === 'i.big')?.transform).toMatchObject({ x: 80, y: 40, scale_x: 2, scale_y: 2 });
    const canvas = renderArtboard(makeArtboard('i', sprite.objects, { width: 120, height: 80, background: null }));
    const small = countPainted(canvas, { x: 0, y: 0, w: 40, h: 40 });
    const big = countPainted(canvas, { x: 46, y: 6, w: 68, h: 68 });
    expect(big / small).toBeGreaterThan(5);
    expect(big / small).toBeLessThan(9);
  });
});
