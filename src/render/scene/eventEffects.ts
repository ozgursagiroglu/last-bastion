/** Which effects each sim event starts. Pure: the scene supplies the lookups and starts the returned effects. */
import type { FxSpec } from '../../art/world/pose';
import type { EnemyKind, GameEvent, LevelDef, TowerState, Vec2 } from '../../game/types';
import type { SceneFxKind } from './pools';

/** Frost shard impacts have no splash radius in the sim; the burst is drawn at this radius. */
export const FROST_BURST_RADIUS = 30;

export interface FxRequest {
  kind: SceneFxKind;
  spec: FxSpec;
}

export interface EffectContext {
  level: LevelDef;
  /** Towers of the view after the step that emitted the event. */
  towers: readonly TowerState[];
  /** World muzzle of a tower as it is aimed now. */
  muzzle(tower: TowerState): Vec2;
  /** Height of an enemy kind's sprite above its ground point. */
  enemyHeight(kind: EnemyKind): number;
  /** Path index of an enemy from its last view state. */
  enemyPath(id: number): number | undefined;
  /** A fresh seed for each lightning bolt. */
  nextSeed(): number;
}

/** End point (exit) of a level path; path 0's when the index is unknown. */
export function pathEnd(level: LevelDef, path: number | undefined): Vec2 {
  const points = level.paths[path ?? 0] ?? level.paths[0] ?? [];
  const end = points[points.length - 1];
  return end ? { x: end.x, y: end.y } : { x: 0, y: 0 };
}

function padAt(level: LevelDef, pad: number): Vec2 {
  const p = level.pads[pad];
  return p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
}

export function effectsFor(event: GameEvent, ctx: EffectContext): FxRequest[] {
  const tower = (id: number) => ctx.towers.find((t) => t.id === id);
  switch (event.type) {
    case 'towerFired': {
      if (event.kind !== 'rifle') return [];
      const t = tower(event.towerId);
      const from = t ? ctx.muzzle(t) : event.from;
      return [
        { kind: 'tracer', spec: { at: from, points: [from, event.to] } },
        { kind: 'hitSpark', spec: { at: event.to } },
      ];
    }
    case 'chainLightning': {
      const first = event.points[0];
      if (!first) return [];
      const t = tower(event.towerId);
      const points = [t ? ctx.muzzle(t) : first, ...event.points.slice(1)];
      const start = points[0] ?? first;
      return [{ kind: 'lightning', spec: { at: start, points, seed: ctx.nextSeed() } }];
    }
    case 'projectileHit':
      return event.kind === 'iceShard'
        ? [{ kind: 'frostBurst', spec: { at: event.pos, radius: FROST_BURST_RADIUS } }]
        : [{ kind: 'explosion', spec: { at: event.pos, radius: event.splashRadius } }];
    case 'enemyKilled':
      return [
        { kind: 'deathPuff', spec: { at: event.pos } },
        { kind: 'coinPopup', spec: { at: { x: event.pos.x, y: event.pos.y - ctx.enemyHeight(event.kind) }, text: `+${event.bounty}` } },
      ];
    case 'enemyLeaked':
      return [{ kind: 'leak', spec: { at: pathEnd(ctx.level, ctx.enemyPath(event.id)), text: `−${event.livesLost}` } }];
    case 'towerBuilt':
      return [{ kind: 'deathPuff', spec: { at: padAt(ctx.level, event.pad) } }];
    case 'towerUpgraded': {
      const t = tower(event.towerId);
      return t ? [{ kind: 'hitSpark', spec: { at: t.pos } }] : [];
    }
    case 'towerSold':
      return [{ kind: 'deathPuff', spec: { at: padAt(ctx.level, event.pad) } }];
    default:
      return [];
  }
}
