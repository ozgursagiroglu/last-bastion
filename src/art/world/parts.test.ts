import { describe, expect, it } from 'vitest';
import { THEME_IDS } from '../../game/types';
import { SpriteBuilder, validateSprite } from '../exode';
import { addCastleGate, addDecor, addPad, addSpawnMarker, DECOR_KINDS } from './parts';

describe('parts', () => {
  it('adds every part into one shared builder, as the menus do', () => {
    const b = new SpriteBuilder('menu');
    b.group('backdrop', { x: 10 });
    addCastleGate(b, 'gate', 600, 400, 'backdrop');
    THEME_IDS.forEach((theme, i) => {
      addPad(b, `pad${i}`, 100 + i * 100, 300, theme, 'backdrop');
      addSpawnMarker(b, `spawn${i}`, 100 + i * 100, 500, theme, 'backdrop');
      DECOR_KINDS[theme].forEach((kind, k) => addDecor(b, `decor${i}-${k}`, kind, 100 + k * 50, 600 + i * 20, 0.9, 'backdrop'));
    });
    const sprite = b.build();
    expect(validateSprite(sprite)).toEqual([]);
    const backdrop = sprite.objects.find((o) => o.id === 'menu.backdrop');
    expect(backdrop?.children).toContain('menu.gate');
    expect(backdrop?.children).toContain('menu.pad0');
    expect(backdrop?.children).toContain('menu.decor3-4');
  });
});
