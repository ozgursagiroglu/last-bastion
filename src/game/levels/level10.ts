import type { LevelDef } from '../types';

/**
 * Three roads converge on the last bastion: the two western roads merge mid-map, the southern road joins them just
 * after, and one road climbs to the gate. Two Orc Warlords lead the final wave.
 */
export const level10: LevelDef = {
  id: 10,
  name: 'The Last Bastion',
  theme: 'volcano',
  paths: [
    [
      { x: -40, y: 190 },
      { x: 250, y: 190 },
      { x: 430, y: 290 },
      { x: 560, y: 400 },
      { x: 780, y: 400 },
      { x: 900, y: 290 },
      { x: 1120, y: 290 },
    ],
    [
      { x: -40, y: 590 },
      { x: 250, y: 590 },
      { x: 430, y: 510 },
      { x: 560, y: 400 },
      { x: 780, y: 400 },
      { x: 900, y: 290 },
      { x: 1120, y: 290 },
    ],
    [
      { x: 840, y: 760 },
      { x: 840, y: 560 },
      { x: 780, y: 400 },
      { x: 900, y: 290 },
      { x: 1120, y: 290 },
    ],
  ],
  pads: [
    { x: 130, y: 105 },
    { x: 380, y: 170 },
    { x: 140, y: 285 },
    { x: 300, y: 320 },
    { x: 140, y: 495 },
    { x: 300, y: 470 },
    { x: 430, y: 400 },
    { x: 380, y: 630 },
    { x: 640, y: 310 },
    { x: 650, y: 490 },
    { x: 780, y: 280 },
    { x: 740, y: 620 },
    { x: 940, y: 560 },
    { x: 900, y: 420 },
    { x: 980, y: 190 },
    { x: 1040, y: 390 },
  ],
  startGold: 700,
  towers: ['rifle', 'cannon', 'frost', 'tesla', 'rocket'],
  waves: [
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'grunt', count: 4, interval: 1.4, delay: 10, path: 1 },
        { enemy: 'grunt', count: 4, interval: 1.4, delay: 20, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 0, path: 1 },
        { enemy: 'grunt', count: 5, interval: 1.4, delay: 10, path: 0 },
        { enemy: 'flyer', count: 2, interval: 1.5, delay: 18, path: 0 },
        { enemy: 'grunt', count: 3, interval: 1.4, delay: 22, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.4, delay: 0, path: 0 },
        { enemy: 'flyer', count: 3, interval: 1.5, delay: 9, path: 1 },
        { enemy: 'grunt', count: 6, interval: 1.4, delay: 15, path: 1 },
        { enemy: 'grunt', count: 3, interval: 1.4, delay: 24, path: 2 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.3, delay: 0, path: 0 },
        { enemy: 'runner', count: 4, interval: 0.9, delay: 10, path: 2 },
        { enemy: 'grunt', count: 7, interval: 1.3, delay: 16, path: 1 },
        { enemy: 'grunt', count: 3, interval: 1.3, delay: 16, path: 2 },
        { enemy: 'flyer', count: 2, interval: 1.5, delay: 26, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 5, interval: 1.4, delay: 0, path: 1 },
        { enemy: 'grunt', count: 7, interval: 1.3, delay: 9, path: 0 },
        { enemy: 'grunt', count: 4, interval: 1.3, delay: 12, path: 1 },
        { enemy: 'shield', count: 1, interval: 2, delay: 19, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.3, delay: 22, path: 2 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'grunt', count: 5, interval: 1.2, delay: 5, path: 2 },
        { enemy: 'brute', count: 1, interval: 3, delay: 9, path: 1 },
        { enemy: 'flyer', count: 5, interval: 1.3, delay: 14, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 22, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 2, interval: 1.8, delay: 0, path: 1 },
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 5, path: 0 },
        { enemy: 'grunt', count: 5, interval: 1.2, delay: 5, path: 2 },
        { enemy: 'flyer', count: 3, interval: 1.3, delay: 15, path: 1 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 20, path: 2 },
        { enemy: 'flyer', count: 3, interval: 1.3, delay: 27, path: 0 },
        { enemy: 'runner', count: 4, interval: 0.8, delay: 32, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'brute', count: 1, interval: 3, delay: 0, path: 1 },
        { enemy: 'grunt', count: 9, interval: 1.2, delay: 4, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 4, path: 2 },
        { enemy: 'brute', count: 1, interval: 3, delay: 14, path: 1 },
        { enemy: 'flyer', count: 6, interval: 1.3, delay: 18, path: 2 },
        { enemy: 'grunt', count: 7, interval: 1.2, delay: 26, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 0, path: 2 },
        { enemy: 'shield', count: 3, interval: 1.8, delay: 8, path: 1 },
        { enemy: 'grunt', count: 5, interval: 1.2, delay: 15, path: 1 },
        { enemy: 'flyer', count: 7, interval: 1.2, delay: 15, path: 2 },
        { enemy: 'brute', count: 2, interval: 3, delay: 22, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 28, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 8, interval: 1.2, delay: 0, path: 1 },
        { enemy: 'grunt', count: 10, interval: 1.2, delay: 6, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 10, path: 1 },
        { enemy: 'brute', count: 2, interval: 3, delay: 14, path: 2 },
        { enemy: 'shield', count: 4, interval: 1.8, delay: 20, path: 1 },
        { enemy: 'grunt', count: 5, interval: 1.2, delay: 22, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 27, path: 2 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 12, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'brute', count: 2, interval: 3, delay: 6, path: 1 },
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 12, path: 1 },
        { enemy: 'shield', count: 4, interval: 1.8, delay: 12, path: 2 },
        { enemy: 'flyer', count: 8, interval: 1.2, delay: 19, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1.2, delay: 20, path: 2 },
        { enemy: 'grunt', count: 10, interval: 1.2, delay: 26, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 12, interval: 1.1, delay: 0, path: 2 },
        { enemy: 'brute', count: 2, interval: 3, delay: 4, path: 0 },
        { enemy: 'grunt', count: 10, interval: 1, delay: 8, path: 0 },
        { enemy: 'brute', count: 2, interval: 3, delay: 8, path: 1 },
        { enemy: 'shield', count: 5, interval: 1.6, delay: 15, path: 2 },
        { enemy: 'flyer', count: 10, interval: 1.2, delay: 22, path: 0 },
        { enemy: 'grunt', count: 12, interval: 1.1, delay: 24, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'runner', count: 8, interval: 0.8, delay: 0, path: 0 },
        { enemy: 'grunt', count: 10, interval: 1, delay: 0, path: 2 },
        { enemy: 'grunt', count: 14, interval: 1.1, delay: 4, path: 1 },
        { enemy: 'grunt', count: 8, interval: 1.1, delay: 8, path: 0 },
        { enemy: 'brute', count: 3, interval: 3, delay: 10, path: 2 },
        { enemy: 'shield', count: 5, interval: 1.6, delay: 18, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.1, delay: 26, path: 0 },
        { enemy: 'flyer', count: 10, interval: 1.2, delay: 26, path: 1 },
        { enemy: 'grunt', count: 10, interval: 1.1, delay: 30, path: 2 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 16, interval: 1, delay: 0, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1, delay: 0, path: 2 },
        { enemy: 'brute', count: 3, interval: 3, delay: 5, path: 1 },
        { enemy: 'grunt', count: 10, interval: 1, delay: 12, path: 1 },
        { enemy: 'brute', count: 2, interval: 3, delay: 12, path: 2 },
        { enemy: 'shield', count: 6, interval: 1.5, delay: 18, path: 0 },
        { enemy: 'flyer', count: 12, interval: 1.1, delay: 25, path: 2 },
        { enemy: 'grunt', count: 12, interval: 1, delay: 30, path: 1 },
      ],
    },
    {
      groups: [
        { enemy: 'boss', count: 1, interval: 1, delay: 0, path: 0 },
        { enemy: 'grunt', count: 12, interval: 1, delay: 4, path: 1 },
        { enemy: 'grunt', count: 12, interval: 1, delay: 4, path: 2 },
        { enemy: 'boss', count: 1, interval: 1, delay: 26, path: 0 },
      ],
    },
  ],
  decorSeed: 10753,
};
