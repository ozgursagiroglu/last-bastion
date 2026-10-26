/**
 * Reusable UI pieces every screen is built from. Each builder adds parts into an existing SpriteBuilder under a group
 * named `name`, centered on (x, y) in the parent's space, and returns the ids a controller needs. Part names are
 * `${name}.*`, so several pieces can share one builder as long as their names differ.
 */
import { linear, radial, ROOT, solid, type PathPoint, type SpriteBuilder } from '../exode';
import { OUTLINE, PALETTE, type Ramp } from '../palette';
import { arcPoints } from './geom';
import { addIcon, type IconName } from './icons';
import { addLabel, textWidth, TEXT, type TextStyle } from './text';

export { TEXT } from './text';

export type PanelVariant = 'wood' | 'stone' | 'dark';
export type ButtonVariant = 'green' | 'blue' | 'red' | 'gold' | 'stone';

/** Canvas shadow under wood and stone panels (one per panel, so keep panels few on screen). */
const PANEL_SHADOW = { color: '#000000', blur: 14, y: 6, opacity: 0.5 };

const WOOD_FRAME: Ramp = { light: '#8f5a2b', dark: '#4d2a10' };
const WOOD_PLANK: Ramp = { light: '#b77a44', dark: '#8a5328' };
const WOOD_GAP = '#3a1f0b';
const STONE_FRAME: Ramp = { light: '#8d877c', dark: '#4b463f' };
const STONE_FACE: Ramp = { light: '#958f84', dark: '#6f695f' };
const DARK_FILL = '#120d0a';

/**
 * Add a panel of w × h centered on (x, y). Returns the group id; put the panel's content under it as children.
 * Wood and stone have a frame of about 6% of the shorter side (8–14 px) around the content area.
 */
export function addPanel(
  b: SpriteBuilder,
  name: string,
  opts: { w: number; h: number; x?: number; y?: number; variant: PanelVariant },
  parent: string = ROOT,
): string {
  const { w, h } = opts;
  const groupId = b.group(name, { x: opts.x ?? 0, y: opts.y ?? 0 }, parent);
  if (opts.variant === 'dark') {
    b.rect(`${name}.bg`, w, h, { radius: 12, fill: solid(DARK_FILL, 0.82), stroke: { color: PALETTE.gold.dark, width: 3 } }, name);
    b.rect(`${name}.rim`, w - 9, h - 9, { radius: 8, stroke: { color: PALETTE.gold.light, width: 2, opacity: 0.3 } }, name);
    return groupId;
  }
  const frame = Math.round(Math.min(14, Math.max(8, Math.min(w, h) * 0.06)));
  const iw = w - frame * 2;
  const ih = h - frame * 2;
  const wood = opts.variant === 'wood';
  const frameRamp = wood ? WOOD_FRAME : STONE_FRAME;
  b.rect(`${name}.frame`, w, h, { radius: 12, fill: linear([[0, frameRamp.light], [1, frameRamp.dark]]), stroke: { color: OUTLINE, width: 3 }, shadow: PANEL_SHADOW }, name);
  b.rect(`${name}.bevel`, w - 7, h - 7, { radius: 9, stroke: { color: '#ffffff', width: 2, opacity: 0.22 } }, name);
  if (wood) woodFace(b, name, iw, ih, frame);
  else stoneFace(b, name, w, h, iw, ih, frame);
  return groupId;
}

function woodFace(b: SpriteBuilder, name: string, iw: number, ih: number, frame: number): void {
  b.rect(`${name}.face`, iw, ih, { radius: 6, fill: WOOD_GAP, stroke: { color: OUTLINE, width: 2 } }, name);
  const rows = Math.max(1, Math.round(ih / 36));
  const ph = ih / rows;
  for (let i = 0; i < rows; i++) {
    const y = -ih / 2 + ph * (i + 0.5);
    const plank = `${name}.plank${i}`;
    b.rect(plank, iw - 3, ph - 3, { y, radius: 4, fill: linear([[0, WOOD_PLANK.light], [1, WOOD_PLANK.dark]]) }, name);
    b.rect(`${plank}.hl`, iw - 14, 2.5, { y: y - ph / 2 + 4, radius: 1.25, fill: solid('#ffffff', 0.2) }, name);
    if (iw > 120) b.rect(`${plank}.joint`, 3, ph - 3, { x: (i % 2 === 0 ? -0.22 : 0.27) * iw, y, fill: WOOD_GAP }, name);
  }
  const nx = iw / 2 + frame / 2;
  const ny = ih / 2 + frame / 2;
  const nail = Math.min(3.5, frame * 0.32);
  [[-nx, -ny], [nx, -ny], [-nx, ny], [nx, ny]].forEach(([x, y], i) => {
    b.circle(`${name}.nail${i}`, nail, { x, y, fill: radial([[0, '#eef3f6'], [1, PALETTE.metal.dark]], [0.35, 0.35], 0.6), stroke: { color: OUTLINE, width: 1.5 } }, name);
  });
}

