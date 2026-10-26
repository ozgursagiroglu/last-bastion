/**
 * King Sunny: ExodeUI's "Sunny the Lion" mascot (id ip-2011, free for personal and commercial use) through the official
 * <exode-mascot> web component. The script is injected once, lazily; when it cannot load, the game runs without him.
 * The element sits over the canvases in a round gold frame, placed from design coords, and never takes pointer input.
 */
import type { Vec2 } from '../game/types';
import type { Portrait } from '../ui/hud/mascotBubble';

export const MASCOT_SCRIPT_URL = 'https://www.exodeui.com/mascots/exode-mascot.js';
export const MASCOT_TAG = 'exode-mascot';
/** Milliseconds the script gets to define the element before the game gives up on the mascot. */
export const MASCOT_LOAD_TIMEOUT = 6000;

/**
 * Where the mascot's art (`ip-2011.bexode`) is served from: this site, under public/mascots. ExodeUI's file server
 * sends no CORS headers, so the component's default fetch from exodeui.com fails on any other origin.
 */
export const MASCOT_ART_BASE = `${import.meta.env.BASE_URL}mascots/`;

/** The royal recolor: main gold, second crimson, background royal blue. */
export const MASCOT_ATTRIBUTES: Readonly<Record<string, string>> = {
  mascot: 'ip-2011',
  base: MASCOT_ART_BASE,
  colors: 'f5b941,b3261e,1d3b78',
  mood: '85',
  personality: 'auto',
  moments: 'on',
};

