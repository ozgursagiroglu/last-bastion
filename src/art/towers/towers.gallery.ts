/**
 * Tower galleries: `pnpm art:render towers` → out/renders/towers-*.png
 */
import type { Animation, ExodeUIEngine } from 'exodeui';
import { PAD_RADIUS, TOWER_KINDS, type TowerKind, type TowerLevel, type Vec2 } from '../../game/types';
import { loopClip, playClip, setPos } from '../../render/exodeRuntime';
import { clipsOf, linear, makeArtboard, placeRoot, solid, SpriteBuilder, type ExodeObject } from '../exode';
import type { GalleryEntry, GalleryFrame } from '../gallery';
import { OUTLINE, PALETTE } from '../palette';
import type { TowerSprite } from '../types';
import { buildTowerIcon, buildTowerSprite, ICON_SIZE } from './index';
import { muzzleWorld, poseTower } from './pose';

const CELL = { w: 96, h: 124 };
/** Root (pad center) inside a cell. */
const ROOT_AT = { x: 48, y: 104 };
const GRASS = '#5b8f3a';
const AIMS = [0, 45, 90, 135, 180, 225, 270, 315];

interface Placed {
  sprite: TowerSprite;
  level: TowerLevel;
  at: Vec2;
}

function pads(prefix: string, centers: readonly Vec2[]): ExodeObject[] {
  const b = new SpriteBuilder(prefix);
  centers.forEach((c, i) => {
    b.circle(`pad${i}`, PAD_RADIUS, {
      x: c.x,
      y: c.y,
      fill: linear([[0, PALETTE.stone.light], [1, PALETTE.stone.dark]]),
      stroke: { color: OUTLINE, width: 2 },
    });
  });
  return b.build().objects;
}

/** Towers (one per cell, row-major) on pads over grass, optionally with labels under each cell. */
function scene(name: string, cells: readonly { kind: TowerKind; level: TowerLevel }[], columns: number, labels = false) {
  const placed: Placed[] = cells.map((c, i) => {
    const at = { x: (i % columns) * CELL.w + ROOT_AT.x, y: Math.floor(i / columns) * (CELL.h + (labels ? 16 : 0)) + ROOT_AT.y };
    return { sprite: placeRoot(buildTowerSprite(c.kind, `${name}-${i}`), at.x, at.y), level: c.level, at };
  });
  const text = new SpriteBuilder(`${name}-labels`);
  if (labels) {
    placed.forEach((p, i) => text.text(`l${i}`, `${p.sprite.kind} L${p.level}`, { size: 12, x: p.at.x, y: p.at.y + 26, fill: '#ffffff' }));
  }
  const rows = Math.ceil(cells.length / columns);
  const artboard = makeArtboard(
    name,
    [...pads(`${name}-pads`, placed.map((p) => p.at)), ...placed.flatMap((p) => p.sprite.objects), ...text.build().objects],
    { width: columns * CELL.w, height: rows * (CELL.h + (labels ? 16 : 0)), background: GRASS, animations: clipsOf(placed.map((p) => p.sprite)) },
  );
  const pose = (engine: ExodeUIEngine, aim = 0) => placed.forEach((p) => poseTower(engine, p.sprite, p.level, aim));
  return { artboard, placed, pose };
}

function clipOf(sprite: TowerSprite, name: string): Animation {
  const clip = sprite.clips[name];
  if (!clip) throw new Error(`${sprite.kind} has no '${name}' clip`);
  return clip;
}

function levelsEntry(): GalleryEntry {
  const cells = ([1, 2, 3] as const).flatMap((level) => TOWER_KINDS.map((kind) => ({ kind, level })));
  const { artboard, pose } = scene('towers-levels', cells, TOWER_KINDS.length, true);
  return { name: 'towers-levels', artboard, scale: 2, prepare: (e) => pose(e) };
}

function aimEntry(kind: TowerKind): GalleryEntry {
  const name = `towers-aim-${kind}`;
  const { artboard, placed } = scene(name, [{ kind, level: 1 }, { kind, level: 3 }], 2);
  const marker = new SpriteBuilder(`${name}-marker`);
  placed.forEach((_, i) => marker.circle(`m${i}`, 2.5, { fill: solid('#ff00ff'), stroke: { color: '#ffffff', width: 1 } }));
  const markers = marker.build();
  const board = { ...artboard, objects: [...artboard.objects, ...markers.objects] };
  const frames: GalleryFrame[] = AIMS.map((deg) => ({
    label: `aim ${deg}°`,
    apply: (engine) => {
      const aim = (deg * Math.PI) / 180;
      placed.forEach((p, i) => {
        poseTower(engine, p.sprite, p.level, aim);
        const m = muzzleWorld(p.sprite, p.level, aim, p.at);
        setPos(engine, marker.id(`m${i}`), m.x, m.y);
      });
    },
  }));
  return { name, artboard: board, scale: 2, frames, columns: 4 };
}

function clipEntry(kind: TowerKind, clipName: 'fire' | 'idle'): GalleryEntry {
  const name = `towers-${clipName}-${kind}`;
  const levels: TowerLevel[] = clipName === 'fire' ? [1, 3] : [1, 2, 3];
  const { artboard, placed } = scene(name, levels.map((level) => ({ kind, level })), levels.length);
  const first = placed[0];
  if (!first) throw new Error('empty scene');
  const duration = clipOf(first.sprite, clipName).duration;
  const count = clipName === 'fire' ? 6 : 4;
  const times = Array.from({ length: count }, (_, i) => (clipName === 'fire' ? (duration * i) / (count - 1) : (duration * i) / count));
  const frames: GalleryFrame[] = times.map((t) => ({
    label: `${clipName} t=${t.toFixed(3)}`,
    apply: (engine) => {
      for (const p of placed) {
        poseTower(engine, p.sprite, p.level, 0);
        const clip = clipOf(p.sprite, clipName);
        if (clipName === 'fire') playClip(engine, clip, t);
        else loopClip(engine, clip, t);
      }
    },
  }));
  return { name, artboard, scale: 2, frames, columns: count === 6 ? 3 : 2 };
}

function iconsEntry(): GalleryEntry {
  const gap = 16;
  const objects: ExodeObject[] = [];
  const frames = new SpriteBuilder('icon-frames');
  TOWER_KINDS.forEach((kind, i) => {
    const x = gap + ICON_SIZE / 2 + i * (ICON_SIZE + gap);
    const y = gap + ICON_SIZE / 2;
    frames.rect(`f${i}`, ICON_SIZE, ICON_SIZE, { x, y, radius: 6, fill: '#3b2a1c', stroke: { color: PALETTE.gold.light, width: 1 } });
    objects.push(...placeRoot(buildTowerIcon(kind, `icon-${kind}`), x, y).objects);
  });
  const width = gap + TOWER_KINDS.length * (ICON_SIZE + gap);
  const artboard = makeArtboard('towers-icons', [...frames.build().objects, ...objects], { width, height: ICON_SIZE + gap * 2, background: '#22180f' });
  return { name: 'towers-icons', artboard, scale: 2 };
}

const AIMING: TowerKind[] = ['rifle', 'cannon', 'rocket'];

export const gallery: GalleryEntry[] = [
  levelsEntry(),
  ...AIMING.map(aimEntry),
  ...TOWER_KINDS.map((k) => clipEntry(k, 'fire')),
  ...TOWER_KINDS.map((k) => clipEntry(k, 'idle')),
  iconsEntry(),
];
