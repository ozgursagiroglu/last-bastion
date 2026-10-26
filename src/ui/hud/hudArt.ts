/**
 * The in-game HUD as one transparent 1280×720 artboard: every piece is built once (ui-kit parts, tower icons) and the
 * controller shows, hides, moves and updates them. Pure: objects out.
 */
import type { Artboard } from 'exodeui';
import { linear, makeArtboard, placeRoot, radial, solid, SpriteBuilder, type ExodeObject, type SpriteInstance } from '../../art/exode';
import { OUTLINE, PALETTE } from '../../art/palette';
import { buildTowerIcon } from '../../art/towers';
import { addIcon } from '../../art/ui/icons';
import { addButton, addCostTag, addCounter, addPanel, addRing, addRoundButton, addStars, ringPoints, type ButtonParts } from '../../art/ui/kit';
import { addLabel, TEXT, type TextStyle } from '../../art/ui/text';
import { PAD_RADIUS, type LevelDef, type TowerKind } from '../../game/types';
import {
  BANNER,
  CALL,
  COST_PILL,
  COUNTERS,
  DEFEAT_PANEL,
  OPTION_R,
  OVERLAY_BUTTON,
  PAUSE_PANEL,
  TOOLTIP,
  TOP_BAR,
  TOP_BUTTON_R,
  TOP_BUTTONS,
  VICTORY_PANEL,
} from './layout';
import { addMascotBubbles, type BubbleLine, type BubbleParts } from './mascotBubble';

export interface TextParts {
  groupId: string;
  textIds: string[];
}

/** One radial-menu option: a round button with a cost pill under it. The controller moves `groupId` to its slot. */
export interface OptionParts {
  groupId: string;
  button: ButtonParts;
  cost: TextParts;
  /** The cost's fill text (turns red when unaffordable). */
  costFillId: string;
}

export interface BuildOptionParts extends OptionParts {
  kind: TowerKind;
}

export interface UpgradeParts extends OptionParts {
  /** "MAX" in the pill, shown instead of the cost at level 3. */
  max: TextParts;
}

export interface TooltipParts {
  groupId: string;
  title: TextParts;
  lines: [TextParts, TextParts];
  damage: TextParts;
  range: TextParts;
  rate: TextParts;
}

export interface CallParts {
  groupId: string;
  glowId: string;
  trackId: string;
  ringId: string;
  /** Wraps the START button so its pulse does not fight the button's hover scale. */
  pulseId: string;
  start: ButtonParts;
  next: ButtonParts;
  label: TextParts;
}

export interface StarsParts {
  groupIds: string[];
  filledIds: string[];
  emptyIds: string[];
}

export interface HudParts {
  sprite: SpriteInstance;
  artboard: Artboard;
  lives: TextParts;
  gold: TextParts;
  goldFillId: string;
  wave: TextParts;
  speed: ButtonParts;
  speedLit: ButtonParts;
  pause: ButtonParts;
  soundOn: ButtonParts;
  soundOff: ButtonParts;
  call: CallParts;
  range: string;
  padHover: string;
  padSelected: string;
  /** In the order of `level.towers`. */
  build: BuildOptionParts[];
  upgrade: UpgradeParts;
  sell: OptionParts;
  tooltip: TooltipParts;
  banner: { groupId: string; title: TextParts; bossId: string };
  dim: string;
  pauseMenu: { groupId: string; resume: ButtonParts; restart: ButtonParts; quit: ButtonParts };
  victory: { groupId: string; stars: StarsParts; continue: ButtonParts; replay: ButtonParts };
  defeat: { groupId: string; retry: ButtonParts; quit: ButtonParts };
  /** King Sunny's speech bubbles, above everything (the victory and defeat overlays included). */
  bubbles: Record<BubbleLine, BubbleParts>;
}

const PREFIX = 'hud';
const DARK = '#120d0a';
const COST_SIZE = 17;
const TITLE_STYLE: TextStyle = { size: 22, fill: PALETTE.gold.light, outline: { color: OUTLINE, width: 3.5 } };
const RANGE_BUILD_RADIUS = 100;

function lastOf(ids: readonly string[]): string {
  const id = ids[ids.length - 1];
  if (id === undefined) throw new Error('A label without text ids');
  return id;
}

function pill(b: SpriteBuilder, name: string, parent: string): void {
  b.rect(name, COST_PILL.w, COST_PILL.h, { y: COST_PILL.y, radius: COST_PILL.h / 2, fill: solid(DARK, 0.88), stroke: { color: OUTLINE, width: 2 } }, parent);
}

