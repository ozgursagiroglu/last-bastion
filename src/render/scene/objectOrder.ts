/**
 * Order of the world artboard's object list. The engine finds the object of every clip track with a linear scan of
 * that list on every applyAnimation, while drawing order comes from zIndex (roots) and `children` (parts), not from
 * the list. So the parts animated most often go first, tier by tier, and within a tier slot 0 of every pool, then
 * slot 1, ... (pools fill their lowest free slot first, so live instances sit near the front). Every object no tier
 * claims follows.
 */
import type { ExodeObject, SpriteInstance } from '../../art/exode';

export interface OrderTier {
  pools: readonly (readonly SpriteInstance[])[];
  /** Clips whose animated parts this tier claims. */
  clips: ReadonlySet<string>;
}

/** Ids of the objects the named clips of a sprite animate. */
export function animatedIds(sprite: SpriteInstance, clips: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>();
  for (const [name, clip] of Object.entries(sprite.clips)) {
    if (!clips.has(name)) continue;
    for (const track of clip.tracks) ids.add(track.object_id);
  }
  return ids;
}

/** Sprite i of every pool, then sprite i + 1 of every pool, ... */
export function bySlot<T>(pools: readonly (readonly T[])[]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...pools.map((p) => p.length));
  for (let i = 0; i < longest; i++) {
    for (const pool of pools) {
      const item = pool[i];
      if (item !== undefined) out.push(item);
    }
  }
  return out;
}

/** Every object of `sprites`, the tiers' animated parts first. */
export function orderObjects(sprites: readonly SpriteInstance[], tiers: readonly OrderTier[]): ExodeObject[] {
  const placed = new Set<string>();
  const out: ExodeObject[] = [];
  for (const tier of tiers) {
    for (const sprite of bySlot(tier.pools)) {
      const ids = animatedIds(sprite, tier.clips);
      for (const o of sprite.objects) {
        if (ids.has(o.id) && !placed.has(o.id)) {
          placed.add(o.id);
          out.push(o);
        }
      }
    }
  }
  for (const sprite of sprites) for (const o of sprite.objects) if (!placed.has(o.id)) out.push(o);
  return out;
}
