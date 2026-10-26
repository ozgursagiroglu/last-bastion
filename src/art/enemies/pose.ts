/** The executable form of the EnemySprite contract: per-frame state the adapter writes (galleries use it too). */
import type { ExodeUIEngine } from 'exodeui';
import { setFillColor, setFlipX, setOpacity, setPos, setScale, setVisible } from '../../render/exodeRuntime';
import type { EnemySprite } from '../types';

export interface EnemyPose {
  facingLeft: boolean;
  /** 0..1 */
  hpRatio: number;
  showHp: boolean;
  slowed: boolean;
  /** 0..1; ignored without a shield bubble */
  shieldRatio: number;
}

export const HP_COLORS = { high: '#5bd46a', mid: '#ffd23f', low: '#ff4d3d' } as const;

export function hpColor(ratio: number): string {
  if (ratio > 0.5) return HP_COLORS.high;
  if (ratio > 0.25) return HP_COLORS.mid;
  return HP_COLORS.low;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Applies flip, health bar (visibility, left-anchored fill, color), frost overlay and shield bubble. */
export function poseEnemy(engine: ExodeUIEngine, sprite: EnemySprite, pose: EnemyPose): void {
  setFlipX(engine, sprite.facePartId, pose.facingLeft);
  const bar = sprite.hpBar;
  setVisible(engine, bar.groupId, pose.showHp);
  if (pose.showHp) {
    const ratio = clamp01(pose.hpRatio);
    setScale(engine, bar.fillId, ratio, 1);
    setPos(engine, bar.fillId, bar.fillX - (bar.fullWidth * (1 - ratio)) / 2, 0);
    setFillColor(engine, bar.fillId, hpColor(ratio));
  }
  setVisible(engine, sprite.frostOverlayId, pose.slowed);
  if (sprite.shieldBubbleId) {
    const shield = clamp01(pose.shieldRatio);
    setVisible(engine, sprite.shieldBubbleId, shield > 0);
    setOpacity(engine, sprite.shieldBubbleId, shield);
  }
}
