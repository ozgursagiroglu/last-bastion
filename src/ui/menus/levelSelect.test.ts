import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../game/levels';
import { countPainted } from '../../platform/nodeCanvas';
import { DIFFICULTIES, type Difficulty, type ProgressData, type Vec2 } from '../../game/types';
import { BACK_BUTTON, buildLevelSelectArt, PANEL, PANEL_PLAY, TAB, tabX, rowY } from './levelSelectArt';
import { LevelSelectScreen } from './levelSelect';
import { nodeLayers } from './nodeCanvasLike';
import { emptyProgress, recordWin } from './progress';

const ids = buildLevelSelectArt(LEVELS);
const PLAY: Vec2 = { x: PANEL.x, y: PANEL.y + PANEL_PLAY.dy };

/** Levels 1–3 won (1: 3/2/1 stars on easy/normal/hard), so 1–4 are unlocked. */
function midProgress(): ProgressData {
  let p = emptyProgress(LEVELS.length);
  p = recordWin(p, 1, 'easy', 3, 10);
  p = recordWin(p, 1, 'normal', 2, 10);
  p = recordWin(p, 1, 'hard', 1, 10);
  p = recordWin(p, 2, 'normal', 3, 10);
  p = recordWin(p, 3, 'easy', 1, 10);
  return p;
}

function setup(progress = midProgress(), difficulty: Difficulty = 'normal', selected?: number) {
  const screen = new LevelSelectScreen(nodeLayers(['back', 'live'] as const, 1280, 720), LEVELS, progress, difficulty, selected);
  screen.resize(1280, 720, 1);
  return screen;
}

function click(screen: LevelSelectScreen, p: Vec2) {
  screen.pointer('down', p);
  return screen.pointer('up', p);
}

function nodeAt(level: number): Vec2 {
  const node = ids.nodes.find((n) => n.levelId === level);
  if (!node) throw new Error(`no node ${level}`);
  return node.pos;
}

function filledStars(screen: LevelSelectScreen, filledIds: readonly string[]): number {
  return filledIds.filter((id) => screen.engine.getObjectState(id)?.visible === true).length;
}

function nodeStars(screen: LevelSelectScreen, level: number): number {
  return filledStars(screen, ids.nodes.find((n) => n.levelId === level)?.stars.filledIds ?? []);
}

const textOf = (screen: LevelSelectScreen, textIds: readonly string[]) => screen.engine.getObjectState(textIds[textIds.length - 1] ?? '')?.text;

