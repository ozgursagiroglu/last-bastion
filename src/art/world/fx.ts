/**
 * Effect sprites (pooled by the scene). Each has one 'play' clip over FX_DURATION that starts from nothing and ends
 * fully faded, so a pooled instance can be restarted at t = 0. The root sits at the effect's point, except tracer and
 * lightning, whose roots stay at 0,0 while their dynamic paths are rewritten in design coords.
 */
import type { Vec2 } from '../../game/types';
import { linear, radial, solid, SpriteBuilder, type AnimProp, type ClipTracks, type Key, type PathPoint } from '../exode';
import { OUTLINE, PALETTE } from '../palette';
import { LIGHTNING_POINTS, type FxKind, type FxSprite } from '../types';
import { outerGlow } from './effects';
import { glowFill, litBall, outline } from './paint';
import { createRng } from './rng';
import { blobPoints, polyPoints } from './shapes';

export const FX_DURATION: Readonly<Record<FxKind, number>> = {
  tracer: 0.08,
  lightning: 0.18,
  explosion: 0.5,
  frostBurst: 0.4,
  hitSpark: 0.15,
  muzzleFlash: 0.08,
  deathPuff: 0.5,
  coinPopup: 0.9,
  leak: 0.6,
};

/** Radius the splash effects are drawn at (the adapter scales the root by splashRadius / baseRadius). */
const BASE_RADIUS: Readonly<Record<FxKind, number>> = {
  tracer: 0,
  lightning: 0,
  explosion: 50,
  frostBurst: 40,
  hitSpark: 0,
  muzzleFlash: 0,
  deathPuff: 0,
  coinPopup: 0,
  leak: 0,
};

interface Parts {
  pathPartIds?: string[];
  textIds?: string[];
  tracks: ClipTracks;
}

type Tracks = Record<string, Partial<Record<AnimProp, readonly Key[]>>>;

/** Placeholder points of a dynamic path (the adapter rewrites them before showing it). */
function line(count: number): PathPoint[] {
  return Array.from({ length: count }, (_, i) => ({ x: i * 4, y: 0 }));
}

/** Keys of a value fading from `from` to 0 over [hold, end]. */
function fade(end: number, hold = 0, from = 1): [number, number][] {
  return hold > 0 ? [[0, from], [hold, from], [end, 0]] : [[0, from], [end, 0]];
}

function tracer(b: SpriteBuilder, d: number): Parts {
  b.group('streak');
  const glow = b.path('glow', line(2), { dynamic: true, stroke: { color: '#ffd27a', width: 6, opacity: 0.8 }, blend: 'lighter' }, 'streak');
  const core = b.path('core', line(2), { dynamic: true, stroke: { color: '#fffbe6', width: 2 } }, 'streak');
  return {
    pathPartIds: [glow, core],
    tracks: { streak: { opacity: fade(d, d * 0.4) }, core: { 'style.stroke.width': [[0, 2.5], [d, 1]] } },
  };
}

function lightning(b: SpriteBuilder, d: number): Parts {
  b.group('bolt');
  const aura = b.path('aura', line(LIGHTNING_POINTS), { dynamic: true, stroke: { color: '#4fc3ff', width: 16, opacity: 0.25 }, blend: 'lighter' }, 'bolt');
  const glow = b.path('glow', line(LIGHTNING_POINTS), { dynamic: true, stroke: { color: '#5fe6ff', width: 8, opacity: 0.75 }, blend: 'lighter' }, 'bolt');
  const core = b.path('core', line(LIGHTNING_POINTS), { dynamic: true, stroke: { color: '#ffffff', width: 2.5 }, effects: [outerGlow('#9ff2ff', 10)] }, 'bolt');
  return {
    pathPartIds: [aura, glow, core],
    tracks: {
      bolt: { opacity: [[0, 1], [d * 0.22, 0.45], [d * 0.4, 1], [d * 0.6, 0.5], [d * 0.78, 0.9], [d, 0]] },
      glow: { 'style.stroke.width': [[0, 8], [d * 0.3, 11], [d * 0.6, 7], [d, 9]] },
    },
  };
}

