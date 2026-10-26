/**
 * Built-in engine effects gallery: `pnpm art:render effects` → out/renders/effects-*.png (findings in ENGINE_EFFECTS.md).
 */
import type { ExodeUIEngine } from 'exodeui';
import { createNodeCanvas, loadEngine, renderEngine } from '../../platform/nodeCanvas';
import type { GalleryEntry } from '../gallery';
import { makeArtboard, SpriteBuilder } from '../exode';
import { buildEffectSample, EFFECT_CASES, type EffectCase } from './engineEffects';

const CELL = { w: 200, h: 110 };
const COLUMNS = 5;
const SCALE = 2;
const STEP = 1 / 60;

/** Writes the state keys LightTrail reads (left/top/angle) so its history follows the object. */
function anchorTrail(engine: ExodeUIEngine, id: string, x: number, y: number): void {
  engine.updateObjectProperty(id, 'left', x);
  engine.updateObjectProperty(id, 'top', y);
  engine.updateObjectProperty(id, 'angle', 0);
}

function label(canvas: ReturnType<typeof createNodeCanvas>, text: string, x: number, y: number): void {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px sans-serif';
  ctx.fillText(text, x, y);
}

/** Every case moving right at 3 px/frame for 30 frames (trails and particles need the motion and engine time). */
function allCases(): ReturnType<typeof createNodeCanvas> {
  const cells = EFFECT_CASES.map((kind, i) => ({ kind, x: (i % COLUMNS) * CELL.w, y: Math.floor(i / COLUMNS) * CELL.h }));
  const samples = cells.map((c) => buildEffectSample(c.kind, c.kind, c.x + 60, c.y + 50));
  const width = CELL.w * COLUMNS;
  const height = CELL.h * Math.ceil(cells.length / COLUMNS);
  const engine = loadEngine(makeArtboard('effects-all', samples.flatMap((s) => s.objects), { width, height, background: '#3d6b30' }));
  for (let f = 0; f <= 30; f++) {
    for (const c of cells) {
      const x = c.x + 60 + f * 3;
      engine.updateObjectProperty(c.kind, 'x', x);
      if (c.kind === 'trailAnchored') anchorTrail(engine, `${c.kind}.ball`, x, c.y + 50);
    }
    engine.advance(STEP);
    if (f < 30) renderEngine(engine, width, height);
  }
  const canvas = renderEngine(engine, width * SCALE, height * SCALE);
  cells.forEach((c) => label(canvas, c.kind, c.x * SCALE + 8, (c.y + CELL.h) * SCALE - 10));
  return canvas;
}

/** A pooled anchored trail: flies right, is hidden, then reused 400 px away; the strip shows the frames after reuse. */
function pooledTrail(kind: EffectCase, clearHistory: boolean): ReturnType<typeof createNodeCanvas> {
  const sample = buildEffectSample(kind, 'p', 40, 55);
  const width = 600;
  const height = 110;
  const engine = loadEngine(makeArtboard('effects-pool', sample.objects, { width, height, background: '#3d6b30' }));
  const move = (x: number) => {
    engine.updateObjectProperty('p', 'x', x);
    anchorTrail(engine, 'p.ball', x, 55);
  };
  for (let f = 0; f < 20; f++) {
    move(40 + f * 6);
    renderEngine(engine, width, height);
  }
  engine.updateObjectProperty('p', 'visible', false);
  renderEngine(engine, width, height);
  if (clearHistory) (engine as unknown as { trailHistories: Map<string, unknown> }).trailHistories.delete('p.ball');
  engine.updateObjectProperty('p', 'visible', true);
  const sheet = createNodeCanvas(width, height * 4);
  const ctx = sheet.getContext('2d');
  for (let f = 0; f < 4; f++) {
    move(480 + f * 6);
    ctx.drawImage(renderEngine(engine, width, height), 0, f * height);
    label(sheet, `frame ${f + 1} after reuse${clearHistory ? ' (history cleared)' : ''}`, 8, f * height + 24);
  }
  return sheet;
}

/** Outer glow over blur (rows) × intensity (columns) on the orb and on a stroke-only zigzag, at 1× and 2×. */
function glowGrid(scale: number): ReturnType<typeof createNodeCanvas> {
  const blurs = [6, 12, 20];
  const intensities = [1, 2, 3];
  const objects = blurs.flatMap((blur, r) =>
    intensities.flatMap((intensity, c) => {
      const effect = { type: 'Glow', mode: 'outer', color: '#5fe6ff', blur, intensity };
      const orb = buildEffectSample('none', `o${r}${c}`, 40 + c * 150, 40 + r * 80);
      const ball = orb.objects.find((o) => o.id === `o${r}${c}.ball`);
      if (ball) (ball.style as Record<string, unknown>).effects = [{ isEnabled: true, ...effect }];
      const b = new SpriteBuilder(`z${r}${c}`, { x: 100 + c * 150, y: 40 + r * 80 });
      b.path('bolt', [{ x: -25, y: -10 }, { x: -8, y: 6 }, { x: 4, y: -8 }, { x: 25, y: 10 }], { stroke: { color: '#ffffff', width: 2.5 }, effects: [effect] });
      return [...orb.objects, ...b.build().objects];
    }),
  );
  const engine = loadEngine(makeArtboard('glow-grid', objects, { width: 450, height: 240, background: '#3d6b30' }));
  const canvas = renderEngine(engine, 450 * scale, 240 * scale);
  intensities.forEach((i, c) => label(canvas, `int ${i}`, (10 + c * 150) * scale, 236 * scale));
  blurs.forEach((blur, r) => label(canvas, `blur ${blur}`, 2, (70 + r * 80) * scale));
  return canvas;
}

export const gallery: GalleryEntry[] = [
  { name: 'effects-all', render: allCases },
  { name: 'effects-glow-grid-1x', render: () => glowGrid(1) },
  { name: 'effects-glow-grid-2x', render: () => glowGrid(2) },
  { name: 'effects-trail-pooled', render: () => pooledTrail('trailAnchored', false) },
  { name: 'effects-trail-pooled-cleared', render: () => pooledTrail('trailAnchored', true) },
];
