import { existsSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { containFit } from '../render/stage';
import { EXPRESSIONS, MASCOT_ATTRIBUTES, MASCOT_LOAD_TIMEOUT, MASCOT_SCRIPT_URL, MASCOT_TAG, MascotController, NO_MASCOT, portraitCss, type ElementLike, type MascotEnv } from './mascot';

class FakeElement implements ElementLike {
  readonly attributes = new Map<string, string>();
  readonly styles = new Map<string, string>();
  readonly style = {
    setProperty: (name: string, value: string) => void (value === '' ? this.styles.delete(name) : this.styles.set(name, value)),
    getPropertyValue: (name: string) => this.styles.get(name) ?? '',
  };
  readonly listeners = new Map<string, (() => void)[]>();
  readonly played: string[] = [];
  connected = false;
  /** Times the component mounted a live engine (each connect does, like the real connectedCallback). */
  mounts = 0;
  /** Times it destroyed it (each disconnect). */
  unmounts = 0;
  throwOnPlay = false;
  constructor(readonly tag: string) {}
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  fire(type: string): void {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
  remove(): void {
    if (this.connected) this.unmounts++;
    this.connected = false;
  }
  play(expression: string): void {
    if (this.throwOnPlay) throw new Error('engine gone');
    this.played.push(expression);
  }
}

function setup(defined: 'already' | 'later' | 'never' = 'later') {
  const created: FakeElement[] = [];
  const head: FakeElement[] = [];
  const timers: { callback: () => void; ms: number }[] = [];
  let define: () => void = () => undefined;
  const whenDefined = new Promise<unknown>((resolve) => {
    define = () => resolve(undefined);
  });
  const info = vi.fn();
  const env: MascotEnv<FakeElement> = {
    document: {
      createElement: (tag) => {
        const el = new FakeElement(tag);
        created.push(el);
        return el;
      },
      head: { append: (el) => void head.push(el) },
    },
    customElements: { get: () => (defined === 'already' ? class {} : undefined), whenDefined: () => (defined === 'never' ? new Promise(() => undefined) : whenDefined) },
    setTimeout: (callback, ms) => timers.push({ callback, ms }),
    console: { info },
  };
  const container: FakeElement[] = [];
  const mascot = new MascotController(env, {
    append: (el) => {
      if (!el.connected) el.mounts++;
      el.connected = true;
      container.push(el);
    },
  });
  const element = () => created.find((e) => e.tag === MASCOT_TAG);
  return { mascot, created, head, timers, define, info, container, element };
}

const identity = (p: { x: number; y: number }) => p;
const slot = { x: 100, y: 200, size: 120 };

describe('portraitCss', () => {
  it('maps the design-space circle to a CSS box through the board fit', () => {
    expect(portraitCss(slot, identity)).toEqual({ left: 40, top: 140, size: 120 });
    const fit = containFit(800, 360);
    const toCss = (p: { x: number; y: number }) => ({ x: p.x * fit.scale + fit.offsetX, y: p.y * fit.scale + fit.offsetY });
    expect(portraitCss(slot, toCss)).toEqual({ left: Math.round(80 + 40 * 0.5), top: 70, size: 60 });
  });
});

describe('MascotController', () => {
  it('lists the component expressions and the royal recolor', () => {
    expect(EXPRESSIONS).toHaveLength(17);
    expect(MASCOT_ATTRIBUTES).toMatchObject({ mascot: 'ip-2011', colors: 'f5b941,b3261e,1d3b78', mood: '85', personality: 'auto' });
    expect(MASCOT_ATTRIBUTES.base).toBe(`${import.meta.env.BASE_URL}mascots/`);
    expect(existsSync(new URL(`../../public/mascots/${MASCOT_ATTRIBUTES.mascot}.bexode`, import.meta.url))).toBe(true);
    expect(MASCOT_ATTRIBUTES.moments).not.toBe('off');
  });

  it('injects the script once and gives up after the timeout, leaving every call a no-op', async () => {
    const s = setup('never');
    const first = s.mascot.load();
    expect(s.mascot.load()).toBe(first);
    expect(s.head.map((e) => [e.tag, e.attributes.get('src')])).toEqual([['script', MASCOT_SCRIPT_URL]]);
    expect(s.timers.map((t) => t.ms)).toEqual([MASCOT_LOAD_TIMEOUT]);
    s.timers[0]?.callback();
    expect(await first).toBe(false);
    expect(s.mascot.loaded).toBe(false);
    s.mascot.show(slot, identity);
    s.mascot.play('wave');
    s.mascot.hide();
    expect(s.container).toEqual([]);
    expect(s.element()).toBeUndefined();
  });

  it('gives up when the script errors', async () => {
    const s = setup('never');
    const done = s.mascot.load();
    s.head[0]?.fire('error');
    expect(await done).toBe(false);
  });

  it('skips the script when the element is already defined', async () => {
    const s = setup('already');
    expect(await s.mascot.load()).toBe(true);
    expect(s.head).toEqual([]);
    expect(s.element()?.attributes.get('mascot')).toBe('ip-2011');
  });

  it('creates the framed element once defined, mounts it on the first show and hides it with display: none', async () => {
    const s = setup();
    const done = s.mascot.load();
    s.define();
    expect(await done).toBe(true);
    const el = s.element();
    if (!el) throw new Error('no element');
    expect(Object.fromEntries(el.attributes)).toEqual(MASCOT_ATTRIBUTES);
    expect(el.styles.get('pointer-events')).toBe('none');
    expect(el.styles.get('border')).toBe('4px solid #ffd95a');
    expect(el.styles.get('visibility')).toBe('hidden');
    expect(el.connected).toBe(false);

    s.mascot.show(slot, identity);
    expect(el.connected).toBe(true);
    expect(s.mascot.shown).toBe(true);
    expect([el.styles.get('left'), el.styles.get('top'), el.styles.get('width'), el.styles.get('height')]).toEqual(['40px', '140px', '120px', '120px']);
    expect(el.attributes.get('follow')).toBe('true');
    s.mascot.show(slot, identity);
    expect(s.container).toHaveLength(1);
    expect(el.styles.has('display')).toBe(false);

    s.mascot.hide();
    expect(s.mascot.shown).toBe(false);
    expect(el.connected).toBe(true);
    expect(el.styles.get('display')).toBe('none');
    s.mascot.hide();
    s.mascot.setFollow(false);
    expect(el.attributes.get('follow')).toBe('false');
    s.mascot.show({ ...slot, x: 200 }, identity);
    expect(s.mascot.shown).toBe(true);
    expect(el.styles.has('display')).toBe(false);
    expect(el.styles.get('left')).toBe('140px');
    expect([el.mounts, el.unmounts]).toEqual([1, 0]);
  });

  it('mounts the component once across show, hide, show, and detaches it only on destroy', async () => {
    const s = setup();
    const done = s.mascot.load();
    s.define();
    await done;
    const el = s.element();
    if (!el) throw new Error('no element');
    el.styles.set('display', 'block');
    for (let i = 0; i < 5; i++) {
      s.mascot.show(slot, identity);
      expect(el.styles.get('display')).toBe('block');
      s.mascot.hide();
      expect(el.styles.get('display')).toBe('none');
    }
    s.mascot.show(slot, identity);
    expect([el.mounts, el.unmounts]).toEqual([1, 0]);
    expect(s.container).toEqual([el]);
    s.mascot.destroy();
    expect([el.mounts, el.unmounts]).toEqual([1, 1]);
    expect(s.mascot.loaded).toBe(false);
    s.mascot.show(slot, identity);
    expect(el.mounts).toBe(1);
  });

  it('queues an expression until shown and ready, then plays requests at once while shown, and logs one line', async () => {
    const s = setup();
    const done = s.mascot.load();
    s.define();
    await done;
    const el = s.element();
    if (!el) throw new Error('no element');
    s.mascot.play('wave');
    s.mascot.show(slot, identity);
    s.mascot.play('smile');
    expect(el.played).toEqual([]);
    el.fire('ready');
    expect(el.played).toEqual(['smile']);
    expect(el.styles.get('visibility')).toBe('visible');
    expect(s.info).toHaveBeenCalledTimes(1);
    s.mascot.play('think');
    expect(el.played).toEqual(['smile', 'think']);
    s.mascot.hide();
    s.mascot.play('cry');
    expect(el.played).toEqual(['smile', 'think']);
    s.mascot.show(slot, identity);
    expect(el.played).toEqual(['smile', 'think', 'cry']);
    s.mascot.show(slot, identity);
    el.fire('ready');
    expect(el.played).toEqual(['smile', 'think', 'cry']);
    expect(s.info).toHaveBeenCalledTimes(1);
    el.throwOnPlay = true;
    expect(() => s.mascot.play('party')).not.toThrow();
  });

  it('keeps an expression asked for before ready across hide() and plays it on the next show', async () => {
    const s = setup();
    const done = s.mascot.load();
    s.define();
    await done;
    const el = s.element();
    if (!el) throw new Error('no element');
    s.mascot.show(slot, identity);
    s.mascot.play('surprise');
    s.mascot.hide();
    el.fire('ready');
    expect(el.played).toEqual([]);
    s.mascot.hide();
    s.mascot.show(slot, identity);
    expect(el.played).toEqual(['surprise']);
    s.mascot.show(slot, identity);
    expect(el.played).toEqual(['surprise']);
  });

  it('plays a reaction GameSession starts in a frame where the portrait is still hidden (it hides before sliding in)', async () => {
    const s = setup();
    const done = s.mascot.load();
    s.define();
    await done;
    const el = s.element();
    if (!el) throw new Error('no element');
    s.mascot.hide();
    s.mascot.play('surprise');
    s.mascot.hide();
    s.mascot.show(slot, identity);
    el.fire('ready');
    expect(el.played).toEqual(['surprise']);
  });

  it('has a do-nothing stand-in', () => {
    expect(() => {
      NO_MASCOT.show(slot, identity);
      NO_MASCOT.play('wave');
      NO_MASCOT.setFollow(false);
      NO_MASCOT.hide();
    }).not.toThrow();
  });
});
