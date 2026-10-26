import type { LevelDef } from '../types';

/** Two roads, from the west and from the south, merge mid-map and run on to one gate. Flyers arrive in wave 3. */
export const level03: LevelDef = {
  id: 3,
  name: 'Twin Woods',
  theme: 'meadow',
  paths: [
    [
      { x: -40, y: 190 },
      { x: 230, y: 190 },
      { x: 420, y: 260 },
      { x: 580, y: 400 },
      { x: 780, y: 400 },
      { x: 900, y: 300 },
      { x: 1040, y: 260 },
      { x: 1170, y: 330 },
    ],
    [
      { x: 280, y: 760 },
      { x: 280, y: 600 },
      { x: 400, y: 480 },
      { x: 580, y: 400 },
      { x: 780, y: 400 },
      { x: 900, y: 300 },
      { x: 1040, y: 260 },
      { x: 1170, y: 330 },
    ],
  ],
  pads: [
    { x: 180, y: 105 },
    { x: 130, y: 280 },
    { x: 560, y: 250 },
    { x: 420, y: 370 },
    { x: 190, y: 520 },
    { x: 420, y: 580 },
    { x: 680, y: 490 },
    { x: 760, y: 310 },
    { x: 960, y: 390 },
    { x: 1020, y: 170 },
  ],
  startGold: 300,
  towers: ['rifle', 'cannon', 'frost'],
  waves: [
    {
      groups: [
        { enemy: 'grunt', count: 3, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'grunt', count: 3, interval: 1.4, delay: 7, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 4, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'grunt', count: 3, interval: 1.4, delay: 9, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 4, interval: 1.4, delay: 0, path: 1 },
        { enemy: 'flyer', count: 2, interval: 1.5, delay: 8, path: 0 },
        { enemy: 'grunt', count: 2, interval: 1.4, delay: 14, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 4, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'flyer', count: 3, interval: 1.5, delay: 8, path: 1 },
        { enemy: 'grunt', count: 2, interval: 1.4, delay: 15, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 4, interval: 1.4, delay: 0, path: 1 },
        { enemy: 'flyer', count: 2, interval: 1.5, delay: 8, path: 0 },
        { enemy: 'runner', count: 3, interval: 0.9, delay: 14, path: 0 },
        { enemy: 'grunt', count: 3, interval: 1.4, delay: 18, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.3, delay: 0, path: 0 },
        { enemy: 'runner', count: 4, interval: 0.9, delay: 11, path: 1 },
        { enemy: 'flyer', count: 3, interval: 1.4, delay: 17, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.3, delay: 0, path: 0 },
        { enemy: 'brute', count: 1, interval: 3, delay: 9, path: 1 },
        { enemy: 'flyer', count: 3, interval: 1.4, delay: 14, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 4, interval: 1.4, delay: 0, path: 1 },
        { enemy: 'brute', count: 1, interval: 3, delay: 7, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1.3, delay: 12, path: 1 },
      ],
    },
  ],
  decorSeed: 3571,
};
