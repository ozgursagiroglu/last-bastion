/** Real simulations driven to the states the HUD tests and gallery need. Node only (tests and galleries). */
import type { Canvas } from '@napi-rs/canvas';
import { greedyCommand, roadSamples } from '../../game/sim/bot';
import { createSimulation } from '../../game/sim';
import { FIXED_DT, type Difficulty, type GameEvent, type LevelDef, type Simulation, type WorldView } from '../../game/types';
import { context2d, createNodeCanvas } from '../../platform/nodeCanvas';
import type { CanvasLike } from '../../render/stage';

/** A CanvasLike over a Node canvas (the Stage resizes it through width/height). */
export function nodeCanvasLike(width: number, height: number): CanvasLike & { node: Canvas } {
  const node = createNodeCanvas(width, height);
  return {
    node,
    get width() {
      return node.width;
    },
    set width(v: number) {
      node.width = v;
    },
    get height() {
      return node.height;
    },
    set height(v: number) {
      node.height = v;
    },
    getContext: () => context2d(node),
  };
}

/** Step until `done(view)` or `maxSeconds` of simulated time; returns every event on the way. */
export function stepUntil(sim: Simulation, done: (view: WorldView) => boolean, maxSeconds = 3600): GameEvent[] {
  const events: GameEvent[] = [];
  const steps = Math.round(maxSeconds / FIXED_DT);
  for (let i = 0; i < steps && !done(sim.view); i++) events.push(...sim.step());
  return events;
}

const ended = (view: WorldView) => view.status === 'won' || view.status === 'lost';

/** Play to the end: 'greedy' builds and upgrades like the sim's bot, 'none' only calls the first wave. */
export function playOut(level: LevelDef, difficulty: Difficulty, strategy: 'greedy' | 'none'): { sim: Simulation; events: GameEvent[] } {
  const sim = createSimulation(level, difficulty);
  const samples = roadSamples(level);
  let builds = 0;
  const think = () => {
    const cmd = greedyCommand(sim.view, samples, builds);
    if (cmd && sim.command(cmd).ok && cmd.type === 'build') builds++;
  };
  if (strategy === 'greedy') think();
  sim.command({ type: 'callWave' });
  const events: GameEvent[] = [];
  const thinkSteps = Math.round(1 / FIXED_DT);
  for (let step = 1; step < Math.round(3600 / FIXED_DT) && !ended(sim.view); step++) {
    events.push(...sim.step());
    if (strategy === 'greedy' && step % thinkSteps === 0 && sim.view.status === 'running') think();
  }
  return { sim, events };
}
