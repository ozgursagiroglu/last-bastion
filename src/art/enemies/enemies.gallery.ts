/**
 * Enemy sprites: `pnpm art:render enemies` → out/renders/enemies-*.png
 */
import type { Animation, ExodeUIEngine } from 'exodeui';
import { ENEMY_KINDS, type EnemyKind } from '../../game/types';
import { createNodeCanvas, loadEngine, renderArtboard, renderEngine } from '../../platform/nodeCanvas';
import { loopClip, playClip } from '../../render/exodeRuntime';
import { clipsOf, makeArtboard, placeRoot, SpriteBuilder, type SpriteInstance } from '../exode';
import type { GalleryEntry, GalleryFrame } from '../gallery';
import { OUTLINE } from '../palette';
import type { EnemySprite } from '../types';
import { buildEnemyIcon, buildEnemySprite } from './index';
import { poseEnemy, type EnemyPose } from './pose';

const GRASS = '#5b8f3a';
const REST: EnemyPose = { facingLeft: false, hpRatio: 1, showHp: false, slowed: false, shieldRatio: 0 };

/** Cell size per kind for the filmstrips (the sprite stands at the bottom center). */
const CELL: Record<EnemyKind, { w: number; h: number; scale: number }> = {
  grunt: { w: 64, h: 60, scale: 3 },
  runner: { w: 64, h: 56, scale: 3 },
  brute: { w: 96, h: 84, scale: 2 },
  flyer: { w: 80, h: 84, scale: 2 },
  shield: { w: 72, h: 68, scale: 3 },
  boss: { w: 120, h: 120, scale: 2 },
};

function clip(sprite: SpriteInstance, name: string): Animation {
  const c = sprite.clips[name];
  if (!c) throw new Error(`${sprite.rootId} has no '${name}' clip`);
  return c;
}

/** A ground line with tick marks every 8 px, to judge foot sliding. */
function ground(w: number, y: number): SpriteInstance {
  const b = new SpriteBuilder('ground', { y });
  b.rect('line', w, 1, { x: w / 2, fill: '#3d6626' });
  return b.build();
}

/** `rootX` is a fraction of the cell width (toppled bodies need room on the right). */
function cellBoard(kind: EnemyKind, sprite: EnemySprite, rootX = 0.5) {
  const { w, h } = CELL[kind];
  placeRoot(sprite, w * rootX, h - 12);
  return makeArtboard(`enemies-${kind}`, [...ground(w, h - 12).objects, ...sprite.objects], { width: w, height: h, background: GRASS, animations: clipsOf([sprite]) });
}

function walkEntry(kind: EnemyKind): GalleryEntry {
  const sprite = buildEnemySprite(kind, `walk-${kind}`);
  const walk = clip(sprite, 'walk');
  const frames: GalleryFrame[] = Array.from({ length: 8 }, (_, i) => {
    const t = (walk.duration * i) / 8;
    return {
      label: `walk ${i}/8`,
      apply: (engine) => {
        poseEnemy(engine, sprite, REST);
        loopClip(engine, walk, t);
      },
    };
  });
  return { name: `enemies-walk-${kind}`, artboard: cellBoard(kind, sprite), scale: CELL[kind].scale, frames };
}

function hitDieEntry(kind: EnemyKind): GalleryEntry {
  const sprite = buildEnemySprite(kind, `hd-${kind}`);
  const hit = clip(sprite, 'hit');
  const die = clip(sprite, 'die');
  const hitTimes = [0.03, 0.06, 0.12];
  const dieTimes = [0, 0.25, 0.5, 0.75, 1].map((f) => f * die.duration);
  const frames: GalleryFrame[] = [
    ...hitTimes.map((t) => ({
      label: `hit ${t.toFixed(2)}`,
      apply: (engine: ExodeUIEngine) => {
        poseEnemy(engine, sprite, REST);
        playClip(engine, die, 0);
        playClip(engine, hit, t);
      },
    })),
    ...dieTimes.map((t) => ({
      label: `die ${t.toFixed(2)}`,
      apply: (engine: ExodeUIEngine) => {
        poseEnemy(engine, sprite, REST);
        playClip(engine, hit, hit.duration);
        playClip(engine, die, t);
      },
    })),
  ];
  return { name: `enemies-hit-die-${kind}`, artboard: cellBoard(kind, sprite, kind === 'flyer' ? 0.5 : 0.35), scale: CELL[kind].scale, frames };
}

