import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../game/levels';
import { PAD_RADIUS, type Vec2 } from '../../game/types';
import {
  BOARD_CENTER,
  CALL_ZONE,
  inside,
  MENU_RADIUS,
  menuSlots,
  OPTION_R,
  optionBox,
  overlaps,
  SAFE,
  tooltipBox,
  tooltipCenter,
} from './layout';

const angleTo = (from: Vec2, to: Vec2) => Math.atan2(to.y - from.y, to.x - from.x);

describe('menuSlots', () => {
  it('opens toward the board center around a central pad', () => {
    const pad = { x: 400, y: 300 };
    const slots = menuSlots(pad, 3);
    const middle = slots[1];
    if (!middle) throw new Error('no middle slot');
    expect(Math.hypot(middle.x - pad.x, middle.y - pad.y)).toBeCloseTo(MENU_RADIUS);
    expect(angleTo(pad, middle)).toBeCloseTo(angleTo(pad, BOARD_CENTER), 5);
  });

  it('keeps every menu of every level on screen, clear of the HUD, the pad and each other', () => {
    for (const level of LEVELS) {
      level.pads.forEach((pad, i) => {
        for (const count of [level.towers.length, 2]) {
          const slots = menuSlots(pad, count);
          const where = `level ${level.id} pad ${i} (${count} options)`;
          expect(slots, where).toHaveLength(count);
          const boxes = slots.map(optionBox);
          for (const box of boxes) {
            expect(inside(box, SAFE), where).toBe(true);
            expect(overlaps(box, CALL_ZONE), where).toBe(false);
          }
          slots.forEach((s, a) => {
            expect(Math.hypot(s.x - pad.x, s.y - pad.y), where).toBeGreaterThan(PAD_RADIUS + OPTION_R);
            slots.slice(a + 1).forEach((t) => expect(Math.hypot(s.x - t.x, s.y - t.y), where).toBeGreaterThan(OPTION_R * 2 + 4));
          });
        }
      });
    }
  });

  it('lays options out in a row under a pad that hugs the top strip', () => {
    const slots = menuSlots({ x: 120, y: 106 }, 5);
    const ys = new Set(slots.map((s) => s.y));
    expect(ys.size).toBe(1);
    expect([...ys][0]).toBeGreaterThan(106);
  });
});

describe('tooltipCenter', () => {
  it('places the tooltip on screen, clear of the open menu, for every pad', () => {
    for (const level of LEVELS) {
      level.pads.forEach((pad, i) => {
        const slots = menuSlots(pad, level.towers.length);
        const tip = tooltipBox(tooltipCenter(pad, slots));
        const where = `level ${level.id} pad ${i}`;
        expect(inside(tip, SAFE), where).toBe(true);
        for (const s of slots) expect(overlaps(tip, optionBox(s)), where).toBe(false);
      });
    }
  });

  it('prefers the side toward the board center', () => {
    const left = { x: 300, y: 400 };
    expect(tooltipCenter(left, menuSlots(left, 2)).x).toBeGreaterThan(left.x);
    const right = { x: 980, y: 400 };
    expect(tooltipCenter(right, menuSlots(right, 2)).x).toBeLessThan(right.x);
  });
});

describe('boxes', () => {
  it('tests containment and overlap', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(inside({ x: 2, y: 2, w: 3, h: 3 }, a)).toBe(true);
    expect(inside({ x: 8, y: 2, w: 3, h: 3 }, a)).toBe(false);
    expect(overlaps(a, { x: 9, y: 9, w: 5, h: 5 })).toBe(true);
    expect(overlaps(a, { x: 10, y: 0, w: 5, h: 5 })).toBe(false);
  });
});
