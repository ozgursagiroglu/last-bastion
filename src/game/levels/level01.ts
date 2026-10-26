import type { LevelDef } from '../types';

/** Gentle S-curve from the left edge to a gate on the right; grunts only until runners join in wave 4. */
export const level01: LevelDef = {
  id: 1,
  name: 'Green Meadow',
  theme: 'meadow',
  paths: [
    [
      { x: -40, y: 220 },
      { x: 240, y: 220 },
      { x: 360, y: 300 },
      { x: 420, y: 440 },
      { x: 540, y: 520 },
      { x: 760, y: 520 },
      { x: 880, y: 440 },
      { x: 940, y: 300 },
      { x: 1040, y: 240 },
      { x: 1170, y: 240 },
    ],
  ],
  pads: [
    { x: 160, y: 300 },
    { x: 420, y: 220 },
    { x: 300, y: 400 },
    { x: 540, y: 420 },
    { x: 650, y: 610 },
    { x: 760, y: 420 },
    { x: 1000, y: 380 },
    { x: 1080, y: 150 },
  ],
  startGold: 250,
  towers: ['rifle', 'cannon'],
  waves: [
    { groups: [{ enemy: 'grunt', count: 6, interval: 1.4, delay: 0, path: 0 }] },
    { groups: [{ enemy: 'grunt', count: 7, interval: 1.2, delay: 0, path: 0 }] },
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'grunt', count: 3, interval: 1.0, delay: 9, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'runner', count: 5, interval: 0.9, delay: 10, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'runner', count: 6, interval: 0.8, delay: 0, path: 0 },
        { enemy: 'grunt', count: 7, interval: 1.2, delay: 6, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 8, interval: 1.1, delay: 0, path: 0 },
        { enemy: 'runner', count: 7, interval: 0.7, delay: 5, path: 0 },
      ],
    },
  ],
  decorSeed: 1847,
};
