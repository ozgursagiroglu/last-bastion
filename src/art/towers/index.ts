/**
 * Tower sprites (TowerSprite contract in src/art/types.ts) and build-menu icons for the five tower kinds.
 */
import type { TowerKind } from '../../game/types';
import { ROOT, SpriteBuilder, type ExodeObject, type SpriteInstance } from '../exode';
import type { TowerSprite } from '../types';
import { withoutEffects } from '../world/effects';
import { CANNON_ART } from './cannon';
import { FROST_ART } from './frost';
import { levels, type TowerArt } from './parts';
import { RIFLE_ART } from './rifle';
import { ROCKET_ART } from './rocket';
import { TESLA_ART } from './tesla';

/** Side of the square a build-menu icon fits in, centered on its root. */
export const ICON_SIZE = 56;

const ART: Record<TowerKind, TowerArt> = {
  rifle: RIFLE_ART,
  cannon: CANNON_ART,
  frost: FROST_ART,
  tesla: TESLA_ART,
  rocket: ROCKET_ART,
};

export function buildTowerSprite(kind: TowerKind, idPrefix: string): TowerSprite {
  const b = new SpriteBuilder(idPrefix);
  const parts = ART[kind].draw(b, ROOT);
  const ids = (names: readonly string[]) => names.map((n) => b.id(n));
  const tierPartIds = levels(ids(parts.tiers[1]), ids(parts.tiers[2]), ids(parts.tiers[3]));
  const sprite = b.build();
  const hidden = new Set([...tierPartIds[2], ...tierPartIds[3]]);
  for (const o of sprite.objects) if (hidden.has(o.id)) o.visible = false;
  return {
    ...sprite,
    kind,
    tierPartIds,
    aimPartId: parts.aimPart === null ? null : b.id(parts.aimPart),
    facePartId: parts.facePart === null ? null : b.id(parts.facePart),
    aimPivot: { ...parts.aimPivot },
    muzzle: levels({ ...parts.muzzle[1] }, { ...parts.muzzle[2] }, { ...parts.muzzle[3] }),
  };
}

/** Static level-1 look that fits a 56×56 box centered on its root (build-menu icon), without engine glows. No clips. */
export function buildTowerIcon(kind: TowerKind, idPrefix: string): SpriteInstance {
  const art = ART[kind];
  const { x, y, size } = art.iconFrame;
  const scale = ICON_SIZE / size;
  const b = new SpriteBuilder(idPrefix);
  b.group('icon', { x: -x * scale, y: -y * scale, scale });
  const parts = art.draw(b, 'icon');
  const drop = new Set([...parts.tiers[2], ...parts.tiers[3]].map((n) => b.id(n)));
  const sprite = b.build();
  return { rootId: sprite.rootId, objects: withoutSubtrees(sprite.objects, drop).map(withoutEffects), clips: {} };
}

/** Objects minus the given ids and their descendants (objects are listed parents first). */
function withoutSubtrees(objects: readonly ExodeObject[], drop: ReadonlySet<string>): ExodeObject[] {
  const kept = new Set<string>();
  const out: ExodeObject[] = [];
  for (const o of objects) {
    if (drop.has(o.id) || (o.parentId !== undefined && !kept.has(o.parentId))) continue;
    kept.add(o.id);
    out.push(o);
  }
  return out.map((o) => (o.children ? { ...o, children: o.children.filter((c) => kept.has(c)) } : o));
}
