/**
 * Shared frame of every enemy sprite: root → shadow, face (flip) → body (hit/die) → art, plus the frost and flash
 * overlays, the optional shield bubble and the health bar. Each kind supplies an `EnemyDesign`.
 */
import type { Fill } from 'exodeui';
import { ENEMIES } from '../../game/config/enemies';
import type { EnemyKind } from '../../game/types';
import {
  linear,
  radial,
  ROOT,
  solid,
  SpriteBuilder,
  type ClipTracks,
  type Easing,
  type Key,
  type PathPoint,
  type SpriteInstance,
  type StrokeSpec,
} from '../exode';
import { OUTLINE, PALETTE, type Ramp } from '../palette';
import type { EnemySprite } from '../types';
import { HP_COLORS } from './pose';

export const LINE: StrokeSpec = { color: OUTLINE, width: 2 };
export const THICK: StrokeSpec = { color: OUTLINE, width: 3 };
export const HIGHLIGHT: Fill = solid('#ffffff', 0.3);

/** Local ramps and colors the shared palette has no match for. */
export const LEATHER: Ramp = { light: '#8a5a32', dark: '#3f2513' };
export const DARK_LEATHER: Ramp = { light: '#5e3a1f', dark: '#2e1a0c' };
export const IRON: Ramp = { light: '#8a98a6', dark: '#323c47' };
export const BONE: Ramp = { light: '#fbf4e0', dark: '#c2ab82' };
export const EYE = '#fff3a0';

/** Vertical light → dark gradient of a ramp. */
export function shade(ramp: Ramp): Fill {
  return linear([[0, ramp.light], [1, ramp.dark]]);
}

/** Axis-aligned ellipse. */
export interface Blob {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

const KAPPA = 0.5523;

/** A closed bezier ellipse as one sub-path (several of them can share one path object). */
export function ellipsePoints({ x, y, rx, ry }: Blob): PathPoint[] {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    { x, y: y - ry, moveTo: true, outX: x + kx, outY: y - ry },
    { x: x + rx, y, inX: x + rx, inY: y - ky, outX: x + rx, outY: y + ky },
    { x, y: y + ry, inX: x + kx, inY: y + ry, outX: x - kx, outY: y + ry },
    { x: x - rx, y, inX: x - rx, inY: y + ky, outX: x - rx, outY: y - ky },
    { x, y: y - ry, inX: x - kx, inY: y - ry, close: true },
  ];
}

export function blobsPath(blobs: readonly Blob[]): PathPoint[] {
  return blobs.flatMap(ellipsePoints);
}

/** A tapered capsule from (ax, ay) to (bx, by), `w0` wide at the start and `w1` at the end, with round ends. */
export function limb(ax: number, ay: number, bx: number, by: number, w0: number, w1: number = w0): PathPoint[] {
  const len = Math.hypot(bx - ax, by - ay);
  if (len === 0) throw new Error('A limb needs two distinct ends');
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const r0 = w0 / 2;
  const r1 = w1 / 2;
  const k0 = (r0 * 4) / 3;
  const k1 = (r1 * 4) / 3;
  const p1 = { x: ax - uy * r0, y: ay + ux * r0 };
  const p2 = { x: bx - uy * r1, y: by + ux * r1 };
  const p3 = { x: bx + uy * r1, y: by - ux * r1 };
  const p4 = { x: ax + uy * r0, y: ay - ux * r0 };
  return [
    { ...p1, moveTo: true, outX: p1.x, outY: p1.y },
    { ...p2, inX: p2.x, inY: p2.y, outX: p2.x + ux * k1, outY: p2.y + uy * k1 },
    { ...p3, inX: p3.x + ux * k1, inY: p3.y + uy * k1, outX: p3.x, outY: p3.y },
    { ...p4, inX: p4.x, inY: p4.y, outX: p4.x - ux * k0, outY: p4.y - uy * k0 },
    { ...p1, inX: p1.x - ux * k0, inY: p1.y - uy * k0, close: true },
  ];
}

