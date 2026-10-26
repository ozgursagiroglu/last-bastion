import { sellRefund, TOWERS } from '../config';
import type { CommandResult, TowerKind, TowerLevel, TowerState } from '../types';
import { copyVec, emit, newId, type World } from './world';

export function build(world: World, padIndex: number, kind: TowerKind): CommandResult {
  const { view } = world;
  const pad = Number.isInteger(padIndex) ? view.level.pads[padIndex] : undefined;
  if (!pad) return { ok: false, reason: 'invalidPad' };
  if (view.towers.some((t) => t.pad === padIndex)) return { ok: false, reason: 'padOccupied' };
  if (!view.level.towers.includes(kind)) return { ok: false, reason: 'towerNotAllowed' };
  const cost = TOWERS[kind].levels[0].cost;
  if (view.gold < cost) return { ok: false, reason: 'insufficientGold' };
  view.gold -= cost;
  const tower: TowerState = {
    id: newId(world),
    kind,
    level: 1,
    pad: padIndex,
    pos: copyVec(pad),
    aim: 0,
    cooldown: 0,
    lastFiredAt: -Infinity,
    spent: cost,
  };
  view.towers.push(tower);
  emit(world, { type: 'towerBuilt', towerId: tower.id, pad: padIndex, kind });
  return { ok: true };
}

/** Cost of the next level, or undefined at level 3. */
export function upgradeCost(tower: TowerState): number | undefined {
  const levels: readonly { cost: number }[] = TOWERS[tower.kind].levels;
  return levels[tower.level]?.cost;
}

export function upgrade(world: World, towerId: number): CommandResult {
  const { view } = world;
  const tower = view.towers.find((t) => t.id === towerId);
  if (!tower) return { ok: false, reason: 'noSuchTower' };
  const cost = upgradeCost(tower);
  if (tower.level >= 3 || cost === undefined) return { ok: false, reason: 'maxLevel' };
  if (view.gold < cost) return { ok: false, reason: 'insufficientGold' };
  const next = (tower.level + 1) as TowerLevel;
  view.gold -= cost;
  tower.level = next;
  tower.spent += cost;
  emit(world, { type: 'towerUpgraded', towerId, level: next });
  return { ok: true };
}

export function sell(world: World, towerId: number): CommandResult {
  const { view } = world;
  const index = view.towers.findIndex((t) => t.id === towerId);
  const tower = view.towers[index];
  if (!tower) return { ok: false, reason: 'noSuchTower' };
  const refund = sellRefund(tower.spent);
  view.gold += refund;
  view.towers.splice(index, 1);
  emit(world, { type: 'towerSold', towerId, pad: tower.pad, refund });
  return { ok: true };
}
