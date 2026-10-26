/**
 * Authoring helpers for ExodeUI artboards. Every sprite, scene and UI layer in the game is built with these, so ids,
 * transforms, paints and clips follow one set of conventions. The engine facts they encode are listed in CLAUDE.md.
 */
import type { Animation, Artboard, Fill, ShapeObject, Track } from 'exodeui';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../game/types';
import { GAME_FONT } from './fonts';

export type ExodeObject = ShapeObject;

/** Keyframe easings the engine resolves (exact names, see CLAUDE.md). The easing applies to the segment it starts. */
export type Easing =
  | 'Linear'
  | 'EaseInQuad'
  | 'EaseOutQuad'
  | 'EaseInOutQuad'
  | 'EaseInCubic'
  | 'EaseOutCubic'
  | 'EaseInOutCubic'
  | 'EaseInSine'
  | 'EaseOutSine'
  | 'EaseInOutSine'
  | 'EaseInExpo'
  | 'EaseOutExpo'
  | 'EaseInBack'
  | 'EaseOutBack'
  | 'EaseInOutBack'
  | 'EaseOutElastic'
  | 'EaseOutBounce'
  | 'StepStart'
  | 'StepEnd';

/** [offset 0..1, color '#rrggbb', opacity 0..1 (default 1)] */
export type GradientStop = readonly [offset: number, color: string, opacity?: number];

const HEX6 = /^#[0-9a-fA-F]{6}$/;

function checkColor(color: string): string {
  if (!HEX6.test(color)) throw new Error(`Colors must be '#rrggbb', got '${color}'`);
  return color;
}

function checkOpacity(opacity: number): number {
  if (!(opacity >= 0 && opacity <= 1)) throw new Error(`Opacity must be within 0..1, got ${opacity}`);
  return opacity;
}

function stopsOf(stops: readonly GradientStop[]): NonNullable<Fill['stops']> {
  if (stops.length < 2) throw new Error('A gradient needs at least two stops');
  return stops.map(([offset, color, opacity = 1]) => ({ offset, color: checkColor(color), opacity: checkOpacity(opacity) }));
}

export function solid(color: string, opacity = 1): Fill {
  return { type: 'Solid', color: checkColor(color), opacity: checkOpacity(opacity) };
}

/** Linear gradient. `from`/`to` are normalized points (0..1) in the shape's box; the default runs top → bottom. */
export function linear(
  stops: readonly GradientStop[],
  from: readonly [number, number] = [0.5, 0],
  to: readonly [number, number] = [0.5, 1],
  opacity = 1,
): Fill {
  return { type: 'LinearGradient', opacity: checkOpacity(opacity), stops: stopsOf(stops), start: [from[0], from[1]], end: [to[0], to[1]] };
}

/** Radial gradient. `center` is normalized in the shape's box; `radius` is a fraction of max(width, height). */
export function radial(
  stops: readonly GradientStop[],
  center: readonly [number, number] = [0.5, 0.5],
  radius = 0.5,
  opacity = 1,
): Fill {
  return { type: 'RadialGradient', opacity: checkOpacity(opacity), stops: stopsOf(stops), center: [center[0], center[1]], radius };
}

export const NO_FILL: Fill = { type: 'None', opacity: 1 };

export interface NodeOpts {
  x?: number;
  y?: number;
  /** Degrees, clockwise on screen (y points down). */
  rotation?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  /** 0..1 */
  opacity?: number;
  visible?: boolean;
  /** Mirror horizontally (applied after rotation, around the node's origin). */
  flipX?: boolean;
  behaviors?: readonly ExodeBehavior[];
}

export interface StrokeSpec {
  color: string;
  width: number;
  opacity?: number;
  join?: 'miter' | 'round' | 'bevel';
  cap?: 'butt' | 'round' | 'square';
  dash?: readonly number[];
}

/** Canvas shadow. Costly per draw call: use it on static or few objects only (see CLAUDE.md). */
export interface ShadowSpec {
  color: string;
  blur: number;
  x?: number;
  y?: number;
  opacity?: number;
}

export type BlendMode = 'source-over' | 'lighter' | 'screen' | 'multiply' | 'overlay';