function explosion(b: SpriteBuilder, d: number): Parts {
  b.circle('glow', 58, { fill: glowFill('#ff9a3a', 0.75), blend: 'lighter' });
  b.group('smoke');
  b.circle('smoke0', 14, { x: -14, y: -6, fill: solid('#6e6660', 0.8) }, 'smoke');
  b.circle('smoke1', 16, { x: 12, y: -12, fill: solid('#80776f', 0.8) }, 'smoke');
  b.circle('smoke2', 12, { x: 2, y: 6, fill: solid('#5e5650', 0.8) }, 'smoke');
  b.ellipse('ring', 100, 64, { stroke: { color: '#ffe9b0', width: 5 } });
  const debris: Tracks = {};
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const name = `debris${i}`;
    b.circle(name, 3, { fill: '#3a2a22', stroke: outline(1) });
    debris[name] = {
      x: [[0, 0], [d * 0.8, Math.cos(a) * 56]],
      y: [[0, 0], [d * 0.35, Math.sin(a) * 30 - 24], [d * 0.8, Math.sin(a) * 36]],
      opacity: [[0, 1], [d * 0.6, 1], [d * 0.9, 0]],
    };
  }
  b.path('fireball', blobPoints(0, 0, 36, 33, 8, 0.25, createRng(3).next), {
    closed: true,
    fill: radial([[0, '#fff6c0'], [0.35, PALETTE.fire.light], [0.72, '#ff8a2a'], [1, PALETTE.fire.dark]]),
    stroke: { color: '#b8300f', width: 2 },
  });
  b.circle('core', 18, { fill: '#ffffff', blend: 'lighter', effects: [outerGlow('#ffd27a', 20)] });
  return {
    tracks: {
      ...debris,
      glow: { scale_x: [[0, 0.4, 'EaseOutCubic'], [d * 0.4, 1.1]], scale_y: [[0, 0.4, 'EaseOutCubic'], [d * 0.4, 1.1]], opacity: fade(d * 0.7) },
      smoke: { y: [[0, 0], [d, -16]], scale_x: [[0, 0.6], [d, 1.3]], scale_y: [[0, 0.6], [d, 1.3]], opacity: [[0, 0], [d * 0.3, 0.9], [d, 0]] },
      ring: {
        scale_x: [[0, 0.3, 'EaseOutCubic'], [d * 0.6, 1]],
        scale_y: [[0, 0.3, 'EaseOutCubic'], [d * 0.6, 1]],
        opacity: [[0, 0], [d * 0.1, 0.9], [d * 0.6, 0]],
        'style.stroke.width': [[0, 7], [d * 0.6, 1.5]],
      },
      fireball: { scale_x: [[0, 0.3, 'EaseOutCubic'], [d * 0.3, 1], [d * 0.7, 1.08]], scale_y: [[0, 0.3, 'EaseOutCubic'], [d * 0.3, 1], [d * 0.7, 1.08]], opacity: fade(d * 0.7, d * 0.3) },
      core: { scale_x: [[0, 0.5], [d * 0.16, 1.2]], scale_y: [[0, 0.5], [d * 0.16, 1.2]], opacity: fade(d * 0.3) },
    },
  };
}