function addOption(b: SpriteBuilder, name: string, variant: 'blue' | 'gold' | 'red', icon: 'upgrade' | 'sell' | 'coin', placeholder: number): OptionParts {
  const groupId = b.group(name);
  const button = addRoundButton(b, `${name}.btn`, { r: OPTION_R, variant, icon }, name);
  pill(b, `${name}.pill`, name);
  const cost = addCostTag(b, `${name}.cost`, { value: placeholder, y: COST_PILL.y, size: COST_SIZE }, name);
  return { groupId, button, cost, costFillId: lastOf(cost.textIds) };
}

function addTooltip(b: SpriteBuilder): TooltipParts {
  const { w, h } = TOOLTIP;
  const groupId = addPanel(b, 'tip', { w, h, variant: 'dark' });
  const left = -w / 2 + 16;
  const textW = w - 32;
  const title = addLabel(b, 'tip.title', 'Rifleman', TITLE_STYLE, { x: left, y: -h / 2 + 22, align: 'left', width: textW * 2 }, 'tip');
  const line = (i: number) => addLabel(b, `tip.line${i}`, 'Description', TEXT.body, { x: left, y: -h / 2 + 49 + i * 20, size: 15, align: 'left', width: textW * 2 }, 'tip');
  const lines: [TextParts, TextParts] = [line(0), line(1)];
  b.rect('tip.sep', w - 28, 2, { y: 16, fill: solid(PALETTE.gold.dark, 0.6) }, 'tip');
  const colW = textW / 3;
  const stat = (i: number, caption: string) => {
    const x = left + colW * (i + 0.5);
    addLabel(b, `tip.cap${i}`, caption, TEXT.small, { x, y: 32, size: 12 }, 'tip');
    return addLabel(b, `tip.val${i}`, '000', TEXT.body, { x, y: 53, size: 20, width: colW * 2 }, 'tip');
  };
  return { groupId, title, lines, damage: stat(0, 'DAMAGE'), range: stat(1, 'RANGE'), rate: stat(2, 'SHOTS/S') };
}

function addCall(b: SpriteBuilder): CallParts {
  const groupId = b.group('call', { x: CALL.x, y: CALL.y });
  const glowId = b.circle('call.glow', CALL.r + 16, { fill: radial([[0, PALETTE.gold.light, 0.75], [0.6, PALETTE.gold.light, 0.3], [1, PALETTE.gold.light, 0]]), blend: 'lighter' }, 'call');
  const trackId = b.circle('call.track', CALL.ringRadius, { stroke: { color: DARK, width: CALL.ringWidth + 5, opacity: 0.75 } }, 'call');
  const ringId = addRing(b, 'call.ring', { radius: CALL.ringRadius, width: CALL.ringWidth, color: PALETTE.gold.light }, 'call');
  const pulseId = b.group('call.pulse', {}, 'call');
  const start = addRoundButton(b, 'call.start', { r: CALL.r, variant: 'gold', icon: 'play' }, 'call.pulse');
  const next = addRoundButton(b, 'call.next', { r: CALL.r - 4, variant: 'red', icon: 'swords' }, 'call');
  const label = addLabel(b, 'call.label', 'START', TEXT.button, { y: CALL.labelY, size: 24, width: 220 }, 'call');
  return { groupId, glowId, trackId, ringId, pulseId, start, next, label };
}

function addBanner(b: SpriteBuilder): HudParts['banner'] {
  const groupId = addPanel(b, 'banner', { x: BANNER.x, y: BANNER.y, w: BANNER.w, h: BANNER.h, variant: 'wood' });
  const title = addLabel(b, 'banner.title', 'WAVE 1', TEXT.title, { size: 50, width: BANNER.w * 2 }, 'banner');
  const bossId = b.group('banner.boss', { y: BANNER.bossY }, 'banner');
  b.rect('banner.boss.bg', BANNER.bossW, BANNER.bossH, { radius: 12, fill: linear([[0, PALETTE.red.light], [1, PALETTE.red.dark]]), stroke: { color: OUTLINE, width: 3 } }, 'banner.boss');
  b.rect('banner.boss.hl', BANNER.bossW - 20, 4, { y: -BANNER.bossH / 2 + 6, radius: 2, fill: solid('#ffffff', 0.3) }, 'banner.boss');
  for (const side of [-1, 1]) addIcon(b, `banner.boss.skull${side < 0 ? 'L' : 'R'}`, 'skull', { size: 30, x: side * (BANNER.bossW / 2 - 28) }, 'banner.boss');
  addLabel(b, 'banner.boss.label', 'BOSS INCOMING!', TEXT.heading, { size: 26, width: BANNER.bossW * 2 }, 'banner.boss');
  return { groupId, title, bossId };
}

