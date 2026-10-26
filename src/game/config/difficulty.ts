import type { Difficulty, DifficultyDef } from '../types';

export const DIFFICULTY: Readonly<Record<Difficulty, DifficultyDef>> = {
  easy: { id: 'easy', name: 'Easy', hpMul: 0.8, speedMul: 0.9, goldMul: 1.2, bountyMul: 1.1, lives: 25 },
  normal: { id: 'normal', name: 'Normal', hpMul: 1, speedMul: 1, goldMul: 1, bountyMul: 1, lives: 20 },
  hard: { id: 'hard', name: 'Hard', hpMul: 1.3, speedMul: 1.1, goldMul: 0.9, bountyMul: 0.9, lives: 10 },
};
