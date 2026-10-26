/**
 * The in-game HUD controller: one transparent Stage above the world. Pointer and key input become HudActions, the world
 * view and app state are posed onto the parts built by buildHud.
 */
import { circleRegion, hitTest, rectRegion, type HitRegion } from '../../art/ui/hit';
import { ringPoints, type ButtonParts } from '../../art/ui/kit';
import { poseStars, type ButtonState } from '../../art/ui/pose';
import { PALETTE } from '../../art/palette';
import { TOWERS, WAVE_GAP } from '../../game/config';
import type { CommandFailure, GameEvent, LevelDef, TowerState, Vec2, WorldView } from '../../game/types';
import { Stage, type CanvasLike } from '../../render/stage';
import type { HudAction, HudState, PointerKind } from '../types';
import { bannerPose, flashStrength, mixColor, overlayPose, pulseScale, shakeOffset, starPose, FLASH_TIME, SHAKE_TIME } from './anim';
import { buildHud, type HudParts, type OptionParts, type TextParts } from './hudArt';
import { BUBBLE_LINE_IDS, bubbleCenter, type MascotBubblePose } from './mascotBubble';
import { buildCost, earlyCallBonus, levelStats, sellRefund, statsInfo, upgradeCost, upgradeHeading, waveHasBoss, waveText } from './info';
import {
  BANNER,
  CALL,
  COST_PILL,
  COUNTERS,
  DEFEAT_PANEL,
  menuSlots,
  OPTION_R,
  OVERLAY_BUTTON,
  PAD_HIT_RADIUS,
  PAUSE_PANEL,
  TOOLTIP,
  TOP_BUTTON_R,
  TOP_BUTTONS,
  tooltipCenter,
  VICTORY_PANEL,
} from './layout';
import { Poser } from './poser';

export type ControlId =
  | 'speed'
  | 'pause'
  | 'sound'
  | 'call'
  | 'upgrade'
  | 'sell'
  | 'resume'
  | 'restart'
  | 'quit'
  | 'continue'
  | 'replay'
  | 'retry'
  | 'defeatQuit'
  | `build:${number}`
  | `pad:${number}`;

export type OverlayKind = 'none' | 'pause' | 'victory' | 'defeat';

/** The overlay a view and pause state call for: the end panels once won or lost, the pause menu while running. */
export function overlayOf(view: WorldView, paused: boolean): OverlayKind {
  if (view.status === 'won') return 'victory';
  if (view.status === 'lost') return 'defeat';
  return paused && view.status === 'running' ? 'pause' : 'none';
}

export interface MenuInfo {
  kind: 'build' | 'tower';
  pad: number;
  /** The tower on the pad (tower menu only). */
  towerId: number | null;
  /** Option centers in design coords: one per allowed tower kind, or [upgrade, sell]. */
  slots: readonly Vec2[];
  tooltip: Vec2;
}

type CallMode = 'start' | 'next' | 'hidden';

const COST_COLOR = PALETTE.gold.light;
const UNAFFORDABLE = PALETTE.red.light;
const COUNTER_COLOR = '#ffffff';
const FLASH_COLOR = '#ff3b2e';
const TIP_LINE_SIZE = 15;
const TIP_LINE_WIDTH = TOOLTIP.w - 32;

function overlayButtonRegion(id: ControlId, panel: { x: number; y: number }, y: number): HitRegion {
  return rectRegion(id, panel.x, panel.y + y, OVERLAY_BUTTON.w, OVERLAY_BUTTON.h);
}

export class GameHud {
  readonly stage: Stage;
  readonly parts: HudParts;
  private readonly poser: Poser;
  private state: HudState = { speed: 1, paused: false, soundOn: true };
  private menu: MenuInfo | null = null;
  private hovered: ControlId | null = null;
  /** What received the last 'down': a control, the bare board, or nothing yet. */
  private pressed: ControlId | 'board' | null = null;
  private lastControl: ControlId | null = null;
  private clock = 0;
  private overlay: OverlayKind = 'none';
  private overlayStart = 0;
  private starsShown = -1;
  private bannerStart: number | null = null;
  private bannerBoss = false;
  private shake: { id: ControlId; start: number } | null = null;
  private flashStart: number | null = null;

