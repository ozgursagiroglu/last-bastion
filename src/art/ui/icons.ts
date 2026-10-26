/**
 * Bold outlined icons for buttons, counters and tags. Each icon is drawn in a 32 × 32 design box centered on the
 * origin and scaled to the requested size, so outlines are 2.5 px at size 32. Object icons (heart, coin, skull, star,
 * swords, lock, upgrade, sell) carry their own colors; glyph icons (pause, play, fast, close, retry, home, sound, check)
 * are white so they read on every button variant.
 */
import type { Fill } from 'exodeui';
import { linear, ROOT, solid, type PathPoint, type SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE, type Ramp } from '../palette';
import { arcPoints, starPoints } from './geom';

export type IconName =
  | 'heart'
  | 'coin'
  | 'skull'
  | 'star'
  | 'starEmpty'
  | 'swords'
  | 'pause'
  | 'play'
  | 'fast'
  | 'lock'
  | 'upgrade'
  | 'sell'
  | 'close'
  | 'retry'
  | 'home'
  | 'soundOn'
  | 'soundOff'
  | 'check';

export const ICON_NAMES: readonly IconName[] = [
  'heart',
  'coin',
  'skull',
  'star',
  'starEmpty',
  'swords',
  'pause',
  'play',
  'fast',
  'lock',
  'upgrade',
  'sell',
  'close',
  'retry',
  'home',
  'soundOn',
  'soundOff',
  'check',
];

/** Side of the design box the icons are drawn in. */
export const ICON_BOX = 32;
/** Outline width in design-box units. */
const OW = 2.5;

const WHITE: Ramp = { light: '#ffffff', dark: '#c9d3de' };
const BONE: Ramp = { light: '#fff8e4', dark: '#bfae86' };
const GREEN: Ramp = { light: '#b4f064', dark: '#3a8c1a' };
const EMPTY: Ramp = { light: '#86735f', dark: '#3e3128' };
const SHINE = '#ffffff';

function ramp(r: Ramp): Fill {
  return linear([[0, r.light], [1, r.dark]]);
}

type Part =
  | { kind: 'fill'; points: readonly PathPoint[]; fill: Fill }
  | { kind: 'line'; points: readonly PathPoint[]; width: number; color: string; cap?: 'round' | 'butt' }
  | { kind: 'rect'; w: number; h: number; r: number; x?: number; y?: number; rotation?: number; fill: Fill };

/** Adds the parts of one icon under its content group, with generated part names. */
class Pen {
  private n = 0;
  constructor(
    readonly b: SpriteBuilder,
    readonly name: string,
  ) {}

  next(tag: string): string {
    return `${this.name}.${tag}${this.n++}`;
  }

  /** Closed shape with the standard outline. */
  shape(points: readonly PathPoint[], fill: Fill, opts: { x?: number; y?: number } = {}): string {
    return this.b.path(this.next('s'), points, { closed: true, fill, stroke: { color: OUTLINE, width: OW }, ...opts }, this.name);
  }

  rect(w: number, h: number, r: number | readonly [number, number, number, number], fill: Fill | string, opts: { x?: number; y?: number; rotation?: number } = {}): string {
    return this.b.rect(this.next('r'), w, h, { radius: r, fill, stroke: { color: OUTLINE, width: OW }, ...opts }, this.name);
  }

  circle(r: number, fill: Fill | string, opts: { x?: number; y?: number; stroke?: number } = {}): string {
    const { stroke = OW, ...pos } = opts;
    return this.b.circle(this.next('c'), r, { fill, stroke: { color: OUTLINE, width: stroke }, ...pos }, this.name);
  }

  /** Soft white highlight ellipse (top-left light). */
  shine(w: number, h: number, x: number, y: number, rotation: number, opacity = 0.55): void {
    this.b.ellipse(this.next('hl'), w, h, { x, y, rotation, fill: solid(SHINE, opacity) }, this.name);
  }

  /** Flat dark detail without an outline (eyes, keyholes, doors). */
  ink(points: readonly PathPoint[]): void {
    this.b.path(this.next('ink'), points, { closed: true, fill: OUTLINE }, this.name);
  }

