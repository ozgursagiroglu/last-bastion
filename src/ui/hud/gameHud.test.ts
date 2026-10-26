import { describe, expect, it } from 'vitest';
import { countPainted } from '../../platform/nodeCanvas';
import { TOWERS } from '../../game/config';
import { getLevel, LEVELS } from '../../game/levels';
import { createSimulation } from '../../game/sim';
import type { Difficulty, Simulation, Vec2, WorldView } from '../../game/types';
import type { HudAction, HudState } from '../types';
import { SHAKE_TIME, STAR_FIRST, STAR_GAP } from './anim';
import { GameHud } from './gameHud';
import { CALL, CALL_ZONE, DEFEAT_PANEL, inside, optionBox, overlaps, PAUSE_PANEL, SAFE, TOP_BUTTONS, VICTORY_PANEL } from './layout';
import { BUBBLE_LINE_IDS, bubbleCenter, CORNER_PORTRAIT, OVERLAY_PORTRAIT } from './mascotBubble';
import { nodeCanvasLike, playOut, stepUntil } from './scenarios';

const RUNNING: HudState = { speed: 1, paused: false, soundOn: true };
const PAUSED: HudState = { ...RUNNING, paused: true };

interface Rig {
  sim: Simulation;
  hud: GameHud;
  view: WorldView;
  canvas: ReturnType<typeof nodeCanvasLike>;
}

function rig(levelId = 1, difficulty: Difficulty = 'normal', sim?: Simulation): Rig {
  const level = getLevel(levelId);
  const s = sim ?? createSimulation(level, difficulty);
  const canvas = nodeCanvasLike(1280, 720);
  const hud = new GameHud(canvas, level);
  hud.resize(1280, 720, 1);
  hud.render(s.view, RUNNING, 0);
  return { sim: s, hud, view: s.view, canvas };
}

function click(r: Rig, p: Vec2): HudAction | null {
  r.hud.pointer('down', p, r.view);
  return r.hud.pointer('up', p, r.view);
}

function state(r: Rig, id: string): Record<string, unknown> {
  const s = r.hud.stage.engine.getObjectState(id) as Record<string, unknown> | undefined;
  if (!s) throw new Error(`no state for ${id}`);
  return s;
}

const visible = (r: Rig, id: string) => state(r, id).visible === true;
const text = (r: Rig, ids: readonly string[]) => state(r, ids[ids.length - 1] ?? '').text;
const fillColor = (r: Rig, id: string) => (state(r, id).style as { fill?: { color?: string } } | undefined)?.fill?.color;

function pad(r: Rig, i: number): Vec2 {
  const p = r.view.level.pads[i];
  if (!p) throw new Error(`no pad ${i}`);
  return p;
}

function slot(r: Rig, i: number): Vec2 {
  const s = r.hud.openMenu?.slots[i];
  if (!s) throw new Error(`no slot ${i}`);
  return s;
}

function apply(r: Rig, action: HudAction | null): void {
  if (action?.type !== 'command') throw new Error(`expected a command, got ${JSON.stringify(action)}`);
  expect(r.sim.command(action.command)).toEqual({ ok: true });
  r.hud.onEvents(r.sim.step(), r.view);
  r.hud.render(r.view, RUNNING, 1 / 60);
}

/** A point away from every pad, menu option and control. */
function emptyPoint(r: Rig): Vec2 {
  for (let y = 100; y < 580; y += 20) {
    for (let x = 40; x < 1240; x += 20) {
      const far = (q: Vec2, d: number) => Math.hypot(q.x - x, q.y - y) > d;
      if (r.view.level.pads.every((p) => far(p, 60)) && (r.hud.openMenu?.slots ?? []).every((s) => far(s, 70))) return { x, y };
    }
  }
  throw new Error('no empty point');
}

