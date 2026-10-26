import { describe, expect, it } from 'vitest';
import { TOWER_KINDS, type TowerLevel } from '../../game/types';
import { countPainted, loadEngine, renderEngine } from '../../platform/nodeCanvas';
import { loopClip, playClip } from '../../render/exodeRuntime';
import { makeArtboard, placeRoot, validateSprite, type ExodeObject } from '../exode';
import type { TowerSprite } from '../types';
import { effectsOf } from '../world/effects';
import { buildTowerIcon, buildTowerSprite, ICON_SIZE } from './index';
import { poseTower } from './pose';

const LEVELS: TowerLevel[] = [1, 2, 3];
/** Root-space box every level must fit in. */
const BOX = { left: -36, right: 36, top: -96, bottom: 16 };
const W = 120;
const H = 140;
const ROOT_AT = { x: 60, y: 112 };

function engineFor(sprite: TowerSprite) {
  placeRoot(sprite, ROOT_AT.x, ROOT_AT.y);
  return loadEngine(makeArtboard('t', sprite.objects, { width: W, height: H, background: null, animations: Object.values(sprite.clips) }));
}

const inBox = { x: ROOT_AT.x + BOX.left, y: ROOT_AT.y + BOX.top, w: BOX.right - BOX.left, h: BOX.bottom - BOX.top };

function byId(sprite: TowerSprite): Map<string, ExodeObject> {
  return new Map(sprite.objects.map((o) => [o.id, o]));
}