function stoneFace(b: SpriteBuilder, name: string, w: number, h: number, iw: number, ih: number, frame: number): void {
  const seam = { fill: solid('#25211d', 0.75) };
  const stepsX = Math.max(2, Math.round(w / 64));
  for (let i = 1; i < stepsX; i++) {
    const x = -w / 2 + (w / stepsX) * i;
    b.rect(`${name}.seamT${i}`, 2.5, frame, { x, y: -h / 2 + frame / 2 + 1, ...seam }, name);
    b.rect(`${name}.seamB${i}`, 2.5, frame, { x: x + w / stepsX / 2, y: h / 2 - frame / 2 - 1, ...seam }, name);
  }
  const stepsY = Math.max(2, Math.round(h / 64));
  for (let i = 1; i < stepsY; i++) {
    const y = -h / 2 + (h / stepsY) * i;
    b.rect(`${name}.seamL${i}`, frame, 2.5, { x: -w / 2 + frame / 2 + 1, y, ...seam }, name);
    b.rect(`${name}.seamR${i}`, frame, 2.5, { x: w / 2 - frame / 2 - 1, y: y + h / stepsY / 2, ...seam }, name);
  }
  b.rect(`${name}.face`, iw, ih, { radius: 5, fill: linear([[0, STONE_FACE.light], [1, STONE_FACE.dark]]), stroke: { color: OUTLINE, width: 2.5 } }, name);
  b.rect(`${name}.inset`, iw - 4, 5, { y: -ih / 2 + 4.5, radius: 2, fill: solid('#000000', 0.16) }, name);
  const rows = Math.max(1, Math.round(ih / 60));
  const rh = ih / rows;
  const blockW = 120;
  for (let r = 0; r < rows; r++) {
    const top = -ih / 2 + rh * r;
    if (r > 0) b.rect(`${name}.row${r}`, iw - 6, 2, { y: top, fill: solid('#000000', 0.13) }, name);
    const offset = r % 2 === 0 ? 0 : blockW / 2;
    for (let x = -iw / 2 + blockW - offset, j = 0; x < iw / 2 - 20; x += blockW, j++) {
      if (x < -iw / 2 + 20) continue;
      b.rect(`${name}.joint${r}-${j}`, 2, rh - 6, { x, y: top + rh / 2, fill: solid('#000000', 0.13) }, name);
    }
  }
}

export interface ButtonParts {
  /** Centered on (x, y); controllers scale it for hover (1.06) and press (0.94). */
  groupId: string;
  /** Outlined label text ids (empty without a label); update with setText. */
  labelIds: string[];
  iconId: string | null;
  /** Grey translucent cover shown when disabled (hidden by default). */
  disabledId: string;
  w: number;
  h: number;
}

interface ButtonLook {
  top: string;
  bottom: string;
  /** The darker band under the face that gives the button its thickness. */
  lip: string;
}

const BUTTON_LOOK: Record<ButtonVariant, ButtonLook> = {
  green: { top: '#93dd4f', bottom: '#3f9020', lip: '#285a12' },
  blue: { top: PALETTE.blue.light, bottom: PALETTE.blue.dark, lip: '#1a3578' },
  red: { top: PALETTE.red.light, bottom: PALETTE.red.dark, lip: '#64130d' },
  gold: { top: PALETTE.gold.light, bottom: PALETTE.gold.dark, lip: '#744705' },
  stone: { top: PALETTE.stone.light, bottom: PALETTE.stone.dark, lip: '#38342f' },
};

const BUTTON_OUTLINE = 3;
const DISABLED = solid('#4a4a4a', 0.62);

/** Fill, rim and gloss of a button face of fw × fh centered on (0, fy). */
function buttonFace(b: SpriteBuilder, name: string, look: ButtonLook, fw: number, fh: number, fy: number, radius: number): void {
  b.rect(`${name}.face`, fw, fh, { y: fy, radius, fill: linear([[0, look.top], [1, look.bottom]]) }, name);
  const inset = Math.max(4, radius * 0.45);
  const gh = fh * 0.42;
  b.rect(`${name}.gloss`, fw - inset * 2, gh, {
    y: fy - fh / 2 + 2.5 + gh / 2,
    radius: Math.max(2, Math.min(radius - 2, gh / 2)),
    fill: linear([[0, '#ffffff', 0.5], [1, '#ffffff', 0.08]]),
  }, name);
}