function overlayButton(
  b: SpriteBuilder,
  name: string,
  y: number,
  variant: 'green' | 'blue' | 'red',
  label: string,
  icon: 'play' | 'retry' | 'home',
  parent: string,
): ButtonParts {
  return addButton(b, name, { w: OVERLAY_BUTTON.w, h: OVERLAY_BUTTON.h, y, variant, label, icon }, parent);
}

function addOverlays(b: SpriteBuilder): Pick<HudParts, 'dim' | 'pauseMenu' | 'victory' | 'defeat'> {
  const dim = b.rect('dim', 1280, 720, { x: 640, y: 360, fill: solid('#000000', 0.6) });

  const p = PAUSE_PANEL;
  const pauseId = addPanel(b, 'pauseMenu', { x: p.x, y: p.y, w: p.w, h: p.h, variant: 'wood' });
  addLabel(b, 'pauseMenu.title', 'PAUSED', TEXT.title, { y: p.titleY }, 'pauseMenu');
  const pauseMenu = {
    groupId: pauseId,
    resume: overlayButton(b, 'pauseMenu.resume', p.buttons.resume, 'green', 'RESUME', 'play', 'pauseMenu'),
    restart: overlayButton(b, 'pauseMenu.restart', p.buttons.restart, 'blue', 'RESTART', 'retry', 'pauseMenu'),
    quit: overlayButton(b, 'pauseMenu.quit', p.buttons.quit, 'red', 'QUIT', 'home', 'pauseMenu'),
  };

  const v = VICTORY_PANEL;
  const victoryId = addPanel(b, 'victory', { x: v.x, y: v.y, w: v.w, h: v.h, variant: 'wood' });
  addLabel(b, 'victory.title', 'VICTORY!', TEXT.title, { y: v.titleY, size: 60 }, 'victory');
  b.ellipse('victory.starsBg', 300, 96, { y: v.starsY, fill: solid(DARK, 0.45) }, 'victory');
  const victory = {
    groupId: victoryId,
    stars: addStars(b, 'victory.stars', { count: 3, size: 74, gap: 12, y: v.starsY }, 'victory'),
    continue: overlayButton(b, 'victory.continue', v.buttons.continue, 'green', 'CONTINUE', 'play', 'victory'),
    replay: overlayButton(b, 'victory.replay', v.buttons.replay, 'blue', 'REPLAY', 'retry', 'victory'),
  };

  const d = DEFEAT_PANEL;
  const defeatId = addPanel(b, 'defeat', { x: d.x, y: d.y, w: d.w, h: d.h, variant: 'stone' });
  addLabel(b, 'defeat.title', 'DEFEAT', TEXT.title, { y: d.titleY, size: 60, fill: PALETTE.red.light }, 'defeat');
  addLabel(b, 'defeat.subtitle', 'The enemy broke through!', TEXT.body, { y: d.subtitleY, size: 20 }, 'defeat');
  const defeat = {
    groupId: defeatId,
    retry: overlayButton(b, 'defeat.retry', d.buttons.retry, 'green', 'RETRY', 'retry', 'defeat'),
    quit: overlayButton(b, 'defeat.quit', d.buttons.quit, 'red', 'QUIT', 'home', 'defeat'),
  };
  return { dim, pauseMenu, victory, defeat };
}

/** Put a separately built sprite (a tower icon) inside `parentId`, drawn just before `beforeId`. */
function graft(objects: ExodeObject[], parentId: string, beforeId: string, sprite: SpriteInstance): void {
  const parent = objects.find((o) => o.id === parentId);
  const root = sprite.objects.find((o) => o.id === sprite.rootId);
  if (!parent || !root) throw new Error(`Cannot graft ${sprite.rootId} into ${parentId}`);
  const children = parent.children ?? [];
  const at = children.indexOf(beforeId);
  children.splice(at < 0 ? children.length : at, 0, root.id);
  parent.children = children;
  root.parentId = parentId;
  objects.push(...sprite.objects);
}

function hide(objects: readonly ExodeObject[], ids: ReadonlySet<string>): void {
  for (const o of objects) if (ids.has(o.id)) o.visible = false;
}

/** Tower icons are 56 px; this fits them inside an option button. */
const TOWER_ICON_SCALE = 0.92;

