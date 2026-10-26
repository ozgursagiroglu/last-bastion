/** Where every HUD piece sits, in design coords (1280×720), and the placement of menus around a pad. Pure. */
import { DESIGN_HEIGHT, DESIGN_WIDTH, PAD_RADIUS, type Vec2 } from '../../game/types';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Dark bar behind the counters (center and size). */
export const TOP_BAR = { x: 214, y: 36, w: 396, h: 54 } as const;
export const COUNTERS = {
  lives: { x: 72, y: 36 },
  gold: { x: 194, y: 36 },
  wave: { x: 336, y: 36 },
} as const;

export const TOP_BUTTON_R = 26;
export const TOP_BUTTONS = {
  speed: { x: 1124, y: 36 },
  pause: { x: 1186, y: 36 },
  sound: { x: 1248, y: 36 },
} as const;

/** Call-wave button in the bottom-right HUD corner. */
export const CALL = { x: 1194, y: 640, r: 38, ringRadius: 48, ringWidth: 7, labelY: 63 } as const;

/** Radial menu: option buttons on an arc around the pad. */
export const OPTION_R = 30;
export const MENU_RADIUS = 96;
/** Cost tag pill under each option, relative to the option center. */
export const COST_PILL = { y: OPTION_R + 6, w: 68, h: 24 } as const;
export const TOOLTIP = { w: 300, h: 142 } as const;

/** Where menus and tooltips may go: the board minus the top strip, with a small margin. */
export const SAFE: Box = { x: 6, y: 74, w: DESIGN_WIDTH - 12, h: DESIGN_HEIGHT - 80 };
/** The bottom-right corner the call-wave button owns. */
export const CALL_ZONE: Box = { x: 1080, y: 590, w: 200, h: 130 };
/** Menus open toward this point (center of the playable area below the top strip). */
export const BOARD_CENTER: Vec2 = { x: DESIGN_WIDTH / 2, y: (70 + DESIGN_HEIGHT) / 2 };

export const PAD_HIT_RADIUS = PAD_RADIUS + 6;

export const OVERLAY_BUTTON = { w: 250, h: 60 } as const;
export const PAUSE_PANEL = { x: 640, y: 360, w: 400, h: 390, titleY: -125, buttons: { resume: -35, restart: 45, quit: 125 } } as const;
export const VICTORY_PANEL = { x: 640, y: 360, w: 460, h: 420, titleY: -145, starsY: -55, buttons: { continue: 65, replay: 145 } } as const;
export const DEFEAT_PANEL = { x: 640, y: 360, w: 440, h: 370, titleY: -120, subtitleY: -62, buttons: { retry: 25, quit: 105 } } as const;

/** Banner center (WAVE n), the boss banner below it. */
export const BANNER = { x: 640, y: 178, w: 380, h: 78, bossY: 66, bossW: 340, bossH: 46 } as const;

/** Box an option (button + cost pill) covers around its center. */
export function optionBox(c: Vec2): Box {
  const half = Math.max(OPTION_R + 2, COST_PILL.w / 2);
  const top = c.y - OPTION_R - 2;
  const bottom = c.y + COST_PILL.y + COST_PILL.h / 2;
  return { x: c.x - half, y: top, w: half * 2, h: bottom - top };
}

export function inside(inner: Box, outer: Box): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function fits(box: Box): boolean {
  return inside(box, SAFE) && !overlaps(box, CALL_ZONE);
}

const RAD = Math.PI / 180;

/** Degrees between neighbouring options. */
function arcStep(count: number): number {
  return count <= 2 ? 64 : 54;
}

function arcAt(pad: Vec2, count: number, centerDeg: number): Vec2[] {
  const step = arcStep(count);
  return Array.from({ length: count }, (_, i) => {
    const a = (centerDeg + (i - (count - 1) / 2) * step) * RAD;
    return { x: pad.x + Math.cos(a) * MENU_RADIUS, y: pad.y + Math.sin(a) * MENU_RADIUS };
  });
}

function clampInto(box: Box, area: Box): Vec2 {
  return {
    x: Math.min(area.x + area.w - box.w, Math.max(area.x, box.x)) - box.x,
    y: Math.min(area.y + area.h - box.h, Math.max(area.y, box.y)) - box.y,
  };
}