/**
 * Rounded rectangular button of w × h centered on (x, y): a glossy face over a darker lip, outlined label
 * (TEXT.button, sized to the button unless `labelSize` is given) and an optional icon left of the label (centered
 * when there is no label).
 */
export function addButton(
  b: SpriteBuilder,
  name: string,
  opts: { w: number; h: number; x?: number; y?: number; variant: ButtonVariant; label?: string; icon?: IconName; labelSize?: number },
  parent: string = ROOT,
): ButtonParts {
  const { w, h } = opts;
  const look = BUTTON_LOOK[opts.variant];
  const groupId = b.group(name, { x: opts.x ?? 0, y: opts.y ?? 0 }, parent);
  const radius = Math.min(16, h * 0.32);
  const lip = Math.max(4, Math.round(h * 0.12));
  const edge = BUTTON_OUTLINE / 2;
  b.rect(`${name}.base`, w, h, { radius, fill: look.lip, stroke: { color: OUTLINE, width: BUTTON_OUTLINE } }, name);
  const fh = h - lip - edge;
  const fy = -h / 2 + edge + fh / 2;
  buttonFace(b, name, look, w - edge * 2, fh, fy, radius - edge);

  const label = opts.label;
  const labelSize = opts.labelSize ?? Math.min(TEXT.button.size, Math.round(fh * 0.56));
  const iconSize = Math.round(fh * (label ? 0.66 : 0.72));
  let iconId: string | null = null;
  let labelIds: string[] = [];
  if (label !== undefined) {
    const gap = Math.round(labelSize * 0.3);
    const contentW = (opts.icon ? iconSize + gap : 0) + textWidth(label, labelSize);
    const left = -contentW / 2;
    if (opts.icon) iconId = addIcon(b, `${name}.icon`, opts.icon, { size: iconSize, x: left + iconSize / 2, y: fy }, name);
    const textOpts = opts.icon
      ? { x: left + iconSize + gap, y: fy, size: labelSize, align: 'left' as const }
      : { y: fy, size: labelSize };
    labelIds = addLabel(b, `${name}.label`, label, TEXT.button, textOpts, name).textIds;
  } else if (opts.icon) {
    iconId = addIcon(b, `${name}.icon`, opts.icon, { size: iconSize, y: fy }, name);
  }
  const disabledId = b.rect(`${name}.disabled`, w + BUTTON_OUTLINE, h + BUTTON_OUTLINE, { radius: radius + edge, fill: DISABLED, visible: false }, name);
  return { groupId, labelIds, iconId, disabledId, w, h };
}

/** Round icon button (pause, speed, sound...) of radius r centered on (x, y). */
export function addRoundButton(
  b: SpriteBuilder,
  name: string,
  opts: { r: number; x?: number; y?: number; variant: ButtonVariant; icon: IconName },
  parent: string = ROOT,
): ButtonParts {
  const { r } = opts;
  const look = BUTTON_LOOK[opts.variant];
  const groupId = b.group(name, { x: opts.x ?? 0, y: opts.y ?? 0 }, parent);
  const lip = Math.max(3, Math.round(r * 0.16));
  const edge = BUTTON_OUTLINE / 2;
  b.circle(`${name}.base`, r, { fill: look.lip, stroke: { color: OUTLINE, width: BUTTON_OUTLINE } }, name);
  const fr = r - edge - lip / 2;
  const fy = -lip / 2;
  b.circle(`${name}.face`, fr, { y: fy, fill: linear([[0, look.top], [1, look.bottom]]) }, name);
  b.ellipse(`${name}.gloss`, fr * 1.3, fr * 0.8, { y: fy - fr * 0.45, fill: linear([[0, '#ffffff', 0.5], [1, '#ffffff', 0.06]]) }, name);
  const iconId = addIcon(b, `${name}.icon`, opts.icon, { size: Math.round(fr * 1.15), y: fy }, name);
  const disabledId = b.circle(`${name}.disabled`, r + edge, { fill: DISABLED, visible: false }, name);
  return { groupId, labelIds: [], iconId, disabledId, w: r * 2, h: r * 2 };
}