export const EXPRESSIONS = [
  'wave',
  'smile',
  'laugh',
  'wink',
  'love',
  'kiss',
  'starstruck',
  'cool',
  'think',
  'surprise',
  'blep',
  'nervous',
  'sleepy',
  'cry',
  'grumpy',
  'dizzy',
  'party',
] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** The frame around the portrait (the component's own square corners are clipped by the round border). */
const FRAME_STYLE: Readonly<Record<string, string>> = {
  position: 'absolute',
  'box-sizing': 'border-box',
  'border-radius': '50%',
  border: '4px solid #ffd95a',
  'box-shadow': '0 6px 18px rgba(0, 0, 0, 0.5)',
  background: '#1d3b78',
  overflow: 'hidden',
  'pointer-events': 'none',
  'z-index': '2',
  visibility: 'hidden',
};

/** The DOM the controller uses (a real document satisfies it; tests pass a fake). */
export interface StyleLike {
  setProperty(name: string, value: string): void;
  getPropertyValue(name: string): string;
}
export interface ElementLike {
  readonly style: StyleLike;
  setAttribute(name: string, value: string): void;
  addEventListener(type: string, listener: () => void): void;
  remove(): void;
}
export interface ContainerLike<E extends ElementLike = ElementLike> {
  append(node: E): void;
}
export interface MascotEnv<E extends ElementLike = ElementLike> {
  readonly document: { createElement(tag: string): E; readonly head: ContainerLike<E> };
  readonly customElements: { get(name: string): unknown; whenDefined(name: string): Promise<unknown> };
  setTimeout(callback: () => void, ms: number): unknown;
  readonly console: { info(...data: unknown[]): void };
}

/** What screens ask of the mascot. Every method is a no-op until (and unless) the component is ready. */
export interface MascotPort {
  /** Show the portrait at a design-space slot; toCss maps design coords to CSS pixels in the container. */
  show(portrait: Portrait, toCss: (p: Vec2) => Vec2): void;
  hide(): void;
  play(expression: Expression): void;
  /** Whether the eyes follow the cursor (the `follow` attribute). */
  setFollow(on: boolean): void;
}

/** A mascot that never appears (tests, or a host without a DOM). */
export const NO_MASCOT: MascotPort = { show() {}, hide() {}, play() {}, setFollow() {} };

/** CSS box of a portrait: left/top corner and side, rounded to whole pixels. */
export function portraitCss(portrait: Portrait, toCss: (p: Vec2) => Vec2): { left: number; top: number; size: number } {
  const r = portrait.size / 2;
  const a = toCss({ x: portrait.x - r, y: portrait.y - r });
  const b = toCss({ x: portrait.x + r, y: portrait.y + r });
  return { left: Math.round(a.x), top: Math.round(a.y), size: Math.max(1, Math.round(b.x - a.x)) };
}

/**
 * Owns the <exode-mascot> element. The component mounts a live engine and fetches its art on every connect and
 * destroys it on disconnect, so the element is attached once, the first time it is shown, and hidden with
 * `display: none` (its IntersectionObserver then reports it invisible and the shared loop stops ticking it).
 */
export class MascotController<E extends ElementLike = ElementLike> implements MascotPort {
  private loading: Promise<boolean> | null = null;
  private element: E | null = null;
  private ready = false;
  private attached = false;
  private hidden = false;
  /** The element's display value before hide(), restored by show(). */
  private display = '';
  private placed = '';
  private follow = true;
  /** The last expression asked for while the component was hidden or not ready; played once it is both shown and ready. */
  private pending: Expression | null = null;

  constructor(
    private readonly env: MascotEnv<E>,
    private readonly container: ContainerLike<E>,
    private readonly timeout = MASCOT_LOAD_TIMEOUT,
  ) {}

  /** The component is defined and the element exists (it may still be loading its art). */
  get loaded(): boolean {
    return this.element !== null;
  }

  get shown(): boolean {
    return this.attached && !this.hidden;
  }

  /** Inject the script (once) and create the element. Resolves false when the mascot is unavailable; never rejects. */
  load(): Promise<boolean> {
    this.loading ??= this.inject().catch(() => false);
    return this.loading;
  }

  show(portrait: Portrait, toCss: (p: Vec2) => Vec2): void {
    const el = this.element;
    if (!el) return;
    const box = portraitCss(portrait, toCss);
    const placed = `${box.left},${box.top},${box.size}`;
    if (placed !== this.placed) {
      this.placed = placed;
      el.style.setProperty('left', `${box.left}px`);
      el.style.setProperty('top', `${box.top}px`);
      el.style.setProperty('width', `${box.size}px`);
      el.style.setProperty('height', `${box.size}px`);
    }
    if (this.hidden) {
      el.style.setProperty('display', this.display);
      this.hidden = false;
    }
    if (!this.attached) {
      el.setAttribute('follow', this.follow ? 'true' : 'false');
      this.container.append(el);
      this.attached = true;
    }
    this.flush();
  }

  /** Hides the portrait; a pending expression keeps waiting for the next show. */
  hide(): void {
    const el = this.element;
    if (!el || !this.attached || this.hidden) return;
    this.display = el.style.getPropertyValue('display');
    el.style.setProperty('display', 'none');
    this.hidden = true;
  }

  /**
   * Plays at once when the component is shown and ready; otherwise the last request waits until both hold (a reaction
   * usually starts a frame before its portrait slides in).
   */
  play(expression: Expression): void {
    this.pending = expression;
    this.flush();
  }

  setFollow(on: boolean): void {
    this.follow = on;
    if (this.attached) this.element?.setAttribute('follow', on ? 'true' : 'false');
  }

  /** Detach the element for good (app teardown): the component destroys its live engine. */
  destroy(): void {
    this.pending = null;
    if (this.attached) this.element?.remove();
    this.attached = false;
    this.element = null;
  }

  private flush(): void {
    const pending = this.pending;
    if (!pending || !this.ready || !this.shown) return;
    this.pending = null;
    this.call(pending);
  }

  private call(expression: Expression): void {
    const el: object | null = this.element;
    if (!el || !('play' in el) || typeof el.play !== 'function') return;
    try {
      el.play.call(el, expression);
    } catch {
      // A mascot hiccup must never reach the game.
    }
  }

  private async inject(): Promise<boolean> {
    const { document, customElements } = this.env;
    if (customElements.get(MASCOT_TAG) === undefined) {
      const script = document.createElement('script');
      const failed = new Promise<boolean>((resolve) => {
        script.addEventListener('error', () => resolve(false));
        this.env.setTimeout(() => resolve(false), this.timeout);
      });
      script.setAttribute('src', MASCOT_SCRIPT_URL);
      script.setAttribute('async', '');
      document.head.append(script);
      const defined = await Promise.race([customElements.whenDefined(MASCOT_TAG).then(() => true), failed]);
      if (!defined) return false;
    }
    const el = document.createElement(MASCOT_TAG);
    for (const [name, value] of Object.entries(MASCOT_ATTRIBUTES)) el.setAttribute(name, value);
    for (const [name, value] of Object.entries(FRAME_STYLE)) el.style.setProperty(name, value);
    el.addEventListener('ready', () => this.onReady());
    this.element = el;
    return true;
  }

  private onReady(): void {
    const el = this.element;
    if (!el) return;
    if (!this.ready) this.env.console.info('[mascot] King Sunny is ready (exode-mascot ip-2011)');
    this.ready = true;
    el.style.setProperty('visibility', 'visible');
    this.flush();
  }
}
