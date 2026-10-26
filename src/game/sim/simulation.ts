import type { Command, CommandResult, CreateSimulation, GameEvent } from '../types';
import { FIXED_DT } from '../types';
import { stepTowers } from './combat';
import { build, sell, upgrade } from './economy';
import { removeDead } from './enemies';
import { moveEnemies, tickSlows } from './movement';
import { checkEnd } from './outcome';
import { stepProjectiles } from './projectiles';
import { callWave, stepWaves } from './waves';
import { asView, createWorld, type World } from './world';

function ended(world: World): boolean {
  return world.view.status === 'won' || world.view.status === 'lost';
}

function refreshCanCallWave(world: World): void {
  const { view } = world;
  view.canCallWave = view.status === 'ready' || (view.status === 'running' && view.nextWaveIn !== null);
}

function runCommand(world: World, cmd: Command): CommandResult {
  switch (cmd.type) {
    case 'build':
      return build(world, cmd.pad, cmd.kind);
    case 'upgrade':
      return upgrade(world, cmd.towerId);
    case 'sell':
      return sell(world, cmd.towerId);
    case 'callWave':
      return callWave(world);
  }
}

export const createSimulation: CreateSimulation = (level, difficulty) => {
  const world = createWorld(level, difficulty);
  return {
    view: asView(world.view),
    step(): GameEvent[] {
      if (ended(world)) return [];
      world.ticks++;
      world.view.time = world.ticks * FIXED_DT;
      stepWaves(world);
      moveEnemies(world);
      tickSlows(world);
      stepTowers(world);
      stepProjectiles(world);
      removeDead(world);
      checkEnd(world);
      refreshCanCallWave(world);
      const events = world.events;
      world.events = [];
      return events;
    },
    command(cmd: Command): CommandResult {
      if (ended(world)) return { ok: false, reason: 'gameOver' };
      const result = runCommand(world, cmd);
      refreshCanCallWave(world);
      return result;
    },
  };
};
