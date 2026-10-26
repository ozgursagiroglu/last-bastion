/**
 * Shared colors (all '#rrggbb'). Ramps run light (lit top surfaces) → dark (shaded bottoms); gradients use them in
 * that order. Light comes from the top-left.
 */
export const OUTLINE = '#1d140e';

/** A color ramp: `light` for lit top surfaces, `dark` for shaded bottoms. */
export interface Ramp {
  readonly light: string;
  readonly dark: string;
}

export const PALETTE = {
  stone: { light: '#b3aea3', dark: '#5f5a52' },
  wood: { light: '#b87a45', dark: '#6b3f1f' },
  metal: { light: '#c5d3dd', dark: '#4f6170' },
  gold: { light: '#ffd95a', dark: '#b8780f' },
  blue: { light: '#6fa8ff', dark: '#2a56b8' },
  red: { light: '#ff6b5a', dark: '#a3231a' },
  goblin: { light: '#9be05a', dark: '#3e7a1e' },
  orc: { light: '#8fb85a', dark: '#3f5a22' },
  troll: { light: '#8fb3c4', dark: '#3d5866' },
  bat: { light: '#a487d8', dark: '#4a2f78' },
  ice: { light: '#e6fbff', dark: '#5fb8e6' },
  energy: { light: '#fff6a8', dark: '#4fc3ff' },
  fire: { light: '#ffe27a', dark: '#e2461b' },
} as const satisfies Readonly<Record<string, Ramp>>;
