import type { LevelDef } from '../types';

/** Two roads cross once in the middle of the lava fields, each running to its own gate. Boss in wave 13. */
export const level09: LevelDef = {
  id: 9,
  name: 'Ember Fields',
  theme: 'volcano',
  paths: [
    [
      { x: -40, y: 180 },
      { x: 250, y: 180 },
      { x: 480, y: 300 },
      { x: 800, y: 480 },
      { x: 1000, y: 480 },
    ],
    [
      { x: 200, y: 760 },
      { x: 200, y: 610 },
      { x: 420, y: 520 },
      { x: 820, y: 280 },
      { x: 1120, y: 250 },
    ],
  ],
  pads: [
    { x: 130, y: 106 },
    { x: 150, y: 270 },
    { x: 380, y: 150 },
    { x: 640, y: 270 },
    { x: 760, y: 180 },
    { x: 980, y: 160 },
    { x: 450, y: 400 },
    { x: 820, y: 380 },
    { x: 960, y: 380 },
    { x: 300, y: 470 },
    { x: 640, y: 510 },
    { x: 110, y: 560 },
    { x: 330, y: 640 },
    { x: 900, y: 570 },
  ],
  startGold: 700,
  towers: ['rifle', 'cannon', 'frost', 'tesla', 'rocket'],
  waves: [
    {
      groups: [
        { enemy: 'grunt', count: 4, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'grunt', count: 4, interval: 1.4, delay: 9, path: 1 },
        { enemy: 'grunt', count: 3, interval: 1.4, delay: 18, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 0, path: 1 },
        { enemy: 'runner', count: 4, interval: 0.9, delay: 10, path: 0 },
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 17, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'flyer', count: 3, interval: 1.5, delay: 10, path: 1 },
        { enemy: 'grunt', count: 6, interval: 1.4, delay: 18, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.3, delay: 0, path: 1 },
        { enemy: 'grunt', count: 5, interval: 1.3, delay: 10, path: 0 },
        { enemy: 'flyer', count: 3, interval: 1.5, delay: 19, path: 1 },
        { enemy: 'runner', count: 4, interval: 0.9, delay: 25, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.3, delay: 0, path: 0 },
        { enemy: 'shield', count: 2, interval: 2, delay: 10, path: 1 },
        { enemy: 'flyer', count: 4, interval: 1.4, delay: 17, path: 0 },
        { enemy: 'grunt', count: 5, interval: 1.3, delay: 24, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.2, delay: 0, path: 1 },
        { enemy: 'flyer', count: 5, interval: 1.3, delay: 10, path: 0 },
        { enemy: 'shield', count: 2, interval: 1.8, delay: 18, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 24, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 6, interval: 1.3, delay: 0, path: 1 },
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 8, path: 0 },
        { enemy: 'brute', count: 1, interval: 3, delay: 18, path: 1 },
        { enemy: 'grunt', count: 5, interval: 1.2, delay: 22, path: 0 },
        { enemy: 'runner', count: 4, interval: 0.9, delay: 30, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 9, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'shield', count: 3, interval: 1.8, delay: 10, path: 1 },
        { enemy: 'flyer', count: 6, interval: 1.3, delay: 17, path: 0 },
        { enemy: 'grunt', count: 7, interval: 1.2, delay: 25, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'brute', count: 1, interval: 3, delay: 0, path: 0 },
        { enemy: 'grunt', count: 10, interval: 1.2, delay: 4, path: 1 },
        { enemy: 'shield', count: 3, interval: 1.8, delay: 16, path: 0 },
        { enemy: 'flyer', count: 6, interval: 1.3, delay: 22, path: 1 },
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 30, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 10, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'brute', count: 2, interval: 3, delay: 8, path: 1 },
        { enemy: 'flyer', count: 7, interval: 1.2, delay: 15, path: 0 },
        { enemy: 'shield', count: 4, interval: 1.8, delay: 24, path: 1 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 31, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 8, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'grunt', count: 12, interval: 1.2, delay: 6, path: 1 },
        { enemy: 'brute', count: 2, interval: 3, delay: 16, path: 0 },
        { enemy: 'shield', count: 4, interval: 1.8, delay: 22, path: 1 },
        { enemy: 'runner', count: 8, interval: 0.8, delay: 30, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 12, interval: 1.1, delay: 0, path: 0 },
        { enemy: 'brute', count: 2, interval: 3, delay: 6, path: 1 },
        { enemy: 'brute', count: 2, interval: 3, delay: 13, path: 0 },
        { enemy: 'shield', count: 5, interval: 1.6, delay: 20, path: 1 },
        { enemy: 'flyer', count: 8, interval: 1.2, delay: 28, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 3, interval: 1.6, delay: 0, path: 0 },
        { enemy: 'grunt', count: 13, interval: 1.1, delay: 4, path: 1 },
        { enemy: 'flyer', count: 6, interval: 1.2, delay: 16, path: 0 },
        { enemy: 'boss', count: 1, interval: 1, delay: 22, path: 1 },
      ],
    },
  ],
  decorSeed: 9613,
};
