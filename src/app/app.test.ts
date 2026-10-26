import { describe, expect, it, vi } from 'vitest';
import { nodeCanvasLike } from '../ui/menus/nodeCanvasLike';
import { TITLE_MASCOT } from '../ui/menus/titleArt';
import { App, frameDt, MAX_FRAME_DT, shiftTransform } from './app';
import { MASCOT_ATTRIBUTES, MASCOT_LOAD_TIMEOUT, MASCOT_SCRIPT_URL } from './mascot';
import { MemoryStorage } from './memoryStorage';
import { loadSettings } from './storage';

type Listener = (e: unknown) => void;

class FakeTarget {
  readonly listeners = new Map<string, Listener[]>();
  addEventListener(type: string, fn: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  fire(type: string, e: unknown = {}): void {
    for (const fn of this.listeners.get(type) ?? []) fn(e);
  }
}

/** A DOM element that records attributes, style properties and listeners. */
class FakeElement extends FakeTarget {
  readonly attributes = new Map<string, string>();
  readonly styles = new Map<string, string>();
  readonly style = {
    setProperty: (name: string, value: string) => (value === '' ? this.styles.delete(name) : this.styles.set(name, value)),
    getPropertyValue: (name: string) => this.styles.get(name) ?? '',
  };
  readonly played: string[] = [];
  removed = 0;
  constructor(
    readonly tag: string,
    private readonly detach: (el: FakeElement) => void,
  ) {
    super();
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  remove(): void {
    this.removed++;
    this.detach(this);
  }
  play(expression: string): void {
    this.played.push(expression);
  }
}

/** How the fake browser treats the mascot script: no custom elements at all, never defined, or defined. */
type MascotScript = 'unsupported' | 'never' | 'defined';

/** Just enough of window, document and #app for App to boot and run in Node. */
function fakeBrowser(script: MascotScript = 'unsupported') {
  const children: object[] = [];
  const detach = (el: object) => {
    const i = children.indexOf(el);
    if (i >= 0) children.splice(i, 1);
  };
  const root = Object.assign(new FakeTarget(), {
    clientWidth: 640,
    clientHeight: 360,
    tabIndex: -1,
    style: { outline: '' },
    focused: 0,
    children,
    focus() {
      root.focused++;
    },
    append(child: object) {
      children.push(child);
    },
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
  });
  const fontsLoaded: string[] = [];
  const head: FakeElement[] = [];
  const document = Object.assign(new FakeTarget(), {
    hidden: false,
    head: { append: (el: FakeElement) => head.push(el) },
    fonts: {
      load: (font: string) => {
        fontsLoaded.push(font);
        return Promise.resolve([]);
      },
    },
    createElement: (tag: string) => {
      if (tag !== 'canvas') return new FakeElement(tag, detach);
      const canvas = Object.assign(nodeCanvasLike(1, 1), {
        style: { transform: '' },
        remove: () => detach(canvas),
      });
      return canvas;
    },
  });
  const frames: ((t: number) => void)[] = [];
  const timers: { callback: () => void; ms: number }[] = [];
  const observed: object[] = [];
  const storage = new MemoryStorage();
  const defined = script === 'defined';
  const customElements = {
    get: () => undefined,
    whenDefined: () => (defined ? Promise.resolve(undefined) : new Promise<never>(() => {})),
  };
  const win = Object.assign(new FakeTarget(), {
    document,
    devicePixelRatio: 2,
    localStorage: storage,
    requestAnimationFrame: (fn: (t: number) => void) => frames.push(fn),
    setTimeout: (callback: () => void, ms: number) => timers.push({ callback, ms }),
    ResizeObserver: class {
      constructor(readonly callback: () => void) {}
      observe(target: object) {
        observed.push(target);
      }
    },
    ...(script === 'unsupported' ? {} : { customElements }),
  });
  const runFrame = (t: number) => {
    const next = frames.shift();
    if (!next) throw new Error('no frame requested');
    next(t);
  };
  const key = (k: string) => root.fire('keydown', { key: k, repeat: false, ctrlKey: false, metaKey: false, altKey: false, preventDefault() {} });
  const canvases = () => children.filter((c) => !(c instanceof FakeElement));
  const mascots = () => children.filter((c): c is FakeElement => c instanceof FakeElement);
  return { root, document, head, win, frames, timers, observed, storage, fontsLoaded, runFrame, key, canvases, mascots };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('frameDt', () => {
  it('measures seconds between timestamps, clamped', () => {
    expect(frameDt(null, 1000)).toBe(0);
    expect(frameDt(1000, 1016)).toBeCloseTo(0.016);
    expect(frameDt(1000, 5000)).toBe(MAX_FRAME_DT);
    expect(frameDt(1000, 900)).toBe(0);
  });
});

describe('App', () => {
  it('loads the font, then boots the title and routes keys and frames', async () => {
    const b = fakeBrowser();
    const app = new App(b.root as unknown as HTMLElement, b.win as unknown as Window);
    app.start();
    app.start();
    expect(b.fontsLoaded).toEqual(['32px "Lilita One"']);
    expect(b.root.children).toHaveLength(0);
    await flush();
    expect(b.root.children).toHaveLength(3);
    expect(b.head).toEqual([]);
    expect(b.observed).toEqual([b.root]);
    const [canvas] = b.root.children as { width: number; height: number }[];
    expect([canvas?.width, canvas?.height]).toEqual([1280, 720]);
    expect(b.root.focused).toBe(1);

    b.runFrame(1000);
    b.runFrame(1016);
    expect(b.frames).toHaveLength(1);

    b.key('Enter');
    expect(b.root.children).toHaveLength(2);
    expect(b.root.children[0]).not.toBe(canvas);
    b.key('3');
    b.key('Enter');
    expect(b.root.children).toHaveLength(3);
    expect(loadSettings(b.storage).difficulty).toBe('hard');
    b.runFrame(1032);

    b.document.hidden = true;
    b.document.fire('visibilitychange');
    b.key('Escape');
    expect(b.root.children).toHaveLength(3);
  });

  it('maps pointer events relative to the container', async () => {
    const b = fakeBrowser();
    new App(b.root as unknown as HTMLElement, b.win as unknown as Window).start();
    await flush();
    b.runFrame(0);
    const scale = 360 / 720;
    const css = { x: 1212 * scale + (640 - 1280 * scale) / 2, y: 66 * scale };
    const event = { pointerType: 'mouse', button: 0, clientX: css.x + 10, clientY: css.y + 20 };
    b.root.fire('pointerdown', event);
    b.root.fire('pointerup', event);
    expect(loadSettings(b.storage).soundOn).toBe(false);
    b.root.fire('pointerdown', { ...event, button: 2 });
    b.root.fire('pointerup', { ...event, button: 2 });
    expect(loadSettings(b.storage).soundOn).toBe(false);
  });

  it('runs unchanged without a mascot when the script never defines the element', async () => {
    const b = fakeBrowser('never');
    new App(b.root as unknown as HTMLElement, b.win as unknown as Window).start();
    await flush();
    expect(b.head.map((s) => [s.tag, s.attributes.get('src'), s.attributes.has('async')])).toEqual([['script', MASCOT_SCRIPT_URL, true]]);
    expect(b.timers.map((t) => t.ms)).toEqual([MASCOT_LOAD_TIMEOUT]);
    b.timers[0]?.callback();
    await flush();
    b.runFrame(0);
    b.key('Enter');
    b.key('Enter');
    b.runFrame(16);
    b.runFrame(32);
    expect(b.mascots()).toEqual([]);
    expect(b.canvases()).toHaveLength(3);
  });

  it('runs unchanged without a mascot when the script fails to load', async () => {
    const b = fakeBrowser('never');
    new App(b.root as unknown as HTMLElement, b.win as unknown as Window).start();
    await flush();
    b.head[0]?.fire('error');
    await flush();
    b.runFrame(0);
    b.key('Enter');
    b.runFrame(16);
    expect(b.mascots()).toEqual([]);
    expect(b.canvases()).toHaveLength(2);
  });

  it('places the official component over the canvases once defined, and logs when it is ready', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const b = fakeBrowser('defined');
    new App(b.root as unknown as HTMLElement, b.win as unknown as Window).start();
    await flush();
    await flush();
    b.runFrame(0);
    const [el] = b.mascots();
    if (!el) throw new Error('mascot not attached');
    expect(el.tag).toBe('exode-mascot');
    expect(Object.fromEntries(el.attributes)).toEqual({ ...MASCOT_ATTRIBUTES, follow: 'true' });
    expect(el.styles.get('pointer-events')).toBe('none');
    expect(el.styles.get('border-radius')).toBe('50%');
    expect(el.styles.get('visibility')).toBe('hidden');
    const scale = 360 / 720;
    const left = (640 - 1280 * scale) / 2 + (TITLE_MASCOT.x - TITLE_MASCOT.size / 2) * scale;
    expect(el.styles.get('left')).toBe(`${Math.round(left)}px`);
    expect(el.styles.get('width')).toBe(`${TITLE_MASCOT.size * scale}px`);
    const mascotLines = () => info.mock.calls.filter(([first]) => String(first).startsWith('[mascot]'));
    expect(mascotLines()).toHaveLength(0);
    el.fire('ready');
    expect(mascotLines()).toHaveLength(1);
    expect(el.styles.get('visibility')).toBe('visible');
    expect(el.played).toEqual(['wave']);
    b.key('Enter');
    b.runFrame(16);
    expect(b.mascots()).toEqual([el]);
    expect(el.played).toEqual(['wave', 'wave']);
    b.key('Enter');
    b.runFrame(32);
    expect(b.mascots()).toEqual([el]);
    expect(el.styles.get('display')).toBe('none');
    expect(el.removed).toBe(0);
    info.mockRestore();
  });
});

describe('shiftTransform', () => {
  it('translates by CSS pixels and clears when back in place', () => {
    expect(shiftTransform(0, 0)).toBe('');
    expect(shiftTransform(0.004, -0.004)).toBe('');
    expect(shiftTransform(3, -1.5)).toBe('translate(3.00px, -1.50px)');
  });
});