function frostBurst(b: SpriteBuilder, d: number): Parts {
  b.circle('mist', 44, { fill: glowFill('#bff4ff', 0.65), blend: 'lighter' });
  b.ellipse('ring', 80, 52, { stroke: { color: PALETTE.ice.light, width: 5 } });
  b.ellipse('ringEdge', 80, 52, { stroke: { color: PALETTE.ice.dark, width: 2 } });
  const tracks: Tracks = {};
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const name = `shard${i}`;
    b.path(name, polyPoints([[7, 0], [0, -3], [-7, 0], [0, 3]]), {
      rotation: (a * 180) / Math.PI,
      fill: linear([[0, PALETTE.ice.light], [1, PALETTE.ice.dark]]),
      stroke: { color: '#1d3b5a', width: 1.5 },
    });
    tracks[name] = {
      x: [[0, Math.cos(a) * 8, 'EaseOutCubic'], [d * 0.7, Math.cos(a) * 38]],
      y: [[0, Math.sin(a) * 5, 'EaseOutCubic'], [d * 0.7, Math.sin(a) * 25]],
      opacity: [[0, 1], [d * 0.5, 1], [d, 0]],
    };
  }
  b.circle('flash', 14, { fill: '#ffffff', blend: 'lighter' });
  const grow = (from: number, to: number, end: number) => [[0, from, 'EaseOutCubic'], [end, to]] as const;
  return {
    tracks: {
      ...tracks,
      mist: { scale_x: grow(0.5, 1.1, d * 0.6), scale_y: grow(0.5, 1.1, d * 0.6), opacity: fade(d, d * 0.3) },
      ring: { scale_x: grow(0.2, 1, d * 0.6), scale_y: grow(0.2, 1, d * 0.6), opacity: fade(d, d * 0.4) },
      ringEdge: { scale_x: grow(0.2, 1, d * 0.6), scale_y: grow(0.2, 1, d * 0.6), opacity: fade(d, d * 0.4) },
      flash: { scale_x: grow(0.6, 1.4, d * 0.3), scale_y: grow(0.6, 1.4, d * 0.3), opacity: fade(d * 0.3) },
    },
  };
}

function hitSpark(b: SpriteBuilder, d: number): Parts {
  b.circle('glow', 13, { fill: glowFill('#fff3a0', 0.9), blend: 'lighter' });
  b.star('star', 11, 3.5, 4, { fill: '#fffbe0', stroke: { color: '#ffb03a', width: 1.5 } });
  b.star('star2', 7, 2.5, 4, { rotation: 45, fill: '#fffbe0', stroke: { color: '#ffb03a', width: 1.5 } });
  b.circle('core', 3, { fill: '#ffffff' });
  const pop = [[0, 0.3, 'EaseOutQuad'], [d * 0.35, 1.15], [d, 0.6]] as const;
  return {
    tracks: {
      glow: { scale_x: [[0, 0.5], [d, 1.3]], scale_y: [[0, 0.5], [d, 1.3]], opacity: fade(d) },
      star: { scale_x: pop, scale_y: pop, rotation: [[0, 0], [d, 25]], opacity: fade(d, d * 0.35) },
      star2: { scale_x: pop, scale_y: pop, rotation: [[0, 45], [d, 20]], opacity: fade(d, d * 0.35) },
      core: { opacity: fade(d * 0.7) },
    },
  };
}

function muzzleFlash(b: SpriteBuilder, d: number): Parts {
  b.circle('glow', 15, { x: 7, fill: glowFill('#ffd27a', 0.9), blend: 'lighter' });
  b.group('burst');
  const spikes: (readonly [number, number])[] = [];
  const reach = [19, 13, 9, 6, 5, 6, 9, 13];
  reach.forEach((r, i) => {
    const a = (i / reach.length) * Math.PI * 2;
    const between = a + Math.PI / reach.length;
    spikes.push([6 + Math.cos(a) * r, Math.sin(a) * r * 0.8], [6 + Math.cos(between) * 4.5, Math.sin(between) * 4.5]);
  });
  b.path('flame', polyPoints(spikes), {
    fill: radial([[0, '#ffffff'], [0.3, '#fff2a0'], [0.65, '#ffc23a'], [1, '#ff6a1a']], [0.35, 0.5], 0.5),
    stroke: { color: '#e2461b', width: 1.5 },
  }, 'burst');
  b.ellipse('core', 9, 7, { x: 6, fill: '#ffffff' }, 'burst');
  return {
    tracks: {
      glow: { opacity: fade(d, d * 0.3) },
      burst: { scale_x: [[0, 0.5], [d * 0.4, 1.15], [d, 0.8]], scale_y: [[0, 0.7], [d * 0.4, 1.1], [d, 0.9]], opacity: fade(d, d * 0.5) },
    },
  };
}

