import { describe, expect, it } from 'vitest';
import type { CreateSimulation } from '../types';
import { buildPath, createSimulation, pathLength, playLevel, pointAtDistance } from './index';
import { makeLevel } from './testLevels';

describe('sim public API', () => {
  it('exports the simulation, the bot and the path helpers', () => {
    const create: CreateSimulation = createSimulation;
    expect(create(makeLevel(), 'easy').view.status).toBe('ready');
    expect(playLevel(makeLevel(), 'easy', { strategy: 'greedy' }).status).toBe('won');
    const points = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ];
    expect(pathLength(points)).toBe(5);
    expect(pointAtDistance(buildPath(points), 5).pos).toEqual({ x: 3, y: 4 });
  });
});
