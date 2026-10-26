/**
 * Clips sampled once per sprite design and replayed through exodeRuntime setters. The engine's applyAnimation finds
 * the object of every track with a linear scan of the artboard's object list, which in a full level (≈10k pooled
 * objects) made 120 walking enemies cost several milliseconds per frame. A baked clip replays the engine's own
 * interpolation (sampled on a scratch engine holding one instance) with a few keyed writes per track.
 * Only transform, opacity and visibility tracks can be baked (the properties the exodeRuntime setters cover).
 */
import { ExodeUIEngine, type Animation } from 'exodeui';
import { makeArtboard, type SpriteInstance } from '../../art/exode';
import { setOpacity, setPos, setRotation, setScale, setVisible } from '../exodeRuntime';

/** Samples per second of clip time; values in between are interpolated linearly. */
export const BAKE_RATE = 240;

const BAKEABLE = ['x', 'y', 'rotation', 'scale_x', 'scale_y', 'opacity', 'visible'] as const;
type BakedProp = (typeof BAKEABLE)[number];

function isBakeable(property: string): property is BakedProp {
  return (BAKEABLE as readonly string[]).includes(property);
}

type Value = number | boolean;

interface BakedPart {
  /** Object id without the sprite's root prefix (e.g. '.body'). */
  suffix: string;
  tracks: Partial<Record<BakedProp, Value[]>>;
}

export interface BakedClip {
  duration: number;
  /** Seconds between samples (samples run from 0 to duration inclusive). */
  step: number;
  samples: number;
  parts: BakedPart[];
}

/** A baked clip bound to one pooled instance. */
export interface BoundClip {
  clip: BakedClip;
  ids: string[];
}

export function canBake(clip: Animation): boolean {
  return clip.tracks.every((t) => isBakeable(t.property));
}

/** Holds one sprite at a time while its clips are sampled; created on first use. */
let scratch: ExodeUIEngine | undefined;

/** Bakes every clip of a sprite. Throws for a clip with a property the setters do not cover. */
export function bakeSprite(sprite: SpriteInstance): Record<string, BakedClip> {
  const engine = (scratch ??= new ExodeUIEngine());
  engine.load(makeArtboard('bake', sprite.objects, { background: null }));
  const out: Record<string, BakedClip> = {};
  for (const [name, clip] of Object.entries(sprite.clips)) out[name] = bake(engine, sprite.rootId, clip);
  return out;
}

function bake(engine: ExodeUIEngine, rootId: string, clip: Animation): BakedClip {
  if (!canBake(clip)) throw new Error(`Clip ${clip.id} animates a property that cannot be baked`);
  const samples = Math.max(2, Math.ceil(clip.duration * BAKE_RATE) + 1);
  const step = clip.duration / (samples - 1);
  const byId = new Map<string, BakedPart>();
  for (const track of clip.tracks) {
    const id = track.object_id;
    if (!id.startsWith(rootId)) throw new Error(`Clip ${clip.id} targets ${id} outside ${rootId}`);
    const part = byId.get(id) ?? { suffix: id.slice(rootId.length), tracks: {} };
    if (isBakeable(track.property)) part.tracks[track.property] = [];
    byId.set(id, part);
  }
  for (let i = 0; i < samples; i++) {
    engine.applyAnimation(clip, Math.min(clip.duration, i * step));
    for (const [id, part] of byId) {
      const state: unknown = engine.getObjectState(id);
      const record = typeof state === 'object' && state !== null ? (state as Record<string, unknown>) : {};
      for (const [prop, values] of Object.entries(part.tracks) as [BakedProp, Value[]][]) {
        const v = record[prop];
        values.push(typeof v === 'number' || typeof v === 'boolean' ? v : prop === 'visible');
      }
    }
  }
  return { duration: clip.duration, step, samples, parts: [...byId.values()] };
}

export function bindClip(clip: BakedClip, rootId: string): BoundClip {
  return { clip, ids: clip.parts.map((p) => rootId + p.suffix) };
}

/** Linear between the samples around the time (undefined without a track). */
function numberAt(values: readonly Value[] | undefined, index: number, frac: number): number | undefined {
  const a = values?.[index];
  if (typeof a !== 'number') return undefined;
  const b = values?.[index + 1];
  return typeof b === 'number' ? a + (b - a) * frac : a;
}

function numberOf(engine: ExodeUIEngine, id: string, prop: string, fallback: number): number {
  const state: unknown = engine.getObjectState(id);
  const v = typeof state === 'object' && state !== null ? (state as Record<string, unknown>)[prop] : undefined;
  return typeof v === 'number' ? v : fallback;
}

/** Writes the clip's pose at time t (seconds, clamped to the clip). */
export function playBaked(engine: ExodeUIEngine, bound: BoundClip, t: number): void {
  const { clip, ids } = bound;
  const f = Math.min(clip.samples - 1, Math.max(0, t / clip.step));
  const index = Math.min(clip.samples - 2, Math.floor(f));
  const frac = f - index;
  for (let i = 0; i < clip.parts.length; i++) {
    const part = clip.parts[i];
    const id = ids[i];
    if (!part || id === undefined) continue;
    const { x, y, rotation, scale_x, scale_y, opacity, visible } = part.tracks;
    const px = numberAt(x, index, frac);
    const py = numberAt(y, index, frac);
    if (px !== undefined || py !== undefined) setPos(engine, id, px ?? numberOf(engine, id, 'x', 0), py ?? numberOf(engine, id, 'y', 0));
    const sx = numberAt(scale_x, index, frac);
    const sy = numberAt(scale_y, index, frac);
    if (sx !== undefined || sy !== undefined) setScale(engine, id, sx ?? numberOf(engine, id, 'scale_x', 1), sy ?? numberOf(engine, id, 'scale_y', 1));
    const r = numberAt(rotation, index, frac);
    if (r !== undefined) setRotation(engine, id, r);
    const o = numberAt(opacity, index, frac);
    if (o !== undefined) setOpacity(engine, id, o);
    const v = visible?.[frac > 0.5 ? index + 1 : index];
    if (typeof v === 'boolean') setVisible(engine, id, v);
  }
}

/** Writes the pose of a looping clip at time t (wrapped into the clip). */
export function loopBaked(engine: ExodeUIEngine, bound: BoundClip, t: number): void {
  const d = bound.clip.duration;
  playBaked(engine, bound, ((t % d) + d) % d);
}