/**
 * One of the engine's built-in style effects, passed through to `style.effects` as is, e.g.
 * `{ type: 'Glow', mode: 'outer', color: '#4fc3ff', blur: 12 }`, `{ type: 'LightTrail', ... }`,
 * `{ type: 'ArtEffect', effectType: 'shimmer', ... }`. See CLAUDE.md for the ones measured in this project.
 */
export interface ExodeEffect {
  type: string;
  [setting: string]: unknown;
}

/** One of the engine's behaviors, passed through to the object's `behaviors` (e.g. a 'ParticleEmitter'). */
export interface ExodeBehavior {
  type: string;
  enabled?: boolean;
  settings?: Record<string, unknown>;
}

export interface PaintOpts {
  /** A Fill, or a '#rrggbb' string for a solid fill. Omitted means no fill. */
  fill?: Fill | string;
  stroke?: StrokeSpec;
  shadow?: ShadowSpec;
  blend?: BlendMode;
  effects?: readonly ExodeEffect[];
}

export type ShapeOpts = NodeOpts & PaintOpts;

export interface PathPoint {
  x: number;
  y: number;
  /** Incoming bezier handle (absolute, same space as x/y). */
  inX?: number;
  inY?: number;
  /** Outgoing bezier handle (absolute, same space as x/y). */
  outX?: number;
  outY?: number;
  /** Start a new sub-path at this point. */
  moveTo?: boolean;
  /** Close the current sub-path after this point. */
  close?: boolean;
}

export interface PathOpts extends ShapeOpts {
  closed?: boolean;
  /**
   * The adapter will rewrite this path's points at runtime (setPathPoints). Gives the geometry a fixed box so the engine
   * keeps the drawing at scale 1 whatever the new points are. The point count must stay the same at runtime.
   */
  dynamic?: boolean;
}

export interface TextOpts extends ShapeOpts {
  size: number;
  font?: string;
  weight?: number;
  align?: 'left' | 'center' | 'right';
  /** Text box width. Defaults to a generous estimate for one line. */
  width?: number;
  height?: number;
  letterSpacing?: number;
}

/**
 * Outline behind the text, drawn as offset fill copies: the engine's text stroke is painted over the glyph fill, uses
 * miter joins (spikes at sharp corners) and is sized in screen pixels, so text is never stroked.
 */
export interface OutlinedTextOpts extends TextOpts {
  outline: { color: string; width: number };
}

/** Number of offset copies that make a solid outline of the given width. */
export function outlineCopies(width: number): number {
  return Math.min(16, Math.max(8, Math.ceil((2 * Math.PI * width) / 3)));
}

/** Animatable properties. Clips must not target properties the runtime adapter drives (see CLAUDE.md). */
export type AnimProp =
  | 'x'
  | 'y'
  | 'rotation'
  | 'scale_x'
  | 'scale_y'
  | 'opacity'
  | 'visible'
  | 'style.fill.color'
  | 'style.fill.opacity'
  | 'style.stroke.color'
  | 'style.stroke.width'
  | 'style.stroke.opacity'
  | 'geometry.width'
  | 'geometry.height';

/** [time in seconds, value, easing of the segment starting at this key] */
export type Key = readonly [time: number, value: number | string | boolean, easing?: Easing];

/** { partName: { property: keys } } */
export type ClipTracks = Readonly<Record<string, Partial<Readonly<Record<AnimProp, readonly Key[]>>>>>;

export interface SpriteInstance {
  /** Root group id (the builder's prefix). The runtime adapter owns its x, y, zIndex, visible, scale and opacity. */
  rootId: string;
  /** Every object, root first, then parts in creation order (later siblings draw on top). */
  objects: ExodeObject[];
  /** Named clips; tracks reference this instance's object ids. */
  clips: Record<string, Animation>;
}

/** Name of the root part in `parent` arguments. */
export const ROOT = '@root';

/** Fixed geometry box for dynamic paths (any constant works; large enough to never be culled). */
export const DYNAMIC_PATH_BOX = 4096;

const TRANSFORM_KEYS = ['x', 'y', 'rotation', 'scale_x', 'scale_y', 'opacity', 'flip_x'] as const;

