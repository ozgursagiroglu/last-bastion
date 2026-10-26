import type { LevelDef } from '../types';

/** Two roads round the frozen lake: one from the west to a gate in the east, one from the east to a gate in the west. */
export const level07: LevelDef = {
  id: 7,
  name: 'Frozen Lake',
  theme: 'snow',
  paths: [
    [
      { x: -40, y: 190 },
      { x: 260, y: 190 },
      { x: 420, y: 290 },
      { x: 720, y: 290 },
      { x: 880, y: 190 },
      { x: 1150, y: 190 },
    ],
    [
      { x: 1320, y: 460 },
      { x: 1060, y: 460 },
      { x: 900, y: 560 },
      { x: 560, y: 560 },
      { x: 400, y: 460 },
      { x: 130, y: 460 },
    ],
  ],
  pads: [
    { x: 120, y: 106 },
    { x: 560, y: 200 },
    { x: 1000, y: 106 },
    { x: 300, y: 330 },
    { x: 480, y: 380 },
    { x: 660, y: 380 },
    { x: 1000, y: 370 },
    { x: 1180, y: 370 },
    { x: 640, y: 470 },
    { x: 840, y: 460 },
    { x: 300, y: 550 },
    { x: 730, y: 650 },
    { x: 1000, y: 640 },
  ],
  startGold: 600,
  towers: ['rifle', 'cannon', 'frost', 'tesla', 'rocket'],
  waves: [
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 9, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'runner', count: 3, interval: 0.9, delay: 10, path: 1 },
        { enemy: 'grunt', count: 3, interval: 1.4, delay: 18, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 3, interval: 1.5, delay: 0, path: 1 },
        { enemy: 'grunt', count: 8, interval: 1.4, delay: 8, path: 0 },
        { enemy: 'runner', count: 1, interval: 0.9, delay: 22, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.4, delay: 0, path: 1 },
        { enemy: 'grunt', count: 6, interval: 1.4, delay: 12, path: 0 },
        { enemy: 'runner', count: 3, interval: 0.9, delay: 24, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'shield', count: 1, interval: 1.8, delay: 11, path: 0 },
        { enemy: 'runner', count: 4, interval: 0.9, delay: 14, path: 1 },
        { enemy: 'grunt', count: 4, interval: 1.4, delay: 22, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.2, delay: 0, path: 1 },
        { enemy: 'shield', count: 1, interval: 1.8, delay: 9, path: 0 },
        { enemy: 'flyer', count: 4, interval: 1.4, delay: 12, path: 0 },
        { enemy: 'runner', count: 6, interval: 0.9, delay: 19, path: 1 },
        { enemy: 'grunt', count: 3, interval: 1.3, delay: 20, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 5, interval: 1.3, delay: 0, path: 1 },
        { enemy: 'brute', count: 1, interval: 3.5, delay: 7, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 11, path: 1 },
        { enemy: 'shield', count: 1, interval: 1.8, delay: 22, path: 0 },
        { enemy: 'grunt', count: 4, interval: 1.3, delay: 24, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 4, path: 1 },
        { enemy: 'shield', count: 2, interval: 1.8, delay: 11, path: 0 },
        { enemy: 'flyer', count: 5, interval: 1.3, delay: 16, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 9, interval: 1.2, delay: 0, path: 1 },
        { enemy: 'brute', count: 1, interval: 3, delay: 6, path: 0 },
        { enemy: 'shield', count: 2, interval: 1.8, delay: 14, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 20, path: 0 },
        { enemy: 'flyer', count: 5, interval: 1.3, delay: 21, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'brute', count: 1, interval: 3, delay: 0, path: 0 },
        { enemy: 'grunt', count: 10, interval: 1.2, delay: 3, path: 1 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 8, path: 0 },
        { enemy: 'shield', count: 3, interval: 1.8, delay: 17, path: 0 },
        { enemy: 'flyer', count: 6, interval: 1.2, delay: 25, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 7, interval: 1.2, delay: 0, path: 1 },
        { enemy: 'brute', count: 2, interval: 3, delay: 6, path: 0 },
        { enemy: 'grunt', count: 10, interval: 1.1, delay: 12, path: 1 },
        { enemy: 'shield', count: 3, interval: 1.6, delay: 20, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.1, delay: 24, path: 0 },
      ],
    },
  ],
  decorSeed: 7451,
};
