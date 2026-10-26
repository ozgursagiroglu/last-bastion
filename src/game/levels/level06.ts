import type { LevelDef } from '../types';

/** A long serpentine down the canyon: three full-width runs joined by two rounded turns. Rocket towers unlock. */
export const level06: LevelDef = {
  id: 6,
  name: 'Canyon Pass',
  theme: 'desert',
  paths: [
    [
      { x: -40, y: 180 },
      { x: 980, y: 180 },
      { x: 1100, y: 230 },
      { x: 1100, y: 330 },
      { x: 980, y: 380 },
      { x: 280, y: 380 },
      { x: 160, y: 430 },
      { x: 160, y: 530 },
      { x: 280, y: 580 },
      { x: 1000, y: 580 },
    ],
  ],
  pads: [
    { x: 320, y: 106 },
    { x: 760, y: 106 },
    { x: 200, y: 280 },
    { x: 440, y: 280 },
    { x: 680, y: 280 },
    { x: 920, y: 280 },
    { x: 1190, y: 280 },
    { x: 70, y: 480 },
    { x: 360, y: 480 },
    { x: 600, y: 480 },
    { x: 840, y: 480 },
    { x: 500, y: 670 },
  ],
  startGold: 380,
  towers: ['rifle', 'cannon', 'frost', 'tesla', 'rocket'],
  waves: [
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'runner', count: 7, interval: 0.7, delay: 6, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 5, interval: 1.3, delay: 0, path: 0 },
        { enemy: 'grunt', count: 6, interval: 1.2, delay: 4, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 4, interval: 1.8, delay: 0, path: 0 },
        { enemy: 'brute', count: 1, interval: 3, delay: 8, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 7, interval: 1.1, delay: 0, path: 0 },
        { enemy: 'flyer', count: 4, interval: 1.3, delay: 4, path: 0 },
        { enemy: 'shield', count: 2, interval: 1.8, delay: 9, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'runner', count: 8, interval: 0.7, delay: 0, path: 0 },
        { enemy: 'brute', count: 2, interval: 3.5, delay: 4, path: 0 },
        { enemy: 'flyer', count: 3, interval: 1.2, delay: 9, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'flyer', count: 9, interval: 1.2, delay: 0, path: 0 },
        { enemy: 'shield', count: 5, interval: 1.6, delay: 3, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'grunt', count: 6, interval: 1.0, delay: 0, path: 0 },
        { enemy: 'brute', count: 3, interval: 3, delay: 3, path: 0 },
        { enemy: 'runner', count: 5, interval: 0.7, delay: 10, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 4, interval: 1.6, delay: 0, path: 0 },
        { enemy: 'brute', count: 3, interval: 3, delay: 4, path: 0 },
        { enemy: 'flyer', count: 4, interval: 1.2, delay: 10, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'brute', count: 3, interval: 3, delay: 0, path: 0 },
        { enemy: 'shield', count: 5, interval: 1.6, delay: 2, path: 0 },
        { enemy: 'flyer', count: 6, interval: 1.2, delay: 9, path: 0 },
      ],
    },
    {
      groups: [
        { enemy: 'shield', count: 5, interval: 1.6, delay: 0, path: 0 },
        { enemy: 'brute', count: 4, interval: 3, delay: 3, path: 0 },
        { enemy: 'flyer', count: 6, interval: 1.1, delay: 8, path: 0 },
      ],
    },
  ],
  decorSeed: 6343,
};
