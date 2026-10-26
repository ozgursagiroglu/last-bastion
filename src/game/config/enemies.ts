import type { EnemyDef, EnemyKind } from '../types';

export const ENEMIES: Readonly<Record<EnemyKind, EnemyDef>> = {
  grunt: { kind: 'grunt', name: 'Goblin', hp: 60, speed: 50, armor: 0, shield: 0, bounty: 6, livesCost: 1, flying: false, radius: 14, slowResist: 0 },
  runner: { kind: 'runner', name: 'Runner', hp: 40, speed: 95, armor: 0, shield: 0, bounty: 5, livesCost: 1, flying: false, radius: 12, slowResist: 0 },
  brute: { kind: 'brute', name: 'Troll', hp: 320, speed: 32, armor: 0.4, shield: 0, bounty: 18, livesCost: 2, flying: false, radius: 20, slowResist: 0 },
  flyer: { kind: 'flyer', name: 'Bat', hp: 70, speed: 70, armor: 0, shield: 0, bounty: 8, livesCost: 1, flying: true, radius: 14, slowResist: 0 },
  shield: { kind: 'shield', name: 'Shield Orc', hp: 140, speed: 45, armor: 0.2, shield: 80, bounty: 12, livesCost: 1, flying: false, radius: 16, slowResist: 0 },
  boss: { kind: 'boss', name: 'Orc Warlord', hp: 2000, speed: 28, armor: 0.3, shield: 0, bounty: 150, livesCost: 10, flying: false, radius: 30, slowResist: 0.5 },
};
