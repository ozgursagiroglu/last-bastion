import { describe, expect, it, vi } from 'vitest';
import { LEVELS } from '../game/levels';
import type { LevelDef, Vec2 } from '../game/types';
import { PAUSE_PANEL, TOP_BUTTONS, VICTORY_PANEL } from '../ui/hud/layout';
import { CORNER_PORTRAIT, type Portrait } from '../ui/hud/mascotBubble';
import { LEVELS_MASCOT } from '../ui/menus/levelSelectArt';
import { nullCanvasLike } from '../render/scene/testSupport';
import { emptyProgress, recordWin } from '../ui/menus/progress';
import { PLAY_BUTTON, SOUND_BUTTON, TITLE_MASCOT } from '../ui/menus/titleArt';
import { Audio } from './audio';
import { FakeAudioContext } from './fakeAudio';
import { portraitCss, type Expression, type MascotPort } from './mascot';
import { MemoryStorage } from './memoryStorage';
import { BASELINE_FRAMES, GUARD_HOLD_MS, GUARD_WINDOW } from './qualityGuard';
import { Shell, type Layer } from './shell';
import { loadProgress, loadSettings, PROGRESS_KEY, saveProgress, saveSettings } from './storage';

/** CSS viewport: wider than 16:9, so the board is letterboxed and offset. */
const CSS = { w: 800, h: 360 };

/** Level 1 cut down to a single grunt, with gold to spare, so a win takes a few hundred frames. */
const quickLevels: readonly LevelDef[] = LEVELS.map((l) =>
  l.id === 1 ? { ...l, startGold: 2000, waves: [{ groups: [{ enemy: 'grunt', count: 1, interval: 1, delay: 0, path: 0 }] }] } : l,
);

/** Records what the shell asks of King Sunny. */
class FakeMascot implements MascotPort {
  readonly played: Expression[] = [];
  shown: { portrait: Portrait; css: { left: number; top: number; size: number } } | null = null;
  follow: boolean | null = null;
  show(portrait: Portrait, toCss: (p: Vec2) => Vec2): void {
    this.shown = { portrait, css: portraitCss(portrait, toCss) };
  }
  hide(): void {
    this.shown = null;
  }
  play(expression: Expression): void {
    this.played.push(expression);
  }
  setFollow(on: boolean): void {
    this.follow = on;
  }
}

interface FakeLayer extends Layer {
  readonly shifts: Vec2[];
}

function setup(storage = new MemoryStorage(), reducedMotion = false) {
  const live = new Set<FakeLayer>();
  const order: FakeLayer[] = [];
  let created = 0;
  const ctx = new FakeAudioContext();
  const audio = new Audio(() => ctx);
  const mascot = new FakeMascot();
  const info = vi.fn();
  /** The monotonic clock the shell reads; it only moves when a test moves it (frames 0 ms apart are not measured). */
  const clock = { t: 0 };
  const shell = new Shell({
    storage,
    audio,
    levels: quickLevels,
    mascot,
    reducedMotion: () => reducedMotion,
    console: { info },
    now: () => clock.t,
    createLayer: () => {
      created++;
      const shifts: Vec2[] = [];
      // No test here looks at pixels: layers draw nothing, so long runs time the engine's JS, not a rasterizer.
      const layer: FakeLayer = { canvas: nullCanvasLike(1, 1), remove: () => live.delete(layer), shift: (x, y) => shifts.push({ x, y }), shifts };
      live.add(layer);
      order.push(layer);
      return layer;
    },
  });
  shell.resize(CSS.w, CSS.h, 1);
  /** Design coords → CSS coords of the letterboxed board. */
  const scale = Math.min(CSS.w / 1280, CSS.h / 720);
  const toCss = (p: { x: number; y: number }) => ({ x: p.x * scale + (CSS.w - 1280 * scale) / 2, y: p.y * scale + (CSS.h - 720 * scale) / 2 });
  const click = (p: { x: number; y: number }) => {
    const c = toCss(p);
    shell.pointer('down', c.x, c.y);
    shell.pointer('up', c.x, c.y);
  };
  /** The live layers in creation order (bottom to top). */
  const stack = () => order.filter((l) => live.has(l));
  return { shell, live, stack, storage, ctx, audio, mascot, info, clock, click, toCss, scale, created: () => created };
}

