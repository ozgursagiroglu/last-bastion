/**
 * Projectile sprites (pooled by the scene): the root sits at the ground point under the projectile. Cannonballs are
 * lifted by their arc height (lift part); shards and rockets turn to their heading (heading part, art faces +x).
 * Each has a 'lightTrail' part with the engine's LightTrail (anchored by the adapter, see trailPartIds).
 */
import type { ProjectileKind } from '../../game/types';
import { linear, solid, SpriteBuilder } from '../exode';
import { PALETTE } from '../palette';
import type { ProjectileSprite } from '../types';
import { lightTrail } from './effects';
import { CONTACT_SHADOW, glowFill, litBall, outline } from './paint';
import { polyPoints } from './shapes';

/** Trail lengths in rendered frames: ≈ 50–70 px at 60 fps for shards (520 px/s) and rockets (360 px/s). */
export const TRAIL_LENGTH: Readonly<Record<ProjectileKind, number>> = { cannonball: 6, iceShard: 8, rocket: 9 };

function cannonball(b: SpriteBuilder): Pick<ProjectileSprite, 'headingPartId' | 'liftPartId'> {
  b.ellipse('shadow', 16, 6, { fill: CONTACT_SHADOW });
  const lift = b.group('lift');
  b.circle('lightTrail', 5, { y: -7, fill: solid('#e8e0d8', 0.3), effects: [lightTrail(TRAIL_LENGTH.cannonball)] }, 'lift');
  b.circle('ball', 7, { y: -7, fill: litBall({ light: '#7d8a96', dark: '#1f262d' }), stroke: outline(2) }, 'lift');
  b.circle('shine', 2.2, { x: -2.5, y: -9.5, fill: solid('#ffffff', 0.7) }, 'lift');
  return { headingPartId: null, liftPartId: lift };
}

function iceShard(b: SpriteBuilder): Pick<ProjectileSprite, 'headingPartId' | 'liftPartId'> {
  const heading = b.group('heading');
  b.ellipse('lightTrail', 16, 6, { x: -6, fill: solid(PALETTE.ice.light, 0.7), blend: 'lighter', effects: [lightTrail(TRAIL_LENGTH.iceShard)] }, 'heading');
  b.ellipse('glow', 34, 18, { x: -2, fill: glowFill('#c8f4ff', 0.55), blend: 'lighter' }, 'heading');
  b.path('trail', polyPoints([[-6, -3], [-22, 0], [-6, 3]]), { fill: solid(PALETTE.ice.light, 0.55) }, 'heading');
  b.path('crystal', polyPoints([[10, 0], [3, -4], [-8, -3], [-10, 0], [-8, 3], [3, 4]]), { fill: linear([[0, PALETTE.ice.light], [1, PALETTE.ice.dark]]), stroke: { color: '#1d3b5a', width: 1.5 } }, 'heading');
  b.path('facet', polyPoints([[9, -0.5], [3, -3], [-7, -2], [3, -0.5]]), { fill: solid('#ffffff', 0.85) }, 'heading');
  return { headingPartId: heading, liftPartId: null };
}

function rocket(b: SpriteBuilder): Pick<ProjectileSprite, 'headingPartId' | 'liftPartId'> {
  const heading = b.group('heading');
  b.ellipse('lightTrail', 14, 7, { x: -18, fill: solid('#ff9a3a', 0.75), blend: 'lighter', effects: [lightTrail(TRAIL_LENGTH.rocket)] }, 'heading');
  b.group('flame', { x: -10 }, 'heading');
  b.circle('flameGlow', 9, { x: -4, fill: glowFill('#ff9a3a', 0.8), blend: 'lighter' }, 'flame');
  b.path('flameOuter', [{ x: 0, y: -3.5, moveTo: true }, { x: -13, y: 0, inX: -6, inY: -4, outX: -6, outY: 4 }, { x: 0, y: 3.5, close: true }], { fill: linear([[0, '#ffe27a'], [1, '#e2461b']], [1, 0.5], [0, 0.5]) }, 'flame');
  b.path('flameCore', [{ x: 0, y: -1.8, moveTo: true }, { x: -7, y: 0, inX: -3, inY: -2, outX: -3, outY: 2 }, { x: 0, y: 1.8, close: true }], { fill: '#fff6c0' }, 'flame');
  b.path('fins', polyPoints([[-10, -3], [-5, -3], [-12, -8], [-13, -8]]).concat(polyPoints([[-10, 3], [-5, 3], [-12, 8], [-13, 8]])), { fill: PALETTE.red.dark, stroke: outline(1.5) }, 'heading');
  b.rect('body', 18, 6, { x: -2, radius: 2, fill: linear([[0, PALETTE.metal.light], [1, PALETTE.metal.dark]]), stroke: outline(1.5) }, 'heading');
  b.rect('band', 3, 6, { x: 2, fill: PALETTE.red.light, stroke: outline(1.5) }, 'heading');
  b.path('nose', [{ x: 7, y: -3, moveTo: true }, { x: 13, y: 0, inX: 11, inY: -3, outX: 11, outY: 3 }, { x: 7, y: 3, close: true }], { fill: linear([[0, PALETTE.red.light], [1, PALETTE.red.dark]]), stroke: outline(1.5) }, 'heading');
  b.clip('loop', 0.15, {
    flame: { scale_x: [[0, 1], [0.05, 1.35], [0.1, 0.85], [0.15, 1]], scale_y: [[0, 1], [0.05, 0.85], [0.1, 1.15], [0.15, 1]] },
    flameGlow: { opacity: [[0, 1], [0.05, 0.7], [0.1, 1], [0.15, 1]] },
  });
  return { headingPartId: heading, liftPartId: null };
}

const BUILDERS: Readonly<Record<ProjectileKind, (b: SpriteBuilder) => Pick<ProjectileSprite, 'headingPartId' | 'liftPartId'>>> = {
  cannonball,
  iceShard,
  rocket,
};

export function buildProjectileSprite(kind: ProjectileKind, idPrefix: string): ProjectileSprite {
  const b = new SpriteBuilder(idPrefix);
  const parts = BUILDERS[kind](b);
  return { ...b.build(), kind, ...parts };
}
