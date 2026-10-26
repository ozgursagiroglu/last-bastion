import { describe, expect, it, vi } from 'vitest';
import { makeArtboard, SpriteBuilder } from '../../art/exode';
import { addRoundButton, ringPoints } from '../../art/ui/kit';
import { loadEngine } from '../../platform/nodeCanvas';
import { Poser } from './poser';

function setup() {
  const b = new SpriteBuilder('p');
  const dot = b.circle('dot', 10, { fill: '#ff0000' });
  const label = b.text('label', 'A', { size: 20 });
  const ring = b.path('ring', ringPoints(0, 0, 20, 1), { dynamic: true, stroke: { color: '#ffffff', width: 2 } });
  const button = addRoundButton(b, 'btn', { r: 20, variant: 'blue', icon: 'pause' });
  const engine = loadEngine(makeArtboard('p', b.build().objects, { background: null }));
  const spy = vi.spyOn(engine, 'updateObjectProperty');
  return { engine, spy, poser: new Poser(engine), dot, label, ring, button };
}

describe('Poser', () => {
  it('writes state through to the engine', () => {
    const { engine, poser, dot, label, button } = setup();
    poser.visible(dot, false);
    poser.pos(dot, 30, 40);
    poser.scale(dot, 2);
    poser.opacity(dot, 0.5);
    poser.text([label], 'B');
    poser.fill(dot, '#00ff00');
    poser.button(button, 'disabled');
    expect(engine.getObjectState(dot)).toMatchObject({ visible: false, x: 30, y: 40, scale_x: 2, opacity: 0.5 });
    expect(engine.getObjectState(label)?.text).toBe('B');
    expect(engine.getObjectState(button.disabledId)?.visible).toBe(true);
  });

  it('skips writes of values already written', () => {
    const { spy, poser, dot, label, ring } = setup();
    poser.pos(dot, 1, 2);
    poser.text([label], 'x');
    poser.path(ring, 'half', () => ringPoints(0, 0, 20, 0.5));
    const writes = spy.mock.calls.length;
    poser.pos(dot, 1, 2);
    poser.text([label], 'x');
    const points = vi.fn(() => ringPoints(0, 0, 20, 0.5));
    poser.path(ring, 'half', points);
    expect(spy.mock.calls.length).toBe(writes);
    expect(points).not.toHaveBeenCalled();
    poser.pos(dot, 1, 3);
    expect(spy.mock.calls.length).toBeGreaterThan(writes);
  });
});