  constructor(canvas: CanvasLike, private readonly level: LevelDef) {
    this.stage = new Stage(canvas);
    this.parts = buildHud(level);
    this.stage.load(this.parts.artboard);
    this.poser = new Poser(this.stage.engine);
    this.parts.build.forEach((option) => this.poser.text(option.cost.textIds, String(buildCost(option.kind))));
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.stage.resize(cssWidth, cssHeight, devicePixelRatio);
  }

  /** The open radial menu, or null. */
  get openMenu(): Readonly<MenuInfo> | null {
    return this.menu;
  }

  /** The overlay as of the last render. */
  get currentOverlay(): OverlayKind {
    return this.overlay;
  }

  pointer(kind: PointerKind, p: Vec2, view: WorldView): HudAction | null {
    const id = hitTest(this.regions(view), p) as ControlId | null;
    if (kind === 'move') {
      this.hovered = id;
      return null;
    }
    if (kind === 'down') {
      this.hovered = id;
      this.pressed = id ?? 'board';
      return null;
    }
    const pressed = this.pressed;
    this.pressed = null;
    if (pressed === 'board' && id === null) {
      if (this.overlayFor(view) === 'none') this.menu = null;
      return null;
    }
    if (pressed === null || pressed !== id) return null;
    return this.activate(id, view);
  }

  key(key: string, view: WorldView): HudAction | null {
    const overlay = this.overlayFor(view);
    const k = key.length === 1 ? key.toLowerCase() : key;
    if (k === 'f') return { type: 'toggleSpeed' };
    if (k === 'm') return { type: 'toggleSound' };
    if (k === ' ' || k === 'Space' || k === 'Spacebar') return this.togglePause(view);
    if (k === 'Escape') {
      if (this.menu) {
        this.menu = null;
        return null;
      }
      return this.togglePause(view);
    }
    if (overlay !== 'none' || !this.menu) return null;
    if (this.menu.kind === 'build' && k >= '1' && k <= '5') {
      const n = Number(k) - 1;
      return n < this.level.towers.length ? this.activate(`build:${n}`, view) : null;
    }
    if (this.menu.kind === 'tower' && k === 'u') return this.activate('upgrade', view);
    if (this.menu.kind === 'tower' && k === 's') return this.activate('sell', view);
    return null;
  }

  onEvents(events: readonly GameEvent[], view: WorldView): void {
    for (const e of events) {
      if (e.type === 'waveStarted') {
        this.bannerStart = this.clock;
        this.bannerBoss = waveHasBoss(view.level, e.wave);
        this.poser.text(this.parts.banner.title.textIds, `WAVE ${e.wave + 1}`);
      } else if (e.type === 'towerBuilt' && this.menu?.kind === 'build' && this.menu.pad === e.pad) {
        this.menu = null;
      } else if (e.type === 'towerSold' && this.menu?.towerId === e.towerId) {
        this.menu = null;
      } else if (e.type === 'levelWon' || e.type === 'levelLost') {
        this.menu = null;
      }
    }
  }

  commandFailed(_reason: CommandFailure): void {
    this.refuse(this.lastControl);
  }

