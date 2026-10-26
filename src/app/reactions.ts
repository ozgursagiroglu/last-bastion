/**
 * What King Sunny says during a level, as pure rules over (sim events, world view, mascot memory) and a real-time clock,
 * plus where his portrait and bubble are at a given moment. GameSession feeds every sim step through `react`.
 */
import type { GameEvent, WorldView } from '../game/types';
import { waveHasBoss } from '../ui/hud/info';
import { CORNER_PORTRAIT, OVERLAY_PORTRAIT, PORTRAIT_SLIDE, type BubbleLine, type MascotBubblePose, type Portrait } from '../ui/hud/mascotBubble';
import type { OverlayKind } from '../ui/hud/gameHud';
import type { Expression } from './mascot';

export interface Reaction {
  readonly line: BubbleLine;
  readonly expression: Expression;
  /** A higher priority interrupts a lower one inside the quiet gap. */
  readonly priority: number;
}

export const REACTIONS = {
  splendid: { line: 'splendid', expression: 'smile', priority: 1 },
  firstWave: { line: 'firstWave', expression: 'surprise', priority: 2 },
  boss: { line: 'boss', expression: 'nervous', priority: 3 },
  holdTheLine: { line: 'holdTheLine', expression: 'grumpy', priority: 4 },
  breaking: { line: 'breaking', expression: 'cry', priority: 5 },
} as const satisfies Record<string, Reaction>;

/** Seconds after a reaction starts before one of the same or lower priority may start. */
export const REACTION_GAP = 2.5;
/** Seconds the portrait is on screen per reaction (slide in, hold, slide out). */
export const REACTION_TIME = 3;
/** Seconds of each slide. */
export const SLIDE_TIME = 0.35;
/** Clean waves in a row between two "Splendid!". */
export const SPLENDID_STREAK = 3;

export interface MascotMemory {
  readonly firstWaveSaid: boolean;
  readonly halfSaid: boolean;
  /** Highest wave index already counted as cleared (-1 before any). */
  readonly clearedThrough: number;
  /** Waves cleared in a row without a leak. */
  readonly cleanStreak: number;
  /** A leak happened since the last clear. */
  readonly leaked: boolean;
  /** The reaction on screen, or null. */
  readonly current: CurrentReaction | null;
}

export interface CurrentReaction {
  readonly reaction: Reaction;
  /** When it started (the quiet gap counts from here). */
  readonly start: number;
  /** Origin of its slide-in, hold, slide-out timeline (before `start` when it swapped in for one already on screen). */
  readonly slideFrom: number;
}

export const INITIAL_MEMORY: MascotMemory = { firstWaveSaid: false, halfSaid: false, clearedThrough: -1, cleanStreak: 0, leaked: false, current: null };

/** The board is empty and the latest wave has spawned everything: that wave and any before it are cleared. */
function boardCleared(view: WorldView): boolean {
  return view.status === 'running' && view.enemies.length === 0 && view.nextWaveIn !== null && view.waveIndex >= 0;
}

/** The candidates one step raises, with the memory updated for what happened (said or not). */
function observe(memory: MascotMemory, events: readonly GameEvent[], view: WorldView): { memory: MascotMemory; candidates: Reaction[] } {
  const candidates: Reaction[] = [];
  let { firstWaveSaid, halfSaid, clearedThrough, cleanStreak, leaked } = memory;
  for (const e of events) {
    if (e.type === 'waveStarted') {
      if (e.wave === 0 && !firstWaveSaid) {
        firstWaveSaid = true;
        candidates.push(REACTIONS.firstWave);
      }
      if (waveHasBoss(view.level, e.wave)) candidates.push(REACTIONS.boss);
    } else if (e.type === 'enemyLeaked') {
      leaked = true;
      if (view.lives > 0 && view.lives <= view.maxLives * 0.25) candidates.push(REACTIONS.breaking);
    }
  }
  if (!halfSaid && view.lives <= view.maxLives / 2) {
    halfSaid = true;
    if (view.lives > 0) candidates.push(REACTIONS.holdTheLine);
  }
  if (boardCleared(view) && view.waveIndex > clearedThrough) {
    const waves = view.waveIndex - clearedThrough;
    const streak = leaked ? 0 : cleanStreak + waves;
    if (Math.floor(streak / SPLENDID_STREAK) > Math.floor(cleanStreak / SPLENDID_STREAK)) candidates.push(REACTIONS.splendid);
    clearedThrough = view.waveIndex;
    cleanStreak = streak;
    leaked = false;
  }
  return { memory: { ...memory, firstWaveSaid, halfSaid, clearedThrough, cleanStreak, leaked }, candidates };
}

/**
 * One sim step's worth of rules at real time `now`. Returns the next memory and the reaction that starts now, if any:
 * at most one per REACTION_GAP seconds, except that a higher priority interrupts the one on screen.
 */
export function react(memory: MascotMemory, events: readonly GameEvent[], view: WorldView, now: number): { memory: MascotMemory; started: Reaction | null } {
  const seen = observe(memory, events, view);
  const best = seen.candidates.reduce<Reaction | null>((a, c) => (a === null || c.priority > a.priority ? c : a), null);
  const current = seen.memory.current;
  if (!best || (current && now - current.start < REACTION_GAP && best.priority <= current.reaction.priority)) {
    return { memory: seen.memory, started: null };
  }
  // An interruption while the portrait is on screen swaps the bubble in place instead of sliding in again.
  const slideFrom = current && slideAt(now - current.slideFrom) > 0 ? now - SLIDE_TIME : now;
  return { memory: { ...seen.memory, current: { reaction: best, start: now, slideFrom } }, started: best };
}

/** How far the corner portrait is slid in at `t` seconds into a reaction: 0 off-board, 1 at rest. */
export function slideAt(t: number): number {
  if (!(t > 0) || t >= REACTION_TIME) return 0;
  const u = Math.min(t, REACTION_TIME - t) / SLIDE_TIME;
  if (u >= 1) return 1;
  return 1 - (1 - u) ** 3;
}

/** Where the portrait and bubble are this frame, or null when the mascot is off the board. */
export interface MascotPose {
  portrait: Portrait;
  bubble: MascotBubblePose | null;
}

/** The lines for the end overlays; the pause overlay hides the mascot. */
function overlayLine(overlay: OverlayKind): BubbleLine | null {
  if (overlay === 'victory') return 'victory';
  if (overlay === 'defeat') return 'defeat';
  return null;
}

/** The expression for an end overlay: starstruck at 3 stars, party below, cry on defeat. */
export function overlayExpression(overlay: OverlayKind, stars: number): Expression | null {
  if (overlay === 'victory') return stars >= 3 ? 'starstruck' : 'party';
  if (overlay === 'defeat') return 'cry';
  return null;
}

/** The mascot's pose for the overlay on screen and the current reaction at real time `now`. */
export function mascotPose(overlay: OverlayKind, memory: MascotMemory, now: number): MascotPose | null {
  if (overlay === 'pause') return null;
  const line = overlayLine(overlay);
  if (line) return { portrait: OVERLAY_PORTRAIT, bubble: { line, portrait: OVERLAY_PORTRAIT, tail: 'down' } };
  const current = memory.current;
  if (!current) return null;
  const slide = slideAt(now - current.slideFrom);
  if (slide <= 0) return null;
  const portrait = { ...CORNER_PORTRAIT, x: CORNER_PORTRAIT.x - (1 - slide) * PORTRAIT_SLIDE };
  return { portrait, bubble: { line: current.reaction.line, portrait, tail: 'left' } };
}
