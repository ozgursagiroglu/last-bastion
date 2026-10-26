/** Contracts between the UI controllers (src/ui/**) and the app shell (src/app/**). */
import type { Command, Difficulty } from '../game/types';
import type { MascotBubblePose } from './hud/mascotBubble';

/** Pointer phases the app forwards to controllers, with the point already mapped to design coords. */
export type PointerKind = 'down' | 'move' | 'up';

/** What the in-game HUD asks the app to do. */
export type HudAction =
  | { type: 'command'; command: Command }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'toggleSpeed' }
  | { type: 'toggleSound' }
  | { type: 'restart' }
  /** Leave the level for the level select. */
  | { type: 'quit' }
  /** After a win: go on (the app opens the level select with the next level selected). */
  | { type: 'continue' };

/** App-owned state the HUD displays. */
export interface HudState {
  speed: 1 | 2;
  paused: boolean;
  soundOn: boolean;
  /** King Sunny's speech bubble, beside his portrait; absent or null hides it. */
  mascot?: MascotBubblePose | null;
}

/** What a menu screen asks the app to do. */
export type MenuAction =
  | { type: 'goto'; screen: 'title' | 'levels' }
  | { type: 'play'; level: number; difficulty: Difficulty }
  | { type: 'toggleSound' };
