/**
 * Renders media from the game's own ExodeUI art in Node: the icons in public/ and the README screenshots in docs/media/.
 * Usage: pnpm media [icons|screenshots]   (default: both)
 * The Open Graph image (public/og-image.png) and the title, level-select, wave-start and battle screenshots are captured
 * from the running game in a browser instead: King Sunny is a DOM web component, which Node cannot render.
 * Output is byte-for-byte repeatable: fixed time steps, and Math.random (the engine's particle emitters) is seeded
 * again before every image.
 */
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import type { ExodeUIEngine } from 'exodeui';
import { clipsOf, linear, makeArtboard, placeRoot, SpriteBuilder } from '../src/art/exode';
import type { GalleryEntry } from '../src/art/gallery';
import { gallery as enemiesGallery } from '../src/art/enemies/enemies.gallery';
import { OUTLINE, PALETTE } from '../src/art/palette';
import { buildTowerSprite } from '../src/art/towers';
import { gallery as towersGallery } from '../src/art/towers/towers.gallery';
import { poseTower } from '../src/art/towers/pose';
import { renderArtboard, renderFrames } from '../src/platform/nodeCanvas';
import { gallery as sceneGallery } from '../src/render/scene/scene.gallery';
import { gallery as hudGallery } from '../src/ui/hud/hud.gallery';

const root = resolve(import.meta.dirname, '..');
const publicDir = join(root, 'public');
const mediaDir = join(root, 'docs', 'media');