/** Enter level 1 and win it (the quick level has one grunt). */
function winLevel1(s: ReturnType<typeof setup>): void {
  s.shell.key('Enter');
  s.shell.key('Enter');
  const session = s.shell.session;
  if (!session) throw new Error('no session');
  for (const pad of [0, 1, 2]) session.sim.command({ type: 'build', pad, kind: 'rifle' });
  session.sim.command({ type: 'callWave' });
  for (let i = 0; i < 5000 && session.view.status === 'running'; i++) s.shell.frame(0.1);
}

describe('Shell', () => {
  it('starts on the title with three sized layers and the saved settings', () => {
    const storage = new MemoryStorage();
    saveSettings(storage, { soundOn: false, difficulty: 'hard' });
    const { shell, live, ctx, audio } = setup(storage);
    expect(shell.screen).toEqual({ kind: 'title' });
    expect(shell.settings).toEqual({ soundOn: false, difficulty: 'hard' });
    expect([...live].map((l) => [l.canvas.width, l.canvas.height])).toEqual([
      [CSS.w, CSS.h],
      [CSS.w, CSS.h],
      [CSS.w, CSS.h],
    ]);
    shell.frame(1 / 60);
    expect(audio.unlocked).toBe(false);
    shell.key('x');
    expect(audio.unlocked).toBe(true);
    expect(ctx.master?.gain.value).toBe(0);
  });

  it('maps CSS pointer coords to the title controls and persists the sound toggle', () => {
    const { shell, storage, click, live } = setup();
    shell.frame(1 / 60);
    click(SOUND_BUTTON);
    expect(shell.settings.soundOn).toBe(false);
    expect(loadSettings(storage).soundOn).toBe(false);
    click(PLAY_BUTTON);
    expect(shell.screen).toEqual({ kind: 'levels' });
    expect(live.size).toBe(2);
  });

  it('goes title → level select → game → level select, replacing the layers', () => {
    const { shell, live, storage, created } = setup();
    shell.key('Enter');
    expect(shell.screen).toEqual({ kind: 'levels' });
    shell.frame(1 / 60);
    shell.key('1');
    shell.key('Enter');
    expect(shell.screen).toEqual({ kind: 'game', level: 1, difficulty: 'easy' });
    expect(loadSettings(storage).difficulty).toBe('easy');
    expect(live.size).toBe(3);
    expect(created()).toBe(8);
    for (const layer of live) expect([layer.canvas.width, layer.canvas.height]).toEqual([CSS.w, CSS.h]);
    expect(shell.session?.difficulty).toBe('easy');
    shell.frame(1 / 60);
    shell.key('Escape');
    expect(shell.session?.isPaused).toBe(false);
    shell.key('Escape');
    expect(shell.screen).toEqual({ kind: 'game', level: 1, difficulty: 'easy' });
  });

  it('pauses when hidden, then quits and restarts from the pause menu', () => {
    const { shell, click, live } = setup();
    shell.key('Enter');
    shell.key('Enter');
    const first = shell.session;
    first?.sim.command({ type: 'callWave' });
    shell.frame(1 / 60);
    shell.hidden();
    expect(first?.isPaused).toBe(true);
    shell.frame(1 / 60);
    click({ x: PAUSE_PANEL.x, y: PAUSE_PANEL.y + PAUSE_PANEL.buttons.restart });
    expect(shell.session).not.toBe(first);
    expect(shell.session?.view.status).toBe('ready');
    expect(live.size).toBe(3);
    shell.session?.sim.command({ type: 'callWave' });
    shell.frame(1 / 60);
    click(TOP_BUTTONS.pause);
    shell.frame(1 / 60);
    click({ x: PAUSE_PANEL.x, y: PAUSE_PANEL.y + PAUSE_PANEL.buttons.quit });
    expect(shell.screen).toEqual({ kind: 'levels', selected: 1 });
    expect(shell.session).toBeNull();
    expect(live.size).toBe(2);
  });

  it('saves a win before the overlay choices, then continues to the next level', () => {
    const s = setup();
    const { shell, storage, click } = s;
    winLevel1(s);
    const session = shell.session;
    if (!session) throw new Error('no session');
    expect(session.view.status).toBe('won');
    expect(shell.progress.unlocked).toBe(2);
    expect(loadProgress(storage, LEVELS.length).stars[1]?.normal).toBe(session.view.stars);
    expect(loadProgress(storage, LEVELS.length).unlocked).toBe(2);
    shell.frame(0.1);
    click({ x: VICTORY_PANEL.x, y: VICTORY_PANEL.y + VICTORY_PANEL.buttons.continue });
    expect(shell.screen).toEqual({ kind: 'levels', selected: 2 });
    shell.key('Enter');
    expect(shell.screen).toEqual({ kind: 'game', level: 2, difficulty: 'normal' });
  });

  it('merges a win with newer progress another tab saved, instead of overwriting it', () => {
    const storage = new MemoryStorage();
    const s = setup(storage);
    let newer = emptyProgress(LEVELS.length);
    for (const id of [1, 2, 3, 4]) newer = recordWin(newer, id, 'hard', 3, LEVELS.length);
    saveProgress(storage, newer, LEVELS.length);
    winLevel1(s);
    const saved = loadProgress(storage, LEVELS.length);
    expect(saved.unlocked).toBe(5);
    expect(saved.stars[4]?.hard).toBe(3);
    expect(saved.stars[1]).toEqual({ easy: 0, normal: s.shell.session?.view.stars, hard: 3 });
    expect(s.shell.progress).toEqual(saved);
  });

  it('refreshes progress and the level select on a storage event from another tab', () => {
    const storage = new MemoryStorage();
    const { shell, stack } = setup(storage);
    shell.key('Enter');
    shell.frame(1 / 60);
    let other = emptyProgress(LEVELS.length);
    for (const id of [1, 2]) other = recordWin(other, id, 'normal', 2, LEVELS.length);
    storage.setItem(PROGRESS_KEY, JSON.stringify(other));
    shell.storageChanged('last-bastion:settings:v1');
    expect(shell.progress.unlocked).toBe(1);
    shell.storageChanged(PROGRESS_KEY);
    expect(shell.progress.unlocked).toBe(3);
    expect(shell.progress.stars[2]?.normal).toBe(2);
    expect(stack()).toHaveLength(2);
    shell.key('ArrowRight');
    shell.key('ArrowRight');
    shell.key('Enter');
    expect(shell.screen).toEqual({ kind: 'game', level: 3, difficulty: 'normal' });
    storage.clear();
    shell.storageChanged(null);
    expect(shell.progress.unlocked).toBe(3);
  });
});

