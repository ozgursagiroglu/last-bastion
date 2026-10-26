/**
 * A running level per entry: a real sim with towers on most pads plays for SECONDS (every wave called as soon as it
 * can be), its events feed the scene, then the background and world stages are composited at 1280×720. The shot is
 * taken RENDERED_STEPS after the first step with a busy board (or after EXTRA_SECONDS).
 */
import type { Canvas } from '@napi-rs/canvas';
import type { GalleryEntry } from '../../art/gallery';
import { moltenSurfaces } from '../../art/world/terrain';
import { getLevel, LEVELS } from '../../game/levels';
import { createSimulation } from '../../game/sim';
import { DESIGN_HEIGHT, DESIGN_WIDTH, FIXED_DT, type GameEvent, type LevelDef, type WorldView } from '../../game/types';
import { createNodeCanvas } from '../../platform/nodeCanvas';
import { GameScene } from './gameScene';
import { buildDemoTowers, fakeProjectile, fakeView, nodeCanvasLike, playSteps, richLevel } from './testSupport';

const SECONDS = 25;
const EXTRA_SECONDS = 8;
const BUSY_ENEMIES = 6;
const BUSY_EFFECTS = 2;
const RENDERED_STEPS = 30;

function renderLevel(source: LevelDef) {
  const level = richLevel(source);
  const bg = nodeCanvasLike(DESIGN_WIDTH, DESIGN_HEIGHT);
  const world = nodeCanvasLike(DESIGN_WIDTH, DESIGN_HEIGHT);
  const scene = new GameScene(bg, world, level);
  scene.resize(DESIGN_WIDTH, DESIGN_HEIGHT, 1);
  const sim = createSimulation(level, 'normal');
  buildDemoTowers(sim, level);
  const feed = (events: readonly GameEvent[], view: WorldView) => scene.onEvents(events, view);
  const frame = (dt: number) => scene.sync(sim.view, dt);
  playSteps(sim, feed, { steps: Math.round(SECONDS / FIXED_DT), every: 1, frame });
  const busy = () =>
    sim.view.enemies.length >= BUSY_ENEMIES && scene.fx.runningIds().length + sim.view.projectiles.length >= BUSY_EFFECTS;
  for (let i = 0; i < Math.round(EXTRA_SECONDS / FIXED_DT) && !busy(); i++) playSteps(sim, feed, { steps: 1, every: 1, frame });
  // Rendered steps before the shot, so light trails and particles have a history.
  playSteps(sim, feed, { steps: RENDERED_STEPS, every: 1, frame: (dt) => scene.render(sim.view, dt) });
  const out = createNodeCanvas(DESIGN_WIDTH, DESIGN_HEIGHT);
  const ctx = out.getContext('2d');
  ctx.drawImage(bg.node, 0, 0);
  ctx.drawImage(world.node, 0, 0);
  return out;
}

interface Shot {
  label: string;
  /** Design-space rect to crop. */
  rect: { x: number; y: number; w: number; h: number };
}

/**
 * Engine effect close-ups on level 10 (volcano): a fresh scene plays `frames` frames of 1/60 s (`step(f)` returns the
 * view and the events of frame f) and a crop is taken at every frame listed in `shots`, scaled 3× in one sheet.
 */
