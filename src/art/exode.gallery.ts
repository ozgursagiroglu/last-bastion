/**
 * Reference gallery for the shared builder: the style techniques every art lane uses (see CLAUDE.md "Art style").
 * `pnpm art:render reference` → out/renders/reference-*.png
 */
import { linear, makeArtboard, radial, solid, SpriteBuilder, type SpriteInstance } from './exode';
import type { GalleryEntry } from './gallery';
import { OUTLINE, PALETTE } from './palette';
import { loopClip } from '../render/exodeRuntime';

/** A small cartoon crate on a ground shadow: outline, vertical gradient, top-left highlight, contact shadow. */
function sampleCrate(prefix: string, x: number, y: number): SpriteInstance {
  const b = new SpriteBuilder(prefix, { x, y });
  b.ellipse('shadow', 70, 22, { fill: solid('#000000', 0.3) });
  b.group('body', { y: -26 });
  b.rect('box', 56, 48, { radius: 6, fill: linear([[0, PALETTE.wood.light], [1, PALETTE.wood.dark]]), stroke: { color: OUTLINE, width: 3 } }, 'body');
  b.rect('plank', 56, 8, { radius: 2, fill: PALETTE.wood.dark, stroke: { color: OUTLINE, width: 2 } }, 'body');
  b.path('shine', [{ x: -22, y: -18 }, { x: 10, y: -18 }, { x: -22, y: -4 }], { closed: true, fill: solid('#ffffff', 0.3) }, 'body');
  b.circle('gem', 7, { y: -24, fill: radial([[0, '#fff3b0'], [1, PALETTE.gold.dark]], [0.35, 0.35], 0.6), stroke: { color: OUTLINE, width: 2 } }, 'body');
  b.clip('idle', 1.2, { body: { y: [[0, -26, 'EaseInOutSine'], [0.6, -30, 'EaseInOutSine'], [1.2, -26]] } });
  return b.build();
}

function swatches(): SpriteInstance {
  const b = new SpriteBuilder('swatches', { x: 40, y: 40 });
  Object.entries(PALETTE).forEach(([name, ramp], i) => {
    b.rect(`${name}-light`, 36, 36, { x: i * 44, fill: ramp.light, stroke: { color: OUTLINE, width: 2 } });
    b.rect(`${name}-dark`, 36, 36, { x: i * 44, y: 40, fill: ramp.dark, stroke: { color: OUTLINE, width: 2 } });
  });
  return b.build();
}

const crate = sampleCrate('crate', 160, 220);
const title = new SpriteBuilder('title', { x: 470, y: 200 });
title.outlinedText('text', 'LAST BASTION', { size: 54, outline: { color: OUTLINE, width: 6 }, fill: PALETTE.gold.light });
title.outlinedText('corners', 'WAVE 4 · MAX 1/10', { size: 30, y: 52, outline: { color: OUTLINE, width: 4 }, fill: '#ffffff' });
title.text('plain', 'plain text, no outline', { size: 22, y: 92, fill: '#ffffff' });

const scene = makeArtboard('reference', [...swatches().objects, ...crate.objects, ...title.build().objects], {
  width: 720,
  height: 300,
  background: '#3a5f2e',
});

const strip = sampleCrate('strip', 60, 110);
const idle = strip.clips.idle;
if (!idle) throw new Error('sampleCrate has no idle clip');

export const gallery: GalleryEntry[] = [
  { name: 'reference-style', artboard: scene },
  {
    name: 'reference-idle-clip',
    artboard: makeArtboard('reference-idle', strip.objects, { width: 120, height: 130, background: '#3a5f2e' }),
    scale: 2,
    frames: [0, 0.3, 0.6, 0.9].map((t) => ({ label: `idle t=${t}`, apply: (engine) => loopClip(engine, idle, t) })),
  },
];
