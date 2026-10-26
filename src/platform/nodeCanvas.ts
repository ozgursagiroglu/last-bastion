/**
 * Node-side rendering of ExodeUI artboards, for tests and the gallery script (`pnpm art:render`).
 * Installs the few DOM globals the engine touches, backed by @napi-rs/canvas, and registers the game font.
 * Never import this from browser code.
 */
import { createCanvas, DOMMatrix, GlobalFonts, Image, Path2D, type Canvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExodeUIEngine, type Artboard } from 'exodeui';
import { GAME_FONT } from '../art/fonts';

const FONT_FILE = fileURLToPath(new URL('../../public/fonts/LilitaOne-Regular.ttf', import.meta.url));

let installed = false;

export function installNodeCanvas(): void {
  if (installed) return;
  installed = true;
  const g = globalThis as Record<string, unknown>;
  g.Path2D ??= Path2D;
  g.DOMMatrix ??= DOMMatrix;
  g.Image ??= Image;
  g.document ??= {
    createElement: (tag: string) => (tag === 'canvas' ? createCanvas(1, 1) : { style: {}, setAttribute() {} }),
    getElementById: () => null,
    head: { appendChild() {} },
  };
  if (!GlobalFonts.registerFromPath(FONT_FILE, GAME_FONT)) throw new Error(`Could not register ${FONT_FILE}`);
}

export function createNodeCanvas(width: number, height: number): Canvas {
  installNodeCanvas();
  return createCanvas(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
}

/** A 2D context typed as the DOM one, which is what the engine and Stage expect. */
export function context2d(canvas: Canvas): CanvasRenderingContext2D {
  return canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
}

/** An engine set up like a Stage ('Contain', 'Center') with the artboard loaded. */
export function loadEngine(artboard: Artboard): ExodeUIEngine {
  installNodeCanvas();
  const engine = new ExodeUIEngine();
  engine.setLayout('Contain', 'Center');
  engine.load(artboard);
  return engine;
}

export function renderEngine(engine: ExodeUIEngine, width: number, height: number): Canvas {
  const canvas = createNodeCanvas(width, height);
  engine.render(context2d(canvas), canvas.width, canvas.height);
  return canvas;
}

export interface RenderOpts {
  /** Output scale relative to the artboard size. Default 1. */
  scale?: number;
  /** Runs after load, before rendering (set state, apply clips). */
  prepare?: (engine: ExodeUIEngine) => void;
}

export function renderArtboard(artboard: Artboard, opts: RenderOpts = {}): Canvas {
  const engine = loadEngine(artboard);
  opts.prepare?.(engine);
  const scale = opts.scale ?? 1;
  return renderEngine(engine, artboard.width * scale, artboard.height * scale);
}

export interface Frame {
  label: string;
  /** Sets engine state for this frame (e.g. playClip at a time). Frames run in order on one engine. */
  apply: (engine: ExodeUIEngine) => void;
}

/** A labelled filmstrip: one cell per frame, `columns` cells per row. */
export function renderFrames(artboard: Artboard, frames: readonly Frame[], opts: { scale?: number; columns?: number } = {}): Canvas {
  const scale = opts.scale ?? 1;
  const columns = Math.max(1, Math.min(opts.columns ?? frames.length, frames.length));
  const cellW = Math.round(artboard.width * scale);
  const cellH = Math.round(artboard.height * scale);
  const labelH = 22;
  const rows = Math.ceil(frames.length / columns);
  const sheet = createNodeCanvas(columns * cellW, rows * (cellH + labelH));
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  const engine = loadEngine(artboard);
  frames.forEach((frame, i) => {
    frame.apply(engine);
    const cell = renderEngine(engine, cellW, cellH);
    const x = (i % columns) * cellW;
    const y = Math.floor(i / columns) * (cellH + labelH);
    ctx.drawImage(cell, x, y);
    ctx.fillStyle = '#dddddd';
    ctx.font = '14px sans-serif';
    ctx.fillText(frame.label, x + 6, y + cellH + 16);
  });
  return sheet;
}

export function savePng(canvas: Canvas, file: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, canvas.toBuffer('image/png'));
}

export function pixelAt(canvas: Canvas, x: number, y: number): [number, number, number, number] {
  const d = canvas.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data;
  return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, d[3] ?? 0];
}

/** Number of pixels with alpha > 0 inside the rect (the whole canvas by default). */
export function countPainted(canvas: Canvas, rect?: { x: number; y: number; w: number; h: number }): number {
  const r = rect ?? { x: 0, y: 0, w: canvas.width, h: canvas.height };
  const data = canvas.getContext('2d').getImageData(r.x, r.y, r.w, r.h).data;
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) n++;
  return n;
}
