import { describe, expect, it } from 'vitest';
import { getLevel } from '../../game/levels';
import { createSimulation } from '../../game/sim';
import { nodeCanvasLike, playOut, stepUntil } from './scenarios';

describe('scenarios', () => {
  it('wraps a Node canvas whose size follows width/height', () => {
    const canvas = nodeCanvasLike(10, 10);
    canvas.width = 30;
    expect(canvas.node.width).toBe(30);
    expect(canvas.getContext('2d')).not.toBeNull();
  });

  it('steps until a condition and collects the events', () => {
    const sim = createSimulation(getLevel(1), 'normal');
    sim.command({ type: 'callWave' });
    const events = stepUntil(sim, (v) => v.enemies.length > 0);
    expect(sim.view.enemies.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'enemySpawned')).toBe(true);
  });

  it('plays a level out to a win with the greedy bot and to a loss without towers', () => {
    expect(playOut(getLevel(1), 'easy', 'greedy').sim.view.status).toBe('won');
    expect(playOut(getLevel(1), 'hard', 'none').sim.view.status).toBe('lost');
  });
});