describe('GameHud build menu', () => {
  it('opens on a free pad and issues build for the clicked kind', () => {
    const r = rig(1);
    expect(click(r, pad(r, 0))).toBeNull();
    expect(r.hud.openMenu).toMatchObject({ kind: 'build', pad: 0 });
    expect(r.hud.openMenu?.slots).toHaveLength(r.view.level.towers.length);
    r.hud.render(r.view, RUNNING, 0.1);
    r.hud.parts.build.forEach((o) => expect(visible(r, o.groupId)).toBe(true));
    expect(visible(r, r.hud.parts.padSelected)).toBe(true);
    expect(text(r, r.hud.parts.build[1]?.cost.textIds ?? [])).toBe(String(TOWERS.cannon.levels[0].cost));

    const action = click(r, slot(r, 1));
    expect(action).toEqual({ type: 'command', command: { type: 'build', pad: 0, kind: 'cannon' } });
    apply(r, action);
    expect(r.view.towers).toHaveLength(1);
    expect(r.hud.openMenu).toBeNull();
    r.hud.parts.build.forEach((o) => expect(visible(r, o.groupId)).toBe(false));
  });

  it('shows the hovered kind’s range ring and tooltip', () => {
    const r = rig(1);
    click(r, pad(r, 2));
    r.hud.render(r.view, RUNNING, 0.1);
    expect(visible(r, r.hud.parts.tooltip.groupId)).toBe(false);
    r.hud.pointer('move', slot(r, 0), r.view);
    r.hud.render(r.view, RUNNING, 0.1);
    expect(visible(r, r.hud.parts.tooltip.groupId)).toBe(true);
    expect(visible(r, r.hud.parts.range)).toBe(true);
    expect(text(r, r.hud.parts.tooltip.title.textIds)).toBe(TOWERS.rifle.name);
    expect(text(r, r.hud.parts.tooltip.range.textIds)).toBe(String(TOWERS.rifle.levels[0].range));
    expect(state(r, r.hud.parts.build[0]?.button.groupId ?? '').scale_x).toBeGreaterThan(1);
  });

  it('greys out unaffordable kinds, issues nothing for them and shakes the option', () => {
    const r = rig(1);
    r.sim.command({ type: 'build', pad: 0, kind: 'rifle' });
    r.sim.command({ type: 'build', pad: 1, kind: 'cannon' });
    expect(r.view.gold).toBeLessThan(TOWERS.rifle.levels[0].cost);
    click(r, pad(r, 2));
    r.hud.render(r.view, RUNNING, 0.1);
    for (const option of r.hud.parts.build) {
      expect(visible(r, option.button.disabledId)).toBe(true);
      expect(fillColor(r, option.costFillId)).not.toBe(fillColor(r, r.hud.parts.goldFillId));
    }
    const at = slot(r, 1);
    expect(click(r, at)).toBeNull();
    expect(r.hud.openMenu).not.toBeNull();
    r.hud.render(r.view, RUNNING, 0.03);
    expect(state(r, r.hud.parts.build[1]?.groupId ?? '').x).not.toBe(at.x);
    expect(fillColor(r, r.hud.parts.goldFillId)).not.toBe('#ffffff');
    r.hud.render(r.view, RUNNING, SHAKE_TIME);
    expect(state(r, r.hud.parts.build[1]?.groupId ?? '').x).toBe(at.x);
    expect(fillColor(r, r.hud.parts.goldFillId)).toBe('#ffffff');
  });

  it('builds the n-th allowed kind with the number keys', () => {
    const r = rig(6);
    expect(r.hud.key('1', r.view)).toBeNull();
    click(r, pad(r, 3));
    expect(r.hud.key('9', r.view)).toBeNull();
    expect(r.hud.key('3', r.view)).toEqual({ type: 'command', command: { type: 'build', pad: 3, kind: r.view.level.towers[2] } });
  });

  it('closes on a click outside and on a second click on its pad', () => {
    const r = rig(1);
    click(r, pad(r, 4));
    expect(r.hud.openMenu).not.toBeNull();
    expect(click(r, emptyPoint(r))).toBeNull();
    expect(r.hud.openMenu).toBeNull();
    click(r, pad(r, 4));
    click(r, pad(r, 4));
    expect(r.hud.openMenu).toBeNull();
    click(r, pad(r, 4));
    click(r, pad(r, 5));
    expect(r.hud.openMenu?.pad).toBe(5);
  });

  it('acts on up over the control that got the down, not on a drag off it', () => {
    const r = rig(1);
    r.hud.pointer('down', TOP_BUTTONS.pause, r.view);
    expect(r.hud.pointer('up', TOP_BUTTONS.sound, r.view)).toBeNull();
    r.hud.pointer('down', emptyPoint(r), r.view);
    expect(r.hud.pointer('up', TOP_BUTTONS.sound, r.view)).toBeNull();
    expect(r.hud.pointer('up', TOP_BUTTONS.sound, r.view)).toBeNull();
  });

  it('highlights a hovered pad', () => {
    const r = rig(1);
    const p = pad(r, 3);
    r.hud.pointer('move', { x: p.x + 30, y: p.y + 10 }, r.view);
    r.hud.render(r.view, RUNNING, 0.1);
    expect(visible(r, r.hud.parts.padHover)).toBe(true);
    expect(state(r, r.hud.parts.padHover)).toMatchObject({ x: p.x, y: p.y });
    r.hud.pointer('move', emptyPoint(r), r.view);
    r.hud.render(r.view, RUNNING, 0.1);
    expect(visible(r, r.hud.parts.padHover)).toBe(false);
  });
});

