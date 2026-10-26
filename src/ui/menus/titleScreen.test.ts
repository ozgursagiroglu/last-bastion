import { describe, expect, it } from 'vitest';
import { countPainted } from '../../platform/nodeCanvas';
import type { Vec2 } from '../../game/types';
import { flatten, nodeLayers } from './nodeCanvasLike';
import { buildTitleArt, PLAY_BUTTON, SOUND_BUTTON, TITLE_POS } from './titleArt';
import { marchDistance, TitleScreen } from './titleScreen';

const ids = buildTitleArt();

function setup() {
  const layers = nodeLayers(['back', 'live', 'front'] as const, 1280, 720);
  const screen = new TitleScreen(layers);
  screen.resize(1280, 720, 1);
  return { layers, screen };
}

function click(screen: TitleScreen, p: Vec2) {
  screen.pointer('down', p);
  return screen.pointer('up', p);
}

describe('TitleScreen', () => {
  it('PLAY, Enter and Space go to the level select', () => {
    const { screen } = setup();
    expect(click(screen, PLAY_BUTTON)).toEqual({ type: 'goto', screen: 'levels' });
    expect(screen.key('Enter')).toEqual({ type: 'goto', screen: 'levels' });
    expect(screen.key(' ')).toEqual({ type: 'goto', screen: 'levels' });
    expect(screen.key('Escape')).toBeNull();
  });

  it('the round sound button toggles sound', () => {
    const { screen } = setup();
    expect(click(screen, SOUND_BUTTON)).toEqual({ type: 'toggleSound' });
  });

  it('acts only on release over the control that was pressed', () => {
    const { screen } = setup();
    expect(screen.pointer('down', PLAY_BUTTON)).toBeNull();
    expect(screen.pointer('up', { x: 10, y: 10 })).toBeNull();
    expect(click(screen, { x: 10, y: 10 })).toBeNull();
  });

  it('shows the sound icon matching the sound state', () => {
    const { screen } = setup();
    screen.render(0.016, false);
    expect(screen.engine.getObjectState(ids.soundOff.groupId)?.visible).toBe(true);
    expect(screen.engine.getObjectState(ids.soundOn.groupId)?.visible).toBe(false);
    screen.render(0.016, true);
    expect(screen.engine.getObjectState(ids.soundOn.groupId)?.visible).toBe(true);
  });

  it('reports PLAY hover', () => {
    const { screen } = setup();
    expect(screen.playHovered).toBe(false);
    screen.pointer('move', PLAY_BUTTON);
    expect(screen.playHovered).toBe(true);
    screen.pointer('move', { x: 10, y: 10 });
    expect(screen.playHovered).toBe(false);
  });

  it('draws the static layers once per resize, not per frame', () => {
    const { screen, layers } = setup();
    expect(screen.staticDraws).toBe(1);
    expect(countPainted(layers.back.node)).toBe(1280 * 720);
    expect(countPainted(layers.front.node)).toBeGreaterThan(5000);
    const live = layers.live.node;
    screen.render(0.016, true);
    expect(countPainted(live)).toBeLessThan(1280 * 720 * 0.5);
    for (let i = 0; i < 5; i++) screen.render(0.016, true);
    expect(screen.staticDraws).toBe(1);
    screen.resize(640, 360, 1);
    expect(screen.staticDraws).toBe(2);
    expect(countPainted(layers.back.node)).toBe(640 * 360);
  });

  it('bobs the title, marches the column and scales PLAY on hover', () => {
    const { screen, layers } = setup();
    const ys = [0.4, 0.8, 0.8].map((dt) => {
      screen.render(dt, true);
      return screen.engine.getObjectState(ids.titleId)?.y ?? TITLE_POS.y;
    });
    expect(new Set(ys.map((y) => y.toFixed(3))).size).toBeGreaterThan(1);
    for (const y of ys) expect(Math.abs(y - TITLE_POS.y)).toBeLessThanOrEqual(7.001);
    const lead = ids.enemies[0]?.rootId ?? '';
    const x0 = screen.engine.getObjectState(lead)?.x ?? 0;
    screen.render(1, true);
    expect((screen.engine.getObjectState(lead)?.x ?? 0) - x0).toBeGreaterThan(20);
    screen.pointer('move', PLAY_BUTTON);
    screen.render(0.016, true);
    expect(screen.engine.getObjectState(ids.play.groupId)?.scale_x).toBeCloseTo(1.06);
    expect(countPainted(flatten([layers.back, layers.live, layers.front]))).toBe(1280 * 720);
  });
});

describe('marchDistance', () => {
  it('keeps marchers spaced along the road and loops them', () => {
    const a = marchDistance(0, 0, 6);
    const b = marchDistance(0, 1, 6);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect((a ?? 0) - (b ?? 0)).toBeGreaterThan(40);
    const seen = new Set<boolean>();
    for (let t = 0; t < 120; t += 0.5) seen.add(marchDistance(t, 0, 6) === null);
    expect(seen).toEqual(new Set([true, false]));
  });
});
