import { describe, expect, it } from 'vitest';
import { getLevel } from '../game/levels';
import { createSimulation } from '../game/sim';
import type { EnemyState, GameEvent, WorldView } from '../game/types';
import { CORNER_PORTRAIT, OVERLAY_PORTRAIT, PORTRAIT_SLIDE } from '../ui/hud/mascotBubble';
import {
  INITIAL_MEMORY,
  mascotPose,
  overlayExpression,
  react,
  REACTION_GAP,
  REACTION_TIME,
  REACTIONS,
  SLIDE_TIME,
  slideAt,
  type MascotMemory,
} from './reactions';

const level = getLevel(8);
const bossWave = level.waves.findIndex((w) => w.groups.some((g) => g.enemy === 'boss'));
const base = createSimulation(level, 'normal').view;

function view(overrides: Partial<WorldView> = {}): WorldView {
  return { ...base, status: 'running', lives: 20, maxLives: 20, enemies: [], nextWaveIn: null, ...overrides };
}

const started = (wave: number): GameEvent => ({ type: 'waveStarted', wave, early: false, bonus: 0 });
const leak: GameEvent = { type: 'enemyLeaked', id: 1, kind: 'grunt', livesLost: 1 };
const someEnemy = { id: 9 } as EnemyState;

/** Feed (events, view) pairs at the given times; returns the lines said and the final memory. */
function run(steps: readonly [number, readonly GameEvent[], WorldView][], memory: MascotMemory = INITIAL_MEMORY) {
  const said: string[] = [];
  let m = memory;
  for (const [now, events, v] of steps) {
    const r = react(m, events, v, now);
    m = r.memory;
    if (r.started) said.push(r.started.line);
  }
  return { said, memory: m };
}

describe('react', () => {
  it('maps each moment to its line and expression', () => {
    expect(REACTIONS.firstWave).toMatchObject({ line: 'firstWave', expression: 'surprise' });
    expect(REACTIONS.boss).toMatchObject({ line: 'boss', expression: 'nervous' });
    expect(REACTIONS.holdTheLine).toMatchObject({ line: 'holdTheLine', expression: 'grumpy' });
    expect(REACTIONS.breaking).toMatchObject({ line: 'breaking', expression: 'cry' });
    expect(REACTIONS.splendid).toMatchObject({ line: 'splendid', expression: 'smile' });
  });

  it('greets the first wave once and warns of a boss wave', () => {
    expect(bossWave).toBeGreaterThan(0);
    const { said } = run([
      [0, [started(0)], view({ waveIndex: 0 })],
      [10, [started(1)], view({ waveIndex: 1 })],
      [20, [started(bossWave)], view({ waveIndex: bossWave })],
    ]);
    expect(said).toEqual(['firstWave', 'boss']);
  });

  it('says "Hold the line!" once when lives first reach half, and cries at each leak under a quarter', () => {
    const { said, memory } = run([
      [0, [leak], view({ lives: 15 })],
      [10, [leak], view({ lives: 10 })],
      [20, [leak], view({ lives: 9 })],
      [30, [leak], view({ lives: 5 })],
      [40, [leak], view({ lives: 4 })],
      [50, [leak], view({ lives: 0, status: 'lost' })],
    ]);
    expect(said).toEqual(['holdTheLine', 'breaking', 'breaking']);
    expect(memory.halfSaid).toBe(true);
  });

  it('cheers every third wave cleared in a row without a leak', () => {
    const cleared = (wave: number) => view({ waveIndex: wave, nextWaveIn: 10, enemies: [] });
    const busy = (wave: number) => view({ waveIndex: wave, enemies: [someEnemy] });
    const { said, memory } = run([
      [100, [], busy(0)],
      [101, [], cleared(0)],
      [102, [], cleared(0)],
      [110, [], busy(1)],
      [111, [], cleared(1)],
      [120, [leak], busy(2)],
      [121, [], cleared(2)],
      [130, [], cleared(3)],
      [140, [], cleared(4)],
      [150, [], cleared(5)],
      [160, [], cleared(6)],
      [170, [], cleared(7)],
      [180, [], cleared(8)],
    ]);
    expect(said).toEqual(['splendid', 'splendid']);
    expect(memory.cleanStreak).toBe(6);
    expect(memory.clearedThrough).toBe(8);
  });

  it('counts overlapping waves cleared together, and never counts a board that is still spawning', () => {
    const { said, memory } = run([
      [0, [], view({ waveIndex: 0, nextWaveIn: null })],
      [5, [], view({ waveIndex: 2, nextWaveIn: 8 })],
    ]);
    expect(said).toEqual(['splendid']);
    expect(memory.clearedThrough).toBe(2);
  });

  it('starts at most one reaction per gap, unless a higher priority interrupts', () => {
    const steps: [number, GameEvent[], WorldView][] = [
      [0, [started(0)], view({ waveIndex: 0 })],
      [1, [leak], view({ lives: 10 })],
      [1.5, [leak], view({ lives: 4 })],
      [2, [leak], view({ lives: 3 })],
      [1.5 + REACTION_GAP, [leak], view({ lives: 2 })],
    ];
    expect(run(steps).said).toEqual(['firstWave', 'holdTheLine', 'breaking', 'breaking']);
    const low = run([
      [0, [leak], view({ lives: 10 })],
      [1, [started(0)], view({ waveIndex: 0 })],
    ]);
    expect(low.said).toEqual(['holdTheLine']);
    expect(low.memory.firstWaveSaid).toBe(true);
  });

  it('swaps the bubble in place when interrupting while on screen', () => {
    const { memory } = run([
      [0, [started(0)], view({ waveIndex: 0 })],
      [1, [leak], view({ lives: 10 })],
    ]);
    expect(memory.current?.reaction).toBe(REACTIONS.holdTheLine);
    expect(memory.current?.slideFrom).toBeCloseTo(1 - SLIDE_TIME);
    expect(slideAt(1 - (memory.current?.slideFrom ?? 0))).toBe(1);
    expect(mascotPose('none', memory, 1)?.portrait).toEqual(CORNER_PORTRAIT);
  });

  it('keeps the full quiet gap after an interruption', () => {
    const steps: [number, GameEvent[], WorldView][] = [
      [0, [started(0)], view({ waveIndex: 0 })],
      [1, [leak], view({ lives: 10 })],
      [1 + REACTION_GAP - 0.1, [started(bossWave)], view({ waveIndex: bossWave })],
    ];
    const early = run(steps);
    expect(early.said).toEqual(['firstWave', 'holdTheLine']);
    expect(early.memory.current?.start).toBe(1);
    const after = run([...steps.slice(0, 2), [1 + REACTION_GAP, [started(bossWave)], view({ waveIndex: bossWave })]]);
    expect(after.said).toEqual(['firstWave', 'holdTheLine', 'boss']);
  });
});

