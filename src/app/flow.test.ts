import { describe, expect, it } from 'vitest';
import { emptyProgress } from '../ui/menus/progress';
import { reduce, type AppState } from './flow';

const N = 10;

function state(over: Partial<AppState> = {}): AppState {
  return { screen: { kind: 'title' }, settings: { soundOn: true, difficulty: 'normal' }, progress: emptyProgress(N), ...over };
}

const inGame = (level = 3, difficulty: 'easy' | 'normal' | 'hard' = 'hard') =>
  state({ screen: { kind: 'game', level, difficulty }, progress: { ...emptyProgress(N), unlocked: level } });

describe('reduce', () => {
  it('goes between title and level select', () => {
    const toLevels = reduce(state(), { type: 'goto', screen: 'levels' }, N);
    expect(toLevels).toMatchObject({ state: { screen: { kind: 'levels' } }, enter: true, saveSettings: false, saveProgress: false });
    expect(reduce(toLevels.state, { type: 'goto', screen: 'title' }, N).state.screen).toEqual({ kind: 'title' });
  });

  it('plays an unlocked level and saves the chosen difficulty', () => {
    const t = reduce(state({ screen: { kind: 'levels' } }), { type: 'play', level: 1, difficulty: 'easy' }, N);
    expect(t.state.screen).toEqual({ kind: 'game', level: 1, difficulty: 'easy' });
    expect(t.state.settings.difficulty).toBe('easy');
    expect(t).toMatchObject({ enter: true, saveSettings: true, saveProgress: false });
  });

  it('refuses to play a locked or unknown level', () => {
    const s = state({ screen: { kind: 'levels' } });
    for (const level of [2, 0, 11, 1.5]) {
      const t = reduce(s, { type: 'play', level, difficulty: 'normal' }, N);
      expect(t.state).toBe(s);
      expect(t.enter).toBe(false);
    }
  });

  it('toggles sound on any screen and saves it', () => {
    const t = reduce(state(), { type: 'toggleSound' }, N);
    expect(t.state.settings.soundOn).toBe(false);
    expect(t).toMatchObject({ enter: false, saveSettings: true });
    expect(reduce(inGame(), { type: 'toggleSound' }, N).state.screen).toEqual(inGame().screen);
  });

  it('records a win and saves progress without leaving the game', () => {
    const t = reduce(inGame(3, 'hard'), { type: 'won', stars: 2 }, N);
    expect(t.state.progress.unlocked).toBe(4);
    expect(t.state.progress.stars[3]).toEqual({ easy: 0, normal: 0, hard: 2 });
    expect(t).toMatchObject({ enter: false, saveProgress: true, saveSettings: false });
    expect(t.state.screen).toEqual({ kind: 'game', level: 3, difficulty: 'hard' });
    expect(reduce(state(), { type: 'won', stars: 3 }, N).saveProgress).toBe(false);
  });

  it('restarts, quits and continues from a game', () => {
    const game = inGame(3);
    expect(reduce(game, { type: 'restart' }, N)).toMatchObject({ state: { screen: game.screen }, enter: true });
    expect(reduce(game, { type: 'quit' }, N).state.screen).toEqual({ kind: 'levels', selected: 3 });
    expect(reduce(game, { type: 'continue' }, N).state.screen).toEqual({ kind: 'levels', selected: 4 });
    expect(reduce(inGame(10), { type: 'continue' }, N).state.screen).toEqual({ kind: 'levels', selected: 10 });
  });

  it('ignores session actions outside a game', () => {
    const s = state();
    for (const type of ['restart', 'quit', 'continue'] as const) expect(reduce(s, { type }, N)).toEqual({ state: s, enter: false, saveSettings: false, saveProgress: false });
  });
});
