import { CANNON_ARC_HEIGHT, CANNON_FLIGHT_TIME, PROJECTILE_HIT_DISTANCE, ROCKET_RETARGET_RADIUS } from '../config';
import type { EnemyState, ProjectileState, Vec2 } from '../types';
import { FIXED_DT } from '../types';
import { applySlow, damageAgainst, damageEnemy } from './damage';
import { canHit } from './enemies';
import { samplePath } from './path';
import { copyVec, distanceSq, emit, EPSILON, newId, pathOf, type Payload, type World } from './world';

function addProjectile(world: World, towerId: number, payload: Payload, from: Vec2, to: Vec2, targetId: number | null): ProjectileState {
  const projectile: ProjectileState = {
    id: newId(world),
    kind: payload.kind,
    towerId,
    pos: copyVec(from),
    heading: Math.atan2(to.y - from.y, to.x - from.x),
    from: copyVec(from),
    to: copyVec(to),
    progress: 0,
    targetId,
    height: 0,
  };
  world.view.projectiles.push(projectile);
  world.payloads.set(projectile.id, payload);
  return projectile;
}

/** Where `enemy` will be after CANNON_FLIGHT_TIME at its current speed (clamped to the path end). */
export function predictPosition(world: World, enemy: EnemyState): Vec2 {
  const ahead = enemy.distance + world.scaled[enemy.kind].speed * enemy.slowFactor * CANNON_FLIGHT_TIME;
  const out = { x: 0, y: 0 };
  samplePath(pathOf(world, enemy.path), ahead, out);
  return out;
}

export function launchCannonball(world: World, towerId: number, payload: Payload, from: Vec2, target: EnemyState): ProjectileState {
  return addProjectile(world, towerId, payload, from, predictPosition(world, target), null);
}

export function launchHoming(world: World, towerId: number, payload: Payload, from: Vec2, target: EnemyState): ProjectileState {
  return addProjectile(world, towerId, payload, from, target.pos, target.id);
}

function splash(world: World, payload: Payload, at: Vec2): void {
  const r2 = payload.splashRadius * payload.splashRadius;
  for (const enemy of world.view.enemies) {
    if (!canHit(payload, enemy) || distanceSq(enemy.pos, at) > r2) continue;
    damageEnemy(world, enemy, damageAgainst(enemy, payload.damage, payload.airDamageMultiplier), payload.damageType, payload.source);
  }
}

function liveTarget(world: World, projectile: ProjectileState, payload: Payload): EnemyState | undefined {
  if (projectile.targetId === null) return undefined;
  const enemy = world.enemyById.get(projectile.targetId);
  return enemy && canHit(payload, enemy) ? enemy : undefined;
}

function retarget(world: World, payload: Payload, around: Vec2): EnemyState | undefined {
  let best: EnemyState | undefined;
  let bestD = ROCKET_RETARGET_RADIUS * ROCKET_RETARGET_RADIUS;
  for (const enemy of world.view.enemies) {
    if (!canHit(payload, enemy)) continue;
    const d = distanceSq(enemy.pos, around);
    if (d < bestD || (d === bestD && (!best || enemy.id < best.id))) {
      best = enemy;
      bestD = d;
    }
  }
  return best;
}

/** Moves the projectile; returns true when it ends this step. */
function advanceCannonball(projectile: ProjectileState): boolean {
  projectile.progress = Math.min(1, projectile.progress + FIXED_DT / CANNON_FLIGHT_TIME);
  const p = projectile.progress >= 1 - EPSILON ? 1 : projectile.progress;
  const { from, to } = projectile;
  projectile.pos.x = from.x + (to.x - from.x) * p;
  projectile.pos.y = from.y + (to.y - from.y) * p;
  projectile.height = 4 * CANNON_ARC_HEIGHT * p * (1 - p);
  return p >= 1;
}

/** Returns the enemy hit (or null for an empty landing) when the projectile ends this step, else undefined. */
function advanceHoming(world: World, projectile: ProjectileState, payload: Payload): EnemyState | null | undefined {
  let target = liveTarget(world, projectile, payload);
  if (!target && projectile.targetId !== null) {
    target = payload.kind === 'rocket' ? retarget(world, payload, projectile.to) : undefined;
    projectile.targetId = target ? target.id : null;
  }
  if (target) {
    projectile.to.x = target.pos.x;
    projectile.to.y = target.pos.y;
  }
  const { pos, to } = projectile;
  const dx = to.x - pos.x;
  const dy = to.y - pos.y;
  const remaining = Math.hypot(dx, dy);
  const stepLen = payload.speed * FIXED_DT;
  if (remaining > 0) projectile.heading = Math.atan2(dy, dx);
  if (remaining <= PROJECTILE_HIT_DISTANCE || stepLen >= remaining) {
    pos.x = to.x;
    pos.y = to.y;
    return target ?? null;
  }
  pos.x += (dx / remaining) * stepLen;
  pos.y += (dy / remaining) * stepLen;
  return undefined;
}

function impact(world: World, projectile: ProjectileState, payload: Payload, target: EnemyState | null): void {
  if (payload.kind === 'iceShard') {
    if (target) {
      damageEnemy(world, target, damageAgainst(target, payload.damage, payload.airDamageMultiplier), payload.damageType, payload.source);
      if (payload.slow && target.hp > 0) applySlow(target, payload.slow);
    }
  } else {
    splash(world, payload, projectile.pos);
  }
  emit(world, {
    type: 'projectileHit',
    id: projectile.id,
    kind: projectile.kind,
    pos: copyVec(projectile.pos),
    splashRadius: payload.kind === 'iceShard' ? 0 : payload.splashRadius,
  });
}

/** Projectile phase of a step: move every projectile, resolve the ones that end. */
export function stepProjectiles(world: World): void {
  const list = world.view.projectiles;
  let kept = 0;
  for (const projectile of list) {
    const payload = world.payloads.get(projectile.id);
    if (!payload) throw new Error(`projectile ${projectile.id} has no payload`);
    let ended: boolean;
    let target: EnemyState | null = null;
    if (projectile.kind === 'cannonball') {
      ended = advanceCannonball(projectile);
    } else {
      const hit = advanceHoming(world, projectile, payload);
      ended = hit !== undefined;
      target = hit ?? null;
    }
    if (ended) {
      impact(world, projectile, payload, target);
      world.payloads.delete(projectile.id);
    } else {
      list[kept++] = projectile;
    }
  }
  list.length = kept;
}
