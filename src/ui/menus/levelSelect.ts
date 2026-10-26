/**
 * Level select controller: node selection among unlocked levels, difficulty tabs, the info panel, PLAY and BACK.
 * Progress and difficulty changes rewrite the affected parts once; render() only animates the selection and hover.
 */
import type { ExodeUIEngine } from 'exodeui';
import { DIFFICULTIES, TOWER_KINDS, type Difficulty, type LevelDef, type ProgressData, type Vec2 } from '../../game/types';
import { poseButton, poseStars } from '../../art/ui/pose';
import { THEMES } from '../../art/world/themes';
import { setFillColor, setPos, setScale, setText, setVisible } from '../../render/exodeRuntime';
import { Stage, type CanvasLike } from '../../render/stage';
import type { MenuAction, PointerKind } from '../types';
import { Controls } from './controls';
import { buildLevelSelectArt, PANEL, rowY, SLOT, SLOT_ICON_SCALE, themeName, type LevelSelectArt } from './levelSelectArt';
import { NODE_RADIUS } from './mapLayout';
import { StaticStages, type MenuScreen } from './menuScreen';
import { bestStars } from './progress';

const DIFFICULTY_KEYS: Readonly<Record<string, Difficulty>> = { '1': 'easy', '2': 'normal', '3': 'hard' };
const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp']);
const NODE_HOVER_SCALE = 1.1;

/** Bottom to top: the static map and panel frame, then everything that changes. */
export interface LevelSelectLayers {
  back: CanvasLike;
  live: CanvasLike;
}

export class LevelSelectScreen implements MenuScreen {
  private readonly stage: Stage;
  private readonly statics: StaticStages;
  private readonly art: LevelSelectArt;
  private readonly controls: Controls;
  private readonly levels: readonly LevelDef[];
  private progress: ProgressData;
  private current: Difficulty;
  private selected: number;
  private time = 0;

  constructor(layers: LevelSelectLayers, levels: readonly LevelDef[], progress: ProgressData, difficulty: Difficulty, selectedLevel?: number) {
    if (levels.length === 0) throw new Error('LevelSelectScreen needs at least one level');
    this.levels = levels;
    this.art = buildLevelSelectArt(levels);
    this.statics = new StaticStages([{ canvas: layers.back, artboard: this.art.backdrop }]);
    this.stage = new Stage(layers.live);
    this.stage.load(this.art.artboard);
    this.controls = new Controls(this.art.regions);
    this.progress = progress;
    this.current = difficulty;
    this.selected = selectedLevel ?? Number.POSITIVE_INFINITY;
    this.applyProgress();
    this.applyDifficulty();
    this.animate();
  }

  /** The loaded engine (tests and galleries read object state from it). */
  get engine(): ExodeUIEngine {
    return this.stage.engine;
  }

  get difficulty(): Difficulty {
    return this.current;
  }

  get selectedLevel(): number {
    return this.selected;
  }

  get currentProgress(): ProgressData {
    return this.progress;
  }

  /** Times the static layer was drawn (once per backing-store size change, never per frame). */
  get staticDraws(): number {
    return this.statics.draws;
  }

  setProgress(progress: ProgressData): void {
    this.progress = progress;
    this.applyProgress();
    this.applyDifficulty();
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.stage.resize(cssWidth, cssHeight, devicePixelRatio);
    this.statics.resize(cssWidth, cssHeight, devicePixelRatio);
  }

  pointer(kind: PointerKind, p: Vec2): MenuAction | null {
    const id = this.controls.pointer(kind, p);
    if (id === null) return null;
    if (id === 'back') return { type: 'goto', screen: 'title' };
    if (id === 'play') return this.playAction();
    if (id.startsWith('tab:')) {
      const d = DIFFICULTIES.find((x) => `tab:${x}` === id);
      if (d) this.setDifficulty(d);
      return null;
    }
    if (id.startsWith('node:')) this.select(Number(id.slice('node:'.length)));
    return null;
  }

  key(key: string): MenuAction | null {
    if (key === 'Escape') return { type: 'goto', screen: 'title' };
    if (key === 'Enter') return this.playAction();
    const d = DIFFICULTY_KEYS[key];
    if (d) this.setDifficulty(d);
    else if (NEXT_KEYS.has(key)) this.step(1);
    else if (PREV_KEYS.has(key)) this.step(-1);
    return null;
  }

  /** The level select has no sound control, so the sound state is not shown. */
  render(dt: number, _soundOn: boolean): void {
    this.time += Number.isFinite(dt) ? Math.max(0, dt) : 0;
    this.animate();
    this.stage.render();
  }

  private isUnlocked(level: LevelDef): boolean {
    return level.id <= this.progress.unlocked;
  }

