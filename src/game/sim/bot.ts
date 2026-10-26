import { TOWERS } from '../config';
import type { Command, Difficulty, LevelDef, TowerKind, Vec2, WorldView } from '../types';
import { FIXED_DT, TOWER_KINDS } from '../types';
import { towerStats } from './combat';
import { upgradeCost } from './economy';
import { buildPath, pointAtDistance } from './path';
import { createSimulation } from './simulation';
import { distanceSq } from './world';

export interface BotOptions {
  /** 'greedy' builds and upgrades as described below; 'none' never builds. */
  strategy: 'greedy' | 'none';
  /** Seconds of simulated time between two bot decisions. Default 1. */
  thinkInterval?: number;
}

export interface PlayResult {
  status: 'won' | 'lost';
  stars: 0 | 1 | 2 | 3;
  livesLeft: number;
  maxLives: number;
  /** Waves whose enemies were all spawned before the end. */
  wavesSpawned: number;
  /** Simulated seconds. */
  time: number;
  goldSpent: number;
}

export const BOT_TIME_LIMIT = 3600;
const SAMPLE_SPACING = 8;

/** Points every SAMPLE_SPACING px along every path. */
export function roadSamples(level: LevelDef): Vec2[] {
  const samples: Vec2[] = [];
  for (const points of level.paths) {
    const path = buildPath(points);
    for (let d = 0; d <= path.length; d += SAMPLE_SPACING) samples.push(pointAtDistance(path, d).pos);
  }
  return samples;
}

export function coverage(samples: readonly Vec2[], center: Vec2, range: number): number {
  const r2 = range * range;
  let count = 0;
  for (const s of samples) if (distanceSq(s, center) <= r2) count++;
  return count;
}

/** Kind of the n-th build (0-based): two openers (rifle, else cannon), then the allowed kinds in turn. */
export function buildOrderKind(level: LevelDef, n: number): TowerKind | undefined {
  const order = TOWER_KINDS.filter((kind) => level.towers.includes(kind));
  const opener = order.includes('rifle') ? 'rifle' : order.includes('cannon') ? 'cannon' : order[0];
  if (n < 2) return opener;
  return order[(n - 2) % order.length];
}

function wavesSpawnedBy(level: LevelDef, waveIndex: number, spawned: number): number {
  let total = 0;
  let waves = 0;
  for (let w = 0; w <= waveIndex; w++) {
    total += level.waves[w]?.groups.reduce((sum, g) => sum + g.count, 0) ?? 0;
    if (total > spawned) break;
    waves++;
  }
  return waves;
}

/**
 * The greedy bot's decision: build the next kind of its build order on the free pad with the most road coverage, or,
 * when no pad is free or that kind is too expensive, upgrade the affordable tower with the most coverage.
 * Ties go to the lower pad index or the earlier tower. `builds` counts the bot's builds so far.
 */
export function greedyCommand(view: WorldView, samples: readonly Vec2[], builds: number): Command | undefined {
  const { level } = view;
  const kind = buildOrderKind(level, builds);
  if (kind && view.gold >= TOWERS[kind].levels[0].cost) {
    const range = TOWERS[kind].levels[0].range;
    let best: number | undefined;
    let bestCover = -1;
    level.pads.forEach((center, pad) => {
      if (view.towers.some((t) => t.pad === pad)) return;
      const cover = coverage(samples, center, range);
      if (cover > bestCover) {
        best = pad;
        bestCover = cover;
      }
    });
    if (best !== undefined) return { type: 'build', pad: best, kind };
  }
  let pick: number | undefined;
  let pickCover = -1;
  for (const tower of view.towers) {
    const cost = upgradeCost(tower);
    if (cost === undefined || cost > view.gold) continue;
    const cover = coverage(samples, tower.pos, towerStats(tower).range);
    if (cover > pickCover) {
      pick = tower.id;
      pickCover = cover;
    }
  }
  return pick === undefined ? undefined : { type: 'upgrade', towerId: pick };
}

export function playLevel(level: LevelDef, difficulty: Difficulty, options: BotOptions = { strategy: 'greedy' }): PlayResult {
  const sim = createSimulation(level, difficulty);
  const { view } = sim;
  const samples = roadSamples(level);
  const thinkSteps = Math.max(1, Math.round((options.thinkInterval ?? 1) / FIXED_DT));
  const maxSteps = Math.round(BOT_TIME_LIMIT / FIXED_DT);
  let builds = 0;
  let goldSpent = 0;
  let spawned = 0;

  const think = (): void => {
    const cmd = greedyCommand(view, samples, builds);
    const gold = view.gold;
    if (!cmd || !sim.command(cmd).ok) return;
    goldSpent += gold - view.gold;
    if (cmd.type === 'build') builds++;
  };

  const greedy = options.strategy === 'greedy';
  if (greedy) think();
  sim.command({ type: 'callWave' });
  for (let step = 1; step <= maxSteps && (view.status === 'ready' || view.status === 'running'); step++) {
    for (const event of sim.step()) if (event.type === 'enemySpawned') spawned++;
    if (greedy && step % thinkSteps === 0 && view.status === 'running') think();
  }

  const won = view.status === 'won';
  return {
    status: won ? 'won' : 'lost',
    stars: won ? view.stars : 0,
    livesLeft: view.lives,
    maxLives: view.maxLives,
    wavesSpawned: wavesSpawnedBy(level, view.waveIndex, spawned),
    time: view.time,
    goldSpent,
  };
}