const LINEUP_GAP = 96;

function lineupEntry(): GalleryEntry {
  return {
    name: 'enemies-lineup',
    render: () => {
      const sprites = ENEMY_KINDS.map((kind, i) => placeRoot(buildEnemySprite(kind, `lineup-${kind}`), 48 + i * LINEUP_GAP, 108));
      const board = makeArtboard('enemies-lineup', sprites.flatMap((s) => s.objects), { width: ENEMY_KINDS.length * LINEUP_GAP, height: 124, background: GRASS });
      const prepare = (engine: ExodeUIEngine) => {
        for (const s of sprites) poseEnemy(engine, s, REST);
      };
      const big = renderArtboard(board, { scale: 2, prepare });
      const small = renderArtboard(board, { prepare });
      const sheet = createNodeCanvas(big.width, big.height + small.height + 8);
      const ctx = sheet.getContext('2d');
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, sheet.width, sheet.height);
      ctx.drawImage(big, 0, 0);
      ctx.drawImage(small, 0, big.height + 8);
      return sheet;
    },
  };
}

interface Variant {
  label: string;
  pose: EnemyPose;
}

const VARIANTS: Variant[] = [
  { label: 'rest', pose: REST },
  { label: 'left', pose: { ...REST, facingLeft: true } },
  { label: 'hp 30%', pose: { ...REST, showHp: true, hpRatio: 0.3 } },
  { label: 'hp 70%', pose: { ...REST, showHp: true, hpRatio: 0.7 } },
  { label: 'slowed', pose: { ...REST, slowed: true } },
  { label: 'shield 100%', pose: { ...REST, shieldRatio: 1 } },
  { label: 'shield 40%', pose: { ...REST, shieldRatio: 0.4, showHp: true, hpRatio: 0.9 } },
];

const STATE_W = 100;
const STATE_H = 120;

function statesEntry(): GalleryEntry {
  return {
    name: 'enemies-states',
    render: () => {
      const posed: { sprite: EnemySprite; pose: EnemyPose }[] = [];
      ENEMY_KINDS.forEach((kind, row) => {
        VARIANTS.forEach((v, col) => {
          if (v.label.startsWith('shield') && kind !== 'shield') return;
          const sprite = placeRoot(buildEnemySprite(kind, `st-${kind}-${col}`), col * STATE_W + STATE_W / 2, row * STATE_H + STATE_H - 14);
          posed.push({ sprite, pose: v.pose });
        });
      });
      const labels = new SpriteBuilder('labels');
      VARIANTS.forEach((v, col) => labels.text(`l${col}`, v.label, { size: 11, x: col * STATE_W + STATE_W / 2, y: 8, fill: '#ffffff' }));
      const width = VARIANTS.length * STATE_W;
      const height = ENEMY_KINDS.length * STATE_H;
      const board = makeArtboard('enemies-states', [...posed.flatMap((p) => p.sprite.objects), ...labels.build().objects], { width, height, background: GRASS });
      const engine = loadEngine(board);
      for (const p of posed) poseEnemy(engine, p.sprite, p.pose);
      return renderEngine(engine, width * 2, height * 2);
    },
  };
}

const ICON_BOX = 40;
const ICON_GAP = 56;

function iconsEntry(): GalleryEntry {
  const frames = new SpriteBuilder('frames');
  const icons = ENEMY_KINDS.map((kind, i) => {
    const x = ICON_GAP / 2 + i * ICON_GAP;
    frames.rect(`f-${kind}`, ICON_BOX, ICON_BOX, { x, y: ICON_GAP / 2, radius: 4, fill: '#2b3a2a', stroke: { color: OUTLINE, width: 1 } });
    return placeRoot(buildEnemyIcon(kind, `icon-${kind}`), x, ICON_GAP / 2);
  });
  return {
    name: 'enemies-icons',
    artboard: makeArtboard('enemies-icons', [...frames.build().objects, ...icons.flatMap((s) => s.objects)], { width: ENEMY_KINDS.length * ICON_GAP, height: ICON_GAP, background: '#1b241a' }),
    scale: 2,
  };
}

export const gallery: GalleryEntry[] = [
  lineupEntry(),
  ...ENEMY_KINDS.map(walkEntry),
  ...ENEMY_KINDS.map(hitDieEntry),
  statesEntry(),
  iconsEntry(),
];
