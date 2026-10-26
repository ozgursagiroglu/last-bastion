/** How many pooled instances of each sprite a level needs, and the id prefixes they use. */
import { TOWERS } from '../../game/config';
import {
  ENEMY_KINDS,
  MAX_ALIVE_PER_KIND,
  PROJECTILE_KINDS,
  type EnemyKind,
  type LevelDef,
  type ProjectileKind,
  type TowerKind,
} from '../../game/types';
import type { FxKind } from '../../art/types';

/** Extra enemy instances per kind, for bodies still playing 'die' while new enemies spawn. */
export const DYING_SPARE = 8;

export const PROJECTILE_POOL: Readonly<Record<ProjectileKind, number>> = { cannonball: 24, iceShard: 32, rocket: 24 };

/** Effects the scene draws (no muzzleFlash: every tower's 'fire' clip draws its own). */
export type SceneFxKind = Exclude<FxKind, 'muzzleFlash'>;

export const FX_POOL: Readonly<Record<SceneFxKind, number>> = {
  tracer: 24,
  lightning: 8,
  explosion: 12,
  frostBurst: 10,
  hitSpark: 16,
  deathPuff: 16,
  coinPopup: 16,
  leak: 4,
};

export const towerPrefix = (pad: number, kind: TowerKind): string => `tw.${pad}.${kind}`;
export const enemyPrefix = (kind: EnemyKind, i: number): string => `en.${kind}.${i}`;
export const projectilePrefix = (kind: ProjectileKind, i: number): string => `pr.${kind}.${i}`;
export const fxPrefix = (kind: SceneFxKind, i: number): string => `fx.${kind}.${i}`;

/** Total spawns per enemy kind over all waves (kinds that never spawn are absent). */
export function spawnTotals(level: LevelDef): Partial<Record<EnemyKind, number>> {
  const totals: Partial<Record<EnemyKind, number>> = {};
  for (const wave of level.waves) for (const g of wave.groups) totals[g.enemy] = (totals[g.enemy] ?? 0) + g.count;
  return totals;
}

/** Enemy pool size per kind that appears in the level: live cap plus room for dying bodies. */
export function enemyPoolSizes(level: LevelDef): Partial<Record<EnemyKind, number>> {
  const totals = spawnTotals(level);
  const sizes: Partial<Record<EnemyKind, number>> = {};
  for (const kind of ENEMY_KINDS) {
    const total = totals[kind] ?? 0;
    if (total > 0) sizes[kind] = Math.min(total, MAX_ALIVE_PER_KIND) + Math.min(DYING_SPARE, total);
  }
  return sizes;
}

/** Projectile pool size per kind fired by the level's towers. */
export function projectilePoolSizes(level: LevelDef): Partial<Record<ProjectileKind, number>> {
  const sizes: Partial<Record<ProjectileKind, number>> = {};
  for (const kind of PROJECTILE_KINDS) {
    if (level.towers.some((t) => TOWERS[t].attack === kind)) sizes[kind] = PROJECTILE_POOL[kind];
  }
  return sizes;
}

/** Effect pool size per kind the level can produce (tower-specific effects only when that tower is allowed). */
export function fxPoolSizes(level: LevelDef): Partial<Record<SceneFxKind, number>> {
  const has = (kind: TowerKind) => level.towers.includes(kind);
  const used: Record<SceneFxKind, boolean> = {
    tracer: has('rifle'),
    lightning: has('tesla'),
    explosion: has('cannon') || has('rocket'),
    frostBurst: has('frost'),
    hitSpark: true,
    deathPuff: true,
    coinPopup: true,
    leak: true,
  };
  const sizes: Partial<Record<SceneFxKind, number>> = {};
  for (const kind of Object.keys(FX_POOL) as SceneFxKind[]) if (used[kind]) sizes[kind] = FX_POOL[kind];
  return sizes;
}
