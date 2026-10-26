/**
 * The app without the DOM: owns the active screen and its layers, routes input and frames to it, applies the screen
 * flow, places King Sunny for each screen, and persists settings and progress. App supplies canvases and events; tests
 * supply Node canvases.
 */
import { DESIGN_HEIGHT, DESIGN_WIDTH, type LevelDef, type Vec2 } from '../game/types';
import { containFit, type CanvasLike } from '../render/stage';
import { LEVELS_MASCOT } from '../ui/menus/levelSelectArt';
import { LevelSelectScreen } from '../ui/menus/levelSelect';
import type { MenuScreen } from '../ui/menus/menuScreen';
import { bestStars } from '../ui/menus/progress';
import { TITLE_MASCOT } from '../ui/menus/titleArt';
import { TitleScreen } from '../ui/menus/titleScreen';
import type { PointerKind } from '../ui/types';
import type { Audio } from './audio';
import { reduce, type AppInput, type AppState, type Screen } from './flow';
import { GameSession } from './game';
import { NO_MASCOT, type MascotPort } from './mascot';
import { BASELINE_FACTOR, GUARD_HOLD_MS, GUARD_LIMIT_MS, QualityGuard } from './qualityGuard';
import { loadProgress, loadSettings, mergeProgress, PROGRESS_KEY, saveProgress, saveSettings, type Settings } from './storage';

/** One canvas stacked in the container; later layers draw above earlier ones. */
export interface Layer {
  readonly canvas: CanvasLike;
  remove(): void;
  /** Offset the layer by CSS pixels (screen shake); (0, 0) puts it back. */
  shift(x: number, y: number): void;
}

export interface ShellHost {
  createLayer(): Layer;
  readonly storage: Storage | null;
  readonly audio: Audio;
  readonly levels: readonly LevelDef[];
  /** King Sunny; absent when there is no DOM to show him in. */
  readonly mascot?: MascotPort;
  /** The player asked for reduced motion: no screen shake. */
  reducedMotion?(): boolean;
  /** Where the one-line quality notice goes (the browser console in the app). */
  readonly console?: { info(...data: unknown[]): void };
  /**
   * Milliseconds of a monotonic clock (default performance.now). Read once per frame, at the start of the animation
   * frame callback, to measure the real, uncapped interval between frames.
   */
  now?(): number;
}

interface ActiveScreen {
  readonly layers: readonly Layer[];
  readonly session: GameSession | null;
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void;
  pointer(kind: PointerKind, cssX: number, cssY: number): AppInput | null;
  key(key: string): AppInput | null;
  frame(dt: number, settings: Settings): AppInput | null;
  /** The tab was hidden. */
  pause(): void;
  /** Progress changed in another tab. */
  progressChanged(): void;
}

/** Design coords → CSS pixels of a contain-fit board in a w × h container. */
export function designToCss(width: number, height: number): (p: Vec2) => Vec2 {
  const fit = containFit(Math.max(1, width), Math.max(1, height));
  return (p) => ({ x: p.x * fit.scale + fit.offsetX, y: p.y * fit.scale + fit.offsetY });
}

/** What a menu screen adds to the shared menu plumbing: its mascot slot and reactions. */
interface MenuHooks {
  readonly portrait: { x: number; y: number; size: number };
  /** Called every frame after render, to play reactions to what changed. */
  react(mascot: MascotPort): void;
  progressChanged(): void;
}

function menuScreen(layers: readonly Layer[], screen: MenuScreen, mascot: MascotPort, hooks: MenuHooks): ActiveScreen {
  let width = DESIGN_WIDTH;
  let height = DESIGN_HEIGHT;
  mascot.setFollow(true);
  mascot.play('wave');
  return {
    layers,
    session: null,
    resize(cssWidth, cssHeight, devicePixelRatio) {
      width = Math.max(1, cssWidth);
      height = Math.max(1, cssHeight);
      screen.resize(cssWidth, cssHeight, devicePixelRatio);
    },
    pointer(kind, cssX, cssY) {
      const fit = containFit(width, height);
      return screen.pointer(kind, { x: (cssX - fit.offsetX) / fit.scale, y: (cssY - fit.offsetY) / fit.scale });
    },
    key: (key) => screen.key(key),
    frame(dt, settings) {
      screen.render(dt, settings.soundOn);
      mascot.show(hooks.portrait, designToCss(width, height));
      hooks.react(mascot);
      return null;
    },
    pause() {},
    progressChanged: () => hooks.progressChanged(),
  };
}

