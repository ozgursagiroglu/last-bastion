/**
 * UI kit gallery. `pnpm art:render ui` → out/renders/ui-*.png
 */
import type { ExodeUIEngine } from 'exodeui';
import { makeArtboard, solid, SpriteBuilder } from '../exode';
import type { GalleryEntry } from '../gallery';
import { OUTLINE, PALETTE } from '../palette';
import { setPathPoints } from '../../render/exodeRuntime';
import { addIcon, ICON_NAMES, type IconName } from './icons';
import { addButton, addCostTag, addCounter, addPanel, addRing, addRoundButton, addStars, ringPoints, type ButtonParts, type ButtonVariant, type PanelVariant } from './kit';
import { poseButton, poseStars, type ButtonState } from './pose';
import { addLabel } from './text';

const GRASS = '#3a5f2e';
const VARIANTS: readonly ButtonVariant[] = ['green', 'blue', 'red', 'gold', 'stone'];
const VARIANT_ICON: Record<ButtonVariant, IconName> = { green: 'play', blue: 'retry', red: 'close', gold: 'upgrade', stone: 'home' };
const VARIANT_LABEL: Record<ButtonVariant, string> = { green: 'PLAY', blue: 'RETRY', red: 'QUIT', gold: 'UPGRADE', stone: 'MENU' };

function buttonsBoard() {
  const b = new SpriteBuilder('btns');
  const disabled: ButtonParts[] = [];
  VARIANTS.forEach((v, i) => {
    const y = 44 + i * 74;
    addButton(b, `${v}-label`, { w: 160, h: 54, x: 100, y, variant: v, label: VARIANT_LABEL[v] });
    disabled.push(addButton(b, `${v}-off`, { w: 160, h: 54, x: 280, y, variant: v, label: VARIANT_LABEL[v] }));
    addButton(b, `${v}-icon`, { w: 190, h: 54, x: 475, y, variant: v, label: VARIANT_LABEL[v], icon: VARIANT_ICON[v] });
    addButton(b, `${v}-only`, { w: 70, h: 54, x: 630, y, variant: v, icon: VARIANT_ICON[v] });
    addRoundButton(b, `${v}-round`, { r: 28, x: 715, y, variant: v, icon: i % 2 === 0 ? 'pause' : 'fast' });
    disabled.push(addRoundButton(b, `${v}-roundoff`, { r: 28, x: 790, y, variant: v, icon: i % 2 === 0 ? 'soundOn' : 'soundOff' }));
  });
  return {
    artboard: makeArtboard('ui-buttons', b.build().objects, { width: 840, height: 400, background: GRASS }),
    prepare: (engine: ExodeUIEngine) => disabled.forEach((btn) => poseButton(engine, btn, 'disabled')),
  };
}

function panelsBoard() {
  const b = new SpriteBuilder('panels');
  const variants: readonly PanelVariant[] = ['wood', 'stone', 'dark'];
  variants.forEach((v, i) => {
    const x = 200 + i * 400;
    addPanel(b, `${v}-big`, { w: 360, h: 240, x, y: 150, variant: v });
    addLabel(b, `${v}-big.title`, `${v.toUpperCase()} PANEL`, 'heading', { y: -70 }, `${v}-big`);
    addLabel(b, `${v}-big.body`, 'Build towers to stop the waves.', 'body', { y: -20 }, `${v}-big`);
    addLabel(b, `${v}-big.small`, 'Small print: 3 waves left', 'small', { y: 10 }, `${v}-big`);
    addButton(b, `${v}-big.ok`, { w: 140, h: 48, y: 70, variant: 'green', label: 'OK' }, `${v}-big`);
    addPanel(b, `${v}-small`, { w: 220, h: 120, x, y: 380, variant: v });
    addCostTag(b, `${v}-small.cost`, { value: 125, y: -20 }, `${v}-small`);
    addLabel(b, `${v}-small.hud`, '20', 'hud', { y: 22 }, `${v}-small`);
  });
  return makeArtboard('ui-panels', b.build().objects, { width: 1200, height: 470, background: GRASS });
}