  render(view: WorldView, state: HudState, dt: number): void {
    this.state = { ...state };
    const overlay = this.overlayFor(view);
    if (overlay !== this.overlay) {
      this.overlay = overlay;
      this.overlayStart = this.clock;
      this.starsShown = -1;
      if (overlay !== 'none') {
        this.menu = null;
        this.hovered = null;
        this.pressed = null;
      }
    }
    this.clock += Math.max(0, dt);
    this.checkMenu(view);
    this.poseCounters(view);
    this.poseTopButtons();
    this.poseCall(view);
    this.poseBoard(view);
    this.poseBanner();
    this.poseOverlays(view);
    this.poseBubble(state.mascot ?? null);
    this.stage.render();
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private overlayFor(view: WorldView): OverlayKind {
    return overlayOf(view, this.state.paused);
  }

  private callMode(view: WorldView): CallMode {
    if (view.status === 'ready' && view.canCallWave) return 'start';
    if (view.status === 'running' && view.canCallWave && view.nextWaveIn !== null) return 'next';
    return 'hidden';
  }

  /** Hit regions, bottom first (hitTest picks the topmost). While an overlay is up only its buttons are live. */
  private regions(view: WorldView): HitRegion[] {
    switch (this.overlayFor(view)) {
      case 'pause':
        return [
          overlayButtonRegion('resume', PAUSE_PANEL, PAUSE_PANEL.buttons.resume),
          overlayButtonRegion('restart', PAUSE_PANEL, PAUSE_PANEL.buttons.restart),
          overlayButtonRegion('quit', PAUSE_PANEL, PAUSE_PANEL.buttons.quit),
        ];
      case 'victory':
        return [
          overlayButtonRegion('continue', VICTORY_PANEL, VICTORY_PANEL.buttons.continue),
          overlayButtonRegion('replay', VICTORY_PANEL, VICTORY_PANEL.buttons.replay),
        ];
      case 'defeat':
        return [
          overlayButtonRegion('retry', DEFEAT_PANEL, DEFEAT_PANEL.buttons.retry),
          overlayButtonRegion('defeatQuit', DEFEAT_PANEL, DEFEAT_PANEL.buttons.quit),
        ];
      case 'none':
        break;
    }
    const regions: HitRegion[] = this.level.pads.map((pad, i) => circleRegion(`pad:${i}`, pad.x, pad.y, PAD_HIT_RADIUS));
    if (this.menu) {
      const ids: ControlId[] = this.menu.kind === 'build' ? this.level.towers.map((_, i) => `build:${i}` as const) : ['upgrade', 'sell'];
      this.menu.slots.forEach((s, i) => {
        const id = ids[i];
        if (id === undefined) return;
        regions.push(rectRegion(id, s.x, s.y + COST_PILL.y, COST_PILL.w, COST_PILL.h), circleRegion(id, s.x, s.y, OPTION_R + 3));
      });
    }
    if (this.callMode(view) !== 'hidden') regions.push(circleRegion('call', CALL.x, CALL.y, CALL.ringRadius + 4));
    for (const id of ['speed', 'pause', 'sound'] as const) {
      const at = TOP_BUTTONS[id];
      regions.push(circleRegion(id, at.x, at.y, TOP_BUTTON_R + 3));
    }
    return regions;
  }

  private togglePause(view: WorldView): HudAction | null {
    if (view.status === 'won' || view.status === 'lost') return null;
    return this.state.paused ? { type: 'resume' } : { type: 'pause' };
  }

  private issue(id: ControlId, action: HudAction): HudAction {
    this.lastControl = id;
    return action;
  }

  /** Shake a control and flash the gold counter. */
  private refuse(id: ControlId | null): void {
    if (id !== null) this.shake = { id, start: this.clock };
    this.flashStart = this.clock;
  }

  private activate(id: ControlId, view: WorldView): HudAction | null {
    switch (id) {
      case 'speed':
        return { type: 'toggleSpeed' };
      case 'pause':
        return { type: 'pause' };
      case 'sound':
        return { type: 'toggleSound' };
      case 'resume':
        return { type: 'resume' };
      case 'restart':
      case 'replay':
      case 'retry':
        return { type: 'restart' };
      case 'quit':
      case 'defeatQuit':
        return { type: 'quit' };
      case 'continue':
        return { type: 'continue' };
      case 'call':
        return view.canCallWave ? this.issue(id, { type: 'command', command: { type: 'callWave' } }) : null;
      case 'upgrade': {
        const tower = this.selectedTower(view);
        if (!tower) return null;
        const cost = upgradeCost(tower);
        if (cost === null || view.gold < cost) {
          this.refuse(id);
          return null;
        }
        return this.issue(id, { type: 'command', command: { type: 'upgrade', towerId: tower.id } });
      }
      case 'sell': {
        const tower = this.selectedTower(view);
        return tower ? this.issue(id, { type: 'command', command: { type: 'sell', towerId: tower.id } }) : null;
      }
    }
    const [prefix, index] = id.split(':');
    const n = Number(index);
    if (prefix === 'pad') {
      this.togglePad(n, view);
      return null;
    }
    const kind = this.level.towers[n];
    if (prefix !== 'build' || kind === undefined || this.menu?.kind !== 'build') return null;
    if (view.gold < buildCost(kind)) {
      this.refuse(id);
      return null;
    }
    return this.issue(id, { type: 'command', command: { type: 'build', pad: this.menu.pad, kind } });
  }

  private togglePad(index: number, view: WorldView): void {
    const pad = this.level.pads[index];
    if (!pad || this.menu?.pad === index) {
      this.menu = null;
      return;
    }
    const tower = view.towers.find((t) => t.pad === index);
    const slots = menuSlots(pad, tower ? 2 : this.level.towers.length);
    this.menu = { kind: tower ? 'tower' : 'build', pad: index, towerId: tower ? tower.id : null, slots, tooltip: tooltipCenter(pad, slots) };
  }

  private selectedTower(view: WorldView): TowerState | undefined {
    const id = this.menu?.towerId;
    return id === null || id === undefined ? undefined : view.towers.find((t) => t.id === id);
  }

  /** Close menus whose pad changed under them (a tower appeared on a build pad, the selected tower is gone). */
  private checkMenu(view: WorldView): void {
    const menu = this.menu;
    if (!menu) return;
    if (menu.kind === 'build' && view.towers.some((t) => t.pad === menu.pad)) this.menu = null;
    if (menu.kind === 'tower' && !this.selectedTower(view)) this.menu = null;
  }

  // ---------------------------------------------------------------------------
  // Posing
  // ---------------------------------------------------------------------------

  private buttonState(id: ControlId, disabled = false): ButtonState {
    if (disabled) return 'disabled';
    if (this.hovered !== id) return 'normal';
    return this.pressed === id ? 'pressed' : 'hover';
  }

  private shakeDx(id: ControlId): number {
    const s = this.shake;
    return s && s.id === id ? shakeOffset(this.clock - s.start) : 0;
  }

  private poseCounters(view: WorldView): void {
    const { poser, parts } = this;
    poser.text(parts.lives.textIds, String(view.lives));
    poser.text(parts.gold.textIds, String(view.gold));
    poser.text(parts.wave.textIds, waveText(view));
    const t = this.flashStart === null ? FLASH_TIME : this.clock - this.flashStart;
    if (t >= FLASH_TIME) this.flashStart = null;
    poser.fill(parts.goldFillId, mixColor(COUNTER_COLOR, FLASH_COLOR, flashStrength(t)));
    poser.pos(parts.gold.groupId, COUNTERS.gold.x + shakeOffset(t) * 0.5, COUNTERS.gold.y);
    if (this.shake && this.clock - this.shake.start >= SHAKE_TIME) this.shake = null;
  }

  private poseRound(parts: ButtonParts, id: ControlId, at: { x: number; y: number }, visible: boolean): void {
    this.poser.visible(parts.groupId, visible);
    if (!visible) return;
    this.poser.button(parts, this.buttonState(id));
    this.poser.pos(parts.groupId, at.x + this.shakeDx(id), at.y);
  }

  private poseTopButtons(): void {
    const { parts, state } = this;
    this.poseRound(parts.speed, 'speed', TOP_BUTTONS.speed, state.speed === 1);
    this.poseRound(parts.speedLit, 'speed', TOP_BUTTONS.speed, state.speed === 2);
    this.poseRound(parts.pause, 'pause', TOP_BUTTONS.pause, true);
    this.poseRound(parts.soundOn, 'sound', TOP_BUTTONS.sound, state.soundOn);
    this.poseRound(parts.soundOff, 'sound', TOP_BUTTONS.sound, !state.soundOn);
  }

  private poseCall(view: WorldView): void {
    const { poser } = this;
    const call = this.parts.call;
    const mode = this.callMode(view);
    poser.visible(call.groupId, mode !== 'hidden');
    if (mode === 'hidden') return;
    poser.pos(call.groupId, CALL.x + this.shakeDx('call'), CALL.y);
    const start = mode === 'start';
    poser.visible(call.glowId, start);
    poser.visible(call.start.groupId, start);
    poser.visible(call.next.groupId, !start);
    poser.visible(call.trackId, !start);
    poser.visible(call.ringId, !start);
    const state = this.buttonState('call');
    if (start) {
      const pulse = pulseScale(this.clock);
      poser.scale(call.pulseId, pulse);
      poser.scale(call.glowId, pulse);
      poser.opacity(call.glowId, 0.5 + (pulse - 1) * 6);
      poser.button(call.start, state);
      poser.text(call.label.textIds, 'START');
      return;
    }
    const left = view.nextWaveIn ?? 0;
    const progress = Math.round((left / WAVE_GAP) * 500) / 500;
    poser.path(call.ringId, String(progress), () => ringPoints(0, 0, CALL.ringRadius, progress));
    poser.button(call.next, state);
    poser.text(call.label.textIds, `NEXT +${earlyCallBonus(left)}`);
  }

  private poseOption(option: OptionParts, id: ControlId, slot: Vec2 | undefined, disabled: boolean): void {
    const { poser } = this;
    poser.visible(option.groupId, slot !== undefined);
    if (!slot) return;
    poser.pos(option.groupId, slot.x + this.shakeDx(id), slot.y);
    poser.button(option.button, this.buttonState(id, disabled));
  }

  private poseText(parts: TextParts, text: string): void {
    this.poser.text(parts.textIds, text);
  }

  private poseBoard(view: WorldView): void {
    const { poser, parts, level } = this;
    const menu = this.menu;
    const hoveredPad = this.hovered?.startsWith('pad:') ? level.pads[Number(this.hovered.slice(4))] : undefined;
    poser.visible(parts.padHover, hoveredPad !== undefined);
    if (hoveredPad) poser.pos(parts.padHover, hoveredPad.x, hoveredPad.y);
    const pad = menu ? level.pads[menu.pad] : undefined;
    poser.visible(parts.padSelected, pad !== undefined);
    if (pad) poser.pos(parts.padSelected, pad.x, pad.y);

    const buildSlots = menu?.kind === 'build' ? menu.slots : [];
    parts.build.forEach((option, i) => {
      const unaffordable = view.gold < buildCost(option.kind);
      this.poseOption(option, `build:${i}`, buildSlots[i], unaffordable);
      poser.fill(option.costFillId, unaffordable ? UNAFFORDABLE : COST_COLOR);
    });

    const tower = menu?.kind === 'tower' ? this.selectedTower(view) : undefined;
    const towerSlots = tower && menu ? menu.slots : [];
    const cost = tower ? upgradeCost(tower) : null;
    this.poseOption(parts.upgrade, 'upgrade', towerSlots[0], cost === null || view.gold < cost);
    this.poseOption(parts.sell, 'sell', towerSlots[1], false);
    if (tower) {
      poser.visible(parts.upgrade.cost.groupId, cost !== null);
      poser.visible(parts.upgrade.max.groupId, cost === null);
      if (cost !== null) {
        this.poseText(parts.upgrade.cost, String(cost));
        poser.fill(parts.upgrade.costFillId, view.gold < cost ? UNAFFORDABLE : COST_COLOR);
      }
      this.poseText(parts.sell.cost, String(sellRefund(tower)));
    }

    let range: number | null = null;
    let tip: { kind: TowerState['kind']; level: 1 | 2 | 3; heading: string } | null = null;
    const hoveredBuild = this.hovered?.startsWith('build:') ? level.towers[Number(this.hovered.slice(6))] : undefined;
    if (menu?.kind === 'build' && hoveredBuild) {
      range = TOWERS[hoveredBuild].levels[0].range;
      tip = { kind: hoveredBuild, level: 1, heading: TOWERS[hoveredBuild].name };
    } else if (tower) {
      const next = tower.level < 3 ? ((tower.level + 1) as 2 | 3) : null;
      const shown = next !== null && this.hovered === 'upgrade' ? next : tower.level;
      range = levelStats(tower.kind, shown).range;
      tip = { kind: tower.kind, level: next ?? 3, heading: upgradeHeading(tower) };
    }
    poser.visible(parts.range, range !== null && pad !== undefined);
    if (range !== null && pad) poser.path(parts.range, `${pad.x},${pad.y},${range}`, () => ringPoints(pad.x, pad.y, range, 1));

    const tooltip = parts.tooltip;
    poser.visible(tooltip.groupId, tip !== null && menu !== null);
    if (tip && menu) {
      poser.pos(tooltip.groupId, menu.tooltip.x, menu.tooltip.y);
      const info = statsInfo(tip.kind, tip.level, tip.heading, TIP_LINE_SIZE, TIP_LINE_WIDTH);
      this.poseText(tooltip.title, info.title);
      this.poseText(tooltip.lines[0], info.lines[0]);
      this.poseText(tooltip.lines[1], info.lines[1]);
      this.poseText(tooltip.damage, info.damage);
      this.poseText(tooltip.range, info.range);
      this.poseText(tooltip.rate, info.rate);
    }
  }

  private poseBanner(): void {
    const { poser } = this;
    const banner = this.parts.banner;
    const pose = this.bannerStart === null ? null : bannerPose(this.clock - this.bannerStart);
    if (pose && !pose.visible) this.bannerStart = null;
    poser.visible(banner.groupId, pose?.visible ?? false);
    if (!pose?.visible) return;
    poser.pos(banner.groupId, BANNER.x + pose.dx, BANNER.y);
    poser.opacity(banner.groupId, pose.opacity);
    poser.visible(banner.bossId, this.bannerBoss);
  }

  private poseOverlays(view: WorldView): void {
    const { poser, parts, overlay } = this;
    const t = this.clock - this.overlayStart;
    const pose = overlayPose(t);
    poser.visible(parts.dim, overlay !== 'none');
    poser.opacity(parts.dim, pose.dim);
    const panels: [OverlayKind, string][] = [
      ['pause', parts.pauseMenu.groupId],
      ['victory', parts.victory.groupId],
      ['defeat', parts.defeat.groupId],
    ];
    for (const [kind, id] of panels) {
      poser.visible(id, overlay === kind);
      if (overlay === kind) poser.scale(id, pose.scale);
    }
    if (overlay === 'pause') {
      poser.button(parts.pauseMenu.resume, this.buttonState('resume'));
      poser.button(parts.pauseMenu.restart, this.buttonState('restart'));
      poser.button(parts.pauseMenu.quit, this.buttonState('quit'));
    } else if (overlay === 'victory') {
      poser.button(parts.victory.continue, this.buttonState('continue'));
      poser.button(parts.victory.replay, this.buttonState('replay'));
      this.poseVictoryStars(view.stars, t);
    } else if (overlay === 'defeat') {
      poser.button(parts.defeat.retry, this.buttonState('retry'));
      poser.button(parts.defeat.quit, this.buttonState('defeatQuit'));
    }
  }

  private poseBubble(pose: MascotBubblePose | null): void {
    for (const line of BUBBLE_LINE_IDS) {
      const bubble = this.parts.bubbles[line];
      const shown = pose?.line === line;
      this.poser.visible(bubble.groupId, shown);
      if (!pose || !shown) continue;
      const at = bubbleCenter(pose.portrait, pose.tail, bubble.w, bubble.h);
      this.poser.pos(bubble.groupId, at.x, at.y);
      this.poser.visible(bubble.tailLeftId, pose.tail === 'left');
      this.poser.visible(bubble.tailDownId, pose.tail === 'down');
    }
  }

  private poseVictoryStars(stars: number, t: number): void {
    const parts = this.parts.victory.stars;
    let landed = 0;
    parts.groupIds.forEach((id, i) => {
      const pose = i < stars ? starPose(t, i) : { filled: false, scale: 1 };
      if (pose.filled) landed++;
      this.poser.scale(id, pose.scale);
    });
    if (landed !== this.starsShown) {
      this.starsShown = landed;
      poseStars(this.stage.engine, parts, landed);
    }
  }
}