  /**
   * Parts sharing one outline: every outline is drawn first, then every fill, so overlaps merge into one silhouette.
   * The outline is as thick as a plain shape's (OW outside the fill).
   */
  merged(parts: readonly Part[]): void {
    for (const p of parts) this.part(p, true);
    for (const p of parts) this.part(p, false);
  }

  private part(p: Part, outline: boolean): void {
    const tag = outline ? 'o' : 'f';
    if (p.kind === 'line') {
      const width = outline ? p.width + OW * 2 : p.width;
      this.b.path(this.next(tag), p.points, { stroke: { color: outline ? OUTLINE : p.color, width, cap: p.cap ?? 'round' } }, this.name);
      return;
    }
    const paint = outline ? { fill: OUTLINE, stroke: { color: OUTLINE, width: OW * 2 } } : { fill: p.fill };
    if (p.kind === 'fill') this.b.path(this.next(tag), p.points, { closed: true, ...paint }, this.name);
    else this.b.rect(this.next(tag), p.w, p.h, { radius: p.r, x: p.x, y: p.y, rotation: p.rotation, ...paint }, this.name);
  }
}

const HEART: PathPoint[] = [
  { x: 0, y: -7, inX: -2, inY: -12, outX: 2, outY: -12 },
  { x: 8, y: -13, inX: 3, inY: -13, outX: 13, outY: -13 },
  { x: 15, y: -4.5, inX: 15, inY: -10.5, outX: 15, outY: 1.5 },
  { x: 0, y: 14, inX: 8, inY: 7.5, outX: -8, outY: 7.5 },
  { x: -15, y: -4.5, inX: -15, inY: 1.5, outX: -15, outY: -10.5 },
  { x: -8, y: -13, inX: -13, inY: -13, outX: -3, outY: -13 },
];

function coin(p: Pen, cx: number, cy: number, r: number): void {
  p.circle(r, ramp(PALETTE.gold), { x: cx, y: cy });
  p.b.circle(p.next('rim'), r * 0.64, { x: cx, y: cy, fill: linear([[0, '#d9951c'], [1, '#ffe486']]), stroke: { color: '#9a5f0a', width: 2 } }, p.name);
  p.b.path(p.next('mark'), starPoints(cx, cy + r * 0.04, r * 0.42, r * 0.19, 5), { closed: true, fill: '#fff0b0', stroke: { color: '#9a5f0a', width: 1.5 } }, p.name);
  p.shine(r * 0.5, r * 0.28, cx - r * 0.45, cy - r * 0.55, -40, 0.75);
}

function sword(p: Pen, rotation: number): void {
  const g = p.next('sword');
  p.b.group(g, { rotation }, p.name);
  const local = new Pen(p.b, g);
  local.shape(
    [{ x: -3, y: 5 }, { x: -3, y: -12.5 }, { x: 0, y: -17.5 }, { x: 3, y: -12.5 }, { x: 3, y: 5 }],
    linear([[0, '#ffffff'], [0.5, PALETTE.metal.light], [1, PALETTE.metal.dark]], [0, 0.5], [1, 0.5]),
  );
  local.rect(4.5, 7, 1.5, ramp(PALETTE.wood), { y: 10.5 });
  local.rect(14, 4.5, 2, ramp(PALETTE.gold), { y: 6.5 });
  local.circle(3, ramp(PALETTE.gold), { y: 15.5 });
}

function speaker(p: Pen): void {
  p.shape([{ x: -13, y: -5 }, { x: -7, y: -5 }, { x: 1, y: -12 }, { x: 1, y: 12 }, { x: -7, y: 5 }, { x: -13, y: 5 }], ramp(WHITE));
}

interface IconDef {
  draw: (p: Pen) => void;
  /** Offset of the drawing so its visual center sits on the icon's origin. */
  dx?: number;
  dy?: number;
}

