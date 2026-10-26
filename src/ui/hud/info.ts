/** Numbers and texts the HUD shows, derived from the stat tables and the world view. Pure. */
import { textWidth } from '../../art/ui/text';
import { earlyCallBonus as bonusFor, sellRefund as refundFor, TOWERS } from '../../game/config';
import type { LevelDef, TowerKind, TowerLevel, TowerLevelStats, TowerState, WorldView } from '../../game/types';

export function buildCost(kind: TowerKind): number {
  return TOWERS[kind].levels[0].cost;
}

export function levelStats(kind: TowerKind, level: TowerLevel): TowerLevelStats {
  const [l1, l2, l3] = TOWERS[kind].levels;
  return level === 1 ? l1 : level === 2 ? l2 : l3;
}

/** Cost of the next upgrade, or null at level 3. */
export function upgradeCost(tower: TowerState): number | null {
  return tower.level === 3 ? null : levelStats(tower.kind, tower.level === 1 ? 2 : 3).cost;
}

export function sellRefund(tower: TowerState): number {
  return refundFor(tower.spent);
}

/** Gold for calling the next wave now (the same rule the sim applies). */
export function earlyCallBonus(nextWaveIn: number): number {
  return bonusFor(nextWaveIn);
}

export function waveText(view: WorldView): string {
  return `${Math.max(0, view.waveIndex + 1)}/${view.waveCount}`;
}

export function waveHasBoss(level: LevelDef, wave: number): boolean {
  return level.waves[wave]?.groups.some((g) => g.enemy === 'boss') ?? false;
}

export interface StatsInfo {
  title: string;
  lines: [string, string];
  damage: string;
  range: string;
  rate: string;
}

function formatRate(fireInterval: number): string {
  const rate = 1 / fireInterval;
  return rate >= 10 ? String(Math.round(rate)) : String(Math.round(rate * 10) / 10);
}

/** Greedy word wrap into at most two lines of `width` px; the second line takes the rest. */
export function wrapTwoLines(text: string, size: number, width: number): [string, string] {
  const words = text.split(' ');
  let first = '';
  let i = 0;
  for (; i < words.length; i++) {
    const next = first ? `${first} ${words[i]}` : (words[i] ?? '');
    if (first && textWidth(next, size) > width) break;
    first = next;
  }
  return [first, words.slice(i).join(' ')];
}

/** Tooltip content for a tower kind at a level (the build menu shows level 1, the tower menu the next level). */
export function statsInfo(kind: TowerKind, level: TowerLevel, heading: string, lineSize: number, lineWidth: number): StatsInfo {
  const def = TOWERS[kind];
  const stats = levelStats(kind, level);
  return {
    title: heading,
    lines: wrapTwoLines(def.description, lineSize, lineWidth),
    damage: String(stats.damage),
    range: String(stats.range),
    rate: formatRate(stats.fireInterval),
  };
}

/** Heading of the tower-menu tooltip: the level an upgrade buys, or MAX. */
export function upgradeHeading(tower: TowerState): string {
  const name = TOWERS[tower.kind].name;
  return tower.level >= 3 ? `${name}  MAX` : `${name}  LV ${tower.level + 1}`;
}