describe('Shell mascot', () => {
  it('waves on the title, sits left of the title in CSS pixels, and smiles when PLAY is first hovered', () => {
    const { shell, mascot, toCss, scale } = setup();
    expect(mascot.played).toEqual(['wave']);
    expect(mascot.follow).toBe(true);
    shell.frame(1 / 60);
    const corner = toCss({ x: TITLE_MASCOT.x - TITLE_MASCOT.size / 2, y: TITLE_MASCOT.y - TITLE_MASCOT.size / 2 });
    expect(mascot.shown?.portrait).toEqual(TITLE_MASCOT);
    expect(mascot.shown?.css).toEqual({ left: Math.round(corner.x), top: Math.round(corner.y), size: Math.round(TITLE_MASCOT.size * scale) });
    const play = toCss(PLAY_BUTTON);
    shell.pointer('move', play.x, play.y);
    shell.frame(1 / 60);
    shell.pointer('move', play.x + 1, play.y);
    shell.frame(1 / 60);
    expect(mascot.played).toEqual(['wave', 'smile']);
    shell.pointer('move', 1, 1);
    shell.frame(1 / 60);
    shell.pointer('move', play.x, play.y);
    shell.frame(1 / 60);
    expect(mascot.played).toEqual(['wave', 'smile', 'smile']);
  });

  it('waves on the level select, thinks on a new selection and is cool on a 3-star level', () => {
    const storage = new MemoryStorage();
    let progress = emptyProgress(LEVELS.length);
    progress = recordWin(progress, 1, 'normal', 3, LEVELS.length);
    progress = recordWin(progress, 2, 'normal', 1, LEVELS.length);
    saveProgress(storage, progress, LEVELS.length);
    const { shell, mascot } = setup(storage);
    shell.key('Enter');
    shell.frame(1 / 60);
    expect(mascot.shown?.portrait).toEqual(LEVELS_MASCOT);
    expect(mascot.played).toEqual(['wave', 'wave']);
    shell.key('ArrowLeft');
    shell.frame(1 / 60);
    expect(mascot.played.at(-1)).toBe('think');
    shell.key('ArrowLeft');
    shell.frame(1 / 60);
    expect(mascot.played.at(-1)).toBe('cool');
    shell.key('3');
    shell.frame(1 / 60);
    expect(mascot.played.at(-1)).toBe('think');
    const count = mascot.played.length;
    shell.frame(1 / 60);
    expect(mascot.played).toHaveLength(count);
  });

  it('hides in game until a reaction, then shows the corner portrait and the HUD bubble', () => {
    const { shell, mascot } = setup();
    shell.key('Enter');
    shell.key('Enter');
    const session = shell.session;
    if (!session) throw new Error('no session');
    shell.frame(1 / 60);
    expect(mascot.shown).toBeNull();
    expect(mascot.follow).toBe(false);
    session.sim.command({ type: 'callWave' });
    shell.frame(1 / 60);
    shell.frame(0.5);
    expect(mascot.played.at(-1)).toBe('surprise');
    expect(mascot.shown?.portrait).toEqual(CORNER_PORTRAIT);
    expect(session.hud.stage.engine.getObjectState(session.hud.parts.bubbles.firstWave.groupId)?.visible).toBe(true);
    for (let t = 0; t < 3; t += 0.1) shell.frame(0.1);
    expect(mascot.shown).toBeNull();
  });
});

