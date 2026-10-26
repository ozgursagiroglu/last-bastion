import { TOWERS } from '../config';
import type { EnemyState, TowerDef, TowerLevelStats, TowerState, Vec2 } from '../types';
import { FIXED_DT, MAX_PROJECTILES } from '../types';
import { damageAgainst, damageEnemy } from './damage';
import { canHit, type HitFilter } from './enemies';
import { launchCannonball, launchHoming } from './projectiles';
import { copyVec, distanceSq, emit, EPSILON, pathOf, type Payload, type World } from './world';

export function towerStats(tower: TowerState): TowerLevelStats {
  const stats = TOWERS[tower.kind].levels[tower.level - 1];
  if (!stats) throw new Error(`${tower.kind} has no level ${tower.level}`);
  return stats;
}

/** The hittable enemy within range that is closest to its exit; ties go to the lower id. */
export function findTarget(world: World, filter: HitFilter, from: Vec2, range: number): EnemyState | undefined {
  const r2 = range * range;
  let best: EnemyState | undefined;
  let bestLeft = Infinity;
  for (const enemy of world.view.enemies) {
    if (!canHit(filter, enemy) || distanceSq(enemy.pos, from) > r2) continue;
    const left = pathOf(world, enemy.path).length - enemy.distance;
    if (left < bestLeft || (left === bestLeft && best && enemy.id < best.id)) {
      best = enemy;
      bestLeft = left;
    }
  }
  return best;
}

/** Tesla chain: the first target, then the nearest unhit hittable enemy within jump range of the previous hit. */
export function chainTargets(world: World, filter: HitFilter, first: EnemyState, count: number, jumpRange: number): EnemyState[] {
  const hit = [first];
  const r2 = jumpRange * jumpRange;
  let prev = first;
  while (hit.length < count) {
    let next: EnemyState | undefined;
    let nextD = Infinity;
    for (const enemy of world.view.enemies) {
      if (hit.includes(enemy) || !canHit(filter, enemy)) continue;
      const d = distanceSq(enemy.pos, prev.pos);
      if (d > r2) continue;
      if (d < nextD || (d === nextD && next && enemy.id < next.id)) {
        next = enemy;
        nextD = d;
      }
    }
    if (!next) break;
    hit.push(next);
    prev = next;
  }
  return hit;
}

function payloadFor(def: TowerDef, stats: TowerLevelStats): Payload {
  const kind = def.attack;
  if (kind !== 'cannonball' && kind !== 'iceShard' && kind !== 'rocket') throw new Error(`${def.kind} fires no projectile`);
  return {
    kind,
    source: def.kind,
    damageType: def.damageType,
    damage: stats.damage,
    splashRadius: stats.splashRadius ?? 0,
    airDamageMultiplier: def.airDamageMultiplier ?? 1,
    hitsAir: def.hitsAir,
    hitsGround: def.hitsGround,
    speed: def.projectileSpeed ?? 0,
    slow: stats.slow ?? null,
  };
}

function fire(world: World, tower: TowerState, def: TowerDef, stats: TowerLevelStats, target: EnemyState): void {
  const from = copyVec(tower.pos);
  const fired = (to: Vec2) =>
    emit(world, { type: 'towerFired', towerId: tower.id, kind: tower.kind, targetId: target.id, from, to: copyVec(to) });
  const air = def.airDamageMultiplier ?? 1;
  switch (def.attack) {
    case 'hitscan':
      fired(target.pos);
      damageEnemy(world, target, damageAgainst(target, stats.damage, air), def.damageType, def.kind);
      return;
    case 'chain': {
      const chain = stats.chain ?? { targets: 1, range: 0, falloff: 0 };
      const hits = chainTargets(world, def, target, chain.targets, chain.range);
      fired(target.pos);
      emit(world, { type: 'chainLightning', towerId: tower.id, points: [from, ...hits.map((e) => copyVec(e.pos))] });
      hits.forEach((enemy, k) => {
        const amount = stats.damage * (1 - chain.falloff) ** k;
        damageEnemy(world, enemy, damageAgainst(enemy, amount, air), def.damageType, def.kind);
      });
      return;
    }
    case 'cannonball':
      fired(launchCannonball(world, tower.id, payloadFor(def, stats), from, target).to);
      return;
    case 'iceShard':
    case 'rocket':
      fired(launchHoming(world, tower.id, payloadFor(def, stats), from, target).to);
      return;
  }
}

/** Tower phase of a step: target, aim, cool down and fire. */
export function stepTowers(world: World): void {
  const { view } = world;
  for (const tower of view.towers) {
    const def = TOWERS[tower.kind];
    const stats = towerStats(tower);
    const target = findTarget(world, def, tower.pos, stats.range);
    if (target) tower.aim = Math.atan2(target.pos.y - tower.pos.y, target.pos.x - tower.pos.x);
    tower.cooldown = tower.cooldown - FIXED_DT <= EPSILON ? 0 : tower.cooldown - FIXED_DT;
    if (!target || tower.cooldown > 0) continue;
    const projectile = def.attack !== 'hitscan' && def.attack !== 'chain';
    if (projectile && view.projectiles.length >= MAX_PROJECTILES) continue;
    fire(world, tower, def, stats, target);
    tower.cooldown = stats.fireInterval;
    tower.lastFiredAt = view.time;
  }
}