function closeups(frames: number, step: (f: number) => { view: WorldView; events: GameEvent[] }, shots: ReadonlyMap<number, Shot>): Canvas {
  const level = getLevel(10);
  const bg = nodeCanvasLike(DESIGN_WIDTH, DESIGN_HEIGHT);
  const world = nodeCanvasLike(DESIGN_WIDTH, DESIGN_HEIGHT);
  const scene = new GameScene(bg, world, level);
  const scale = 3;
  const cells = [...shots.values()];
  const cellW = Math.max(...cells.map((s) => s.rect.w)) * scale;
  const cellH = Math.max(...cells.map((s) => s.rect.h)) * scale + 30;
  const sheet = createNodeCanvas(cellW * Math.min(3, cells.length), cellH * Math.ceil(cells.length / 3));
  const out = sheet.getContext('2d');
  out.fillStyle = '#111111';
  out.fillRect(0, 0, sheet.width, sheet.height);
  let cell = 0;
  for (let f = 0; f < frames; f++) {
    const { view, events } = step(f);
    scene.onEvents(events, view);
    scene.render(view, 1 / 60);
    const shot = shots.get(f);
    if (!shot) continue;
    const { x, y, w, h } = shot.rect;
    const cx = (cell % 3) * cellW;
    const cy = Math.floor(cell / 3) * cellH;
    out.drawImage(bg.node, x, y, w, h, cx, cy, w * scale, h * scale);
    out.drawImage(world.node, x, y, w, h, cx, cy, w * scale, h * scale);
    out.fillStyle = '#dddddd';
    out.font = '20px sans-serif';
    out.fillText(shot.label, cx + 8, cy + h * scale + 22);
    cell++;
  }
  return sheet;
}

/** A rocket, an ice shard and a cannonball flying left to right across x = 500..780 (y ≈ 360). */
function trails(): Canvas {
  const level = getLevel(10);
  const kinds = ['rocket', 'iceShard', 'cannonball'] as const;
  const speeds = { rocket: 6, iceShard: 8.7, cannonball: 4 };
  return closeups(
    40,
    (f) => ({
      events: [],
      view: fakeView(level, {
        projectiles: kinds.map((kind, i) => {
          const x = 500 + f * speeds[kind] * (kind === 'cannonball' ? 1.5 : 1);
          const wave = Math.sin(f / 6) * 10;
          return fakeProjectile(i + 1, kind, { pos: { x, y: 330 + i * 40 + wave }, heading: Math.atan2(Math.cos(f / 6) * 10 / 6, speeds[kind]), height: kind === 'cannonball' ? 30 - Math.abs(f - 20) : 0 });
        }),
      }),
    }),
    new Map([
      [14, { label: 'trails, frame 14', rect: { x: 480, y: 290, w: 200, h: 130 } }],
      [26, { label: 'frame 26', rect: { x: 560, y: 290, w: 200, h: 130 } }],
      [38, { label: 'frame 38', rect: { x: 620, y: 290, w: 200, h: 130 } }],
    ]),
  );
}

/** A rocket explosion and a frost burst on frame 0, shot as they play. */
function bursts(): Canvas {
  const level = getLevel(10);
  const hit = (kind: 'rocket' | 'iceShard', x: number, radius: number): GameEvent => ({ type: 'projectileHit', id: 1, kind, pos: { x, y: 450 }, splashRadius: radius });
  const rect = { x: 560, y: 380, w: 260, h: 140 };
  return closeups(
    31,
    (f) => ({ view: fakeView(level), events: f === 0 ? [hit('rocket', 630, 55), hit('iceShard', 750, 0)] : [] }),
    new Map([2, 6, 12, 18, 24, 30].map((f) => [f, { label: `explosion + frost burst, t=${(f / 60).toFixed(2)}s`, rect }])),
  );
}

/** Embers rising from the first lava pools after 3 s. */
function embers(): Canvas {
  const level = getLevel(10);
  const pools = moltenSurfaces(level).slice(0, 3);
  return closeups(
    181,
    () => ({ view: fakeView(level), events: [] }),
    new Map(pools.map((p, i) => [178 + i, { label: `embers over a molten surface (${i + 1})`, rect: { x: p.x - 70, y: Math.max(0, p.y - 90), w: 140, h: 110 } }])),
  );
}

export const gallery: GalleryEntry[] = [
  ...LEVELS.map((level) => ({
    name: `scene-level-${String(level.id).padStart(2, '0')}`,
    render: () => renderLevel(level),
  })),
  { name: 'scene-fx-trails', render: trails },
  { name: 'scene-fx-bursts', render: bursts },
  { name: 'scene-fx-embers', render: embers },
];