  private playAction(): MenuAction {
    return { type: 'play', level: this.selected, difficulty: this.current };
  }

  private setDifficulty(d: Difficulty): void {
    this.current = d;
    this.applyDifficulty();
  }

  private select(levelId: number): void {
    const level = this.levels.find((l) => l.id === levelId);
    if (!level || !this.isUnlocked(level)) return;
    this.selected = levelId;
    this.applySelection();
  }

  private step(direction: 1 | -1): void {
    const open = this.levels.filter((l) => this.isUnlocked(l));
    const index = open.findIndex((l) => l.id === this.selected);
    const next = open[Math.min(open.length - 1, Math.max(0, index + direction))];
    if (next) this.select(next.id);
  }

  /** Lock state of every node; the selection falls back to the furthest unlocked level when it is not playable. */
  private applyProgress(): void {
    const engine = this.stage.engine;
    for (const node of this.art.nodes) {
      const open = node.levelId <= this.progress.unlocked;
      setVisible(engine, node.litId, open);
      setVisible(engine, node.lockedId, !open);
      setVisible(engine, node.starsId, open);
      this.controls.setEnabled(node.controlId, open);
    }
    const open = this.levels.filter((l) => this.isUnlocked(l));
    const fallback = open[open.length - 1] ?? this.levels[0];
    if (!open.some((l) => l.id === this.selected) && fallback) this.selected = fallback.id;
    this.applySelection();
  }

  private applyDifficulty(): void {
    const engine = this.stage.engine;
    for (const d of DIFFICULTIES) {
      setVisible(engine, this.art.tabs[d].on.groupId, d === this.current);
      setVisible(engine, this.art.tabs[d].off.groupId, d !== this.current);
    }
    for (const node of this.art.nodes) poseStars(engine, node.stars, bestStars(this.progress, node.levelId, this.current));
    const row = DIFFICULTIES.indexOf(this.current);
    setPos(engine, this.art.panel.rowHighlightId, 0, rowY(row) - PANEL.y);
  }

  private applySelection(): void {
    const engine = this.stage.engine;
    const level = this.levels.find((l) => l.id === this.selected) ?? this.levels[0];
    if (!level) return;
    const panel = this.art.panel;
    setText(engine, panel.levelIds, `LEVEL ${level.id}`);
    setText(engine, panel.nameIds, level.name);
    setText(engine, panel.themeIds, themeName(level.theme));
    const accent = THEMES[level.theme].accent;
    const themeFill = panel.themeIds[panel.themeIds.length - 1];
    if (themeFill) setFillColor(engine, themeFill, accent);
    setFillColor(engine, panel.swatchId, accent);
    setText(engine, panel.wavesIds, `${level.waves.length} waves`);

    const allowed = TOWER_KINDS.filter((k) => level.towers.includes(k));
    const offset = (i: number) => (i - (allowed.length - 1) / 2) * SLOT.step;
    panel.slotIds.forEach((id, i) => {
      setVisible(engine, id, i < allowed.length);
      setPos(engine, id, offset(i), SLOT.dy);
    });
    for (const kind of TOWER_KINDS) {
      const id = panel.iconIds[kind];
      const i = allowed.indexOf(kind);
      setVisible(engine, id, i >= 0);
      if (i >= 0) {
        setPos(engine, id, PANEL.x + offset(i), PANEL.y + SLOT.dy);
        setScale(engine, id, SLOT_ICON_SCALE);
      }
    }
    for (const d of DIFFICULTIES) poseStars(engine, panel.rowStars[d], bestStars(this.progress, level.id, d));
  }

  private animate(): void {
    const engine = this.stage.engine;
    const t = this.time;
    const node = this.art.nodes.find((n) => n.levelId === this.selected);
    setVisible(engine, this.art.selectId, node !== undefined);
    setVisible(engine, this.art.pointerId, node !== undefined);
    if (node) {
      setPos(engine, this.art.selectId, node.pos.x, node.pos.y);
      setScale(engine, this.art.selectId, 1 + Math.sin(t * 4) * 0.06);
      setPos(engine, this.art.pointerId, node.pos.x, node.pos.y - NODE_RADIUS - 22 - Math.abs(Math.sin(t * 3.2)) * 9);
    }
    for (const n of this.art.nodes) setScale(engine, n.badgeId, this.controls.hovered === n.controlId ? NODE_HOVER_SCALE : 1);
    poseButton(engine, this.art.back, this.controls.state('back'));
    poseButton(engine, this.art.panel.play, this.controls.state('play'));
    for (const d of DIFFICULTIES) {
      const state = this.controls.state(`tab:${d}`);
      poseButton(engine, this.art.tabs[d].on, state);
      poseButton(engine, this.art.tabs[d].off, state);
    }
  }
}