function titleHooks(screen: TitleScreen): MenuHooks {
  let hovered = false;
  return {
    portrait: TITLE_MASCOT,
    react(mascot) {
      if (screen.playHovered && !hovered) mascot.play('smile');
      hovered = screen.playHovered;
    },
    progressChanged() {},
  };
}

function levelsHooks(screen: LevelSelectScreen, progress: () => AppState['progress']): MenuHooks {
  let seen = `${screen.selectedLevel}:${screen.difficulty}`;
  return {
    portrait: LEVELS_MASCOT,
    react(mascot) {
      const now = `${screen.selectedLevel}:${screen.difficulty}`;
      if (now === seen) return;
      seen = now;
      mascot.play(bestStars(screen.currentProgress, screen.selectedLevel, screen.difficulty) === 3 ? 'cool' : 'think');
    },
    progressChanged: () => screen.setProgress(progress()),
  };
}

export class Shell {
  private state: AppState;
  private active: ActiveScreen;
  private size = { width: DESIGN_WIDTH, height: DESIGN_HEIGHT, ratio: 1 };
  private readonly mascot: MascotPort;
  /**
   * Watches the real interval between frames (the device's pace from the first frames, then each level afresh); once
   * it drops the engine effects they stay off for the session.
   */
  private readonly quality = new QualityGuard();
  /**
   * Clock reading at the start of the last frame; null when the next interval would not be a frame's (the tab was
   * hidden, or a level was just built).
   */
  private lastFrameAt: number | null = null;

  constructor(private readonly host: ShellHost) {
    const settings = loadSettings(host.storage);
    this.mascot = host.mascot ?? NO_MASCOT;
    this.state = { screen: { kind: 'title' }, settings, progress: loadProgress(host.storage, host.levels.length) };
    host.audio.setMuted(!settings.soundOn);
    this.active = this.create(this.state.screen);
  }

  get screen(): Screen {
    return this.state.screen;
  }

  get settings(): Readonly<Settings> {
    return this.state.settings;
  }

  get progress(): AppState['progress'] {
    return this.state.progress;
  }

  /** The level being played, or null on a menu. */
  get session(): GameSession | null {
    return this.active.session;
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.size = { width: cssWidth, height: cssHeight, ratio: devicePixelRatio };
    this.active.resize(cssWidth, cssHeight, devicePixelRatio);
  }

  pointer(kind: PointerKind, cssX: number, cssY: number): void {
    if (kind === 'down') this.host.audio.unlock();
    this.dispatch(this.active.pointer(kind, cssX, cssY), true);
  }

  key(key: string): void {
    this.host.audio.unlock();
    this.dispatch(this.active.key(key), true);
  }

  /** Call at the start of each animation frame callback. dt: real seconds since the last frame (capped by the app). */
  frame(dt: number): void {
    this.watchQuality();
    this.dispatch(this.active.frame(dt, this.state.settings), false);
    this.shake();
  }

  /** Whether levels draw the engine's built-in effects (false once the quality guard dropped them). */
  get engineEffects(): boolean {
    return !this.quality.dropped;
  }

  /** The page was hidden: pause a running level. */
  hidden(): void {
    this.active.pause();
    this.lastFrameAt = null;
  }

  /**
   * Another tab wrote to storage (the `storage` event; key null means it was cleared). Progress only ever grows here:
   * the stored progress is merged into ours and the level select shows the result.
   */
  storageChanged(key: string | null): void {
    if (key !== null && key !== PROGRESS_KEY) return;
    const count = this.host.levels.length;
    this.state = { ...this.state, progress: mergeProgress(this.state.progress, loadProgress(this.host.storage, count), count) };
    this.active.progressChanged();
  }