function transformOf(opts: NodeOpts, base: { x: number; y: number } = { x: 0, y: 0 }): ExodeObject['transform'] {
  const scale = opts.scale ?? 1;
  return {
    x: base.x + (opts.x ?? 0),
    y: base.y + (opts.y ?? 0),
    rotation: opts.rotation ?? 0,
    scale_x: (opts.scaleX ?? 1) * scale,
    scale_y: (opts.scaleY ?? 1) * scale,
    opacity: checkOpacity(opts.opacity ?? 1),
    flip_x: opts.flipX ?? false,
  };
}

function styleOf(opts: PaintOpts): ExodeObject['style'] {
  const style: ExodeObject['style'] = {
    fill: opts.fill === undefined ? NO_FILL : typeof opts.fill === 'string' ? solid(opts.fill) : opts.fill,
  };
  if (opts.stroke) {
    const s = opts.stroke;
    style.stroke = {
      color: checkColor(s.color),
      width: s.width,
      opacity: checkOpacity(s.opacity ?? 1),
      lineJoin: s.join ?? 'round',
      lineCap: s.cap ?? 'round',
      ...(s.dash ? { dashArray: [...s.dash] } : {}),
    };
  }
  if (opts.shadow) {
    const s = opts.shadow;
    style.shadow = { color: checkColor(s.color), blur: s.blur, offsetX: s.x ?? 0, offsetY: s.y ?? 0, opacity: checkOpacity(s.opacity ?? 1) };
  }
  if (opts.blend && opts.blend !== 'source-over') style.compositeOperation = opts.blend;
  if (opts.effects) (style as Record<string, unknown>).effects = opts.effects.map((e) => ({ isEnabled: true, ...e }));
  return style;
}

function behaviorsOf(opts: NodeOpts): Partial<ExodeObject> {
  if (!opts.behaviors) return {};
  const behaviors = opts.behaviors.map((b, i) => ({ id: `b${i}`, sensors: [], enabled: true, ...b }));
  return { behaviors } as unknown as Partial<ExodeObject>;
}