function iconsBoard() {
  const b = new SpriteBuilder('icons');
  const step = 72;
  const left = 50;
  b.rect('light', 1320, 190, { x: 660, y: 95, fill: '#e8dcc0' });
  b.rect('dark', 1320, 190, { x: 660, y: 285, fill: '#2a2320' });
  ICON_NAMES.forEach((icon, i) => {
    const x = left + i * step;
    for (const [bg, top] of [['l', 0], ['d', 190]] as const) {
      addIcon(b, `${icon}-${bg}64`, icon, { size: 64, x, y: top + 44 });
      addIcon(b, `${icon}-${bg}32`, icon, { size: 32, x, y: top + 106 });
      addIcon(b, `${icon}-${bg}24`, icon, { size: 24, x, y: top + 146 });
    }
    b.text(`${icon}-name`, icon, { size: 13, x, y: 176, fill: OUTLINE });
  });
  return makeArtboard('ui-icons', b.build().objects, { width: 1320, height: 380, background: '#000000' });
}

function widgetsBoard() {
  const b = new SpriteBuilder('widgets');
  b.rect('hudbar', 560, 60, { x: 300, y: 40, radius: 12, fill: solid('#120d0a', 0.6) });
  addCounter(b, 'lives', { icon: 'heart', text: '20', x: 110, y: 40 });
  addCounter(b, 'gold', { icon: 'coin', text: '1350', x: 270, y: 40 });
  addCounter(b, 'wave', { icon: 'swords', text: '3/10', x: 470, y: 40 });
  [70, 125, 1500].forEach((value, i) => addCostTag(b, `cost${i}`, { value, x: 80 + i * 140, y: 110 }));
  addCostTag(b, 'cost-small', { value: 60, x: 500, y: 110, size: 15 });
  const stars = [0, 1, 2, 3].map((n) => ({ n, parts: addStars(b, `stars${n}`, { count: 3, size: 34, x: 75 + n * 150, y: 175 }) }));
  const progress = [0, 0.25, 0.6, 1];
  const rings = progress.map((p, i) => {
    const x = 75 + i * 150;
    const y = 270;
    b.circle(`track${i}`, 30, { x, y, fill: solid('#120d0a', 0.55), stroke: { color: OUTLINE, width: 9 } });
    const id = addRing(b, `ring${i}`, { radius: 30, width: 5, color: PALETTE.gold.light, x, y });
    addIcon(b, `ringicon${i}`, 'skull', { size: 30, x, y });
    return { id, x, y, p };
  });
  return {
    artboard: makeArtboard('ui-widgets', b.build().objects, { width: 600, height: 320, background: GRASS }),
    prepare: (engine: ExodeUIEngine) => {
      for (const { n, parts } of stars) poseStars(engine, parts, n);
      for (const r of rings) setPathPoints(engine, r.id, ringPoints(r.x, r.y, 30, r.p));
    },
  };
}

function statesEntry(): GalleryEntry {
  const b = new SpriteBuilder('states');
  const button = addButton(b, 'play', { w: 150, h: 52, x: 95, y: 50, variant: 'green', label: 'PLAY', icon: 'play' });
  const round = addRoundButton(b, 'pause', { r: 26, x: 215, y: 50, variant: 'blue', icon: 'pause' });
  const states: readonly ButtonState[] = ['normal', 'hover', 'pressed', 'disabled'];
  return {
    name: 'ui-states',
    artboard: makeArtboard('ui-states', b.build().objects, { width: 260, height: 100, background: GRASS }),
    scale: 2,
    columns: 2,
    frames: states.map((s) => ({
      label: s,
      apply: (engine) => {
        poseButton(engine, button, s);
        poseButton(engine, round, s);
      },
    })),
  };
}

const buttons = buttonsBoard();
const widgets = widgetsBoard();

export const gallery: GalleryEntry[] = [
  { name: 'ui-buttons', artboard: buttons.artboard, prepare: buttons.prepare, scale: 2 },
  { name: 'ui-panels', artboard: panelsBoard() },  { name: 'ui-icons', artboard: iconsBoard() },
  { name: 'ui-widgets', artboard: widgets.artboard, prepare: widgets.prepare, scale: 2 },
  statesEntry(),
];