  /**
   * Feeds the quality guard the real interval since the previous frame (it includes the browser's raster and
   * compositing of what that frame drew), and drops the engine effects when it says so.
   */
  private watchQuality(): void {
    const now = this.host.now?.() ?? performance.now();
    const last = this.lastFrameAt;
    this.lastFrameAt = now;
    const session = this.active.session;
    if (last === null || !this.quality.frame(now - last, session !== null) || !session) return;
    session.scene.setEngineEffects(false);
    const average = this.quality.average ?? 0;
    const threshold = this.quality.threshold ?? 0;
    (this.host.console ?? console).info(
      `[quality] level frames averaged ${average.toFixed(1)} ms apart (over ${threshold.toFixed(1)} ms, this device's pace × ${BASELINE_FACTOR} or ${GUARD_LIMIT_MS} ms, for ${GUARD_HOLD_MS / 1000} s): engine effects are off for the rest of the session`,
    );
  }

  private shake(): void {
    const session = this.active.session;
    if (!session) return;
    const still = this.host.reducedMotion?.() ?? false;
    const offset = still ? { x: 0, y: 0 } : session.shake;
    const [bg, world] = this.active.layers;
    bg?.shift(offset.x, offset.y);
    world?.shift(offset.x, offset.y);
  }

  private dispatch(input: AppInput | null, fromPlayer: boolean): void {
    if (!input) return;
    const { audio, storage, levels } = this.host;
    if (fromPlayer && this.active.session === null) audio.play('click');
    const t = reduce(this.state, input, levels.length);
    this.state = t.state;
    if (t.saveSettings) {
      saveSettings(storage, t.state.settings);
      audio.setMuted(!t.state.settings.soundOn);
    }
    if (t.saveProgress) this.state = { ...this.state, progress: saveProgress(storage, t.state.progress, levels.length) };
    if (t.enter) this.enter(this.state.screen);
  }

  private enter(screen: Screen): void {
    for (const layer of this.active.layers) layer.remove();
    this.active = this.create(screen);
    this.active.resize(this.size.width, this.size.height, this.size.ratio);
  }

  private create(screen: Screen): ActiveScreen {
    const { levels, audio } = this.host;
    const { settings, progress } = this.state;
    const mascot = this.mascot;
    if (screen.kind === 'game') {
      const level = levels.find((l) => l.id === screen.level);
      if (level) {
        const layers = [this.host.createLayer(), this.host.createLayer(), this.host.createLayer()] as const;
        const session = new GameSession({ bg: layers[0].canvas, world: layers[1].canvas, hud: layers[2].canvas }, level, screen.difficulty, audio, mascot);
        session.scene.setEngineEffects(this.engineEffects);
        this.quality.reset();
        this.lastFrameAt = null;
        return gameScreen(layers, session);
      }
      this.state = { ...this.state, screen: { kind: 'levels' } };
    }
    const back = this.host.createLayer();
    const live = this.host.createLayer();
    if (screen.kind === 'title') {
      const front = this.host.createLayer();
      const title = new TitleScreen({ back: back.canvas, live: live.canvas, front: front.canvas });
      return menuScreen([back, live, front], title, mascot, titleHooks(title));
    }
    const selected = screen.kind === 'levels' ? screen.selected : undefined;
    const select = new LevelSelectScreen({ back: back.canvas, live: live.canvas }, levels, progress, settings.difficulty, selected);
    return menuScreen([back, live], select, mascot, levelsHooks(select, () => this.state.progress));
  }
}

function gameScreen(layers: readonly [Layer, Layer, Layer], session: GameSession): ActiveScreen {
  return {
    layers,
    session,
    resize: (w, h, dpr) => session.resize(w, h, dpr),
    pointer: (kind, x, y) => session.pointer(kind, x, y),
    key: (key) => session.key(key),
    frame: (dt, settings) => session.frame(dt, settings),
    pause: () => session.pause(),
    progressChanged() {},
  };
}
