import { ENEMIES, SHIELD_PHYSICAL_EFFICIENCY } from '../config';
import type { DamageType, EnemyState, TowerKind } from '../types';
import { copyVec, emit, type World } from './world';

/** Tower damage against this enemy after the flying multiplier. */
export function damageAgainst(enemy: EnemyState, damage: number, airDamageMultiplier: number): number {
  return ENEMIES[enemy.kind].flying ? damage * airDamageMultiplier : damage;
}

/**
 * Applies `amount` to shield then HP, emits enemyHit, and kills the enemy (bounty, enemyKilled) the first time its HP
 * reaches 0. Hits on an enemy that is already dead do nothing.
 */
export function damageEnemy(world: World, enemy: EnemyState, amount: number, damageType: DamageType, source: TowerKind): void {
  if (enemy.hp <= 0) return;
  const physical = damageType === 'physical';
  let left = amount;
  let removed = 0;
  if (enemy.shield > 0) {
    const eff = physical ? SHIELD_PHYSICAL_EFFICIENCY : 1;
    const absorbed = Math.min(enemy.shield, left * eff);
    enemy.shield -= absorbed;
    left -= absorbed / eff;
    removed += absorbed;
  }
  if (left > 0) {
    const hpDamage = physical ? left * (1 - ENEMIES[enemy.kind].armor) : left;
    removed += Math.min(enemy.hp, hpDamage);
    enemy.hp -= hpDamage;
  }
  enemy.lastHitAt = world.view.time;
  emit(world, { type: 'enemyHit', id: enemy.id, amount: removed, damageType, source });
  if (enemy.hp <= 0) {
    const bounty = world.scaled[enemy.kind].bounty;
    world.view.gold += bounty;
    emit(world, { type: 'enemyKilled', id: enemy.id, kind: enemy.kind, pos: copyVec(enemy.pos), bounty });
  }
}

export function applySlow(enemy: EnemyState, slow: { factor: number; duration: number }): void {
  const f = 1 - (1 - slow.factor) * (1 - ENEMIES[enemy.kind].slowResist);
  enemy.slowFactor = Math.min(enemy.slowFactor, f);
  enemy.slowTimer = Math.max(enemy.slowTimer, slow.duration);
}
