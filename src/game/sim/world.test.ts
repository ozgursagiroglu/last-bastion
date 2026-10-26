import { describe, expect, it } from 'vitest';
import { DIFFICULTY, ENEMIES, LEVEL_HP_GROWTH } from '../config';
import { DIFFICULTIES, ENEMY_KINDS } from '../types';
import { makeLevel } from './testLevels';
import { createWorld, newId, scaleEnemies } from './world';

describe('createWorld', () => {
  it.each(DIFFICULTIES)('sets up %s with rounded gold and its lives', (difficulty) => {
    const { goldMul, lives } = DIFFICULTY[difficulty];
    const level = makeLevel({ startGold: 155, waves: [{ groups: [] }, { groups: [] }, { groups: [] }] });
    const { view } = createWorld(level, difficulty);
    expect(view).toMatchObject({
      level,
      difficulty,
      time: 0,
      status: 'ready',
      gold: Math.round(155 * goldMul),
      lives,
      maxLives: lives,
      waveIndex: -1,
      waveCount: 3,
      nextWaveIn: null,
      canCallWave: true,
      stars: 0,
    });
    expect(Number.isInteger(view.gold)).toBe(true);
    expect(view.enemies).toEqual([]);
    expect(view.towers).toEqual([]);
    expect(view.projectiles).toEqual([]);
  });

  it('hands out ids from one counter', () => {
    const world = createWorld(makeLevel(), 'normal');
    expect([newId(world), newId(world), newId(world)]).toEqual([1, 2, 3]);
  });
});

describe('scaleEnemies', () => {
  it.each([1, 5, 10])('scales HP and shield by difficulty and level id %i, then rounds', (levelId) => {
    for (const difficulty of DIFFICULTIES) {
      const scale = DIFFICULTY[difficulty].hpMul * (1 + LEVEL_HP_GROWTH * (levelId - 1));
      const scaled = scaleEnemies(levelId, difficulty);
      for (const kind of ENEMY_KINDS) {
        expect(scaled[kind].maxHp).toBe(Math.round(ENEMIES[kind].hp * scale));
        expect(scaled[kind].maxShield).toBe(Math.round(ENEMIES[kind].shield * scale));
      }
    }
  });

  it('grows HP with the level id', () => {
    const first = scaleEnemies(1, 'normal');
    const tenth = scaleEnemies(10, 'normal');
    for (const kind of ENEMY_KINDS) expect(tenth[kind].maxHp).toBeGreaterThan(first[kind].maxHp);
  });

  it('scales speed and rounds bounty per difficulty, independent of the level', () => {
    for (const difficulty of DIFFICULTIES) {
      const { speedMul, bountyMul } = DIFFICULTY[difficulty];
      for (const kind of ENEMY_KINDS) {
        for (const levelId of [1, 7]) {
          const scaled = scaleEnemies(levelId, difficulty)[kind];
          expect(scaled.speed).toBeCloseTo(ENEMIES[kind].speed * speedMul);
          expect(scaled.bounty).toBe(Math.round(ENEMIES[kind].bounty * bountyMul));
        }
      }
    }
  });
});
