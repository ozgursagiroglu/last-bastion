/**
 * Menu screens: `pnpm art:render menus` → out/renders/menus-*.png. Each image is the real screen controller rendered
 * into a Node canvas.
 */
import type { Canvas } from '@napi-rs/canvas';
import type { GalleryEntry } from '../../art/gallery';
import { LEVELS } from '../../game/levels';
import { DESIGN_HEIGHT, DESIGN_WIDTH, type Difficulty, type ProgressData, type Vec2 } from '../../game/types';
import { createNodeCanvas } from '../../platform/nodeCanvas';
import { LevelSelectScreen } from './levelSelect';
import { LEVELS_MASCOT, TAB, tabX } from './levelSelectArt';
import { drawPortraitStandIn, flatten, nodeLayers } from './nodeCanvasLike';
import { emptyProgress, recordWin } from './progress';
import { TITLE_MASCOT } from './titleArt';
import { TitleScreen } from './titleScreen';

const LABEL_H = 24;

/** Cells stacked vertically with a caption under each. */
function sheet(cells: readonly { label: string; canvas: Canvas }[]): Canvas {
  const out = createNodeCanvas(DESIGN_WIDTH, cells.length * (DESIGN_HEIGHT + LABEL_H));
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, out.width, out.height);
  cells.forEach((cell, i) => {
    const y = i * (DESIGN_HEIGHT + LABEL_H);
    ctx.drawImage(cell.canvas, 0, y);
    ctx.fillStyle = '#dddddd';
    ctx.font = '16px sans-serif';
    ctx.fillText(cell.label, 8, y + DESIGN_HEIGHT + 17);
  });
  return out;
}

function titleEntry(): GalleryEntry {
  return {
    name: 'menus-title',
    render: () => {
      const layers = nodeLayers(['back', 'live', 'front'] as const, DESIGN_WIDTH, DESIGN_HEIGHT);
      const screen = new TitleScreen(layers);
      screen.resize(DESIGN_WIDTH, DESIGN_HEIGHT, 1);
      const cells: { label: string; canvas: Canvas }[] = [];
      const moments = [
        { label: 't = 0 s, sound on', at: 0, sound: true },
        { label: 't = 4.3 s, sound off, PLAY hovered', at: 4.3, sound: false, hover: true },
        { label: 't = 11 s, sound on', at: 11, sound: true },
      ];
      let now = 0;
      for (const m of moments) {
        screen.pointer('move', m.hover ? { x: 640, y: 392 } : { x: 0, y: 0 });
        while (now < m.at - 1e-9) {
          const dt = Math.min(1 / 30, m.at - now);
          screen.render(dt, m.sound);
          now += dt;
        }
        screen.render(0, m.sound);
        const copy = flatten([layers.back, layers.live, layers.front]);
        drawPortraitStandIn(copy, TITLE_MASCOT);
        cells.push({ label: m.label, canvas: copy });
      }
      return sheet(cells);
    },
  };
}

function levelsEntry(name: string, progress: () => ProgressData, difficulty: Difficulty, selected?: number, hover?: Vec2): GalleryEntry {
  return {
    name,
    render: () => {
      const layers = nodeLayers(['back', 'live'] as const, DESIGN_WIDTH, DESIGN_HEIGHT);
      const screen = new LevelSelectScreen(layers, LEVELS, progress(), difficulty, selected);
      screen.resize(DESIGN_WIDTH, DESIGN_HEIGHT, 1);
      if (hover) screen.pointer('move', hover);
      screen.render(0.4, true);
      const out = flatten([layers.back, layers.live]);
      drawPortraitStandIn(out, LEVELS_MASCOT);
      return out;
    },
  };
}

/** Levels 1–6 unlocked: 1–5 won with mixed stars per difficulty. */
function midProgress(): ProgressData {
  const wins: readonly [number, Difficulty, 1 | 2 | 3][] = [
    [1, 'easy', 3], [1, 'normal', 3], [1, 'hard', 2],
    [2, 'normal', 2], [2, 'easy', 3],
    [3, 'normal', 3], [3, 'hard', 1],
    [4, 'normal', 1],
    [5, 'easy', 2], [5, 'normal', 2],
  ];
  return wins.reduce((p, [level, d, stars]) => recordWin(p, level, d, stars, LEVELS.length), emptyProgress(LEVELS.length));
}

function doneProgress(): ProgressData {
  let p = emptyProgress(LEVELS.length);
  for (const level of LEVELS) {
    p = recordWin(p, level.id, 'normal', 3, LEVELS.length);
    p = recordWin(p, level.id, 'easy', 3, LEVELS.length);
    p = recordWin(p, level.id, 'hard', level.id % 3 === 0 ? 2 : 3, LEVELS.length);
  }
  return p;
}

export const gallery: GalleryEntry[] = [
  titleEntry(),
  levelsEntry('menus-levels-fresh', () => emptyProgress(LEVELS.length), 'normal'),
  levelsEntry('menus-levels-mid', midProgress, 'normal', 4, { x: tabX(2), y: TAB.y }),
  levelsEntry('menus-levels-done', doneProgress, 'hard', 10),
];
