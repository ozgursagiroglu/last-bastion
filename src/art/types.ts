/**
 * Contracts between the art builders (src/art/**) and the runtime adapters (src/render/**, src/ui/**).
 *
 * Conventions every sprite follows (the adapters rely on them):
 * - The root group sits at the sprite's ground point (pad center, feet, impact point). The adapter owns the root's
 *   x, y, zIndex, visible, scale and opacity; clips never target the root (SpriteBuilder.clip enforces it).
 * - Art faces +x (right) by default.
 * - Clips only animate parts the adapter does not drive (the ids listed in these interfaces are adapter-driven, except
 *   `bodyPartId`, which belongs to the hit/die clips).
 * - A 'once' clip's pose at t = 0 and t = duration is the rest pose, except 'die'. A 'loop' clip's first and last keys
 *   are equal.
 */
import type { EnemyKind, ProjectileKind, TowerKind, TowerLevel, Vec2 } from '../game/types';
import type { SpriteInstance } from './exode';

export type { SpriteInstance } from './exode';

/**
 * Clips: 'idle' (loop), 'fire' (once, ≤ 0.35 s, works for every level).
 * Built with every tier part hidden except tier 1.
 */
export interface TowerSprite extends SpriteInstance {
  kind: TowerKind;
  /**
   * Parts that exist only at one level. For level L the adapter shows `tierPartIds[L]` and hides the other two lists.
   * Parts shared by all levels are not listed.
   */
  tierPartIds: Record<TowerLevel, string[]>;
  /**
   * Group rotated toward the target, in degrees (0 = facing +x, positive = clockwise on screen), or null when the tower
   * does not aim. When `facePartId` is set, the aim part is a descendant of the face part and the adapter writes the
   * local angle (180° − aim while mirrored).
   */
  aimPartId: string | null;
  /**
   * Group mirrored with flip_x when the target is left of the tower (soldier-style towers), or null. It sits at the
   * root origin with no other transform.
   */
  facePartId: string | null;
  /** Pivot of the aim part in root space. */
  aimPivot: Vec2;
  /**
   * Muzzle (where shots and projectiles start) in root space per level, for the unmirrored sprite with the aim part at
   * rotation 0. World muzzle for aim angle α (radians) and root position P:
   * - aim part, facing right: P + pivot + R(α)·(m − pivot)
   * - aim part, mirrored:     P + (−pivot.x, pivot.y) + R(α)·(m.x − pivot.x, −(m.y − pivot.y))
   * - no aim part:            P + m (x negated while mirrored)
   */
  muzzle: Record<TowerLevel, Vec2>;
}

/** Clips: 'walk' (loop), 'hit' (once, ≤ 0.2 s), 'die' (once, 0.35–0.6 s; t = 0 is the rest pose, ends fully transparent). */
export interface EnemySprite extends SpriteInstance {
  kind: EnemyKind;
  /** Group mirrored with flip_x while moving left. Sits at the root origin with no other transform. */
  facePartId: string;
  /** Inner group animated by 'hit' and 'die' (adapter never writes it). */
  bodyPartId: string;
  /**
   * Health bar above the head, hidden at full health by the adapter. The fill is a rectangle centered at `fillX` in the
   * bar group's space with width `fullWidth`; the adapter left-anchors it: scale_x = ratio, x = fillX − fullWidth·(1 − ratio)/2.
   */
  hpBar: { groupId: string; fillId: string; fullWidth: number; fillX: number };
  /** Cold tint shown while slowed (adapter toggles visible). */
  frostOverlayId: string;
  /** Shield bubble whose opacity follows shield / maxShield; null for kinds without a shield. */
  shieldBubbleId: string | null;
  /** Height in px of the sprite above its ground point (for floating text and effects). */
  height: number;
  /** Px travelled per walk cycle: the adapter plays 'walk' at t = (distance / stride) × duration, so feet do not slide. */
  stride: number;
}

/** Clips: optional 'loop' (spin, flame flicker). */
export interface ProjectileSprite extends SpriteInstance {
  kind: ProjectileKind;
  /** Group rotated to the flight heading in degrees (null if the projectile is round). */
  headingPartId: string | null;
  /** Cannonball: group lifted by the arc height (adapter sets its y = −height); the ground shadow stays at the root. */
  liftPartId: string | null;
}

export type FxKind =
  | 'tracer' // rifle bullet streak from muzzle to target (dynamic path, 2 points)
  | 'lightning' // tesla bolt through the chain points (dynamic path, LIGHTNING_POINTS points)
  | 'explosion' // cannon / rocket impact
  | 'frostBurst' // ice shard impact
  | 'hitSpark' // small spark where a hitscan shot lands
  | 'muzzleFlash' // flash at a muzzle (rifle, cannon, rocket)
  | 'deathPuff' // smoke puff when an enemy dies
  | 'coinPopup' // "+12" gold text rising from a kill
  | 'leak'; // red flash at the exit when an enemy gets through

/** Number of points of the lightning path; the adapter fills the chain into exactly this many points. */
export const LIGHTNING_POINTS = 16;

/** Clip 'play' runs once over `duration`; the adapter hides the instance afterwards. */
export interface FxSprite extends SpriteInstance {
  kind: FxKind;
  duration: number;
  /** tracer / lightning: dynamic path parts whose points the adapter rewrites in design coords (root stays at 0,0). */
  pathPartIds: string[];
  /** coinPopup: text ids whose text the adapter sets (e.g. '+12'). */
  textIds: string[];
  /** explosion / frostBurst: radius the art is drawn at; the adapter scales the root by splashRadius / baseRadius. */
  baseRadius: number;
}