describe.each(TOWER_KINDS)('%s tower sprite', (kind) => {
  const sprite = buildTowerSprite(kind, `t-${kind}`);

  it('is a valid sprite within the part budget', () => {
    expect(validateSprite(sprite)).toEqual([]);
    expect(sprite.kind).toBe(kind);
    expect(sprite.objects.length).toBeLessThanOrEqual(45);
  });

  it("has an 'idle' loop and a short 'fire' clip that start and end at rest", () => {
    const { idle, fire } = sprite.clips;
    expect(idle).toBeDefined();
    expect(fire).toBeDefined();
    expect(fire?.duration).toBeLessThanOrEqual(0.35);
    const objects = byId(sprite);
    for (const clip of [idle, fire]) {
      for (const track of clip?.tracks ?? []) {
        const first = track.keyframes[0];
        const last = track.keyframes[track.keyframes.length - 1];
        expect(first?.time).toBe(0);
        if (clip === idle) expect(last?.time).toBeCloseTo(idle?.duration ?? 0, 9);
        expect(first?.value).toEqual(last?.value);
        expect([sprite.aimPartId, sprite.facePartId]).not.toContain(track.object_id);
        if (clip === fire) {
          const transform = objects.get(track.object_id)?.transform as unknown as Record<string, unknown>;
          expect(first?.value).toEqual(transform[track.property]);
        }
      }
    }
  });

  it('lists disjoint tier parts that exist, with only tier 1 shown at build time', () => {
    const objects = byId(sprite);
    const all = LEVELS.flatMap((l) => sprite.tierPartIds[l]);
    expect(new Set(all).size).toBe(all.length);
    expect(sprite.tierPartIds[2].length + sprite.tierPartIds[3].length).toBeGreaterThan(0);
    for (const l of LEVELS) {
      for (const id of sprite.tierPartIds[l]) {
        expect(objects.has(id), id).toBe(true);
        expect(objects.get(id)?.visible, id).toBe(l === 1);
      }
    }
  });

  it('nests the aim part inside the face part, which sits untransformed at the root origin', () => {
    const objects = byId(sprite);
    if (sprite.aimPartId) expect(objects.has(sprite.aimPartId)).toBe(true);
    if (!sprite.facePartId) return;
    const face = objects.get(sprite.facePartId);
    expect(face?.transform).toMatchObject({ x: 0, y: 0, rotation: 0, scale_x: 1, scale_y: 1, flip_x: false });
    let id = sprite.aimPartId ?? undefined;
    const chain: string[] = [];
    while (id) {
      chain.push(id);
      id = objects.get(id)?.parentId;
    }
    expect(chain).toContain(sprite.facePartId);
  });

  it('keeps every muzzle and the aim pivot inside the tower box', () => {
    for (const p of [sprite.aimPivot, ...LEVELS.map((l) => sprite.muzzle[l])]) {
      expect(p.x).toBeGreaterThanOrEqual(BOX.left);
      expect(p.x).toBeLessThanOrEqual(BOX.right);
      expect(p.y).toBeGreaterThanOrEqual(BOX.top);
      expect(p.y).toBeLessThanOrEqual(BOX.bottom);
    }
  });

  it.each(LEVELS)('renders level %i inside the root-space box at every aim and idle time', (level) => {
    const s = buildTowerSprite(kind, `box-${kind}`);
    const engine = engineFor(s);
    const idle = s.clips.idle;
    if (!idle) throw new Error('no idle clip');
    const aims = s.aimPartId ? [0, 45, 90, 135, 180, 225, 270, 315] : [0];
    for (const deg of aims) {
      for (const t of [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (idle.duration * i) / 8)) {
        poseTower(engine, s, level, (deg * Math.PI) / 180);
        loopClip(engine, idle, t);
        const canvas = renderEngine(engine, W, H);
        const total = countPainted(canvas);
        expect(total, `aim ${deg} t ${t}`).toBe(countPainted(canvas, inBox));
        expect(total).toBeGreaterThan(2000);
      }
    }
  });

  it('shows at most one part with an engine glow at each level (a covered part would still draw its glow)', () => {
    const s = buildTowerSprite(kind, `glow-${kind}`);
    const engine = engineFor(s);
    const objects = byId(s);
    const shown = (id: string | undefined): boolean => {
      if (id === undefined) return true;
      const state: unknown = engine.getObjectState(id);
      const visible = typeof state === 'object' && state !== null && (state as { visible?: unknown }).visible !== false;
      return visible && shown(objects.get(id)?.parentId);
    };
    const glowing = s.objects.filter((o) => effectsOf(o).some((e) => e.type === 'Glow'));
    for (const level of LEVELS) {
      poseTower(engine, s, level, 0);
      expect(glowing.filter((o) => shown(o.id)).length, `level ${level}`).toBeLessThanOrEqual(1);
    }
  });

  it('paints more at each level', () => {
    const s = buildTowerSprite(kind, `grow-${kind}`);
    const engine = engineFor(s);
    const painted = LEVELS.map((level) => {
      poseTower(engine, s, level, 0);
      return countPainted(renderEngine(engine, W, H));
    });
    expect(painted[1]).toBeGreaterThan(painted[0] ?? 0);
    expect(painted[2]).toBeGreaterThan(painted[1] ?? 0);
  });

  it('plays fire at every level without leaving the rest pose at the end', () => {
    const s = buildTowerSprite(kind, `fire-${kind}`);
    const engine = engineFor(s);
    const fire = s.clips.fire;
    if (!fire) throw new Error('no fire clip');
    for (const level of LEVELS) {
      poseTower(engine, s, level, 0);
      const rest = renderEngine(engine, W, H).toBuffer('image/png');
      playClip(engine, fire, fire.duration / 3);
      expect(renderEngine(engine, W, H).toBuffer('image/png').equals(rest)).toBe(false);
      playClip(engine, fire, fire.duration);
      expect(renderEngine(engine, W, H).toBuffer('image/png').equals(rest)).toBe(true);
    }
  });
});

describe.each(TOWER_KINDS)('%s icon', (kind) => {
  const icon = buildTowerIcon(kind, `icon-${kind}`);
  const sprite = buildTowerSprite(kind, `icon-${kind}`);

  it('is a valid static sprite without tier 2 and 3 parts', () => {
    expect(validateSprite(icon)).toEqual([]);
    expect(icon.clips).toEqual({});
    const ids = new Set(icon.objects.map((o) => o.id));
    for (const id of [...sprite.tierPartIds[2], ...sprite.tierPartIds[3]]) expect(ids.has(id), id).toBe(false);
    for (const id of sprite.tierPartIds[1]) expect(ids.has(id), id).toBe(true);
    expect(icon.objects.every((o) => o.visible)).toBe(true);
  });

  it('fits a 56×56 box centered on its root and fills most of it', () => {
    const size = 80;
    placeRoot(icon, size / 2, size / 2);
    const canvas = renderEngine(loadEngine(makeArtboard('i', icon.objects, { width: size, height: size, background: null })), size, size);
    const box = { x: (size - ICON_SIZE) / 2, y: (size - ICON_SIZE) / 2, w: ICON_SIZE, h: ICON_SIZE };
    const total = countPainted(canvas);
    expect(total).toBe(countPainted(canvas, box));
    expect(total).toBeGreaterThan(ICON_SIZE * ICON_SIZE * 0.35);
  });
});
