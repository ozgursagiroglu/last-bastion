/**
 * Gallery entries are rendered to PNG by `pnpm art:render [filter]` (scripts/render-art.ts) so art can be checked by
 * eye. Any file named `*.gallery.ts` under src/ that exports `gallery: GalleryEntry[]` is picked up. Output goes to
 * out/renders/<name>.png (git-ignored).
 */
import type { Canvas } from '@napi-rs/canvas';
import type { Artboard, ExodeUIEngine } from 'exodeui';

export interface GalleryFrame {
  label: string;
  apply: (engine: ExodeUIEngine) => void;
}

interface GalleryBase {
  /** File name without extension; use a lane prefix, e.g. 'towers-rifle-levels'. */
  name: string;
}

export interface ArtboardGalleryEntry extends GalleryBase {
  artboard: Artboard;
  /** Output scale (default 1). Use 2–3 for close-ups of small sprites. */
  scale?: number;
  /** Runs after load, before a single render (ignored when `frames` is set). */
  prepare?: (engine: ExodeUIEngine) => void;
  /** Render a labelled filmstrip instead of one image (e.g. a clip at several times). */
  frames?: GalleryFrame[];
  /** Filmstrip cells per row (default: all in one row). */
  columns?: number;
}

/** Custom rendering, e.g. several stacked stages composited into one image (use src/platform/nodeCanvas.ts). */
export interface CustomGalleryEntry extends GalleryBase {
  render: () => Canvas;
}

export type GalleryEntry = ArtboardGalleryEntry | CustomGalleryEntry;
