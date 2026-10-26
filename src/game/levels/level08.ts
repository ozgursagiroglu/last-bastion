import type { LevelDef } from '../types';

/** A tight serpentine of four runs down the glacier; pads sit in the narrow ice shelves between them. Boss in wave 12. */
export const level08: LevelDef = {
  id: 8,
  name: 'Glacier Gate',
  theme: 'snow',
  paths: [
    [
      { x: -40, y: 140 },
      { x: 960, y: 140 },
      { x: 1040, y: 175 },
      { x: 1040, y: 255 },
      { x: 960, y: 290 },
      { x: 300, y: 290 },
      { x: 220, y: 325 },
      { x: 220, y: 405 },
      { x: 300, y: 440 },
      { x: 960, y: 440 },
      { x: 1040, y: 475 },
      { x: 1040, y: 555 },
      { x: 960, y: 590 },
      { x: 340, y: 590 },
    ],
  ],
  pads: [
    { x: 380, y: 215 },
    { x: 620, y: 215 },
    { x: 860, y: 215 },
    { x: 1130, y: 215 },
    { x: 130, y: 365 },
    { x: 420, y: 365 },
    { x: 660, y: 365 },
    { x: 900, y: 365 },
    { x: 480, y: 515 },
    { x: 720, y: 515 },
    { x: 940, y: 515 },
    { x: 1130, y: 515 },
    { x: 560, y: 670 },
    { x: 800, y: 670 },
  ],
  startGold: 420,
  towers: ['rifle', 'cannon', 'frost', 'tesla', 'rocket'],
  waves: [
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'runner', count: 6, interval: 0.8, delay: 9, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'flyer', count: 5, interval: 1.3, delay: 7, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'brute', count: 1, interval: 3, delay: 7, path: 0 },
        { enemy: 'runner', count: 6, interval: 0.8, delay: 11, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 2, interval: 1.8, delay: 0, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 4, path: 0 },
        { enemy: 'flyer', count: 5, interval: 1.3, delay: 12, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.1, delay: 0, path: 0 },
        { enemy: 'brute', count: 1, interval: 3, delay: 6, path: 0 },
        { enemy: 'shield', count: 2, interval: 1.8, delay: 9, path: 0 },
        { enemy: 'runner', count: 6, interval: 0.8, delay: 14, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 3, interval: 1.8, delay: 0, path: 0 },
        { enemy: 'grunt', count: 7, interval: 1.1, delay: 5, path: 0 },
        { enemy: 'brute', count: 1, interval: 3, delay: 13, path: 0 },
        { enemy: 'runner', count: 6, interval: 0.8, delay: 16, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 6, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'brute', count: 2, interval: 3, delay: 6, path: 0 },
        { enemy: 'shield', count: 2, interval: 1.8, delay: 12, path: 0 },
        { enemy: 'grunt', count: 5, interval: 1.1, delay: 16, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'brute', count: 2, interval: 3, delay: 0, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1.1, delay: 3, path: 0 },
        { enemy: 'shield', count: 3, interval: 1.8, delay: 12, path: 0 },
        { enemy: 'flyer', count: 4, interval: 1.2, delay: 18, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 4, interval: 1.6, delay: 0, path: 0 },
        { enemy: 'brute', count: 2, interval: 3, delay: 5, path: 0 },
        { enemy: 'flyer', count: 6, interval: 1.2, delay: 10, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1.1, delay: 18, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'brute', count: 3, interval: 3, delay: 0, path: 0 },
        { enemy: 'shield', count: 4, interval: 1.6, delay: 4, path: 0 },
        { enemy: 'flyer', count: 6, interval: 1.2, delay: 11, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1, delay: 19, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 8, interval: 1.1, delay: 0, path: 0 },
        { enemy: 'brute', count: 3, interval: 3, delay: 4, path: 0 },
        { enemy: 'shield', count: 5, interval: 1.5, delay: 11, path: 0 },
        { enemy: 'grunt', count: 10, interval: 1, delay: 19, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 3, interval: 1.6, delay: 0, path: 0 },
        { enemy: 'grunt', count: 8, interval: 1.1, delay: 4, path: 0 },
        { enemy: 'boss', count: 1, interval: 1, delay: 14, path: 0 },
      ],
    },
  ],
  decorSeed: 8599,
};
