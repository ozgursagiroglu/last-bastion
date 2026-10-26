/**
 * Renders every gallery entry to out/renders/<name>.png.
 * Usage: pnpm art:render [filter]   (filter: substring of entry names or gallery file paths)
 */
import { readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GalleryEntry } from '../src/art/gallery';
import { renderArtboard, renderFrames, savePng } from '../src/platform/nodeCanvas';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'out', 'renders');
const filter = process.argv[2] ?? '';

function galleryFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return galleryFiles(p);
    return e.name.endsWith('.gallery.ts') ? [p] : [];
  });
}

let rendered = 0;
for (const file of galleryFiles(join(root, 'src')).sort()) {
  const rel = relative(root, file);
  const mod = (await import(pathToFileURL(file).href)) as { gallery?: GalleryEntry[] };
  if (!Array.isArray(mod.gallery)) {
    console.error(`${rel}: no exported 'gallery' array`);
    process.exitCode = 1;
    continue;
  }
  for (const entry of mod.gallery) {
    if (filter && !entry.name.includes(filter) && !rel.includes(filter)) continue;
    const canvas =
      'render' in entry
        ? entry.render()
        : entry.frames
          ? renderFrames(entry.artboard, entry.frames, { scale: entry.scale, columns: entry.columns })
          : renderArtboard(entry.artboard, { scale: entry.scale, prepare: entry.prepare });
    const out = join(outDir, `${entry.name}.png`);
    savePng(canvas, out);
    rendered++;
    console.log(`${relative(root, out)}  ${canvas.width}x${canvas.height}  (${rel})`);
  }
}
console.log(`${rendered} image(s) rendered${filter ? ` for filter '${filter}'` : ''}`);
if (rendered === 0) process.exitCode = 1;
