import type { LevelDef } from '../types';

/** One road from the west splits around the oasis and joins again before the gate; the Orc Warlord ends wave 10 alone. */
export const level05: LevelDef = {
  id: 5,
  name: 'Oasis Siege',
  theme: 'desert',
  paths: [
    [
      { x: -40, y: 370 },
      { x: 180, y: 370 },
      { x: 330, y: 220 },
      { x: 640, y: 190 },
      { x: 900, y: 240 },
      { x: 1010, y: 370 },
      { x: 1170, y: 370 },
    ],
    [
      { x: -40, y: 370 },
      { x: 180, y: 370 },
      { x: 330, y: 520 },
      { x: 640, y: 550 },
      { x: 900, y: 500 },
      { x: 1010, y: 370 },
      { x: 1170, y: 370 },
    ],
  ],
  pads: [
    { x: 180, y: 250 },
    { x: 300, y: 370 },
    { x: 480, y: 110 },
    { x: 480, y: 300 },
    { x: 480, y: 440 },
    { x: 480, y: 630 },
    { x: 760, y: 300 },
    { x: 760, y: 440 },
    { x: 800, y: 130 },
    { x: 800, y: 610 },
    { x: 900, y: 370 },
    { x: 1060, y: 270 },
  ],
  startGold: 450,
  towers: ['rifle', 'cannon', 'frost', 'tesla'],
  waves: [
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 9, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.3, delay: 0, path: 0 },
        { enemy: 'runner', count: 6, interval: 0.9, delay: 10, path: 1 },
        { enemy: 'grunt', count: 2, interval: 1.3, delay: 17, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.3, delay: 0, path: 1 },
        { enemy: 'shield', count: 2, interval: 2, delay: 9, path: 0 },
        { enemy: 'flyer', count: 3, interval: 1.5, delay: 15, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.3, delay: 0, path: 1 },
        { enemy: 'brute', count: 1, interval: 3, delay: 10, path: 0 },
        { enemy: 'flyer', count: 3, interval: 1.4, delay: 15, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'runner', count: 6, interval: 0.9, delay: 0, path: 0 },
        { enemy: 'grunt', count: 7, interval: 1.3, delay: 7, path: 1 },
        { enemy: 'shield', count: 2, interval: 2, delay: 17, path: 0 },
        { enemy: 'flyer', count: 3, interval: 1.4, delay: 21, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 9, interval: 1.3, delay: 0, path: 0 },
        { enemy: 'flyer', count: 6, interval: 1.4, delay: 12, path: 1 },
        { enemy: 'grunt', count: 6, interval: 1.3, delay: 21, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'runner', count: 8, interval: 0.9, delay: 0, path: 1 },
        { enemy: 'brute', count: 1, interval: 3.5, delay: 8, path: 0 },
        { enemy: 'grunt', count: 9, interval: 1.2, delay: 12, path: 0 },
        { enemy: 'shield', count: 2, interval: 1.8, delay: 23, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 3, interval: 1.8, delay: 0, path: 0 },
        { enemy: 'flyer', count: 9, interval: 1.3, delay: 7, path: 1 },
        { enemy: 'grunt', count: 9, interval: 1.2, delay: 19, path: 0 },
        { enemy: 'brute', count: 1, interval: 3, delay: 30, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'brute', count: 2, interval: 3.5, delay: 0, path: 0 },
        { enemy: 'flyer', count: 8, interval: 1.3, delay: 6, path: 1 },
        { enemy: 'shield', count: 3, interval: 1.8, delay: 16, path: 0 },
        { enemy: 'grunt', count: 10, interval: 1.2, delay: 23, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'runner', count: 4, interval: 0.8, delay: 0, path: 1 },
        { enemy: 'boss', count: 1, interval: 1, delay: 8, path: 0 },
      ],
    },
  ],
  decorSeed: 5209,
};
