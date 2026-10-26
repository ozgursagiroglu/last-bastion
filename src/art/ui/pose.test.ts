import { describe, expect, it } from 'vitest';
import { makeArtboard, SpriteBuilder } from '../exode';
import { loadEngine } from '../../platform/nodeCanvas';
import { addButton, addStars } from './kit';
import { poseButton, poseStars, type ButtonState } from './pose';

function setup() {
  const b = new SpriteBuilder('ui');
  const button = addButton(b, 'play', { w: 120, h: 48, x: 100, y: 50, variant: 'green', label: 'PLAY' });
  const stars = addStars(b, 'stars', { count: 3, size: 30, x: 100, y: 120 });
  const engine = loadEngine(makeArtboard('ui', b.build().objects, { width: 200, height: 160, background: null }));
  return { engine, button, stars };
}

describe('poseButton', () => {
  it('scales the group for hover and press and shows the cover only when disabled', () => {
    const { engine, button } = setup();
    const expected: Record<ButtonState, [number, boolean]> = {
      hover: [1.06, false],
      pressed: [0.94, false],
      disabled: [1, true],
      normal: [1, false],
    };
    for (const [state, [scale, covered]] of Object.entries(expected) as [ButtonState, [number, boolean]][]) {
      poseButton(engine, button, state);
      expect(engine.getObjectState(button.groupId)).toMatchObject({ scale_x: scale, scale_y: scale });
      expect(engine.getObjectState(button.disabledId)?.visible).toBe(covered);
    }
  });
});

describe('poseStars', () => {
  it('shows the first n stars filled and the rest empty', () => {
    const { engine, stars } = setup();
    for (const n of [0, 1, 2, 3, 5]) {
      poseStars(engine, stars, n);
      stars.filledIds.forEach((id, i) => expect(engine.getObjectState(id)?.visible).toBe(i < n));
      stars.emptyIds.forEach((id, i) => expect(engine.getObjectState(id)?.visible).toBe(i >= n));
    }
  });
});
