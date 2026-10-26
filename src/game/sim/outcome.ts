import { STAR_THRESHOLDS } from '../config';
import { allWavesSpawned } from './waves';
import { emit, type World } from './world';

export function starsFor(lives: number, maxLives: number): 1 | 2 | 3 {
  const ratio = lives / maxLives;
  if (ratio >= STAR_THRESHOLDS.three) return 3;
  if (ratio >= STAR_THRESHOLDS.two) return 2;
  return 1;
}

/** End check of a step: lost at 0 lives, won once every wave has spawned and no enemy is left. */
export function checkEnd(world: World): void {
  const { view } = world;
  if (view.status !== 'running') return;
  if (view.lives <= 0) {
    view.status = 'lost';
    view.nextWaveIn = null;
    emit(world, { type: 'levelLost' });
  } else if (allWavesSpawned(world) && view.enemies.length === 0) {
    const stars = starsFor(view.lives, view.maxLives);
    view.status = 'won';
    view.stars = stars;
    view.nextWaveIn = null;
    emit(world, { type: 'levelWon', stars });
  }
}