function deathPuff(b: SpriteBuilder, d: number): Parts {
  b.ellipse('scorch', 40, 14, { fill: solid('#000000', 0.25) });
  const tracks: Tracks = {};
  const puffs: [number, number, number][] = [[-12, -10, 10], [11, -12, 11], [0, -22, 12], [-6, -2, 9], [8, -2, 9]];
  puffs.forEach(([x, y, r], i) => {
    const name = `puff${i}`;
    b.circle(name, r, { x, y, fill: radial([[0, '#f2eeea'], [1, '#9a948e']], [0.4, 0.35], 0.7) });
    tracks[name] = {
      x: [[0, x * 0.4, 'EaseOutCubic'], [d, x * 1.5]],
      y: [[0, y * 0.4 - 6, 'EaseOutCubic'], [d, y * 1.4 - 10]],
      scale_x: [[0, 0.4, 'EaseOutCubic'], [d, 1.3]],
      scale_y: [[0, 0.4, 'EaseOutCubic'], [d, 1.3]],
      opacity: [[0, 0.95], [d * 0.4, 0.85], [d, 0]],
    };
  });
  return { tracks: { ...tracks, scorch: { opacity: fade(d, d * 0.3) } } };
}

function coinPopup(b: SpriteBuilder, d: number): Parts {
  b.group('rise', { y: -14 });
  b.circle('coin', 8, { x: -14, fill: litBall(PALETTE.gold, '#fff6c0'), stroke: outline(2) }, 'rise');
  b.circle('coinRim', 4.5, { x: -14, stroke: { color: PALETTE.gold.dark, width: 2 } }, 'rise');
  const label = b.outlinedText('label', '+12', { x: 29, size: 22, width: 66, align: 'left', fill: PALETTE.gold.light, outline: { color: OUTLINE, width: 3 } }, 'rise');
  const pop = [[0, 0.6, 'EaseOutBack'], [d * 0.18, 1], [d, 1]] as const;
  return {
    textIds: [...label.textIds],
    tracks: {
      rise: { y: [[0, -14, 'EaseOutCubic'], [d, -44]], opacity: [[0, 0], [d * 0.08, 1], [d * 0.65, 1], [d, 0]], scale_x: pop, scale_y: pop },
    },
  };
}

function leak(b: SpriteBuilder, d: number): Parts {
  b.circle('flash', 36, { fill: glowFill('#ff2a1a', 0.55) });
  b.ellipse('ring', 64, 40, { stroke: { color: '#ff4a3a', width: 4 } });
  b.ellipse('ring2', 64, 40, { stroke: { color: '#ff8a7a', width: 3 } });
  b.group('rise', { y: -34 });
  const label = b.outlinedText('label', '-1', { size: 26, fill: PALETTE.red.light, outline: { color: OUTLINE, width: 3 } }, 'rise');
  return {
    textIds: [...label.textIds],
    tracks: {
      flash: { scale_x: [[0, 0.6], [d * 0.6, 1.2]], scale_y: [[0, 0.6], [d * 0.6, 1.2]], opacity: fade(d * 0.7) },
      ring: { scale_x: [[0, 0.3, 'EaseOutCubic'], [d * 0.75, 1.4]], scale_y: [[0, 0.3, 'EaseOutCubic'], [d * 0.75, 1.4]], opacity: fade(d * 0.75), 'style.stroke.width': [[0, 6], [d * 0.75, 1.5]] },
      ring2: {
        scale_x: [[0, 0.3], [d * 0.25, 0.3, 'EaseOutCubic'], [d, 1.4]],
        scale_y: [[0, 0.3], [d * 0.25, 0.3, 'EaseOutCubic'], [d, 1.4]],
        opacity: [[0, 0], [d * 0.25, 1], [d, 0]],
      },
      rise: { y: [[0, -30, 'EaseOutCubic'], [d, -54]], opacity: [[0, 0], [d * 0.1, 1], [d * 0.7, 1], [d, 0]] },
    },
  };
}

const BUILDERS: Readonly<Record<FxKind, (b: SpriteBuilder, duration: number) => Parts>> = {
  tracer,
  lightning,
  explosion,
  frostBurst,
  hitSpark,
  muzzleFlash,
  deathPuff,
  coinPopup,
  leak,
};