describe('GameHud menus stay on screen', () => {
  it('opens every build and tower menu inside the safe area, clear of the call-wave corner', () => {
    for (const level of LEVELS) {
      const r = rig(level.id);
      level.pads.forEach((_, i) => {
        for (const towerMenu of [false, true]) {
          if (towerMenu && !r.view.towers.some((t) => t.pad === i)) {
            r.sim.command({ type: 'build', pad: i, kind: 'rifle' });
            if (!r.view.towers.some((t) => t.pad === i)) continue;
          }
          click(r, pad(r, i));
          const menu = r.hud.openMenu;
          expect(menu?.kind, `level ${level.id} pad ${i} towers ${JSON.stringify(r.view.towers.map((t) => t.pad))}`).toBe(towerMenu ? 'tower' : 'build');
          for (const s of menu?.slots ?? []) {
            const box = optionBox(s);
            expect(inside(box, SAFE), `level ${level.id} pad ${i}`).toBe(true);
            expect(overlaps(box, CALL_ZONE), `level ${level.id} pad ${i}`).toBe(false);
          }
          click(r, pad(r, i));
        }
        if (r.view.gold < TOWERS.rifle.levels[0].cost) r.view.towers.forEach((t) => r.sim.command({ type: 'sell', towerId: t.id }));
      });
    }
  });
});

describe('GameHud tower menu', () => {
  it('upgrades, shows the next level, sells and closes when the tower is gone', () => {
    const r = rig(10);
    r.sim.command({ type: 'build', pad: 2, kind: 'rifle' });
    const tower = r.view.towers[0];
    if (!tower) throw new Error('no tower');
    click(r, pad(r, 2));
    expect(r.hud.openMenu).toMatchObject({ kind: 'tower', pad: 2, towerId: tower.id });
    r.hud.render(r.view, RUNNING, 0.1);
    expect(visible(r, r.hud.parts.upgrade.groupId)).toBe(true);
    expect(visible(r, r.hud.parts.range)).toBe(true);
    expect(visible(r, r.hud.parts.tooltip.groupId)).toBe(true);
    expect(text(r, r.hud.parts.upgrade.cost.textIds)).toBe(String(TOWERS.rifle.levels[1].cost));
    expect(text(r, r.hud.parts.tooltip.damage.textIds)).toBe(String(TOWERS.rifle.levels[1].damage));
    expect(text(r, r.hud.parts.sell.cost.textIds)).toBe(String(Math.floor(TOWERS.rifle.levels[0].cost * 0.7)));

    apply(r, click(r, slot(r, 0)));
    apply(r, r.hud.key('u', r.view));
    expect(r.view.towers[0]?.level).toBe(3);
    expect(r.hud.openMenu?.kind).toBe('tower');
    expect(visible(r, r.hud.parts.upgrade.max.groupId)).toBe(true);
    expect(visible(r, r.hud.parts.upgrade.cost.groupId)).toBe(false);
    expect(visible(r, r.hud.parts.upgrade.button.disabledId)).toBe(true);
    expect(click(r, slot(r, 0))).toBeNull();

    const spent = r.view.towers[0]?.spent ?? 0;
    expect(text(r, r.hud.parts.sell.cost.textIds)).toBe(String(Math.floor(spent * 0.7)));
    const sell = click(r, slot(r, 1));
    expect(sell).toEqual({ type: 'command', command: { type: 'sell', towerId: tower.id } });
    apply(r, sell);
    expect(r.hud.openMenu).toBeNull();
    expect(visible(r, r.hud.parts.sell.groupId)).toBe(false);
  });

  it('sells with S and closes when the tower is sold from elsewhere', () => {
    const r = rig(1);
    r.sim.command({ type: 'build', pad: 1, kind: 'rifle' });
    const id = r.view.towers[0]?.id ?? -1;
    click(r, pad(r, 1));
    expect(r.hud.key('s', r.view)).toEqual({ type: 'command', command: { type: 'sell', towerId: id } });
    r.sim.command({ type: 'sell', towerId: id });
    r.hud.onEvents(r.sim.step(), r.view);
    expect(r.hud.openMenu).toBeNull();
  });

  it('shakes the issuing control and flashes gold when the app reports a refusal', () => {
    const r = rig(10);
    r.sim.command({ type: 'build', pad: 0, kind: 'rifle' });
    click(r, pad(r, 0));
    r.hud.render(r.view, RUNNING, 0.1);
    const at = slot(r, 0);
    expect(click(r, at)?.type).toBe('command');
    r.hud.commandFailed('insufficientGold');
    r.hud.render(r.view, RUNNING, 0.03);
    expect(state(r, r.hud.parts.upgrade.groupId).x).not.toBe(at.x);
    expect(fillColor(r, r.hud.parts.goldFillId)).not.toBe('#ffffff');
  });
});

