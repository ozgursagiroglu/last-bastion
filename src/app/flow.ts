/** Screen flow as a pure reducer: menu and session actions → the next screen, settings and progress. */
import type { Difficulty, ProgressData } from '../game/types';
import { recordWin } from '../ui/menus/progress';
import type { MenuAction } from '../ui/types';
import type { SessionAction } from './game';
import type { Settings } from './storage';

export type Screen =
  | { kind: 'title' }
  /** selected: the level to highlight; undefined lets the level select pick the furthest unlocked one. */
  | { kind: 'levels'; selected?: number }
  | { kind: 'game'; level: number; difficulty: Difficulty };

export interface AppState {
  screen: Screen;
  settings: Settings;
  progress: ProgressData;
}

export type AppInput = MenuAction | SessionAction;

export interface Transition {
  state: AppState;
  /** The screen must be (re)created: it changed, or the level restarts. */
  enter: boolean;
  saveSettings: boolean;
  saveProgress: boolean;
}

function stay(state: AppState): Transition {
  return { state, enter: false, saveSettings: false, saveProgress: false };
}

function go(state: AppState, screen: Screen, saveSettings = false): Transition {
  return { state: { ...state, screen }, enter: true, saveSettings, saveProgress: false };
}

export function reduce(state: AppState, input: AppInput, levelCount: number): Transition {
  const { screen } = state;
  switch (input.type) {
    case 'goto':
      return go(state, input.screen === 'title' ? { kind: 'title' } : { kind: 'levels' });
    case 'play': {
      if (!Number.isInteger(input.level) || input.level < 1 || input.level > Math.min(levelCount, state.progress.unlocked)) return stay(state);
      const next = { ...state, settings: { ...state.settings, difficulty: input.difficulty } };
      return go(next, { kind: 'game', level: input.level, difficulty: input.difficulty }, true);
    }
    case 'toggleSound':
      return { state: { ...state, settings: { ...state.settings, soundOn: !state.settings.soundOn } }, enter: false, saveSettings: true, saveProgress: false };
    case 'won':
      if (screen.kind !== 'game') return stay(state);
      return {
        state: { ...state, progress: recordWin(state.progress, screen.level, screen.difficulty, input.stars, levelCount) },
        enter: false,
        saveSettings: false,
        saveProgress: true,
      };
    case 'restart':
      return screen.kind === 'game' ? go(state, screen) : stay(state);
    case 'quit':
      return screen.kind === 'game' ? go(state, { kind: 'levels', selected: screen.level }) : stay(state);
    case 'continue':
      return screen.kind === 'game' ? go(state, { kind: 'levels', selected: Math.min(levelCount, screen.level + 1) }) : stay(state);
  }
}