/** Bounding-box center of path points including bezier handles (the engine draws a path relative to this point). */
export function pathCenter(points: readonly PathPoint[]): { x: number; y: number } {
  if (points.length === 0) throw new Error('A path needs points');
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const add = (x: number | undefined, y: number | undefined) => {
    if (x !== undefined) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    if (y !== undefined) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  };
  for (const p of points) {
    add(p.x, p.y);
    add(p.inX, p.inY);
    add(p.outX, p.outY);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/** Our PathPoint → the engine's point format. */
export function toEnginePoints(points: readonly PathPoint[]): Record<string, number | boolean>[] {
  return points.map((p) => {
    const q: Record<string, number | boolean> = { x: p.x, y: p.y };
    if (p.inX !== undefined) q.in_x = p.inX;
    if (p.inY !== undefined) q.in_y = p.inY;
    if (p.outX !== undefined) q.out_x = p.outX;
    if (p.outY !== undefined) q.out_y = p.outY;
    if (p.moveTo) q.moveTo = true;
    if (p.close) q.closePath = true;
    return q;
  });
}

function estimateTextWidth(text: string, size: number): number {
  return Math.ceil(text.length * size * 0.62 + size);
}

/**
 * Builds one sprite instance. Part names are local to the builder; object ids are `${prefix}.${name}` and the root's id
 * is the prefix itself. Parents are given by part name (default: the root).
 */
export class SpriteBuilder {
  readonly rootId: string;
  private readonly objects: ExodeObject[] = [];
  private readonly byName = new Map<string, ExodeObject>();
  private readonly clips: Record<string, Animation> = {};

  constructor(readonly prefix: string, rootOpts: NodeOpts = {}) {
    if (!/^[A-Za-z0-9_.:-]+$/.test(prefix)) throw new Error(`Invalid id prefix '${prefix}'`);
    this.rootId = prefix;
    const root: ExodeObject = {
      id: prefix,
      name: prefix,
      type: 'Group',
      transform: transformOf(rootOpts),
      style: {},
      clipContent: false,
      visible: rootOpts.visible ?? true,
      ...behaviorsOf(rootOpts),
      children: [],
    };
    this.objects.push(root);
    this.byName.set(ROOT, root);
  }

  /** Object id of a part. */
  id(name: string): string {
    if (name === ROOT) return this.rootId;
    if (!this.byName.has(name)) throw new Error(`Unknown part '${name}' in '${this.prefix}'`);
    return `${this.prefix}.${name}`;
  }

  has(name: string): boolean {
    return this.byName.has(name);
  }

  private add(name: string, parent: string, obj: Omit<ExodeObject, 'id' | 'name' | 'parentId'>): string {
    if (name === ROOT || !/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/.test(name)) throw new Error(`Invalid part name '${name}'`);
    if (this.byName.has(name)) throw new Error(`Duplicate part '${name}' in '${this.prefix}'`);
    const parentObj = this.byName.get(parent);
    if (!parentObj) throw new Error(`Unknown parent '${parent}' for part '${name}' in '${this.prefix}'`);
    const id = `${this.prefix}.${name}`;
    const full = { ...obj, id, name, parentId: parentObj.id } as ExodeObject;
    (parentObj.children ??= []).push(id);
    this.objects.push(full);
    this.byName.set(name, full);
    return id;
  }

  private shape(name: string, geometry: ExodeObject['geometry'], opts: ShapeOpts, parent: string): string {
    return this.add(name, parent, {
      type: 'Shape',
      transform: transformOf(opts),
      geometry,
      style: styleOf(opts),
      visible: opts.visible ?? true,
      ...behaviorsOf(opts),
    });
  }

  group(name: string, opts: NodeOpts = {}, parent: string = ROOT): string {
    return this.add(name, parent, {
      type: 'Group',
      transform: transformOf(opts),
      style: {},
      clipContent: false,
      visible: opts.visible ?? true,
      ...behaviorsOf(opts),
      children: [],
    });
  }

  rect(
    name: string,
    width: number,
    height: number,
    opts: ShapeOpts & { radius?: number | readonly [number, number, number, number] } = {},
    parent: string = ROOT,
  ): string {
    const radius = opts.radius === undefined ? 0 : typeof opts.radius === 'number' ? opts.radius : [...opts.radius];
    return this.shape(name, { type: 'Rectangle', width, height, corner_radius: radius as number }, opts, parent);
  }

  ellipse(name: string, width: number, height: number, opts: ShapeOpts = {}, parent: string = ROOT): string {
    return this.shape(name, { type: 'Ellipse', width, height }, opts, parent);
  }

  circle(name: string, radius: number, opts: ShapeOpts = {}, parent: string = ROOT): string {
    return this.ellipse(name, radius * 2, radius * 2, opts, parent);
  }

  /** Regular polygon; the first vertex points up. */
  polygon(name: string, radius: number, sides: number, opts: ShapeOpts = {}, parent: string = ROOT): string {
    return this.shape(name, { type: 'Polygon', radius, sides }, opts, parent);
  }

  /** Star; the first point points up. */
  star(name: string, outerRadius: number, innerRadius: number, points: number, opts: ShapeOpts = {}, parent: string = ROOT): string {
    return this.shape(name, { type: 'Star', outer_radius: outerRadius, inner_radius: innerRadius, points }, opts, parent);
  }

  /** Isosceles triangle with the apex up, centered on its box. */
  triangle(name: string, width: number, height: number, opts: ShapeOpts = {}, parent: string = ROOT): string {
    return this.shape(name, { type: 'Triangle', width, height }, opts, parent);
  }

  /**
   * Path through points given in the parent's space (they draw exactly where given; `x`/`y` add an offset).
   * Use `closed` for filled outlines, bezier handles for curves.
   */
  path(name: string, points: readonly PathPoint[], opts: PathOpts = {}, parent: string = ROOT): string {
    const center = pathCenter(points);
    const geometry: ExodeObject['geometry'] = {
      type: 'Path',
      points: toEnginePoints(points),
      isClosed: opts.closed ?? false,
      ...(opts.dynamic ? { width: DYNAMIC_PATH_BOX, height: DYNAMIC_PATH_BOX } : {}),
    } as ExodeObject['geometry'];
    return this.add(name, parent, {
      type: 'Shape',
      transform: transformOf(opts, center),
      geometry,
      style: styleOf(opts),
      visible: opts.visible ?? true,
      ...behaviorsOf(opts),
    });
  }

  text(name: string, text: string, opts: TextOpts, parent: string = ROOT): string {
    const width = opts.width ?? estimateTextWidth(text, opts.size);
    const geometry = {
      type: 'Text',
      text,
      fontSize: opts.size,
      fontFamily: opts.font ?? GAME_FONT,
      fontWeight: opts.weight ?? 400,
      textAlign: opts.align ?? 'center',
      textVerticalAlign: 'middle',
      width,
      height: opts.height ?? Math.ceil(opts.size * 1.3),
      letterSpacing: opts.letterSpacing ?? 0,
    } as ExodeObject['geometry'];
    return this.add(name, parent, {
      type: 'Shape',
      transform: transformOf(opts),
      geometry,
      style: styleOf({ ...opts, fill: opts.fill ?? '#ffffff' }),
      visible: opts.visible ?? true,
      ...behaviorsOf(opts),
    });
  }

  /**
   * Text with an outline: a group holding outlineCopies(width) copies in the outline color, offset around a circle of
   * that radius (`<name>.o0`, `<name>.o1`, ...), under the fill copy (`<name>.fill`, last in `textIds`).
   * Update every id in `textIds` with setText.
   */
  outlinedText(name: string, text: string, opts: OutlinedTextOpts, parent: string = ROOT): { groupId: string; textIds: string[] } {
    const { outline, x, y, rotation, scale, scaleX, scaleY, opacity, visible, flipX, ...textOpts } = opts;
    const groupId = this.group(name, { x, y, rotation, scale, scaleX, scaleY, opacity, visible, flipX }, parent);
    const textIds: string[] = [];
    const copies = outlineCopies(outline.width);
    for (let i = 0; i < copies; i++) {
      const angle = (i / copies) * Math.PI * 2;
      const offset = { x: Math.cos(angle) * outline.width, y: Math.sin(angle) * outline.width };
      textIds.push(this.text(`${name}.o${i}`, text, { ...textOpts, ...offset, fill: outline.color, stroke: undefined }, name));
    }
    textIds.push(this.text(`${name}.fill`, text, { ...textOpts, stroke: undefined }, name));
    return { groupId, textIds };
  }

  /** Keyframe clip over this sprite's parts. Clips may not target the root (the adapter owns it). */
  clip(name: string, duration: number, tracks: ClipTracks): Animation {
    if (!(duration > 0)) throw new Error(`Clip '${name}' needs a positive duration`);
    if (this.clips[name]) throw new Error(`Duplicate clip '${name}' in '${this.prefix}'`);
    const out: Track[] = [];
    for (const [part, props] of Object.entries(tracks)) {
      if (part === ROOT) throw new Error(`Clip '${name}' targets the root of '${this.prefix}'`);
      const objectId = this.id(part);
      for (const [property, keys] of Object.entries(props) as [AnimProp, readonly Key[]][]) {
        if (keys.length === 0) throw new Error(`Clip '${name}' has an empty track ${part}.${property}`);
        let last = -Infinity;
        const keyframes = keys.map(([time, value, easing]) => {
          if (time < 0 || time > duration + 1e-9) throw new Error(`Clip '${name}' key at ${time}s is outside 0..${duration}s`);
          if (time < last) throw new Error(`Clip '${name}' keys of ${part}.${property} are not sorted`);
          last = time;
          if (property === 'opacity' && typeof value === 'number') checkOpacity(value);
          return { time, value: value as number | string, easing: easing ?? 'Linear' };
        });
        out.push({ object_id: objectId, property, keyframes });
      }
    }
    const anim: Animation = { id: `${this.prefix}#${name}`, name, duration, tracks: out };
    this.clips[name] = anim;
    return anim;
  }

  build(): SpriteInstance {
    return { rootId: this.rootId, objects: this.objects.map((o) => ({ ...o })), clips: { ...this.clips } };
  }
}

/**
 * Structural problems in a sprite (empty when valid): duplicate ids, broken parent/children links, clip tracks on
 * missing objects or on the root, keyframes outside the clip, bad colors or opacities.
 */
export function validateSprite(sprite: SpriteInstance): string[] {
  const errors: string[] = [];
  const ids = new Map<string, ExodeObject>();
  for (const o of sprite.objects) {
    if (ids.has(o.id)) errors.push(`duplicate id ${o.id}`);
    ids.set(o.id, o);
  }
  const root = ids.get(sprite.rootId);
  if (!root) errors.push(`missing root ${sprite.rootId}`);
  else if (root.parentId) errors.push(`root ${sprite.rootId} has a parent`);
  for (const o of sprite.objects) {
    if (o.id !== sprite.rootId && !o.id.startsWith(`${sprite.rootId}.`)) errors.push(`${o.id} is not prefixed with ${sprite.rootId}.`);
    if (o.parentId) {
      const parent = ids.get(o.parentId);
      if (!parent) errors.push(`${o.id} has missing parent ${o.parentId}`);
      else if (!parent.children?.includes(o.id)) errors.push(`${o.parentId} does not list child ${o.id}`);
    } else if (o.id !== sprite.rootId) errors.push(`${o.id} has no parent`);
    for (const child of o.children ?? []) if (ids.get(child)?.parentId !== o.id) errors.push(`${o.id} lists ${child} which is not its child`);
    const t = o.transform as unknown as Record<string, unknown>;
    for (const k of TRANSFORM_KEYS) if (k !== 'flip_x' && typeof t[k] !== 'number') errors.push(`${o.id} transform.${k} is not a number`);
    const opacity = t.opacity as number;
    if (opacity < 0 || opacity > 1) errors.push(`${o.id} opacity ${opacity} outside 0..1`);
    const fill = o.style?.fill;
    for (const c of [fill?.color, ...(fill?.stops ?? []).map((s) => s.color), o.style?.stroke?.color]) {
      if (c !== undefined && !HEX6.test(c)) errors.push(`${o.id} color ${c} is not #rrggbb`);
    }
  }
  for (const clip of Object.values(sprite.clips)) {
    for (const track of clip.tracks) {
      if (!ids.has(track.object_id)) errors.push(`clip ${clip.name} targets missing ${track.object_id}`);
      if (track.object_id === sprite.rootId) errors.push(`clip ${clip.name} targets the root`);
      for (const k of track.keyframes) if (k.time < 0 || k.time > clip.duration + 1e-9) errors.push(`clip ${clip.name} key ${k.time}s outside 0..${clip.duration}s`);
    }
  }
  return errors;
}

/** Move a built sprite's root to (x, y) with a uniform scale (mutates the root's authored transform). */
export function placeRoot<T extends SpriteInstance>(sprite: T, x: number, y: number, scale = 1): T {
  const root = sprite.objects.find((o) => o.id === sprite.rootId);
  if (!root) throw new Error(`missing root ${sprite.rootId}`);
  root.transform = { ...root.transform, x, y, scale_x: scale, scale_y: scale };
  return sprite;
}

export interface ArtboardOpts {
  width?: number;
  height?: number;
  /** '#rrggbb' background, or null for a transparent layer. Default '#000000'. */
  background?: string | null;
  animations?: readonly Animation[];
}

export function makeArtboard(name: string, objects: readonly ExodeObject[], opts: ArtboardOpts = {}): Artboard {
  const background = opts.background === undefined ? '#000000' : opts.background;
  return {
    id: name,
    name,
    width: opts.width ?? DESIGN_WIDTH,
    height: opts.height ?? DESIGN_HEIGHT,
    backgroundColor: background ?? '#000000',
    backgroundVisible: background !== null,
    objects: [...objects],
    animations: [...(opts.animations ?? [])],
  };
}

/** All clips of the given sprites, for an artboard's `animations` list. */
export function clipsOf(sprites: readonly SpriteInstance[]): Animation[] {
  return sprites.flatMap((s) => Object.values(s.clips));
}
