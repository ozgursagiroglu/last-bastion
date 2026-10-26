/**
 * HUD gallery: the level's terrain, its towers, then the HUD stage on top. `pnpm art:render hud` → out/renders/hud-*.png
 */
import type { Canvas } from '@napi-rs/canvas';
import { clipsOf, makeArtboard, placeRoot } from '../../art/exode';
import type { GalleryEntry } from '../../art/gallery';
import { buildTowerSprite } from '../../art/towers';
import { poseTower } from '../../art/towers/pose';
import { buildTerrainArtboard } from '../../art/world/terrain';
import { getLevel } from '../../game/levels';
import { createSimulation } from '../../game/sim';
import { DESIGN_HEIGHT, DESIGN_WIDTH, type Command, type Difficulty, type LevelDef, type Simulation, type WorldView } from '../../game/types';
import { createNodeCanvas, renderArtboard } from '../../platform/nodeCanvas';
import type { HudState } from '../types';
import { drawPortraitStandIn } from '../menus/nodeCanvasLike';
import { GameHud } from './gameHud';
import { CORNER_PORTRAIT, OVERLAY_PORTRAIT, type BubbleLine, type BubbleTail, type Portrait } from './mascotBubble';
import { nodeCanvasLike, playOut, stepUntil } from './scenarios';

const RUNNING: HudState = { speed: 1, paused: false, soundOn: true };

function towersLayer(view: WorldView): Canvas | null {
  if (view.towers.length === 0) return null;
  const sprites = [...view.towers]
    .sort((a, b) => a.pos.y - b.pos.y)
    .map((t) => ({ tower: t, sprite: placeRoot(buildTowerSprite(t.kind, `tower${t.id}`), t.pos.x, t.pos.y) }));
  const artboard = makeArtboard('towers', sprites.flatMap((s) => s.sprite.objects), { background: null, animations: clipsOf(sprites.map((s) => s.sprite)) });
  return renderArtboard(artboard, { prepare: (engine) => sprites.forEach((s) => poseTower(engine, s.sprite, s.tower.level, s.tower.aim)) });
}

function compose(level: LevelDef, view: WorldView, hudCanvas: Canvas): Canvas {
  const out = createNodeCanvas(DESIGN_WIDTH, DESIGN_HEIGHT);
  const ctx = out.getContext('2d');
  ctx.drawImage(renderArtboard(buildTerrainArtboard(level)), 0, 0);
  const towers = towersLayer(view);
  if (towers) ctx.drawImage(towers, 0, 0);
  ctx.drawImage(hudCanvas, 0, 0);
  return out;
}

interface Shot {
  sim: Simulation;
  hud: GameHud;
  /** Where the mascot portrait sits, drawn as a stand-in disc. */
  portrait?: Portrait;
}

/** A HUD over a real simulation (fresh, or from `makeSim`); `setup` drives both, then the composite is rendered. */
function shot(name: string, levelId: number, difficulty: Difficulty, setup: (s: Shot) => void, makeSim?: () => Simulation): GalleryEntry {
  return {
    name,
    render: () => {
      const level = getLevel(levelId);
      const canvas = nodeCanvasLike(DESIGN_WIDTH, DESIGN_HEIGHT);
      const s: Shot = { sim: makeSim ? makeSim() : createSimulation(level, difficulty), hud: new GameHud(canvas, level) };
      s.hud.resize(DESIGN_WIDTH, DESIGN_HEIGHT, 1);
      setup(s);
      const out = compose(level, s.sim.view, canvas.node);
      if (s.portrait) drawPortraitStandIn(out, s.portrait);
      return out;
    },
  };
}

function mascotShot(name: string, line: BubbleLine, portrait: Portrait, tail: BubbleTail, levelId = 2): GalleryEntry {
  return shot(name, levelId, 'normal', (s) => {
    s.portrait = portrait;
    s.hud.render(s.sim.view, { ...RUNNING, mascot: { line, portrait, tail } }, 0.1);
  });
}

function run(s: Shot, cmd: Command): void {
  if (!s.sim.command(cmd).ok) throw new Error(`gallery command refused: ${JSON.stringify(cmd)}`);
}

function click(s: Shot, p: { x: number; y: number }): void {
  s.hud.pointer('down', p, s.sim.view);
  s.hud.pointer('up', p, s.sim.view);
}

function padAt(level: LevelDef, i: number): { x: number; y: number } {
  const pad = level.pads[i];
  if (!pad) throw new Error(`no pad ${i}`);
  return pad;
}

