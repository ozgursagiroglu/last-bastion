/** The browser side of the app: canvases in the container, DOM events, fonts, resizing and the animation frame loop. */
import { GAME_FONT } from '../art/fonts';
import { LEVELS } from '../game/levels';
import type { PointerKind } from '../ui/types';
import { Audio } from './audio';
import { MascotController, type MascotEnv } from './mascot';
import { Shell, type Layer } from './shell';
import { browserStorage } from './storage';

/** Longest frame fed to the game, in seconds (a stalled tab must not fast-forward the level). */
export const MAX_FRAME_DT = 0.1;

/** Keys whose browser default (scrolling, activating focused elements) the game replaces. */
const CAPTURED_KEYS = new Set([' ', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

type BrowserWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
  ResizeObserver?: typeof ResizeObserver;
};

function createAudioContext(win: BrowserWindow): AudioContext | null {
  const Context = win.AudioContext ?? win.webkitAudioContext;
  return Context ? new Context() : null;
}

/** CSS transform for a layer shifted by (x, y) CSS pixels; '' when it sits in place. */
export function shiftTransform(x: number, y: number): string {
  if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return '';
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
}

/** Seconds between two animation frame timestamps, clamped to 0..MAX_FRAME_DT. */
export function frameDt(previous: number | null, now: number): number {
  if (previous === null) return 0;
  return Math.min(MAX_FRAME_DT, Math.max(0, (now - previous) / 1000));
}

export class App {
  private shell: Shell | null = null;
  private lastFrame: number | null = null;
  private started = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly win: Window,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.loadFont().then(() => this.boot());
  }

  private async loadFont(): Promise<void> {
    try {
      await this.win.document.fonts.load(`32px "${GAME_FONT}"`);
    } catch {
      // Without the font the canvas falls back to a system font; the game still works.
    }
  }

  private boot(): void {
    const win = this.win as BrowserWindow;
    const doc = win.document;
    const audio = new Audio(() => createAudioContext(win));
    const mascot = this.createMascot();
    const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.shell = new Shell({
      storage: browserStorage(win),
      audio,
      levels: LEVELS,
      mascot: mascot ?? undefined,
      reducedMotion: () => motion?.matches ?? false,
      console,
      createLayer: () => this.createLayer(),
    });
    this.fit();
    void mascot?.load();
    if (win.ResizeObserver) new win.ResizeObserver(() => this.fit()).observe(this.root);
    win.addEventListener('resize', () => this.fit());
    win.addEventListener('storage', (e) => this.shell?.storageChanged(e.key));

    this.root.addEventListener('pointerdown', (e) => this.pointer('down', e));
    this.root.addEventListener('pointermove', (e) => this.pointer('move', e));
    this.root.addEventListener('pointerup', (e) => this.pointer('up', e));
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    // Keys reach the container's listener only while it has focus.
    this.root.tabIndex = 0;
    this.root.style.outline = 'none';
    this.root.focus();
    this.root.addEventListener('keydown', (e) => this.keydown(e));
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) this.shell?.hidden();
      this.lastFrame = null;
    });
    win.requestAnimationFrame((t) => this.tick(t));
  }

  private createLayer(): Layer {
    const canvas = this.win.document.createElement('canvas');
    this.root.append(canvas);
    let transform = '';
    return {
      canvas,
      remove: () => canvas.remove(),
      shift: (x, y) => {
        const next = shiftTransform(x, y);
        if (next === transform) return;
        transform = next;
        canvas.style.transform = next;
      },
    };
  }

  /** King Sunny over the canvases, or null when the browser has no custom elements. */
  private createMascot(): MascotController<HTMLElement> | null {
    const win = this.win;
    const registry = (win as Partial<Pick<Window, 'customElements'>>).customElements;
    if (!registry) return null;
    const env: MascotEnv<HTMLElement> = {
      document: win.document,
      customElements: registry,
      setTimeout: (callback, ms) => win.setTimeout(callback, ms),
      console,
    };
    return new MascotController<HTMLElement>(env, this.root);
  }

  private fit(): void {
    this.shell?.resize(this.root.clientWidth, this.root.clientHeight, this.win.devicePixelRatio || 1);
  }

  private pointer(kind: PointerKind, e: PointerEvent): void {
    if (kind !== 'move' && e.pointerType === 'mouse' && e.button !== 0) return;
    if (kind === 'down') this.root.focus();
    const rect = this.root.getBoundingClientRect();
    this.shell?.pointer(kind, e.clientX - rect.left, e.clientY - rect.top);
  }

  private keydown(e: KeyboardEvent): void {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (CAPTURED_KEYS.has(e.key)) e.preventDefault();
    this.shell?.key(e.key);
  }

  private tick(now: number): void {
    const dt = frameDt(this.lastFrame, now);
    this.lastFrame = now;
    this.shell?.frame(dt);
    this.win.requestAnimationFrame((t) => this.tick(t));
  }
}
