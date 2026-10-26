/**
 * King Sunny's speech bubbles on the HUD canvas, one per line (each sized to its text, all hidden until posed), and
 * where his portrait sits in design coords. The portrait itself is a DOM element the app places over the canvases.
 */
import { solid, type SpriteBuilder } from '../../art/exode';
import { PALETTE } from '../../art/palette';
import { addPanel } from '../../art/ui/kit';
import { addLabel, textWidth } from '../../art/ui/text';
import type { Vec2 } from '../../game/types';
import { VICTORY_PANEL } from './layout';

export const BUBBLE_LINES = {
  firstWave: 'Here they come!',
  boss: 'A Warlord approaches!',
  holdTheLine: 'Hold the line!',
  breaking: "They're breaking through!",
  splendid: 'Splendid!',
  victory: 'The bastion stands!',
  defeat: "We'll be back...",
} as const;

export type BubbleLine = keyof typeof BUBBLE_LINES;
export const BUBBLE_LINE_IDS = Object.keys(BUBBLE_LINES) as BubbleLine[];

/** A round portrait: center and diameter in design coords. */
export interface Portrait {
  x: number;
  y: number;
  size: number;
}

/** Which side of the bubble points at the portrait: 'left' sits right of it, 'down' sits above it. */
export type BubbleTail = 'left' | 'down';

/** What the HUD draws for the mascot this frame. */
export interface MascotBubblePose {
  line: BubbleLine;
  portrait: Portrait;
  tail: BubbleTail;
}

/** The in-game portrait in the bottom-left corner (where it rests once slid in). */
export const CORNER_PORTRAIT: Portrait = { x: 84, y: 630, size: 120 };
/** How far left of its rest x the corner portrait starts and ends its slide (fully off the board). */
export const PORTRAIT_SLIDE = 180;
/** The portrait beside the victory and defeat panels, its bubble above it. */
export const OVERLAY_PORTRAIT: Portrait = { x: VICTORY_PANEL.x - VICTORY_PANEL.w / 2 - 140, y: 450, size: 120 };

const TEXT_SIZE = 20;
const PAD_X = 20;
const BUBBLE_H = 48;
/** Gap between the portrait's edge and the tip of the tail. */
const GAP = 6;
const TAIL = 14;
const TAIL_HALF = 9;
const RIM = PALETTE.gold.dark;
const FILL = '#120d0a';

export interface BubbleParts {
  groupId: string;
  w: number;
  h: number;
  tailLeftId: string;
  tailDownId: string;
}

export function bubbleSize(line: BubbleLine): { w: number; h: number } {
  return { w: Math.ceil(textWidth(BUBBLE_LINES[line], TEXT_SIZE)) + PAD_X * 2, h: BUBBLE_H };
}

/** Center of a w × h bubble whose tail tip stops just short of the portrait. */
export function bubbleCenter(portrait: Portrait, tail: BubbleTail, w: number, h: number): Vec2 {
  const r = portrait.size / 2 + GAP + TAIL;
  return tail === 'left' ? { x: portrait.x + r + w / 2, y: portrait.y } : { x: portrait.x, y: portrait.y - r - h / 2 };
}

function addTail(b: SpriteBuilder, name: string, parent: string, points: readonly Vec2[]): string {
  const id = b.group(name, { visible: false }, parent);
  b.path(`${name}.fill`, points, { closed: true, fill: solid(FILL, 0.82) }, name);
  b.path(`${name}.edge`, points, { stroke: { color: RIM, width: 3 } }, name);
  return id;
}

function addBubble(b: SpriteBuilder, name: string, line: BubbleLine): BubbleParts {
  const { w, h } = bubbleSize(line);
  const groupId = addPanel(b, name, { w, h, variant: 'dark' });
  const x = -w / 2 + 1.5;
  const y = h / 2 - 1.5;
  const tailLeftId = addTail(b, `${name}.tailL`, name, [
    { x, y: -TAIL_HALF },
    { x: x - TAIL - 1.5, y: 2 },
    { x, y: TAIL_HALF },
  ]);
  const tailDownId = addTail(b, `${name}.tailD`, name, [
    { x: -TAIL_HALF, y },
    { x: 0, y: y + TAIL + 1.5 },
    { x: TAIL_HALF, y },
  ]);
  addLabel(b, `${name}.text`, BUBBLE_LINES[line], 'body', { size: TEXT_SIZE, fill: '#fff1cf', width: w * 2 }, name);
  return { groupId, w, h, tailLeftId, tailDownId };
}

/** Every bubble, hidden. */
export function addMascotBubbles(b: SpriteBuilder): Record<BubbleLine, BubbleParts> {
  const parts = {} as Record<BubbleLine, BubbleParts>;
  for (const line of BUBBLE_LINE_IDS) {
    parts[line] = addBubble(b, `bubble-${line}`, line);
  }
  return parts;
}