describe('slideAt', () => {
  it('slides in, holds, slides out within the reaction time', () => {
    expect(slideAt(0)).toBe(0);
    expect(slideAt(SLIDE_TIME / 2)).toBeGreaterThan(0.5);
    expect(slideAt(SLIDE_TIME / 2)).toBeLessThan(1);
    expect(slideAt(SLIDE_TIME)).toBe(1);
    expect(slideAt(REACTION_TIME / 2)).toBe(1);
    expect(slideAt(REACTION_TIME - SLIDE_TIME / 2)).toBeLessThan(1);
    expect(slideAt(REACTION_TIME)).toBe(0);
    expect(slideAt(-1)).toBe(0);
    expect(slideAt(Number.NaN)).toBe(0);
  });
});

describe('mascotPose', () => {
  const talking: MascotMemory = { ...INITIAL_MEMORY, current: { reaction: REACTIONS.boss, start: 10, slideFrom: 10 } };

  it('is hidden with nothing to say, and on the pause overlay', () => {
    expect(mascotPose('none', INITIAL_MEMORY, 5)).toBeNull();
    expect(mascotPose('pause', talking, 11)).toBeNull();
    expect(mascotPose('none', talking, 10 + REACTION_TIME)).toBeNull();
  });

  it('slides the corner portrait in from the left with its bubble beside it', () => {
    const entering = mascotPose('none', talking, 10 + SLIDE_TIME / 2);
    expect(entering?.portrait.x).toBeLessThan(CORNER_PORTRAIT.x);
    expect(entering?.portrait.x).toBeGreaterThan(CORNER_PORTRAIT.x - PORTRAIT_SLIDE);
    const resting = mascotPose('none', talking, 11);
    expect(resting).toEqual({ portrait: CORNER_PORTRAIT, bubble: { line: 'boss', portrait: CORNER_PORTRAIT, tail: 'left' } });
  });

  it('stands beside the victory and defeat panels with their lines', () => {
    expect(mascotPose('victory', talking, 11)).toEqual({ portrait: OVERLAY_PORTRAIT, bubble: { line: 'victory', portrait: OVERLAY_PORTRAIT, tail: 'down' } });
    expect(mascotPose('defeat', INITIAL_MEMORY, 0)?.bubble?.line).toBe('defeat');
  });

  it('picks starstruck at three stars, party below, cry on defeat', () => {
    expect(overlayExpression('victory', 3)).toBe('starstruck');
    expect(overlayExpression('victory', 2)).toBe('party');
    expect(overlayExpression('defeat', 0)).toBe('cry');
    expect(overlayExpression('pause', 0)).toBeNull();
    expect(overlayExpression('none', 0)).toBeNull();
  });
});
