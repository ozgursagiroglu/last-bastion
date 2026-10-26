import type { LevelDef } from '../types';

/** A wide U-bend: east along the top, round the bend, back west to a gate on the left. Brutes arrive in wave 5. */
export const level02: LevelDef = {
  id: 2,
  name: 'River Bend',
  theme: 'meadow',
  paths: [
    [
      { x: -40, y: 200 },
      { x: 800, y: 200 },
      { x: 950, y: 250 },
      { x: 1030, y: 370 },
      { x: 990, y: 490 },
      { x: 860, y: 560 },
      { x: 520, y: 560 },
      { x: 330, y: 500 },
      { x: 170, y: 500 },
    ],
  ],
  pads: [
    { x: 300, y: 110 },
    { x: 620, y: 110 },
    { x: 420, y: 290 },
    { x: 720, y: 290 },
    { x: 1110, y: 330 },
    { x: 920, y: 380 },
    { x: 620, y: 470 },
    { x: 700, y: 650 },
    { x: 380, y: 410 },
  ],
  startGold: 270,
  towers: ['rifle', 'cannon', 'frost'],
  waves: [
    { groups: [{ enemy: 'grunt', count: 7, interval: 1.3, delay: 0, path: 0 }] },
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'runner', count: 5, interval: 0.8, delay: 7, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'runner', count: 5, interval: 0.8, delay: 0, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 5, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.1, delay: 0, path: 0 },
        { enemy: 'runner', count: 6, interval: 0.7, delay: 4, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'brute', count: 1, interval: 3, delay: 8, path: 0 },
        { enemy: 'runner', count: 3, interval: 0.8, delay: 12, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'runner', count: 5, interval: 0.7, delay: 0, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 4, path: 0 },
        { enemy: 'brute', count: 1, interval: 3, delay: 10, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'brute', count: 2, interval: 4, delay: 0, path: 0 },
        { enemy: 'grunt', count: 4, interval: 1.2, delay: 3, path: 0 },
        { enemy: 'runner', count: 4, interval: 0.7, delay: 9, path: 0 },
      ],
    },
  ],
  decorSeed: 2903,
};