describe('Shell quality guard', () => {
  const HZ60 = 1000 / 60;
  const HZ30 = 1000 / 30;
  /** Level frames at 30 fps until the window is full and 3 s have passed: the drop comes on the 210th (±1 for rounding). */
  const TO_DROP_AT_30FPS = GUARD_WINDOW + Math.round(GUARD_HOLD_MS / HZ30);
  /** Hang guard: each run below took 3–12 s in the full suite on a laptop under load; CI runners are about half as fast. */
  const GUARD_TIMEOUT = 180_000;

  /** Shows `count` frames, `intervalMs` apart on the shell's clock (the app's dt is capped at 0.1 s, the clock is not). */
  function frames(s: ReturnType<typeof setup>, count: number, intervalMs: number | ((i: number) => number)): void {
    for (let i = 0; i < count; i++) {
      const ms = typeof intervalMs === 'number' ? intervalMs : intervalMs(i);
      s.clock.t += ms;
      s.shell.frame(Math.min(0.1, ms / 1000));
    }
  }

  /** The title for the guard to learn the device's pace (the first frame only starts the clock), then level 1. */
  function playAfterTitle(s: ReturnType<typeof setup>, paceMs: number | ((i: number) => number)) {
    frames(s, BASELINE_FRAMES + 1, paceMs);
    s.shell.key('Enter');
    s.shell.key('Enter');
    const session = s.shell.session;
    if (!session) throw new Error('no session');
    return session;
  }

  /** Starts a wave, pauses and restarts the level from the pause menu (2 frames); returns the new session. */
  function restart(s: ReturnType<typeof setup>, intervalMs: number) {
    const first = s.shell.session;
    first?.sim.command({ type: 'callWave' });
    frames(s, 1, intervalMs);
    first?.pause();
    frames(s, 1, intervalMs);
    s.click({ x: PAUSE_PANEL.x, y: PAUSE_PANEL.y + PAUSE_PANEL.buttons.restart });
    const next = s.shell.session;
    if (!next || next === first) throw new Error('no new session');
    return next;
  }

  it('drops the effects when a 60 Hz device slows to 30 fps in a level, for the rest of the session, with one line', () => {
    const s = setup();
    const first = playAfterTitle(s, HZ60);
    expect(first.scene.engineEffects).toBe(true);
    // The first level frame only restarts the clock (its interval spans building the level).
    frames(s, 1 + TO_DROP_AT_30FPS - 2, HZ30);
    expect(first.scene.engineEffects).toBe(true);
    frames(s, 4, HZ30);
    expect(first.scene.engineEffects).toBe(false);
    expect(s.shell.engineEffects).toBe(false);
    expect(s.info).toHaveBeenCalledTimes(1);
    expect(s.info.mock.calls[0]?.[0]).toMatch(/^\[quality\] .*engine effects are off/);

    frames(s, 30, HZ60);
    expect(first.scene.engineEffects).toBe(false);
    expect(restart(s, HZ60).scene.engineEffects).toBe(false);
    frames(s, 30, 100);
    expect(s.info).toHaveBeenCalledTimes(1);
  }, GUARD_TIMEOUT);

  it('keeps the effects of a 30 Hz-capped device that plays at its own pace', () => {
    const s = setup();
    const jitter = (i: number) => HZ30 + ((i * 7) % 5) - 2;
    const session = playAfterTitle(s, jitter);
    frames(s, TO_DROP_AT_30FPS + 90, jitter);
    expect(session.scene.engineEffects).toBe(true);
    expect(s.info).not.toHaveBeenCalled();
  }, GUARD_TIMEOUT);

  it('measures each level afresh: slow time does not carry over from the previous level', () => {
    const s = setup();
    playAfterTitle(s, HZ60);
    frames(s, 1 + TO_DROP_AT_30FPS - 12, HZ30);
    const next = restart(s, HZ30);
    frames(s, 1 + TO_DROP_AT_30FPS - 2, HZ30);
    expect(next.scene.engineEffects).toBe(true);
    frames(s, 4, HZ30);
    expect(next.scene.engineEffects).toBe(false);
    expect(s.info).toHaveBeenCalledTimes(1);
  }, GUARD_TIMEOUT);

  it('does not count the time the tab was hidden as a frame', () => {
    const s = setup();
    const session = playAfterTitle(s, HZ60);
    frames(s, GUARD_WINDOW + 1, HZ60);
    s.shell.hidden();
    frames(s, 1, 120_000);
    frames(s, 5, HZ60);
    expect(session.scene.engineEffects).toBe(true);
  }, GUARD_TIMEOUT);
});

describe('Shell shake', () => {
  function leakOnce(reducedMotion: boolean) {
    const s = setup(new MemoryStorage(), reducedMotion);
    s.shell.key('Enter');
    s.shell.key('Enter');
    const session = s.shell.session;
    if (!session) throw new Error('no session');
    session.sim.command({ type: 'callWave' });
    for (let i = 0; i < 5000 && session.view.lives === session.view.maxLives; i++) s.shell.frame(0.1);
    s.shell.frame(0.02);
    return s;
  }

  it('shakes the bg and world layers on a leak, never the HUD', () => {
    const { stack } = leakOnce(false);
    const [bg, world, hud] = stack();
    const last = (l: FakeLayer | undefined) => l?.shifts.at(-1) ?? { x: 0, y: 0 };
    expect(Math.hypot(last(bg).x, last(bg).y)).toBeGreaterThan(0.1);
    expect(last(world)).toEqual(last(bg));
    expect(hud?.shifts).toEqual([]);
  });

  it('keeps the layers still with prefers-reduced-motion', () => {
    const { stack } = leakOnce(true);
    for (const layer of stack()) for (const s of layer.shifts) expect(s).toEqual({ x: 0, y: 0 });
  });
});