/** Horizontal distance between options laid out in a row. */
const ROW_STEP = COST_PILL.w + 8;

/** A row of options centered under (side 1) or over (side -1) the pad, slid sideways to stay on the board. */
function rowAt(pad: Vec2, count: number, side: 1 | -1): Vec2[] {
  const half = ((count - 1) * ROW_STEP) / 2;
  const margin = COST_PILL.w / 2;
  const y = pad.y + side * MENU_RADIUS;
  let right = SAFE.x + SAFE.w - margin - half;
  if (overlaps(optionBox({ x: CALL_ZONE.x, y }), CALL_ZONE)) right = Math.min(right, CALL_ZONE.x - margin - half - 1);
  const cx = Math.max(SAFE.x + margin + half, Math.min(right, pad.x));
  return Array.from({ length: count }, (_, i) => ({ x: cx - half + i * ROW_STEP, y }));
}

/**
 * Centers of `count` option buttons on an arc around the pad, opening toward the board center. When that arc leaves the
 * safe area (board edges, the top strip, the call-wave corner) it is turned by the smallest angle that fits; when no
 * turn fits (a pad close to the top strip) the options form a row under the pad, or over it.
 */
export function menuSlots(pad: Vec2, count: number): Vec2[] {
  const dx = BOARD_CENTER.x - pad.x;
  const dy = BOARD_CENTER.y - pad.y;
  const toward = Math.hypot(dx, dy) < 1 ? -90 : Math.atan2(dy, dx) / RAD;
  const fitsAll = (slots: readonly Vec2[]) => slots.every((s) => fits(optionBox(s)));
  for (let turn = 0; turn <= 180; turn += 6) {
    for (const sign of turn === 0 ? [1] : [1, -1]) {
      const slots = arcAt(pad, count, toward + sign * turn);
      if (fitsAll(slots)) return slots;
    }
  }
  for (const side of [1, -1] as const) {
    const row = rowAt(pad, count, side);
    if (fitsAll(row)) return row;
  }
  return arcAt(pad, count, toward).map((s) => {
    const shift = clampInto(optionBox(s), SAFE);
    return { x: s.x + shift.x, y: s.y + shift.y };
  });
}

function union(boxes: readonly Box[]): Box {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: right - x, h: bottom - y };
}

export function tooltipBox(center: Vec2): Box {
  return { x: center.x - TOOLTIP.w / 2, y: center.y - TOOLTIP.h / 2, w: TOOLTIP.w, h: TOOLTIP.h };
}

/** Center of the tooltip next to an open menu: beside it toward the board center if it fits, else another side. */
export function tooltipCenter(pad: Vec2, slots: readonly Vec2[]): Vec2 {
  const menu = union([{ x: pad.x - PAD_RADIUS, y: pad.y - PAD_RADIUS, w: PAD_RADIUS * 2, h: PAD_RADIUS * 2 }, ...slots.map(optionBox)]);
  const gap = 10;
  const clampY = (y: number) => Math.min(SAFE.y + SAFE.h - TOOLTIP.h / 2, Math.max(SAFE.y + TOOLTIP.h / 2, y));
  const clampX = (x: number) => Math.min(SAFE.x + SAFE.w - TOOLTIP.w / 2, Math.max(SAFE.x + TOOLTIP.w / 2, x));
  const right = { x: menu.x + menu.w + gap + TOOLTIP.w / 2, y: clampY(pad.y) };
  const left = { x: menu.x - gap - TOOLTIP.w / 2, y: clampY(pad.y) };
  const below = { x: clampX(pad.x), y: menu.y + menu.h + gap + TOOLTIP.h / 2 };
  const above = { x: clampX(pad.x), y: menu.y - gap - TOOLTIP.h / 2 };
  const candidates = pad.x < BOARD_CENTER.x ? [right, left, below, above] : [left, right, below, above];
  const fit = candidates.find((c) => fits(tooltipBox(c)));
  if (fit) return fit;
  const first = tooltipBox(right);
  const shift = clampInto(first, SAFE);
  return { x: right.x + shift.x, y: right.y + shift.y };
}
