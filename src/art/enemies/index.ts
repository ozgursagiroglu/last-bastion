/** The six enemy sprites (EnemySprite contract in src/art/types.ts) and their wave-preview icons. */
import type { EnemyKind } from '../../game/types';
import type { SpriteInstance } from '../exode';
import type { EnemySprite } from '../types';
import { BOSS } from './boss';
import { BRUTE } from './brute';
import { FLYER } from './flyer';
import { GRUNT } from './grunt';
import { buildEnemy, buildIcon, type EnemyDesign } from './kit';
import { RUNNER } from './runner';
import { SHIELD } from './shield';

export const ENEMY_DESIGNS: Readonly<Record<EnemyKind, EnemyDesign>> = {
  grunt: GRUNT,
  runner: RUNNER,
  brute: BRUTE,
  flyer: FLYER,
  shield: SHIELD,
  boss: BOSS,
};

export function buildEnemySprite(kind: EnemyKind, idPrefix: string): EnemySprite {
  return buildEnemy(ENEMY_DESIGNS[kind], idPrefix);
}

/** Static look that fits a 40×40 box centered on its root (wave previews). No clips needed. */
export function buildEnemyIcon(kind: EnemyKind, idPrefix: string): SpriteInstance {
  return buildIcon(ENEMY_DESIGNS[kind], idPrefix);
}