export function buildHud(level: LevelDef): HudParts {
  const b = new SpriteBuilder(PREFIX);

  b.rect('bar', TOP_BAR.w, TOP_BAR.h, { x: TOP_BAR.x, y: TOP_BAR.y, radius: 16, fill: solid(DARK, 0.62), stroke: { color: OUTLINE, width: 2, opacity: 0.6 } });
  const lives = addCounter(b, 'lives', { icon: 'heart', text: '20', ...COUNTERS.lives });
  const gold = addCounter(b, 'gold', { icon: 'coin', text: '000', ...COUNTERS.gold });
  const wave = addCounter(b, 'wave', { icon: 'swords', text: '0/10', ...COUNTERS.wave });

  const round = (name: string, at: { x: number; y: number }, variant: 'blue' | 'gold', icon: 'fast' | 'pause' | 'soundOn' | 'soundOff') =>
    addRoundButton(b, name, { r: TOP_BUTTON_R, variant, icon, ...at });
  const speed = round('speed', TOP_BUTTONS.speed, 'blue', 'fast');
  const speedLit = round('speedLit', TOP_BUTTONS.speed, 'gold', 'fast');
  const pause = round('pause', TOP_BUTTONS.pause, 'blue', 'pause');
  const soundOn = round('soundOn', TOP_BUTTONS.sound, 'blue', 'soundOn');
  const soundOff = round('soundOff', TOP_BUTTONS.sound, 'blue', 'soundOff');

  const call = addCall(b);

  const range = b.path('range', ringPoints(0, 0, RANGE_BUILD_RADIUS, 1), {
    closed: true,
    dynamic: true,
    fill: solid('#ffffff', 0.12),
    stroke: { color: '#ffffff', width: 3, opacity: 0.8 },
  });
  const padHover = b.circle('padHover', PAD_RADIUS + 3, { fill: solid('#ffffff', 0.14), stroke: { color: '#ffffff', width: 3, opacity: 0.9 } });
  const padSelected = b.circle('padSelected', PAD_RADIUS + 4, { fill: solid(PALETTE.gold.light, 0.16), stroke: { color: PALETTE.gold.light, width: 4 } });

  const build = level.towers.map((kind, i): BuildOptionParts => ({ kind, ...addOption(b, `build${i}`, 'blue', 'coin', 100) }));
  const upgradeBase = addOption(b, 'upgrade', 'gold', 'upgrade', 100);
  const max = addLabel(b, 'upgrade.max', 'MAX', { size: COST_SIZE, fill: PALETTE.gold.light, outline: { color: OUTLINE, width: 3.5 } }, { y: COST_PILL.y }, 'upgrade');
  const upgrade: UpgradeParts = { ...upgradeBase, max };
  const sell = addOption(b, 'sell', 'red', 'sell', 100);

  const tooltip = addTooltip(b);
  const banner = addBanner(b);
  const overlays = addOverlays(b);
  const bubbles = addMascotBubbles(b);

  const built = b.build();
  const objects = built.objects;
  for (const option of build) {
    const icon = placeRoot(buildTowerIcon(option.kind, `${PREFIX}.ticon.${option.kind}`), 0, -2, TOWER_ICON_SCALE);
    graft(objects, option.button.groupId, option.button.disabledId, icon);
  }
  hide(
    objects,
    new Set([
      speedLit.groupId,
      soundOff.groupId,
      call.groupId,
      call.next.groupId,
      range,
      padHover,
      padSelected,
      ...build.map((o) => o.button.iconId).filter((id): id is string => id !== null),
      ...build.map((o) => o.groupId),
      upgrade.groupId,
      max.groupId,
      sell.groupId,
      tooltip.groupId,
      banner.groupId,
      banner.bossId,
      overlays.dim,
      overlays.pauseMenu.groupId,
      overlays.victory.groupId,
      overlays.defeat.groupId,
      ...Object.values(bubbles).map((bubble) => bubble.groupId),
    ]),
  );

  const sprite: SpriteInstance = { rootId: built.rootId, objects, clips: {} };
  return {
    sprite,
    artboard: makeArtboard('hud', objects, { background: null }),
    lives,
    gold,
    goldFillId: lastOf(gold.textIds),
    wave,
    speed,
    speedLit,
    pause,
    soundOn,
    soundOff,
    call,
    range,
    padHover,
    padSelected,
    build,
    upgrade,
    sell,
    tooltip,
    banner,
    ...overlays,
    bubbles,
  };
}