describe('GameHud call-wave button', () => {
  it('issues callWave from START, hides while a wave spawns and offers NEXT during the countdown', () => {
    const r = rig(1);
    expect(visible(r, r.hud.parts.call.groupId)).toBe(true);
    expect(visible(r, r.hud.parts.call.start.groupId)).toBe(true);
    expect(text(r, r.hud.parts.call.label.textIds)).toBe('START');
    const start = click(r, CALL);
    expect(start).toEqual({ type: 'command', command: { type: 'callWave' } });
    apply(r, start);
    expect(r.view.canCallWave).toBe(false);
    expect(visible(r, r.hud.parts.call.groupId)).toBe(false);
    expect(click(r, CALL)).toBeNull();

    r.hud.onEvents(stepUntil(r.sim, (v) => v.nextWaveIn !== null && v.nextWaveIn < 9.5), r.view);
    r.hud.render(r.view, RUNNING, 0.1);
    expect(visible(r, r.hud.parts.call.next.groupId)).toBe(true);
    expect(visible(r, r.hud.parts.call.ringId)).toBe(true);
    expect(text(r, r.hud.parts.call.label.textIds)).toBe(`NEXT +${Math.ceil(r.view.nextWaveIn ?? 0)}`);
    const gold = r.view.gold;
    apply(r, click(r, CALL));
    expect(r.view.gold).toBe(gold + 10);
  });

  it('paints the ring and the label in the corner', () => {
    const r = rig(1);
    r.hud.render(r.view, RUNNING, 0.1);
    const corner = { x: CALL_ZONE.x, y: CALL_ZONE.y, w: CALL_ZONE.w, h: CALL_ZONE.h };
    expect(countPainted(r.canvas.node, corner)).toBeGreaterThan(5000);
    expect(countPainted(r.canvas.node, { x: 500, y: 300, w: 200, h: 100 })).toBe(0);
  });
});

