import type { ExodeUIEngine } from 'exodeui';
import { describe, expect, it } from 'vitest';
import type { TowerKind, TowerLevel, Vec2 } from '../../game/types';
import { loadEngine, pixelAt, renderEngine } from '../../platform/nodeCanvas';
import { makeArtboard, placeRoot } from '../exode';
import type { TowerSprite } from '../types';
import { buildTowerSprite } from './index';
import { aimPartAngle, isMirrored, muzzleWorld, normalizeDegrees, poseTower } from './pose';

const W = 160;
const H = 160;
const ROOT_AT = { x: 80, y: 120 };
const rad = (deg: number) => (deg * Math.PI) / 180;

function setup(kind: TowerKind) {
  const sprite = placeRoot(buildTowerSprite(kind, `p-${kind}`), ROOT_AT.x, ROOT_AT.y);
  const engine = loadEngine(makeArtboard('p', sprite.objects, { width: W, height: H, background: null }));
  return { sprite, engine };
}

function state(engine: ExodeUIEngine, id: string): Record<string, unknown> {
  const s: unknown = engine.getObjectState(id);
  if (typeof s !== 'object' || s === null) throw new Error(`no state for ${id}`);
  return s as Record<string, unknown>;
}

/** World muzzle from the engine's own aim/face state: P + F(pivot + R(θ)·(m − pivot)), F = mirror when flipped. */
function muzzleFromEngine(engine: ExodeUIEngine, sprite: TowerSprite, level: TowerLevel): Vec2 {
  const m = sprite.muzzle[level];
  const flipped = sprite.facePartId !== null && state(engine, sprite.facePartId).flip_x === true;
  let local = { ...m };
  if (sprite.aimPartId !== null) {
    const theta = rad(Number(state(engine, sprite.aimPartId).rotation));
    const p = sprite.aimPivot;
    const d = { x: m.x - p.x, y: m.y - p.y };
    local = { x: p.x + Math.cos(theta) * d.x - Math.sin(theta) * d.y, y: p.y + Math.sin(theta) * d.x + Math.cos(theta) * d.y };
  }
  return { x: ROOT_AT.x + (flipped ? -local.x : local.x), y: ROOT_AT.y + local.y };
}

describe('normalizeDegrees', () => {
  it('maps any angle into (−180, 180]', () => {
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(-180)).toBe(180);
    expect(normalizeDegrees(180)).toBe(180);
    expect(normalizeDegrees(190)).toBe(-170);
    expect(normalizeDegrees(540)).toBe(180);
    expect(normalizeDegrees(-450)).toBe(-90);
  });
});

describe('poseTower', () => {
  it('shows only the tier parts of the chosen level', () => {
    for (const kind of ['rifle', 'cannon', 'frost', 'tesla', 'rocket'] as const) {
      const { sprite, engine } = setup(kind);
      for (const level of [3, 1, 2] as const) {
        poseTower(engine, sprite, level, 0);
        for (const l of [1, 2, 3] as const) {
          for (const id of sprite.tierPartIds[l]) expect(state(engine, id).visible, `${kind} L${level} ${id}`).toBe(l === level);
        }
      }
    }
  });

  it('mirrors the rifleman when aiming left and writes the local arm angle', () => {
    const { sprite, engine } = setup('rifle');
    const face = sprite.facePartId;
    const aim = sprite.aimPartId;
    if (!face || !aim) throw new Error('rifle needs face and aim parts');
    const cases: [deg: number, flip: boolean, local: number][] = [
      [0, false, 0],
      [45, false, 45],
      [90, false, 90],
      [100, true, 80],
      [150, true, 30],
      [180, true, 0],
      [225, true, -45],
      [300, false, -60],
      [-30, false, -30],
    ];
    for (const [deg, flip, local] of cases) {
      poseTower(engine, sprite, 1, rad(deg));
      expect(state(engine, face).flip_x, `aim ${deg}`).toBe(flip);
      expect(Number(state(engine, aim).rotation), `aim ${deg}`).toBeCloseTo(local, 6);
      expect(isMirrored(sprite, rad(deg))).toBe(flip);
      expect(aimPartAngle(sprite, rad(deg))).toBeCloseTo(local, 6);
    }
  });

  it('turns the cannon turret to the aim angle without mirroring', () => {
    const { sprite, engine } = setup('cannon');
    const aim = sprite.aimPartId;
    if (!aim) throw new Error('cannon needs an aim part');
    expect(sprite.facePartId).toBeNull();
    for (const [deg, local] of [[0, 0], [135, 135], [180, 180], [270, -90], [-45, -45]] as const) {
      poseTower(engine, sprite, 2, rad(deg));
      expect(Number(state(engine, aim).rotation)).toBeCloseTo(local, 6);
    }
  });
});

describe('muzzleWorld', () => {
  const aims = [0, 30, 89, 91, 135, 180, 200, 270, 330];

  it.each(['rifle', 'cannon', 'rocket', 'frost', 'tesla'] as const)('matches the posed %s at several angles', (kind) => {
    const { sprite, engine } = setup(kind);
    for (const level of [1, 3] as const) {
      for (const deg of aims) {
        poseTower(engine, sprite, level, rad(deg));
        const got = muzzleWorld(sprite, level, rad(deg), ROOT_AT);
        const want = muzzleFromEngine(engine, sprite, level);
        expect(got.x, `L${level} aim ${deg}`).toBeCloseTo(want.x, 6);
        expect(got.y, `L${level} aim ${deg}`).toBeCloseTo(want.y, 6);
      }
    }
  });

  it('follows the contract formula, mirrored and not', () => {
    const { sprite } = setup('rifle');
    const p = sprite.aimPivot;
    const m = sprite.muzzle[2];
    const P = { x: 10, y: 20 };
    const right = muzzleWorld(sprite, 2, rad(30), P);
    const a = rad(30);
    expect(right.x).toBeCloseTo(P.x + p.x + Math.cos(a) * (m.x - p.x) - Math.sin(a) * (m.y - p.y), 9);
    expect(right.y).toBeCloseTo(P.y + p.y + Math.sin(a) * (m.x - p.x) + Math.cos(a) * (m.y - p.y), 9);
    const b = rad(160);
    const left = muzzleWorld(sprite, 2, b, P);
    const dx = m.x - p.x;
    const dy = -(m.y - p.y);
    expect(left.x).toBeCloseTo(P.x - p.x + Math.cos(b) * dx - Math.sin(b) * dy, 9);
    expect(left.y).toBeCloseTo(P.y + p.y + Math.sin(b) * dx + Math.cos(b) * dy, 9);
    const frost = buildTowerSprite('frost', 'f');
    expect(muzzleWorld(frost, 3, rad(170), P)).toEqual({ x: P.x + frost.muzzle[3].x, y: P.y + frost.muzzle[3].y });
  });

  it.each(['rifle', 'cannon', 'rocket'] as const)('sits on the painted %s barrel tip', (kind) => {
    const { sprite, engine } = setup(kind);
    for (const level of [1, 3] as const) {
      for (const deg of [0, 60, 150, 200, 300]) {
        const aim = rad(deg);
        poseTower(engine, sprite, level, aim);
        const canvas = renderEngine(engine, W, H);
        const m = muzzleWorld(sprite, level, aim, ROOT_AT);
        const back = { x: m.x - Math.cos(aim) * 3, y: m.y - Math.sin(aim) * 3 };
        expect(pixelAt(canvas, back.x, back.y)[3], `${kind} L${level} aim ${deg}`).toBeGreaterThan(200);
      }
    }
  });
});
