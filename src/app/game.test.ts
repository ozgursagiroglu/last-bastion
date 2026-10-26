import { describe, expect, it, vi } from 'vitest';
import { greedyCommand, roadSamples } from '../game/sim/bot';
import { getLevel } from '../game/levels';
import { FIXED_DT, type Command, type Vec2 } from '../game/types';
import { CALL, PAUSE_PANEL, TOP_BUTTONS, VICTORY_PANEL } from '../ui/hud/layout';
import { OVERLAY_PORTRAIT } from '../ui/hud/mascotBubble';
import type { MascotPort } from './mascot';
import { nullCanvasLike } from '../render/scene/testSupport';
import { Audio, type Sfx } from './audio';
import { FakeAudioContext } from './fakeAudio';
import { GameSession, type SessionAction } from './game';
import type { Settings } from './storage';

const level1 = getLevel(1);
const SETTINGS: Settings = { soundOn: true, difficulty: 'normal' };
/** CSS size of the test viewport: half the design board, so CSS and design coords differ. */
const CSS = { w: 640, h: 360 };

/** No test here looks at pixels: the layers draw nothing, so long runs time the engine's JS, not a rasterizer. */
const layers = () => ({ bg: nullCanvasLike(CSS.w, CSS.h), world: nullCanvasLike(CSS.w, CSS.h), hud: nullCanvasLike(CSS.w, CSS.h) });

function setup(): { session: GameSession; played: Sfx[] } {
  const audio = new Audio(() => new FakeAudioContext());
  audio.unlock();
  const played: Sfx[] = [];
  const play = audio.play.bind(audio);
  vi.spyOn(audio, 'play').mockImplementation((sfx) => {
    played.push(sfx);
    play(sfx);
  });
  const session = new GameSession(layers(), level1, 'normal', audio);
  session.resize(CSS.w, CSS.h, 1);
  return { session, played };
}

/** A press and release at a design point, sent as CSS coords. */
function click(session: GameSession, p: Vec2): SessionAction | null {
  const css = session.hud.stage.toCss(p);
  session.pointer('down', css.x, css.y);
  return session.pointer('up', css.x, css.y);
}

function closeMenu(session: GameSession): void {
  if (session.hud.openMenu) session.key('Escape');
}

/** Issue a command the way a player would: open the pad's menu, click the option. */
function clickCommand(session: GameSession, cmd: Command): void {
  closeMenu(session);
  const { level, towers } = session.view;
  if (cmd.type === 'callWave') {
    click(session, CALL);
    return;
  }
  const pad = cmd.type === 'build' ? cmd.pad : towers.find((t) => t.id === cmd.towerId)?.pad;
  const padAt = pad === undefined ? undefined : level.pads[pad];
  if (!padAt) throw new Error(`no pad for ${JSON.stringify(cmd)}`);
  click(session, padAt);
  const option = cmd.type === 'build' ? level.towers.indexOf(cmd.kind) : cmd.type === 'upgrade' ? 0 : 1;
  const slot = session.hud.openMenu?.slots[option];
  if (!slot) throw new Error(`menu did not open on pad ${pad}`);
  click(session, slot);
}

const FRAME_DT = 1 / 15;