describe('GameHud controls and keys', () => {
  it('maps the top buttons to speed, pause and sound', () => {
    const r = rig(1);
    expect(click(r, TOP_BUTTONS.speed)).toEqual({ type: 'toggleSpeed' });
    expect(click(r, TOP_BUTTONS.pause)).toEqual({ type: 'pause' });
    expect(click(r, TOP_BUTTONS.sound)).toEqual({ type: 'toggleSound' });
  });

  it('shows the lit speed button at 2x and the muted icon with sound off', () => {
    const r = rig(1);
    r.hud.render(r.view, { speed: 2, paused: false, soundOn: false }, 0.1);
    expect(visible(r, r.hud.parts.speedLit.groupId)).toBe(true);
    expect(visible(r, r.hud.parts.speed.groupId)).toBe(false);
    expect(visible(r, r.hud.parts.soundOff.groupId)).toBe(true);
    expect(visible(r, r.hud.parts.soundOn.groupId)).toBe(false);
  });

  it('handles Space, F, M and Escape', () => {
    const r = rig(1);
    expect(r.hud.key(' ', r.view)).toEqual({ type: 'pause' });
    expect(r.hud.key('F', r.view)).toEqual({ type: 'toggleSpeed' });
    expect(r.hud.key('m', r.view)).toEqual({ type: 'toggleSound' });
    click(r, pad(r, 0));
    expect(r.hud.key('Escape', r.view)).toBeNull();
    expect(r.hud.openMenu).toBeNull();
    expect(r.hud.key('Escape', r.view)).toEqual({ type: 'pause' });
    r.hud.render(r.view, PAUSED, 0.1);
    expect(r.hud.key(' ', r.view)).toEqual({ type: 'resume' });
  });

  it('updates the counters', () => {
    const r = rig(1);
    r.sim.command({ type: 'build', pad: 0, kind: 'rifle' });
    r.sim.command({ type: 'callWave' });
    r.hud.render(r.view, RUNNING, 0.1);
    expect(text(r, r.hud.parts.gold.textIds)).toBe(String(r.view.gold));
    expect(text(r, r.hud.parts.lives.textIds)).toBe(String(r.view.lives));
    expect(text(r, r.hud.parts.wave.textIds)).toBe(`1/${r.view.waveCount}`);
  });
});

describe('GameHud banners', () => {
  it('slides WAVE n in on waveStarted and hides it after about 1.5 s', () => {
    const r = rig(1);
    r.sim.command({ type: 'callWave' });
    r.hud.onEvents(r.sim.step(), r.view);
    r.hud.render(r.view, RUNNING, 0.5);
    expect(visible(r, r.hud.parts.banner.groupId)).toBe(true);
    expect(visible(r, r.hud.parts.banner.bossId)).toBe(false);
    expect(text(r, r.hud.parts.banner.title.textIds)).toBe('WAVE 1');
    r.hud.render(r.view, RUNNING, 1.2);
    expect(visible(r, r.hud.parts.banner.groupId)).toBe(false);
  });

  it('adds BOSS INCOMING! for a wave with a boss', () => {
    const r = rig(5);
    const boss = r.view.level.waves.findIndex((w) => w.groups.some((g) => g.enemy === 'boss'));
    r.hud.onEvents([{ type: 'waveStarted', wave: boss, early: false, bonus: 0 }], r.view);
    r.hud.render(r.view, RUNNING, 0.4);
    expect(visible(r, r.hud.parts.banner.bossId)).toBe(true);
    expect(text(r, r.hud.parts.banner.title.textIds)).toBe(`WAVE ${boss + 1}`);
  });
});

