import { earlyCallBonus, WAVE_GAP } from '../config';
import type { CommandResult } from '../types';
import { FIXED_DT, MAX_ALIVE_PER_KIND } from '../types';
import { spawnEnemy } from './enemies';
import { emit, EPSILON, type World } from './world';

const GAP_STEPS = Math.round(WAVE_GAP / FIXED_DT);

function startWave(world: World, early: boolean, bonus: number, inStep: boolean): void {
  const { view, waves } = world;
  view.waveIndex++;
  view.status = 'running';
  view.gold += bonus;
  const def = view.level.waves[view.waveIndex];
  waves.groups = (def?.groups ?? []).map((group) => ({ group, spawned: 0, ticks: 0 }));
  waves.skipTick = inStep;
  setCountdown(world, null);
  emit(world, { type: 'waveStarted', wave: view.waveIndex, early, bonus });
}

function setCountdown(world: World, steps: number | null): void {
  world.waves.countdown = steps;
  world.view.nextWaveIn = steps === null ? null : steps * FIXED_DT;
}

/** The callWave command: first wave in 'ready', early call during the countdown. */
export function callWave(world: World): CommandResult {
  const { view, waves } = world;
  if (view.status === 'ready') {
    startWave(world, false, 0, false);
    return { ok: true };
  }
  if (view.status === 'running' && waves.countdown !== null && view.nextWaveIn !== null) {
    startWave(world, true, earlyCallBonus(view.nextWaveIn), false);
    return { ok: true };
  }
  return { ok: false, reason: 'cannotCallWave' };
}

export function currentWaveSpawned(world: World): boolean {
  return world.waves.groups.length === 0;
}

export function allWavesSpawned(world: World): boolean {
  return world.view.waveIndex >= world.view.waveCount - 1 && currentWaveSpawned(world);
}

/** Wave phase of a step: countdown and auto-start, then spawns. */
export function stepWaves(world: World): void {
  const { view, waves } = world;
  if (view.status !== 'running') return;
  if (waves.countdown !== null) {
    setCountdown(world, waves.countdown - 1);
    if (waves.countdown <= 0) startWave(world, false, 0, true);
  }
  for (const runtime of waves.groups) {
    const { group } = runtime;
    if (!waves.skipTick && world.aliveByKind[group.enemy] < MAX_ALIVE_PER_KIND) runtime.ticks++;
    const clock = runtime.ticks * FIXED_DT + EPSILON;
    while (
      runtime.spawned < group.count &&
      world.aliveByKind[group.enemy] < MAX_ALIVE_PER_KIND &&
      group.delay + runtime.spawned * group.interval <= clock
    ) {
      spawnEnemy(world, group.enemy, group.path);
      runtime.spawned++;
    }
  }
  waves.skipTick = false;
  waves.groups = waves.groups.filter((runtime) => runtime.spawned < runtime.group.count);
  if (currentWaveSpawned(world) && waves.countdown === null && view.waveIndex < view.waveCount - 1) {
    setCountdown(world, GAP_STEPS);
  }
}
