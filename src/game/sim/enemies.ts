import { ENEMIES } from '../config';
import type { EnemyKind, EnemyState } from '../types';
import { samplePath } from './path';
import { emit, newId, pathOf, type World } from './world';

export interface HitFilter {
  hitsAir: boolean;
  hitsGround: boolean;
}

/** Alive and reachable by an attack with this air/ground filter. */
export function canHit(filter: HitFilter, enemy: EnemyState): boolean {
  if (enemy.hp <= 0) return false;
  return ENEMIES[enemy.kind].flying ? filter.hitsAir : filter.hitsGround;
}

export function spawnEnemy(world: World, kind: EnemyKind, path: number): EnemyState {
  const stats = world.scaled[kind];
  const pos = { x: 0, y: 0 };
  const heading = samplePath(pathOf(world, path), 0, pos);
  const enemy: EnemyState = {
    id: newId(world),
    kind,
    path,
    distance: 0,
    pos,
    heading,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    shield: stats.maxShield,
    maxShield: stats.maxShield,
    slowFactor: 1,
    slowTimer: 0,
    lastHitAt: -Infinity,
  };
  world.view.enemies.push(enemy);
  world.enemyById.set(enemy.id, enemy);
  world.aliveByKind[kind]++;
  emit(world, { type: 'enemySpawned', id: enemy.id, kind });
  return enemy;
}

/** Removes every enemy matching `gone` from the world, keeping the order of the others. */
export function removeEnemies(world: World, gone: (enemy: EnemyState) => boolean): void {
  const list = world.view.enemies;
  let kept = 0;
  for (const enemy of list) {
    if (gone(enemy)) {
      world.enemyById.delete(enemy.id);
      world.aliveByKind[enemy.kind]--;
    } else {
      list[kept++] = enemy;
    }
  }
  list.length = kept;
}

export function removeDead(world: World): void {
  removeEnemies(world, (enemy) => enemy.hp <= 0);
}