describe('LevelSelectScreen', () => {
  it('draws the static map once per resize, not per frame', () => {
    const layers = nodeLayers(['back', 'live'] as const, 1, 1);
    const screen = new LevelSelectScreen(layers, LEVELS, midProgress(), 'normal');
    screen.resize(1280, 720, 1);
    expect(screen.staticDraws).toBe(1);
    expect(countPainted(layers.back.node)).toBe(1280 * 720);
    for (let i = 0; i < 5; i++) screen.render(0.016, true);
    expect(screen.staticDraws).toBe(1);
    expect(countPainted(layers.live.node)).toBeLessThan(1280 * 720 * 0.6);
    expect(screen.currentProgress.unlocked).toBe(4);
  });

  it('selects the furthest unlocked level by default and clamps a locked selection', () => {
    expect(setup().selectedLevel).toBe(4);
    expect(setup(midProgress(), 'normal', 2).selectedLevel).toBe(2);
    expect(setup(midProgress(), 'normal', 9).selectedLevel).toBe(4);
    expect(setup(emptyProgress(10)).selectedLevel).toBe(1);
  });

  it('shows locked nodes grey with a lock and ignores clicks on them', () => {
    const screen = setup(midProgress(), 'normal', 2);
    const locked = ids.nodes.find((n) => n.levelId === 7);
    const open = ids.nodes.find((n) => n.levelId === 3);
    expect(screen.engine.getObjectState(locked?.lockedId ?? '')?.visible).toBe(true);
    expect(screen.engine.getObjectState(locked?.litId ?? '')?.visible).toBe(false);
    expect(screen.engine.getObjectState(open?.litId ?? '')?.visible).toBe(true);
    expect(click(screen, nodeAt(7))).toBeNull();
    expect(screen.selectedLevel).toBe(2);
  });

  it('selecting an unlocked node updates the panel', () => {
    const screen = setup(midProgress(), 'normal', 1);
    expect(click(screen, nodeAt(3))).toBeNull();
    expect(screen.selectedLevel).toBe(3);
    const level = LEVELS[2];
    expect(textOf(screen, ids.panel.nameIds)).toBe(level?.name);
    expect(textOf(screen, ids.panel.levelIds)).toBe('LEVEL 3');
    expect(textOf(screen, ids.panel.wavesIds)).toBe(`${level?.waves.length} waves`);
    expect(textOf(screen, ids.panel.themeIds)).toBe('Meadow');
    const shown = Object.entries(ids.panel.iconIds).filter(([, id]) => screen.engine.getObjectState(id)?.visible === true).map(([k]) => k);
    expect(shown.sort()).toEqual([...(level?.towers ?? [])].sort());
    expect(filledStars(screen, ids.panel.rowStars.easy.filledIds)).toBe(1);
    expect(filledStars(screen, ids.panel.rowStars.normal.filledIds)).toBe(0);
    click(screen, nodeAt(1));
    expect(DIFFICULTIES.map((d) => filledStars(screen, ids.panel.rowStars[d].filledIds))).toEqual([3, 2, 1]);
  });

  it('difficulty tabs and keys 1/2/3 switch difficulty and the stars shown', () => {
    const screen = setup();
    expect(nodeStars(screen, 1)).toBe(2);
    expect(nodeStars(screen, 2)).toBe(3);
    expect(click(screen, { x: tabX(2), y: TAB.y })).toBeNull();
    expect(screen.difficulty).toBe('hard');
    expect(nodeStars(screen, 1)).toBe(1);
    expect(nodeStars(screen, 2)).toBe(0);
    expect(screen.engine.getObjectState(ids.tabs.hard.on.groupId)?.visible).toBe(true);
    expect(screen.engine.getObjectState(ids.tabs.normal.on.groupId)?.visible).toBe(false);
    expect(screen.engine.getObjectState(ids.panel.rowHighlightId)?.y).toBeCloseTo(rowY(2) - PANEL.y);
    screen.key('1');
    expect(screen.difficulty).toBe('easy');
    expect(nodeStars(screen, 1)).toBe(3);
    expect(nodeStars(screen, 3)).toBe(1);
    screen.key('2');
    expect(screen.difficulty).toBe('normal');
    screen.key('3');
    expect(screen.difficulty).toBe('hard');
  });

  it('PLAY and Enter emit play with the selected level and difficulty', () => {
    const screen = setup(midProgress(), 'easy', 2);
    expect(click(screen, PLAY)).toEqual({ type: 'play', level: 2, difficulty: 'easy' });
    screen.key('3');
    click(screen, nodeAt(4));
    expect(screen.key('Enter')).toEqual({ type: 'play', level: 4, difficulty: 'hard' });
  });

  it('arrow keys move the selection among unlocked levels only', () => {
    const screen = setup(midProgress(), 'normal', 1);
    screen.key('ArrowLeft');
    expect(screen.selectedLevel).toBe(1);
    for (let i = 0; i < 6; i++) screen.key('ArrowRight');
    expect(screen.selectedLevel).toBe(4);
    screen.key('ArrowUp');
    expect(screen.selectedLevel).toBe(3);
    screen.key('ArrowDown');
    expect(screen.selectedLevel).toBe(4);
  });

  it('BACK and Escape go to the title', () => {
    const screen = setup();
    expect(click(screen, BACK_BUTTON)).toEqual({ type: 'goto', screen: 'title' });
    expect(screen.key('Escape')).toEqual({ type: 'goto', screen: 'title' });
  });

  it('setProgress unlocks nodes and refreshes the stars', () => {
    const screen = setup(emptyProgress(10));
    expect(click(screen, nodeAt(2))).toBeNull();
    expect(screen.selectedLevel).toBe(1);
    screen.setProgress(recordWin(emptyProgress(10), 1, 'normal', 3, 10));
    expect(nodeStars(screen, 1)).toBe(3);
    click(screen, nodeAt(2));
    expect(screen.selectedLevel).toBe(2);
    screen.setProgress(emptyProgress(10));
    expect(screen.selectedLevel).toBe(1);
  });

  it('moves the selection marker to the selected node and renders', () => {
    const screen = setup(midProgress(), 'normal', 3);
    screen.render(0.5, true);
    const marker = screen.engine.getObjectState(ids.selectId);
    expect(marker?.visible).toBe(true);
    expect([marker?.x, marker?.y]).toEqual([nodeAt(3).x, nodeAt(3).y]);
    screen.pointer('move', nodeAt(2));
    screen.render(0.016, true);
    expect(screen.engine.getObjectState(ids.nodes[1]?.badgeId ?? '')?.scale_x).toBeCloseTo(1.1);
  });
});
