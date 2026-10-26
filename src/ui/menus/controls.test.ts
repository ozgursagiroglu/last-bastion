import { describe, expect, it } from 'vitest';
import { circleRegion, rectRegion } from '../../art/ui/hit';
import { Controls } from './controls';

function setup() {
  return new Controls([rectRegion('a', 50, 50, 40, 40), circleRegion('b', 150, 50, 20)]);
}

describe('Controls', () => {
  it('activates on up over the control that received down', () => {
    const c = setup();
    expect(c.pointer('down', { x: 50, y: 50 })).toBeNull();
    expect(c.pointer('up', { x: 60, y: 55 })).toBe('a');
  });

  it('ignores an up over another control or after dragging off', () => {
    const c = setup();
    c.pointer('down', { x: 50, y: 50 });
    expect(c.pointer('up', { x: 150, y: 50 })).toBeNull();
    c.pointer('down', { x: 50, y: 50 });
    expect(c.pointer('up', { x: 300, y: 300 })).toBeNull();
    expect(c.pointer('up', { x: 50, y: 50 })).toBeNull();
  });

  it('reports hover and pressed states', () => {
    const c = setup();
    c.pointer('move', { x: 150, y: 50 });
    expect(c.hovered).toBe('b');
    expect(c.state('b')).toBe('hover');
    expect(c.state('a')).toBe('normal');
    c.pointer('down', { x: 150, y: 50 });
    expect(c.state('b')).toBe('pressed');
    c.pointer('move', { x: 300, y: 50 });
    expect(c.state('b')).toBe('normal');
  });

  it('lets disabled controls ignore the pointer', () => {
    const c = setup();
    c.setEnabled('a', false);
    c.pointer('down', { x: 50, y: 50 });
    expect(c.pointer('up', { x: 50, y: 50 })).toBeNull();
    expect(c.state('a')).toBe('disabled');
    c.setEnabled('a', true);
    c.pointer('down', { x: 50, y: 50 });
    expect(c.pointer('up', { x: 50, y: 50 })).toBe('a');
  });
});