describe('GameHud overlays', () => {
  const center = (panel: { x: number; y: number }, y: number): Vec2 => ({ x: panel.x, y: panel.y + y });

  it('pauses with Resume, Restart and Quit and blocks the board', () => {
    const r = rig(1);
    r.sim.command({ type: 'callWave' });
    r.sim.step();
    r.hud.render(r.view, PAUSED, 0.1);
    expect(r.hud.currentOverlay).toBe('pause');
    expect(visible(r, r.hud.parts.pauseMenu.groupId)).toBe(true);
    expect(visible(r, r.hud.parts.dim)).toBe(true);
    expect(click(r, pad(r, 0))).toBeNull();
    expect(r.hud.openMenu).toBeNull();
    expect(click(r, TOP_BUTTONS.speed)).toBeNull();
    expect(click(r, center(PAUSE_PANEL, PAUSE_PANEL.buttons.resume))).toEqual({ type: 'resume' });
    expect(click(r, center(PAUSE_PANEL, PAUSE_PANEL.buttons.restart))).toEqual({ type: 'restart' });
    expect(click(r, center(PAUSE_PANEL, PAUSE_PANEL.buttons.quit))).toEqual({ type: 'quit' });
    r.hud.render(r.view, RUNNING, 0.1);
    expect(visible(r, r.hud.parts.pauseMenu.groupId)).toBe(false);
  });

  it('shows no pause overlay before the first wave', () => {
    const r = rig(1);
    r.hud.render(r.view, PAUSED, 0.1);
    expect(r.hud.currentOverlay).toBe('none');
  });

  it('shows defeat on lost with Retry and Quit', () => {
    const { sim } = playOut(getLevel(1), 'hard', 'none');
    expect(sim.view.status).toBe('lost');
    const r = rig(1, 'hard', sim);
    expect(r.hud.currentOverlay).toBe('defeat');
    expect(visible(r, r.hud.parts.defeat.groupId)).toBe(true);
    expect(visible(r, r.hud.parts.call.groupId)).toBe(false);
    expect(click(r, pad(r, 0))).toBeNull();
    expect(r.hud.key(' ', r.view)).toBeNull();
    expect(click(r, center(DEFEAT_PANEL, DEFEAT_PANEL.buttons.retry))).toEqual({ type: 'restart' });
    expect(click(r, center(DEFEAT_PANEL, DEFEAT_PANEL.buttons.quit))).toEqual({ type: 'quit' });
  });

  it('shows victory on won with the stars landing one by one, Continue and Replay', () => {
    const { sim } = playOut(getLevel(1), 'easy', 'greedy');
    expect(sim.view.status).toBe('won');
    const stars = sim.view.stars;
    expect(stars).toBeGreaterThan(0);
    const r = rig(1, 'easy', sim);
    const filled = () => r.hud.parts.victory.stars.filledIds.filter((id) => visible(r, id)).length;
    expect(r.hud.currentOverlay).toBe('victory');
    expect(filled()).toBe(0);
    r.hud.render(r.view, RUNNING, STAR_FIRST + 0.05);
    expect(filled()).toBe(1);
    r.hud.render(r.view, RUNNING, STAR_GAP * 3);
    expect(filled()).toBe(stars);
    r.hud.parts.victory.stars.emptyIds.forEach((id, i) => expect(visible(r, id)).toBe(i >= stars));
    expect(click(r, center(VICTORY_PANEL, VICTORY_PANEL.buttons.continue))).toEqual({ type: 'continue' });
    expect(click(r, center(VICTORY_PANEL, VICTORY_PANEL.buttons.replay))).toEqual({ type: 'restart' });
  });
});

describe('GameHud mascot bubble', () => {
  it('shows only the posed line beside the portrait, with the tail toward it, and hides it again', () => {
    const r = rig();
    const bubbles = r.hud.parts.bubbles;
    for (const line of BUBBLE_LINE_IDS) expect(visible(r, bubbles[line].groupId)).toBe(false);
    r.hud.render(r.view, { ...RUNNING, mascot: { line: 'boss', portrait: CORNER_PORTRAIT, tail: 'left' } }, 0.1);
    for (const line of BUBBLE_LINE_IDS) expect(visible(r, bubbles[line].groupId)).toBe(line === 'boss');
    const at = bubbleCenter(CORNER_PORTRAIT, 'left', bubbles.boss.w, bubbles.boss.h);
    expect([state(r, bubbles.boss.groupId).x, state(r, bubbles.boss.groupId).y]).toEqual([at.x, at.y]);
    expect(visible(r, bubbles.boss.tailLeftId)).toBe(true);
    expect(visible(r, bubbles.boss.tailDownId)).toBe(false);
    expect(countPainted(r.canvas.node, { x: at.x - 20, y: at.y - 10, w: 40, h: 20 })).toBe(800);
    r.hud.render(r.view, { ...RUNNING, mascot: { line: 'defeat', portrait: OVERLAY_PORTRAIT, tail: 'down' } }, 0.1);
    expect(visible(r, bubbles.boss.groupId)).toBe(false);
    expect(visible(r, bubbles.defeat.tailDownId)).toBe(true);
    r.hud.render(r.view, RUNNING, 0.1);
    for (const line of BUBBLE_LINE_IDS) expect(visible(r, bubbles[line].groupId)).toBe(false);
  });
});
