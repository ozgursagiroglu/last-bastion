/** Text presets and layout helpers for UI labels (GAME_FONT, 'Lilita One'). */
import { ROOT, type SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE } from '../palette';

export type TextPreset = 'title' | 'heading' | 'button' | 'hud' | 'body' | 'small';

export interface TextStyle {
  size: number;
  fill: string;
  /** Outline drawn by SpriteBuilder.outlinedText (outline copies behind the fill); null for plain text. */
  outline: { color: string; width: number } | null;
}

/** Text presets (size, fill, outline) for titles, buttons, HUD numbers and body text. */
export const TEXT: Readonly<Record<TextPreset, TextStyle>> = {
  title: { size: 54, fill: PALETTE.gold.light, outline: { color: OUTLINE, width: 6 } },
  heading: { size: 34, fill: '#fff1cf', outline: { color: OUTLINE, width: 4.5 } },
  button: { size: 24, fill: '#ffffff', outline: { color: OUTLINE, width: 3.5 } },
  hud: { size: 26, fill: '#ffffff', outline: { color: OUTLINE, width: 4 } },
  body: { size: 18, fill: '#f4ead5', outline: { color: OUTLINE, width: 2.5 } },
  small: { size: 14, fill: '#dccfb2', outline: null },
};

/** Lilita One advance widths per em (measured), digits 0–9 then capitals A–Z. */
const DIGIT_EM = [0.639, 0.406, 0.525, 0.528, 0.598, 0.524, 0.575, 0.5, 0.57, 0.565];
const UPPER_EM = [
  0.655, 0.594, 0.561, 0.616, 0.493, 0.472, 0.621, 0.644, 0.429, 0.462, 0.62, 0.435, 0.907, 0.648, 0.696, 0.57, 0.706, 0.59,
  0.531, 0.502, 0.628, 0.661, 0.953, 0.683, 0.615, 0.563,
];

function charEm(c: string): number {
  if (c >= '0' && c <= '9') return DIGIT_EM[c.charCodeAt(0) - 48] ?? 0.55;
  if (c >= 'A' && c <= 'Z') return UPPER_EM[c.charCodeAt(0) - 65] ?? 0.6;
  if (c === ' ') return 0.19;
  if ('.,:;!\'|'.includes(c)) return 0.27;
  if ('ijlft'.includes(c)) return 0.31;
  if ('mw%'.includes(c)) return 0.78;
  if (c >= 'a' && c <= 'z') return 0.5;
  return 0.56;
}

/**
 * Estimated rendered width of a single line in GAME_FONT (within a few percent; kerning pairs make it slightly
 * generous).
 */
export function textWidth(text: string, size: number): number {
  let em = 0;
  for (const c of text) em += charEm(c);
  return em * size;
}

/** The engine places Lilita One high in its line box: shifting by this fraction of the size centers capitals on y. */
export const OPTICAL_Y = 0.05;

export interface LabelOpts {
  x?: number;
  y?: number;
  /** Overrides the preset size; the outline scales with it. */
  size?: number;
  fill?: string;
  /** 'left' starts the text at x, 'right' ends it at x; default centered on x. */
  align?: 'left' | 'center' | 'right';
  /** Wrap width; by default wide enough that the line never wraps. */
  width?: number;
  visible?: boolean;
}

/**
 * Text in a preset style. The group is placed at (x, y); text ids are every copy to update with setText (outline and
 * fill, or just the fill for presets without an outline).
 */
export function addLabel(
  b: SpriteBuilder,
  name: string,
  text: string,
  preset: TextPreset | TextStyle,
  opts: LabelOpts = {},
  parent: string = ROOT,
): { groupId: string; textIds: string[] } {
  const style = typeof preset === 'string' ? TEXT[preset] : preset;
  const size = opts.size ?? style.size;
  const align = opts.align ?? 'center';
  const width = opts.width ?? Math.ceil(Math.max(textWidth(text, size) * 2, size * 8));
  // Text boxes are centered on their x: shift so the anchor lands on the box edge for left/right alignment.
  const boxX = align === 'left' ? width / 2 : align === 'right' ? -width / 2 : 0;
  const groupId = b.group(name, { x: opts.x ?? 0, y: opts.y ?? 0, visible: opts.visible }, parent);
  const textOpts = { size, align, width, x: boxX, y: OPTICAL_Y * size, fill: opts.fill ?? style.fill };
  if (style.outline) {
    const outline = { color: style.outline.color, width: Math.max(1.5, (style.outline.width * size) / style.size) };
    const { textIds } = b.outlinedText(`${name}.text`, text, { ...textOpts, outline }, name);
    return { groupId, textIds: [...textIds] };
  }
  return { groupId, textIds: [b.text(`${name}.text`, text, textOpts, name)] };
}