/** Straight-edged closed polygon as one sub-path. */
export function poly(points: readonly (readonly [number, number])[]): PathPoint[] {
  return points.map(([x, y], i) => ({ x, y, ...(i === 0 ? { moveTo: true } : {}), ...(i === points.length - 1 ? { close: true } : {}) }));
}

/** Keys looping through `values` at evenly spaced times over `duration`; the first value closes the loop. */
export function loopKeys(duration: number, values: readonly number[], easing: Easing = 'EaseInOutSine'): Key[] {
  const first = values[0];
  if (first === undefined) throw new Error('loopKeys needs values');
  return [...values.map((v, i): Key => [(duration * i) / values.length, v, easing]), [duration, first]];
}

/**
 * Pendulum legs pivoting at the hip (both leg groups sit at y = `hipY`): leg `a` is forward at t = 0 and plants until
 * mid-cycle, leg `b` mirrors it; each lifts by `lift` px while it swings forward.
 */
export function legTracks(duration: number, swing: number, lift: number, hipY: number, a: string, b: string): ClipTracks {
  const up = hipY - lift;
  return {
    [a]: { rotation: loopKeys(duration, [-swing, swing]), y: loopKeys(duration, [hipY, hipY, hipY, up]) },
    [b]: { rotation: loopKeys(duration, [swing, -swing]), y: loopKeys(duration, [hipY, up, hipY, hipY]) },
  };
}

/** Body bob of a walk: lowest at each foot plant (t = 0 and ½), highest as the legs pass; quick rise, heavy drop. */
export function bobKeys(duration: number, rest: number, amount: number): Key[] {
  const q = duration / 4;
  return [[0, rest, 'EaseOutQuad'], [q, rest - amount, 'EaseInQuad'], [2 * q, rest, 'EaseOutQuad'], [3 * q, rest - amount, 'EaseInQuad'], [duration, rest]];
}

/**
 * Distance travelled per walk cycle for pendulum legs of `legLength` (hip to sole) swinging ±`swing`°: each foot sweeps
 * 2·L·sin(swing) while planted, and a cycle has two steps.
 */
export function walkStride(legLength: number, swing: number): number {
  return Math.round(4 * legLength * Math.sin((swing * Math.PI) / 180) * 10) / 10;
}

/** Adds the leg group (at the hip) of a walker and returns its name. Rest pose: hanging straight down. */
export function leg(b: SpriteBuilder, name: string, hipX: number, hipY: number, points: readonly PathPoint[], fill: Fill | string, parent = 'body'): string {
  b.group(name, { x: hipX, y: hipY }, parent);
  b.path(`${name}-art`, points, { closed: true, fill, stroke: LINE }, name);
  return name;
}

export interface EnemyDesign {
  kind: EnemyKind;
  /** Top of the head above the ground point. */
  height: number;
  barWidth: number;
  /** Px per walk cycle (feet do not slide at the kind's speed). */
  stride: number;
  shadow: { width: number; height: number; opacity: number };
  /** y of the body part (the hit squash and die pivot): 0 for walkers (feet), the hover point for flyers. */
  bodyY: number;
  die: 'topple' | 'drop';
  /** Draws the art into the 'body' part. */
  draw: (b: SpriteBuilder) => void;
  /** Part holding the frost and flash overlays (it moves with the walk bob), and their shape in its space. */
  overlayParent: string;
  silhouette: readonly Blob[];
  /** Shield bubble in body space. */
  bubble?: Blob;
  walk: (duration: number) => ClipTracks;
  /** Icon framing: the figure is scaled by `scale` and the point (centerX, centerY) lands on the icon root. */
  icon: { scale: number; centerX: number; centerY: number };
}

export const FROST_OPACITY = 0.45;
export const BAR_HEIGHT = 8;
/** Clearance between the top of the head and the health bar. */
export const BAR_GAP = 10;
export const HIT_DURATION = 0.18;
export const DIE_DURATION = 0.5;

function hitTracks(): ClipTracks {
  return {
    body: {
      scale_x: [[0, 1, 'EaseOutQuad'], [0.05, 1.22, 'EaseInOutSine'], [HIT_DURATION, 1]],
      scale_y: [[0, 1, 'EaseOutQuad'], [0.05, 0.8, 'EaseInOutSine'], [HIT_DURATION, 1]],
    },
    flash: {
      visible: [[0, false], [0.01, true], [0.11, true], [0.12, false]],
      opacity: [[0, 0.85], [0.11, 0]],
    },
  };
}