describe('GameSession', () => {
  it('builds through pointer clicks at pad positions', () => {
    const { session, played } = setup();
    session.frame(FRAME_DT, SETTINGS);
    clickCommand(session, { type: 'build', pad: 0, kind: 'rifle' });
    expect(session.view.towers).toMatchObject([{ pad: 0, kind: 'rifle' }]);
    expect(played).toEqual([]);
    session.frame(FIXED_DT, SETTINGS);
    expect(played).toContain('build');
  });

  it('plays level 1 to a win at speed 2 and reports it once', () => {
    const { session, played } = setup();
    const samples = roadSamples(level1);
    let builds = 0;
    const think = () => {
      const cmd = greedyCommand(session.view, samples, builds);
      if (!cmd) return;
      const before = session.view.towers.length;
      clickCommand(session, cmd);
      if (session.view.towers.length > before) builds++;
    };
    session.frame(FRAME_DT, SETTINGS);
    think();
    expect(builds).toBe(1);
    clickCommand(session, { type: 'callWave' });
    expect(session.view.status).toBe('running');
    expect(click(session, TOP_BUTTONS.speed)).toBeNull();
    expect(session.currentSpeed).toBe(2);

    const actions: SessionAction[] = [];
    let lastThink = 0;
    for (let i = 0; i < 20_000 && session.view.status === 'running'; i++) {
      const action = session.frame(FRAME_DT, SETTINGS);
      if (action) actions.push(action);
      if (session.view.time - lastThink >= 1 && session.view.status === 'running') {
        lastThink = session.view.time;
        think();
      }
    }
    expect(session.view.status).toBe('won');
    expect(builds).toBeGreaterThan(2);
    expect(actions).toEqual([{ type: 'won', stars: session.view.stars }]);
    expect(played).toContain('victory');
    expect(played).toContain('rifle');
    expect(session.frame(FRAME_DT, SETTINGS)).toBeNull();
    expect(session.hud.currentOverlay).toBe('victory');
    expect(click(session, { x: VICTORY_PANEL.x, y: VICTORY_PANEL.y + VICTORY_PANEL.buttons.continue })).toEqual({ type: 'continue' });
    expect(click(session, { x: VICTORY_PANEL.x, y: VICTORY_PANEL.y + VICTORY_PANEL.buttons.replay })).toEqual({ type: 'restart' });
    // Hang guard: 27–64 s in the full suite on a laptop under load; CI runners are about half as fast.
  }, 360_000);

  it('pauses from the HUD and offers quit and restart', () => {
    const { session } = setup();
    clickCommand(session, { type: 'callWave' });
    session.frame(FRAME_DT, SETTINGS);
    expect(click(session, TOP_BUTTONS.pause)).toBeNull();
    expect(session.isPaused).toBe(true);
    const time = session.view.time;
    session.frame(FRAME_DT, SETTINGS);
    expect(session.view.time).toBe(time);
    expect(session.hud.currentOverlay).toBe('pause');
    expect(click(session, { x: PAUSE_PANEL.x, y: PAUSE_PANEL.y + PAUSE_PANEL.buttons.quit })).toEqual({ type: 'quit' });
    expect(click(session, { x: PAUSE_PANEL.x, y: PAUSE_PANEL.y + PAUSE_PANEL.buttons.restart })).toEqual({ type: 'restart' });
    expect(click(session, { x: PAUSE_PANEL.x, y: PAUSE_PANEL.y + PAUSE_PANEL.buttons.resume })).toBeNull();
    expect(session.isPaused).toBe(false);
    session.frame(FRAME_DT, SETTINGS);
    expect(session.view.time).toBeGreaterThan(time);
  });

  it('pauses on request only while running, and resumes by key', () => {
    const { session } = setup();
    session.pause();
    expect(session.isPaused).toBe(false);
    clickCommand(session, { type: 'callWave' });
    session.frame(FRAME_DT, SETTINGS);
    session.pause();
    expect(session.isPaused).toBe(true);
    session.frame(FRAME_DT, SETTINGS);
    expect(session.key(' ')).toBeNull();
    expect(session.isPaused).toBe(false);
  });

  it('forwards the sound toggle and toggles speed by key', () => {
    const { session } = setup();
    session.frame(FRAME_DT, SETTINGS);
    expect(click(session, TOP_BUTTONS.sound)).toEqual({ type: 'toggleSound' });
    expect(session.key('m')).toEqual({ type: 'toggleSound' });
    expect(session.key('f')).toBeNull();
    expect(session.currentSpeed).toBe(2);
    session.key('f');
    expect(session.currentSpeed).toBe(1);
  });

  it('reports a refused command to the HUD with the error sound', () => {
    const { session, played } = setup();
    session.frame(FRAME_DT, SETTINGS);
    const failed = vi.spyOn(session.hud, 'commandFailed');
    vi.spyOn(session.sim, 'command').mockReturnValue({ ok: false, reason: 'cannotCallWave' });
    click(session, CALL);
    expect(failed).toHaveBeenCalledWith('cannotCallWave');
    expect(played).toContain('error');
  });

  it('drives King Sunny: hidden at first, "Here they come!" on the first wave, cry and the defeat line on a loss', () => {
    const audio = new Audio(() => null);
    const calls: string[] = [];
    const mascot: MascotPort = {
      show: (p) => calls.push(`show ${p.x},${p.y}`),
      hide: () => calls.push('hide'),
      play: (e) => calls.push(`play ${e}`),
      setFollow: (on) => calls.push(`follow ${on}`),
    };
    const session = new GameSession(layers(), level1, 'hard', audio, mascot);
    session.resize(CSS.w, CSS.h, 1);
    expect(calls).toEqual(['hide', 'follow false']);
    session.frame(FRAME_DT, SETTINGS);
    expect(calls.at(-1)).toBe('hide');
    clickCommand(session, { type: 'callWave' });
    session.frame(FRAME_DT, SETTINGS);
    expect(calls).toContain('play surprise');
    expect(session.mascotMemory.current?.reaction.line).toBe('firstWave');
    let shook = false;
    for (let i = 0; i < 20_000 && session.view.status === 'running'; i++) {
      session.frame(FRAME_DT, SETTINGS);
      if (session.shake.x !== 0 || session.shake.y !== 0) shook = true;
    }
    expect(session.view.status).toBe('lost');
    expect(shook).toBe(true);
    session.frame(FRAME_DT, SETTINGS);
    expect(calls).toContain('play cry');
    expect(calls.at(-1)).toBe(`show ${OVERLAY_PORTRAIT.x},${OVERLAY_PORTRAIT.y}`);
    expect(session.hud.stage.engine.getObjectState(session.hud.parts.bubbles.defeat.groupId)?.visible).toBe(true);
  }, 180_000);

  it('freezes mascot reactions and the screen shake while paused', () => {
    const calls: string[] = [];
    const mascot: MascotPort = {
      show: () => calls.push('show'),
      hide: () => calls.push('hide'),
      play: (e) => calls.push(`play ${e}`),
      setFollow: () => undefined,
    };
    const session = new GameSession(layers(), level1, 'normal', new Audio(() => null), mascot);
    session.resize(CSS.w, CSS.h, 1);
    clickCommand(session, { type: 'callWave' });
    session.frame(FRAME_DT, SETTINGS);
    expect(calls).toContain('play surprise');
    vi.spyOn(session.sim, 'step').mockReturnValueOnce([{ type: 'enemyLeaked', id: 999, kind: 'grunt', livesLost: 1 }]);
    session.frame(FRAME_DT, SETTINGS);
    expect(calls.at(-1)).toBe('show');
    const shake = session.shake;
    expect(Math.hypot(shake.x, shake.y)).toBeGreaterThan(0.1);

    session.pause();
    for (let i = 0; i < 40; i++) session.frame(0.1, SETTINGS);
    expect(calls.at(-1)).toBe('hide');
    expect(session.shake).toEqual(shake);
    expect(session.key(' ')).toBeNull();
    session.frame(FRAME_DT, SETTINGS);
    expect(calls.at(-1)).toBe('show');
    expect(session.mascotMemory.current?.reaction.line).toBe('firstWave');
    expect(Math.hypot(session.shake.x, session.shake.y)).toBeGreaterThan(0);
  });

  it('runs at most the capped steps per frame', () => {
    const { session } = setup();
    clickCommand(session, { type: 'callWave' });
    const time = session.view.time;
    session.frame(10, SETTINGS);
    expect(session.view.time - time).toBeCloseTo(8 * FIXED_DT);
  });
});