export const gallery: GalleryEntry[] = [
  shot('hud-ready', 1, 'normal', (s) => {
    s.hud.pointer('move', padAt(s.sim.view.level, 2), s.sim.view);
    s.hud.render(s.sim.view, RUNNING, 0.55);
  }),
  shot('hud-build-menu', 6, 'normal', (s) => {
    run(s, { type: 'build', pad: 0, kind: 'cannon' });
    run(s, { type: 'build', pad: 1, kind: 'frost' });
    const pad = padAt(s.sim.view.level, 4);
    click(s, pad);
    s.hud.render(s.sim.view, RUNNING, 0.1);
    const slot = s.hud.openMenu?.slots[1];
    if (slot) s.hud.pointer('move', slot, s.sim.view);
    s.hud.render(s.sim.view, RUNNING, 0.1);
  }),
  shot('hud-build-menu-top-edge', 7, 'normal', (s) => {
    click(s, padAt(s.sim.view.level, 0));
    const slot = s.hud.openMenu?.slots[4];
    if (slot) s.hud.pointer('move', slot, s.sim.view);
    s.hud.render(s.sim.view, RUNNING, 0.1);
  }),
  shot('hud-build-menu-corner', 7, 'normal', (s) => {
    click(s, padAt(s.sim.view.level, 12));
    const slot = s.hud.openMenu?.slots[2];
    if (slot) s.hud.pointer('move', slot, s.sim.view);
    s.hud.render(s.sim.view, RUNNING, 0.1);
  }),
  shot('hud-tower-menu', 1, 'normal', (s) => {
    run(s, { type: 'build', pad: 3, kind: 'rifle' });
    const tower = s.sim.view.towers[0];
    if (tower) run(s, { type: 'upgrade', towerId: tower.id });
    click(s, padAt(s.sim.view.level, 3));
    s.hud.render(s.sim.view, RUNNING, 0.1);
  }),
  shot('hud-countdown', 2, 'normal', (s) => {
    run(s, { type: 'build', pad: 1, kind: 'rifle' });
    run(s, { type: 'callWave' });
    s.hud.onEvents(stepUntil(s.sim, (v) => v.nextWaveIn !== null && v.nextWaveIn < 7.4), s.sim.view);
    s.hud.render(s.sim.view, { speed: 2, paused: false, soundOn: false }, 3);
  }),
  shot('hud-wave-banner', 3, 'normal', (s) => {
    run(s, { type: 'callWave' });
    s.hud.onEvents(s.sim.step(), s.sim.view);
    s.hud.render(s.sim.view, RUNNING, 0.7);
  }),
  shot('hud-boss-banner', 5, 'normal', (s) => {
    run(s, { type: 'callWave' });
    s.hud.onEvents(stepUntil(s.sim, (v) => v.nextWaveIn !== null), s.sim.view);
    const boss = s.sim.view.level.waves.findIndex((w) => w.groups.some((g) => g.enemy === 'boss'));
    s.hud.render(s.sim.view, RUNNING, 3);
    s.hud.onEvents([{ type: 'waveStarted', wave: boss, early: false, bonus: 0 }], s.sim.view);
    s.hud.render(s.sim.view, RUNNING, 0.8);
  }),
  shot('hud-pause', 4, 'normal', (s) => {
    run(s, { type: 'callWave' });
    stepUntil(s.sim, (v) => v.time > 6);
    s.hud.render(s.sim.view, RUNNING, 0.1);
    s.hud.render(s.sim.view, { ...RUNNING, paused: true }, 0.1);
    s.hud.render(s.sim.view, { ...RUNNING, paused: true }, 0.5);
  }),
  shot('hud-victory', 1, 'easy', (s) => {
    for (let t = 0; t < 3; t += 0.25) s.hud.render(s.sim.view, RUNNING, 0.25);
  }, () => playOut(getLevel(1), 'easy', 'greedy').sim),
  shot('hud-defeat', 1, 'hard', (s) => {
    s.hud.render(s.sim.view, RUNNING, 0.1);
    s.hud.render(s.sim.view, RUNNING, 1);
  }, () => playOut(getLevel(1), 'hard', 'none').sim),
  mascotShot('hud-mascot-breaking', 'breaking', CORNER_PORTRAIT, 'left'),
  mascotShot('hud-mascot-splendid', 'splendid', CORNER_PORTRAIT, 'left', 7),
  shot('hud-mascot-victory', 1, 'easy', (s) => {
    s.portrait = OVERLAY_PORTRAIT;
    for (let t = 0; t < 3; t += 0.25) s.hud.render(s.sim.view, { ...RUNNING, mascot: { line: 'victory', portrait: OVERLAY_PORTRAIT, tail: 'down' } }, 0.25);
  }, () => playOut(getLevel(1), 'easy', 'greedy').sim),
  shot('hud-mascot-defeat', 1, 'hard', (s) => {
    s.portrait = OVERLAY_PORTRAIT;
    for (let t = 0; t < 1; t += 0.25) s.hud.render(s.sim.view, { ...RUNNING, mascot: { line: 'defeat', portrait: OVERLAY_PORTRAIT, tail: 'down' } }, 0.25);
  }, () => playOut(getLevel(1), 'hard', 'none').sim),
];
