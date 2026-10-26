import type { LevelDef } from '../types';

/** A long zigzag across the dunes: three steep descents and climbs to a gate on the right. Shield orcs arrive in wave 4. */
export const level04: LevelDef = {
  id: 4,
  name: 'Dune Road',
  theme: 'desert',
  paths: [
    [
      { x: -40, y: 200 },
      { x: 120, y: 200 },
      { x: 300, y: 560 },
      { x: 420, y: 560 },
      { x: 600, y: 200 },
      { x: 720, y: 200 },
      { x: 900, y: 560 },
      { x: 1020, y: 560 },
      { x: 1160, y: 300 },
    ],
  ],
  pads: [
    { x: 80, y: 340 },
    { x: 290, y: 340 },
    { x: 360, y: 460 },
    { x: 360, y: 650 },
    { x: 660, y: 110 },
    { x: 660, y: 300 },
    { x: 890, y: 340 },
    { x: 960, y: 460 },
    { x: 960, y: 650 },
    { x: 1180, y: 450 },
  ],
  startGold: 320,
  towers: ['rifle', 'cannon', 'frost', 'tesla'],
  waves: [
    { groups: [{ enemy: 'grunt', count: 8, interval: 1.3, delay: 0, path: 0 }] },
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.3, delay: 0, path: 0 },
        { enemy: 'runner', count: 6, interval: 0.8, delay: 8, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'runner', count: 3, interval: 0.8, delay: 0, path: 0 },
        { enemy: 'grunt', count: 5, interval: 1.2, delay: 4, path: 0 },
        { enemy: 'flyer', count: 3, interval: 1.4, delay: 11, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'shield', count: 2, interval: 2, delay: 10, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'runner', count: 6, interval: 0.8, delay: 0, path: 0 },
        { enemy: 'shield', count: 3, interval: 1.8, delay: 6, path: 0 },
        { enemy: 'grunt', count: 4, interval: 1.2, delay: 13, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'brute', count: 1, interval: 3, delay: 8, path: 0 },
        { enemy: 'flyer', count: 4, interval: 1.3, delay: 12, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 5, interval: 1.3, delay: 0, path: 0 },
        { enemy: 'shield', count: 3, interval: 1.8, delay: 7, path: 0 },
        { enemy: 'runner', count: 7, interval: 0.8, delay: 14, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.1, delay: 0, path: 0 },
        { enemy: 'brute', count: 2, interval: 3.5, delay: 6, path: 0 },
        { enemy: 'shield', count: 2, interval: 1.8, delay: 14, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 3, interval: 1.8, delay: 0, path: 0 },
        { enemy: 'brute', count: 2, interval: 3.5, delay: 5, path: 0 },
        { enemy: 'flyer', count: 6, interval: 1.2, delay: 12, path: 0 },
        { enemy: 'grunt', count: 2, interval: 1.1, delay: 20, path: 0 },
      ],
    },
  ],
  decorSeed: 4127,
};