/** Icon followed by text, the pair centered on (x, y) for the initial text (longer texts grow to the right). */
function iconWithText(
  b: SpriteBuilder,
  name: string,
  icon: IconName,
  text: string,
  style: TextStyle,
  opts: { x?: number; y?: number; size: number; iconScale: number },
  parent: string,
): { groupId: string; textIds: string[] } {
  const groupId = b.group(name, { x: opts.x ?? 0, y: opts.y ?? 0 }, parent);
  const iconSize = Math.round(opts.size * opts.iconScale);
  const gap = Math.round(opts.size * 0.22);
  const left = -(iconSize + gap + textWidth(text, opts.size)) / 2;
  addIcon(b, `${name}.icon`, icon, { size: iconSize, x: left + iconSize / 2 }, name);
  const { textIds } = addLabel(b, `${name}.label`, text, style, { x: left + iconSize + gap, size: opts.size, align: 'left' }, name);
  return { groupId, textIds };
}

const COST_STYLE: TextStyle = { size: 20, fill: PALETTE.gold.light, outline: { color: OUTLINE, width: 3.5 } };

/** Coin icon + amount, e.g. a tower cost. `size` is the text size (default 20). */
export function addCostTag(
  b: SpriteBuilder,
  name: string,
  opts: { value: number; x?: number; y?: number; size?: number },
  parent: string = ROOT,
): { groupId: string; textIds: string[] } {
  return iconWithText(b, name, 'coin', String(opts.value), COST_STYLE, { x: opts.x, y: opts.y, size: opts.size ?? COST_STYLE.size, iconScale: 1.05 }, parent);
}

/** Icon + outlined number for the HUD (lives, gold, wave). `size` is the text size (default TEXT.hud). */
export function addCounter(
  b: SpriteBuilder,
  name: string,
  opts: { icon: IconName; text: string; x?: number; y?: number; size?: number },
  parent: string = ROOT,
): { groupId: string; textIds: string[] } {
  return iconWithText(b, name, opts.icon, opts.text, TEXT.hud, { x: opts.x, y: opts.y, size: opts.size ?? TEXT.hud.size, iconScale: 1.3 }, parent);
}

/**
 * `count` stars in a row centered on (x, y); each star has a filled and an empty version (empty visible by default).
 * Show progress with poseStars.
 */
export function addStars(
  b: SpriteBuilder,
  name: string,
  opts: { count: number; size: number; x?: number; y?: number; gap?: number },
  parent: string = ROOT,
): { groupIds: string[]; filledIds: string[]; emptyIds: string[] } {
  b.group(name, { x: opts.x ?? 0, y: opts.y ?? 0 }, parent);
  const step = opts.size + (opts.gap ?? Math.round(opts.size * 0.12));
  const groupIds: string[] = [];
  const filledIds: string[] = [];
  const emptyIds: string[] = [];
  for (let i = 0; i < opts.count; i++) {
    const star = `${name}.star${i}`;
    groupIds.push(b.group(star, { x: (i - (opts.count - 1) / 2) * step }, name));
    emptyIds.push(addIcon(b, `${star}.empty`, 'starEmpty', { size: opts.size }, star));
    filledIds.push(b.group(`${star}.filled`, { visible: false }, star));
    addIcon(b, `${star}.filled.icon`, 'star', { size: opts.size }, `${star}.filled`);
  }
  return { groupIds, filledIds, emptyIds };
}

/** Number of points of a ring path (ringPoints always returns exactly this many). */
export const RING_POINTS = 25;

/** RING_POINTS points along an arc from 12 o'clock clockwise covering `progress` (0..1, clamped) of the circle. */
export function ringPoints(cx: number, cy: number, radius: number, progress: number): PathPoint[] {
  const p = Math.min(1, Math.max(0, progress));
  return arcPoints(cx, cy, radius, -90, 360 * p, RING_POINTS);
}

/**
 * A ring progress indicator centered on (x, y) in the parent's space, built full (progress 1) with butt caps (nothing
 * shows at 0). Returns the path id: update it with `setPathPoints(engine, id, ringPoints(x, y, radius, progress))`
 * using the same x, y and radius.
 */
export function addRing(
  b: SpriteBuilder,
  name: string,
  opts: { radius: number; width: number; color: string; x?: number; y?: number },
  parent: string = ROOT,
): string {
  return b.path(name, ringPoints(opts.x ?? 0, opts.y ?? 0, opts.radius, 1), { dynamic: true, stroke: { color: opts.color, width: opts.width, cap: 'butt' } }, parent);
}
