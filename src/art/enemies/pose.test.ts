import { describe, expect, it } from 'vitest';
import type { EnemyKind } from '../../game/types';
import { loadEngine, pixelAt, renderEngine } from '../../platform/nodeCanvas';
import { makeArtboard, placeRoot } from '../exode';
import { buildEnemySprite } from './index';
import { HP_COLORS, hpColor, poseEnemy, type EnemyPose } from './pose';

const REST: EnemyPose = { facingLeft: false, hpRatio: 1, showHp: false, slowed: false, shieldRatio: 0 };

function setup(kind: EnemyKind) {
  const sprite = placeRoot(buildEnemySprite(kind, `p-${kind}`), 100, 120);
  const engine = loadEngine(makeArtboard('p', sprite.objects, { width: 200, height: 140, background: null }));
  return { sprite, engine };
}

describe('hpColor', () => {
  it('is green above half, yellow above a quarter, red otherwise', () => {
    expect(hpColor(1)).toBe('#5bd46a');
    expect(hpColor(0.51)).toBe(HP_COLORS.high);
    expect(hpColor(0.5)).toBe('#ffd23f');
    expect(hpColor(0.26)).toBe(HP_COLORS.mid);
    expect(hpColor(0.25)).toBe('#ff4d3d');
    expect(hpColor(0)).toBe(HP_COLORS.low);
  });
});

describe('poseEnemy', () => {
  it('mirrors the face group while moving left', () => {
    const { sprite, engine } = setup('grunt');
    poseEnemy(engine, sprite, { ...REST, facingLeft: true });
    expect(engine.getObjectState(sprite.facePartId).flip_x).toBe(true);
    poseEnemy(engine, sprite, REST);
    expect(engine.getObjectState(sprite.facePartId).flip_x).toBe(false);
  });

  it('shows the health bar with a left-anchored, colored fill', () => {
    const { sprite, engine } = setup('brute');
    const { groupId, fillId, fullWidth, fillX } = sprite.hpBar;
    poseEnemy(engine, sprite, { ...REST, showHp: true, hpRatio: 0.3 });
    expect(engine.getObjectState(groupId).visible).toBe(true);
    const fill = engine.getObjectState(fillId);
    expect(fill.scale_x).toBeCloseTo(0.3);
    expect(fill.scale_y).toBe(1);
    expect(fill.x).toBeCloseTo(fillX - fullWidth * 0.35);
    expect(fill.style.fill.color).toBe(HP_COLORS.mid);

    poseEnemy(engine, sprite, { ...REST, showHp: true, hpRatio: 0.8 });
    expect(engine.getObjectState(fillId).style.fill.color).toBe(HP_COLORS.high);
    poseEnemy(engine, sprite, { ...REST, showHp: true, hpRatio: 0.1 });
    expect(engine.getObjectState(fillId).style.fill.color).toBe(HP_COLORS.low);
    poseEnemy(engine, sprite, { ...REST, showHp: true, hpRatio: 1.5 });
    expect(engine.getObjectState(fillId)).toMatchObject({ scale_x: 1, x: fillX });

    poseEnemy(engine, sprite, REST);
    expect(engine.getObjectState(groupId).visible).toBe(false);
  });

  it('paints the bar fill from its left end', () => {
    const { sprite, engine } = setup('boss');
    poseEnemy(engine, sprite, { ...REST, showHp: true, hpRatio: 0.3 });
    const canvas = renderEngine(engine, 200, 140);
    const barY = 120 - sprite.height - 14;
    const left = 100 - sprite.hpBar.fullWidth / 2;
    expect(pixelAt(canvas, left + 4, barY).slice(0, 3)).toEqual([0xff, 0xd2, 0x3f]);
    expect(pixelAt(canvas, left + sprite.hpBar.fullWidth - 4, barY).slice(0, 3)).not.toEqual([0xff, 0xd2, 0x3f]);
  });

  it('toggles the frost overlay', () => {
    const { sprite, engine } = setup('runner');
    poseEnemy(engine, sprite, { ...REST, slowed: true });
    expect(engine.getObjectState(sprite.frostOverlayId).visible).toBe(true);
    poseEnemy(engine, sprite, REST);
    expect(engine.getObjectState(sprite.frostOverlayId).visible).toBe(false);
  });

  it('fades the shield bubble with the shield ratio', () => {
    const { sprite, engine } = setup('shield');
    const bubble = sprite.shieldBubbleId;
    if (!bubble) throw new Error('shield orc has no bubble');
    poseEnemy(engine, sprite, { ...REST, shieldRatio: 1 });
    expect(engine.getObjectState(bubble)).toMatchObject({ visible: true, opacity: 1 });
    poseEnemy(engine, sprite, { ...REST, shieldRatio: 0.4 });
    expect(engine.getObjectState(bubble)).toMatchObject({ visible: true, opacity: 0.4 });
    poseEnemy(engine, sprite, REST);
    expect(engine.getObjectState(bubble)).toMatchObject({ visible: false, opacity: 0 });
  });

  it('ignores the shield ratio for kinds without a bubble', () => {
    const { sprite, engine } = setup('flyer');
    expect(sprite.shieldBubbleId).toBeNull();
    expect(() => poseEnemy(engine, sprite, { ...REST, shieldRatio: 1 })).not.toThrow();
  });
});