const ICONS: Record<IconName, IconDef> = {
  heart: {
    dy: -0.5,
    draw: (p) => {
      p.shape(HEART, ramp(PALETTE.red));
      p.shine(8, 5, -7.5, -6, -45, 0.6);
    },
  },
  coin: { draw: (p) => coin(p, 0, 0, 14) },
  skull: {
    draw: (p) => {
      const bone = ramp(BONE);
      p.merged([
        { kind: 'rect', w: 15, h: 10, r: 3, y: 8.5, fill: linear([[0, '#e8dcbc'], [1, BONE.dark]]) },
        { kind: 'fill', points: arcPoints(0, -3, 12.5, 0, 360, 9), fill: bone },
      ]);
      p.shine(9, 4.5, -5, -10.5, -25, 0.5);
      p.b.ellipse(p.next('eye'), 7.5, 8.5, { x: -5, y: -2, fill: OUTLINE }, p.name);
      p.b.ellipse(p.next('eye'), 7.5, 8.5, { x: 5, y: -2, fill: OUTLINE }, p.name);
      p.ink([{ x: 0, y: 3.5 }, { x: 2.5, y: 7 }, { x: -2.5, y: 7 }]);
      p.b.path(p.next('teeth'), [{ x: -2.5, y: 10, moveTo: true }, { x: -2.5, y: 13.5 }, { x: 2.5, y: 10, moveTo: true }, { x: 2.5, y: 13.5 }], { stroke: { color: OUTLINE, width: 2 } }, p.name);
    },
  },
  star: {
    draw: (p) => {
      p.shape(starPoints(0, 1.5, 15.5, 7.5, 5), ramp(PALETTE.gold));
      p.shine(7, 4, -3.5, -2, -30, 0.6);
    },
  },
  starEmpty: {
    draw: (p) => {
      p.shape(starPoints(0, 1.5, 15.5, 7.5, 5), ramp(EMPTY));
      p.b.path(p.next('hollow'), starPoints(0, 2, 8.5, 4, 5), { closed: true, fill: solid('#000000', 0.3) }, p.name);
    },
  },
  swords: {
    draw: (p) => {
      sword(p, -45);
      sword(p, 45);
    },
  },
  pause: {
    draw: (p) => {
      p.rect(8, 23, 2.5, ramp(WHITE), { x: -6 });
      p.rect(8, 23, 2.5, ramp(WHITE), { x: 6 });
    },
  },
  play: {
    dx: 1.5,
    draw: (p) => p.shape([{ x: -10, y: -13.5 }, { x: 12, y: 0 }, { x: -10, y: 13.5 }], ramp(WHITE)),
  },
  fast: {
    draw: (p) => {
      for (const dx of [-7, 4]) {
        p.shape([{ x: dx - 6, y: -12 }, { x: dx + 2, y: -12 }, { x: dx + 11, y: 0 }, { x: dx + 2, y: 12 }, { x: dx - 6, y: 12 }, { x: dx + 3, y: 0 }], ramp(WHITE));
      }
    },
  },
  lock: {
    dy: 0.5,
    draw: (p) => {
      p.merged([
        {
          kind: 'line',
          cap: 'butt',
          width: 4.5,
          color: PALETTE.metal.light,
          points: [{ x: -7, y: 0 }, { x: -7, y: -6, outX: -7, outY: -14.5 }, { x: 7, y: -6, inX: 7, inY: -14.5 }, { x: 7, y: 0 }],
        },
      ]);
      p.rect(23, 17, 3.5, ramp(PALETTE.gold), { y: 5.5 });
      p.b.circle(p.next('key'), 2.8, { y: 3.5, fill: OUTLINE }, p.name);
      p.ink([{ x: -1.3, y: 4 }, { x: 1.3, y: 4 }, { x: 2, y: 9.5 }, { x: -2, y: 9.5 }]);
    },
  },
  upgrade: {
    dy: -0.5,
    draw: (p) => {
      p.shape([{ x: 0, y: -15 }, { x: 14, y: -0.5 }, { x: 5.5, y: -0.5 }, { x: 5.5, y: 14 }, { x: -5.5, y: 14 }, { x: -5.5, y: -0.5 }, { x: -14, y: -0.5 }], ramp(GREEN));
      p.b.path(p.next('hl'), [{ x: 0, y: -11 }, { x: -9.5, y: -3 }, { x: -2, y: -3 }], { closed: true, fill: solid(SHINE, 0.45) }, p.name);
    },
  },
  sell: {
    draw: (p) => {
      coin(p, -3, -3, 12);
      p.circle(7.5, ramp(PALETTE.red), { x: 8.5, y: 8.5 });
      p.b.rect(p.next('minus'), 8.5, 3, { x: 8.5, y: 8.5, radius: 1.2, fill: '#ffffff' }, p.name);
    },
  },
  close: {
    draw: (p) => {
      const white = ramp(WHITE);
      p.merged([
        { kind: 'rect', w: 30, h: 8.5, r: 3, rotation: 45, fill: white },
        { kind: 'rect', w: 30, h: 8.5, r: 3, rotation: -45, fill: white },
      ]);
    },
  },
  retry: {
    dy: 0.5,
    draw: (p) => {
      const end = 255;
      const a = (end * Math.PI) / 180;
      const e = { x: 10.5 * Math.cos(a), y: 1 + 10.5 * Math.sin(a) };
      const t = { x: -Math.sin(a), y: Math.cos(a) };
      const n = { x: Math.cos(a), y: Math.sin(a) };
      p.merged([
        { kind: 'line', width: 5, color: '#eef2f6', points: arcPoints(0, 1, 10.5, -25, end + 25, 9) },
        {
          kind: 'fill',
          fill: ramp(WHITE),
          points: [
            { x: e.x + t.x * 7.5, y: e.y + t.y * 7.5 },
            { x: e.x - t.x * 1.5 + n.x * 7, y: e.y - t.y * 1.5 + n.y * 7 },
            { x: e.x - t.x * 1.5 - n.x * 7, y: e.y - t.y * 1.5 - n.y * 7 },
          ],
        },
      ]);
    },
  },
  home: {
    draw: (p) => {
      p.rect(5, 9, 1, ramp(WHITE), { x: 8.5, y: -8 });
      p.shape([{ x: 0, y: -14.5 }, { x: 15, y: -0.5 }, { x: 10.5, y: -0.5 }, { x: 10.5, y: 13.5 }, { x: -10.5, y: 13.5 }, { x: -10.5, y: -0.5 }, { x: -15, y: -0.5 }], ramp(WHITE));
      p.b.rect(p.next('door'), 7, 10, { y: 8, radius: [3.5, 3.5, 0, 0], fill: OUTLINE }, p.name);
    },
  },
  soundOn: {
    dx: -1.5,
    draw: (p) => {
      speaker(p);
      p.merged([
        { kind: 'line', width: 3, color: '#ffffff', points: arcPoints(1, 0, 6.5, -45, 90, 4) },
        { kind: 'line', width: 3, color: '#ffffff', points: arcPoints(1, 0, 12, -45, 90, 5) },
      ]);
    },
  },
  soundOff: {
    dx: -2,
    draw: (p) => {
      speaker(p);
      p.merged([
        { kind: 'line', width: 3.5, color: PALETTE.red.light, points: [{ x: 5.5, y: -4.5 }, { x: 14.5, y: 4.5 }] },
        { kind: 'line', width: 3.5, color: PALETTE.red.light, points: [{ x: 5.5, y: 4.5 }, { x: 14.5, y: -4.5 }] },
      ]);
    },
  },
  check: {
    dy: 0.5,
    draw: (p) => p.merged([{ kind: 'line', width: 6, color: '#ffffff', points: [{ x: -12, y: 0 }, { x: -4, y: 8 }, { x: 12, y: -9 }] }]),
  },
};

/**
 * Icon drawn to fit a size × size box centered on (x, y). Returns the icon group id (scale it, or toggle `visible`).
 * Part names are `${name}.*`.
 */
export function addIcon(b: SpriteBuilder, name: string, icon: IconName, opts: { size: number; x?: number; y?: number }, parent: string = ROOT): string {
  const def = ICONS[icon];
  const groupId = b.group(name, { x: opts.x ?? 0, y: opts.y ?? 0, scale: opts.size / ICON_BOX }, parent);
  const content = `${name}.icon`;
  b.group(content, { x: def.dx ?? 0, y: def.dy ?? 0 }, name);
  def.draw(new Pen(b, content));
  return groupId;
}