const WEBP_QUALITIES = [90, 85, 80, 75];
const WEBP_MAX_BYTES = 400 * 1024;
const BADGE_DARK = '#14110f';
/** Icon design size: every icon is this one artboard, rendered at its size (or shrunk from it, below this size). */
const ICON_BOARD = 128;
const ICON_TOWER_SCALE = 1.08;
/** The level-3 cannon spans about y -73..+12 around its root: this centers it in the badge. */
const ICON_TOWER_LIFT = 30;
const ICON_AIM = 0;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** `crop` keeps part of a gallery sheet (the enemy lineup's top row is the sprites at 2×). */
const SCREENSHOTS: readonly { file: string; entry: string; crop?: Rect }[] = [
  { file: 'meadow', entry: 'scene-level-01' },
  { file: 'desert', entry: 'scene-level-05' },
  { file: 'snow', entry: 'scene-level-07' },
  { file: 'volcano', entry: 'scene-level-10' },
  { file: 'build-menu', entry: 'hud-build-menu' },
  { file: 'victory', entry: 'hud-victory' },
  { file: 'towers', entry: 'towers-levels' },
  { file: 'enemies', entry: 'enemies-lineup', crop: { x: 0, y: 0, w: 1152, h: 248 } },
];

const ICONS: readonly { file: string; size: number; background: string | null }[] = [
  { file: 'icon-512.png', size: 512, background: null },
  { file: 'icon-192.png', size: 192, background: null },
  { file: 'apple-touch-icon.png', size: 180, background: BADGE_DARK },
  { file: 'favicon-32.png', size: 32, background: null },
  { file: 'favicon-16.png', size: 16, background: null },
];

/** mulberry32: a small seeded generator standing in for Math.random. */
function seedRandom(seed: number): void {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function write(file: string, data: Buffer, canvas: Canvas): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
  console.log(`${relative(root, file)}  ${canvas.width}x${canvas.height}  ${(data.length / 1024).toFixed(0)} KB`);
}

function writePng(file: string, canvas: Canvas): void {
  write(file, canvas.toBuffer('image/png'), canvas);
}

/** WebP at the best quality that stays under WEBP_MAX_BYTES. */
function writeWebp(file: string, canvas: Canvas): void {
  for (const quality of WEBP_QUALITIES) {
    const data = canvas.toBuffer('image/webp', quality);
    if (data.length <= WEBP_MAX_BYTES) return write(file, data, canvas);
  }
  throw new Error(`${relative(root, file)} stays over ${WEBP_MAX_BYTES} bytes at quality ${WEBP_QUALITIES.at(-1)}`);
}

function galleryEntry(name: string): GalleryEntry {
  const all = [...sceneGallery, ...hudGallery, ...towersGallery, ...enemiesGallery];
  const entry = all.find((e) => e.name === name);
  if (!entry) throw new Error(`no gallery entry '${name}'`);
  return entry;
}

function renderEntry(entry: GalleryEntry): Canvas {
  if ('render' in entry) return entry.render();
  if (entry.frames) return renderFrames(entry.artboard, entry.frames, { scale: entry.scale, columns: entry.columns });
  return renderArtboard(entry.artboard, { scale: entry.scale, prepare: entry.prepare });
}

/** A level-3 cannon on a round dark badge with a gold rim. */
function renderIcon(size: number, background: string | null): Canvas {
  const center = ICON_BOARD / 2;
  const badge = new SpriteBuilder('icon-badge', { x: center, y: center });
  badge.circle('rim', center - 2, {
    fill: linear([[0, PALETTE.gold.light], [1, PALETTE.gold.dark]]),
    stroke: { color: OUTLINE, width: 3 },
  });
  badge.circle('face', center - 10, { fill: BADGE_DARK, stroke: { color: OUTLINE, width: 2 } });
  const tower = placeRoot(buildTowerSprite('cannon', 'icon-tower'), center, center + ICON_TOWER_LIFT, ICON_TOWER_SCALE);
  const artboard = makeArtboard('icon', [...badge.build().objects, ...tower.objects], {
    width: ICON_BOARD,
    height: ICON_BOARD,
    background,
    animations: clipsOf([tower]),
  });
  const prepare = (engine: ExodeUIEngine) => poseTower(engine, tower, 3, ICON_AIM);
  if (size >= ICON_BOARD) return renderArtboard(artboard, { scale: size / ICON_BOARD, prepare });
  // Stroke widths stay in screen pixels at any render scale, so small icons are shrunk from the design size instead.
  let canvas = renderArtboard(artboard, { prepare });
  while (canvas.width > size) canvas = resized(canvas, Math.max(size, Math.round(canvas.width / 2)));
  return canvas;
}

function cropped(source: Canvas, r: Rect): Canvas {
  if (r.x + r.w > source.width || r.y + r.h > source.height) throw new Error(`crop ${JSON.stringify(r)} is outside ${source.width}x${source.height}`);
  const out = createCanvas(r.w, r.h);
  out.getContext('2d').drawImage(source, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return out;
}

function resized(source: Canvas, size: number): Canvas {
  const out = createCanvas(size, size);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, size, size);
  return out;
}

/** Favicons side by side, magnified without smoothing on the browser tab's light and dark backgrounds (git-ignored). */
function magnified(canvases: readonly Canvas[]): Canvas {
  const zoom = 8;
  const gap = 16;
  const backgrounds = ['#f1f3f4', '#202124'];
  const cell = Math.max(...canvases.map((c) => c.width)) * zoom + gap;
  const out = createCanvas(canvases.length * cell + gap, backgrounds.length * cell + gap);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  backgrounds.forEach((color, row) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, row * cell, out.width, cell + gap);
    canvases.forEach((c, col) => ctx.drawImage(c, gap + col * cell, gap + row * cell, c.width * zoom, c.height * zoom));
  });
  return out;
}

const STEPS = ['icons', 'screenshots'] as const;
const only = process.argv[2];
if (only !== undefined && !STEPS.some((s) => s === only)) throw new Error(`unknown step '${only}' (steps: ${STEPS.join(', ')})`);
const runs = (step: (typeof STEPS)[number]) => only === undefined || only === step;

if (runs('icons')) {
  const icons = ICONS.map((icon) => ({ ...icon, canvas: renderIcon(icon.size, icon.background) }));
  for (const icon of icons) writePng(join(publicDir, icon.file), icon.canvas);
  writePng(join(root, 'out', 'media', 'favicons-8x.png'), magnified(icons.filter((i) => i.size <= 32).map((i) => i.canvas)));
}

if (runs('screenshots')) {
  for (const shot of SCREENSHOTS) {
    seedRandom(1);
    const canvas = renderEntry(galleryEntry(shot.entry));
    writeWebp(join(mediaDir, `${shot.file}.webp`), shot.crop ? cropped(canvas, shot.crop) : canvas);
  }
}
