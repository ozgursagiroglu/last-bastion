import { ENEMIES } from '../config';
import type { EnemyState } from '../types';
import { FIXED_DT } from '../types';
import { removeEnemies } from './enemies';
import { samplePath } from './path';
import { emit, EPSILON, pathOf, type World } from './world';

/** Advances every enemy along its path; enemies that reach the exit leave and cost lives. */
export function moveEnemies(world: World): void {
  const leaked: EnemyState[] = [];
  for (const enemy of world.view.enemies) {
    const path = pathOf(world, enemy.path);
    enemy.distance += world.scaled[enemy.kind].speed * enemy.slowFactor * FIXED_DT;
    if (enemy.distance >= path.length) leaked.push(enemy);
    else enemy.heading = samplePath(path, enemy.distance, enemy.pos);
  }
  if (leaked.length === 0) return;
  for (const enemy of leaked) {
    const livesCost = ENEMIES[enemy.kind].livesCost;
    world.view.lives = Math.max(0, world.view.lives - livesCost);
    emit(world, { type: 'enemyLeaked', id: enemy.id, kind: enemy.kind, livesLost: livesCost });
  }
  const gone = new Set(leaked);
  removeEnemies(world, (enemy) => gone.has(enemy));
}

export function tickSlows(world: World): void {
  for (const enemy of world.view.enemies) {
    if (enemy.slowTimer <= 0) continue;
    enemy.slowTimer -= FIXED_DT;
    if (enemy.slowTimer <= EPSILON) {
      enemy.slowTimer = 0;
      enemy.slowFactor = 1;
    }
  }
}