function dieTracks(d: EnemyDesign): ClipTracks {
  const shadow = { opacity: [[0, d.shadow.opacity], [DIE_DURATION, 0]] as Key[] };
  const fade: Key[] = [[0, 1], [0.2, 1, 'EaseInQuad'], [DIE_DURATION, 0]];
  if (d.die === 'drop') {
    return {
      shadow,
      body: {
        y: [[0, d.bodyY, 'EaseInQuad'], [0.4, d.bodyY + 30], [DIE_DURATION, d.bodyY + 30]],
        rotation: [[0, 0, 'EaseInQuad'], [0.4, 30], [DIE_DURATION, 30]],
        opacity: fade,
      },
    };
  }
  return {
    shadow,
    body: {
      rotation: [[0, 0, 'EaseInQuad'], [0.28, 84, 'EaseOutQuad'], [0.36, 90], [DIE_DURATION, 90]],
      opacity: fade,
    },
  };
}

/** Shadow, face and body with the art; the face group must exist when the shadow goes inside it (icons). */
function frame(b: SpriteBuilder, d: EnemyDesign, shadowParent: string): void {
  b.ellipse('shadow', d.shadow.width, d.shadow.height, { fill: '#000000', opacity: d.shadow.opacity }, shadowParent);
  if (!b.has('face')) b.group('face');
  b.group('body', { y: d.bodyY }, 'face');
  d.draw(b);
}

export function buildEnemy(d: EnemyDesign, prefix: string): EnemySprite {
  const b = new SpriteBuilder(prefix);
  frame(b, d, ROOT);
  const overlay = blobsPath(d.silhouette);
  const frostOverlayId = b.path(
    'frost',
    overlay,
    { closed: true, fill: shade(PALETTE.ice), opacity: FROST_OPACITY, visible: false },
    d.overlayParent,
  );
  b.path('flash', overlay, { closed: true, fill: '#ffffff', opacity: 0, visible: false }, d.overlayParent);
  const bubble = d.bubble;
  const shieldBubbleId = bubble
    ? b.ellipse(
        'bubble',
        bubble.rx * 2,
        bubble.ry * 2,
        {
          x: bubble.x,
          y: bubble.y,
          fill: radial([[0, PALETTE.energy.dark, 0], [0.6, PALETTE.energy.dark, 0.08], [0.9, PALETTE.energy.dark, 0.3], [1, PALETTE.ice.light, 0.7]]),
          stroke: { color: PALETTE.energy.dark, width: 2, opacity: 0.8 },
          blend: 'lighter',
        },
        'body',
      )
    : null;
  const groupId = b.group('hp', { y: -(d.height + BAR_GAP + BAR_HEIGHT / 2), visible: false });
  b.rect('hp-back', d.barWidth + 4, BAR_HEIGHT, { radius: 3, fill: OUTLINE }, 'hp');
  const fillId = b.rect('hp-fill', d.barWidth, BAR_HEIGHT - 4, { radius: 1, fill: HP_COLORS.high }, 'hp');
  const walkDuration = d.stride / ENEMIES[d.kind].speed;
  b.clip('walk', walkDuration, d.walk(walkDuration));
  b.clip('hit', HIT_DURATION, hitTracks());
  b.clip('die', DIE_DURATION, dieTracks(d));
  return {
    ...b.build(),
    kind: d.kind,
    facePartId: b.id('face'),
    bodyPartId: b.id('body'),
    hpBar: { groupId, fillId, fullWidth: d.barWidth, fillX: 0 },
    frostOverlayId,
    shieldBubbleId,
    height: d.height,
    stride: d.stride,
  };
}

export function buildIcon(d: EnemyDesign, prefix: string): SpriteInstance {
  const b = new SpriteBuilder(prefix);
  b.group('face', { x: -d.icon.centerX * d.icon.scale, y: -d.icon.centerY * d.icon.scale, scale: d.icon.scale });
  frame(b, d, 'face');
  return b.build();
}
