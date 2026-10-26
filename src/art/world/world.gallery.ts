/**
 * World art gallery: `pnpm art:render world` → out/renders/world-*.png
 * Terrain per theme (synthetic levels), decor sheets, gate and pads, projectiles, and every effect's 'play' clip.
 */
import { THEME_IDS, type ProjectileKind } from '../../game/types';
import { loopClip } from '../../render/exodeRuntime';
import type { GalleryEntry } from '../gallery';
import { clipsOf, makeArtboard, placeRoot, SpriteBuilder } from '../exode';
import type { FxKind } from '../types';
import { buildFxSprite, FX_DURATION } from './fx';
import { addCastleGate, addDecor, addPad, addSpawnMarker, DECOR_KINDS } from './parts';
import { fxFrame, poseProjectile, startFx, type FxSpec } from './pose';
import { buildProjectileSprite } from './projectiles';
import { SAMPLE_LEVELS } from './sampleLevels';
import { buildTerrainArtboard } from './terrain';
import { THEMES } from './themes';

const terrain: GalleryEntry[] = THEME_IDS.map((theme) => ({ name: `world-terrain-${theme}`, artboard: buildTerrainArtboard(SAMPLE_LEVELS[theme]) }));

const decor: GalleryEntry[] = THEME_IDS.map((theme) => {
  const kinds = DECOR_KINDS[theme];
  const b = new SpriteBuilder('sheet');
  b.rect('ground', 90 * (kinds.length + 1), 120, { x: 45 * (kinds.length + 1), y: 60, fill: THEMES[theme].ground.light });
  kinds.forEach((kind, i) => addDecor(b, `d${i}`, kind, 70 + i * 90, 95));
  addSpawnMarker(b, 'spawn', 70 + kinds.length * 90, 95, theme);
  return {
    name: `world-decor-${theme}`,
    artboard: makeArtboard(`decor-${theme}`, b.build().objects, { width: 90 * (kinds.length + 1), height: 120, background: THEMES[theme].ground.dark }),
    scale: 2,
  };
});

function gateAndPads() {
  const b = new SpriteBuilder('gp');
  THEME_IDS.forEach((theme, i) => {
    b.rect(`ground${i}`, 120, 260, { x: 180 + i * 120, y: 130, fill: THEMES[theme].ground.light });
    addPad(b, `pad${i}`, 180 + i * 120, 70, theme);
    addPad(b, `padB${i}`, 180 + i * 120, 190, theme);
  });
  addCastleGate(b, 'gate', 60, 200);
  return makeArtboard('gate-and-pad', b.build().objects, { width: 600, height: 260, background: '#5f9e3a' });
}

const HEADINGS = [0, 90, 225];

function projectiles(): GalleryEntry {
  const rows: { kind: ProjectileKind; y: number; height: (i: number) => number; heading: (i: number) => number }[] = [
    { kind: 'iceShard', y: 30, height: () => 0, heading: (i) => HEADINGS[i] ?? 0 },
    { kind: 'rocket', y: 80, height: () => 0, heading: (i) => HEADINGS[i] ?? 0 },
    { kind: 'cannonball', y: 200, height: (i) => i * 30, heading: () => 0 },
  ];
  const posed = rows.flatMap((row) =>
    HEADINGS.map((_, i) => ({ sprite: placeRoot(buildProjectileSprite(row.kind, `${row.kind}${i}`), 40 + i * 60, row.y), heading: row.heading(i), height: row.height(i) })),
  );
  return {
    name: 'world-projectiles',
    artboard: makeArtboard('projectiles', posed.flatMap((p) => p.sprite.objects), { width: 200, height: 220, background: '#5f9e3a', animations: clipsOf(posed.map((p) => p.sprite)) }),
    scale: 3,
    prepare: (engine) => {
      for (const p of posed) {
        poseProjectile(engine, p.sprite, { heading: (p.heading * Math.PI) / 180, height: p.height });
        const loop = p.sprite.clips.loop;
        if (loop) loopClip(engine, loop, 0.05);
      }
    },
  };
}

const FX_SPECS: Readonly<Record<FxKind, FxSpec>> = {
  tracer: { at: { x: 0, y: 0 }, points: [{ x: 20, y: 90 }, { x: 150, y: 40 }] },
  lightning: { at: { x: 0, y: 0 }, points: [{ x: 15, y: 90 }, { x: 80, y: 40 }, { x: 150, y: 80 }], seed: 7 },
  explosion: { at: { x: 85, y: 70 }, radius: 50 },
  frostBurst: { at: { x: 85, y: 70 }, radius: 40 },
  hitSpark: { at: { x: 85, y: 65 } },
  muzzleFlash: { at: { x: 60, y: 65 } },
  deathPuff: { at: { x: 85, y: 85 } },
  coinPopup: { at: { x: 85, y: 95 }, text: '+12' },
  leak: { at: { x: 85, y: 90 }, text: '−2' },
};

const FX_KINDS = Object.keys(FX_DURATION) as FxKind[];

const effects: GalleryEntry[] = FX_KINDS.map((kind) => {
  const fx = buildFxSprite(kind, `fx-${kind}`);
  const spec = FX_SPECS[kind];
  return {
    name: `world-fx-${kind}`,
    artboard: makeArtboard(`fx-${kind}`, fx.objects, { width: 170, height: 130, background: '#3d6b30', animations: clipsOf([fx]) }),
    scale: 2,
    columns: 3,
    frames: [0, 1, 2, 3, 4, 5].map((i) => {
      const t = (fx.duration * i) / 5;
      return {
        label: `${kind} t=${t.toFixed(3)}`,
        apply: (engine) => {
          startFx(engine, fx, spec);
          fxFrame(engine, fx, t);
        },
      };
    }),
  };
});

export const gallery: GalleryEntry[] = [
  ...terrain,
  ...decor,
  { name: 'world-gate-and-pad', artboard: gateAndPads(), scale: 2 },
  projectiles(),
  ...effects,
];