export function buildFxSprite(kind: FxKind, idPrefix: string): FxSprite {
  const b = new SpriteBuilder(idPrefix);
  const duration = FX_DURATION[kind];
  const parts = BUILDERS[kind](b, duration);
  b.clip('play', duration, parts.tracks);
  return { ...b.build(), kind, duration, pathPartIds: parts.pathPartIds ?? [], textIds: parts.textIds ?? [], baseRadius: BASE_RADIUS[kind] };
}

/**
 * Exactly LIGHTNING_POINTS jagged points through the chain (first and last chain points exact), deterministic per seed.
 * Every chain point is hit exactly when the chain has at most LIGHTNING_POINTS points; longer chains are resampled.
 */
export function lightningPoints(chain: readonly Vec2[], seed: number): PathPoint[] {
  const first = chain[0];
  const last = chain[chain.length - 1];
  if (!first || !last) throw new Error('lightningPoints needs at least one chain point');
  const rng = createRng(seed);
  const segments = LIGHTNING_POINTS - 1;
  const legs = chain.slice(1).map((to, i) => ({ from: chain[i] ?? to, to }));
  const lengths = legs.map((l) => Math.hypot(l.to.x - l.from.x, l.to.y - l.from.y));
  const total = lengths.reduce((s, x) => s + x, 0);
  const counts = allocate(lengths, total, segments);
  const out: PathPoint[] = [{ x: first.x, y: first.y }];
  if (legs.length === 0 || counts === null) {
    for (let i = 1; i <= segments; i++) out.push(jitter(along(chain, lengths, (total * i) / segments), rng, i === segments ? 0 : total / segments));
  } else {
    legs.forEach((leg, li) => {
      const n = counts[li] ?? 1;
      const len = lengths[li] ?? 0;
      const nx = len === 0 ? 0 : -(leg.to.y - leg.from.y) / len;
      const ny = len === 0 ? 0 : (leg.to.x - leg.from.x) / len;
      const maxAmp = Math.min(14, Math.max(4, len * 0.09));
      let sign = rng.next() < 0.5 ? -1 : 1;
      for (let k = 1; k <= n; k++) {
        const t = Math.min(1, (k + (k < n ? (rng.next() - 0.5) * 0.5 : 0)) / n);
        sign = rng.next() < 0.75 ? -sign : sign;
        const amp = k === n ? 0 : maxAmp * sign * (0.3 + 0.7 * rng.next());
        out.push({ x: leg.from.x + (leg.to.x - leg.from.x) * t + nx * amp, y: leg.from.y + (leg.to.y - leg.from.y) * t + ny * amp });
      }
    });
  }
  out[out.length - 1] = { x: last.x, y: last.y };
  return out;
}

/** Splits `segments` across the legs by length (each leg ≥ 1), or null when there are more legs than segments. */
function allocate(lengths: readonly number[], total: number, segments: number): number[] | null {
  if (lengths.length === 0 || lengths.length > segments) return null;
  const spare = segments - lengths.length;
  const shares = lengths.map((l) => (total === 0 ? spare / lengths.length : (l / total) * spare));
  const counts = shares.map((s) => 1 + Math.floor(s));
  let left = segments - counts.reduce((s, c) => s + c, 0);
  const order = shares.map((s, i) => ({ i, r: s - Math.floor(s) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    counts[i] = (counts[i] ?? 0) + 1;
    left--;
  }
  return counts;
}

function along(chain: readonly Vec2[], lengths: readonly number[], distanceAlong: number): Vec2 {
  let left = distanceAlong;
  for (let i = 0; i < lengths.length; i++) {
    const a = chain[i];
    const b = chain[i + 1];
    const len = lengths[i] ?? 0;
    if (a && b && (left <= len || i === lengths.length - 1)) {
      const t = len === 0 ? 0 : Math.min(1, left / len);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    left -= len;
  }
  const only = chain[0] ?? { x: 0, y: 0 };
  return { x: only.x, y: only.y };
}

function jitter(p: Vec2, rng: { next(): number }, step: number): PathPoint {
  const amp = Math.min(12, step * 0.4);
  return { x: p.x + (rng.next() * 2 - 1) * amp, y: p.y + (rng.next() * 2 - 1) * amp };
}
