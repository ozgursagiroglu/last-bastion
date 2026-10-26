/** The four level themes: ground, road and pad colors, and an accent for tinting menus. */
import type { ThemeId } from '../../game/types';
import type { Ramp } from '../palette';

export interface ThemeStyle {
  /** light (top) → dark (bottom) */
  ground: Ramp;
  road: { edge: string; fill: string; center: string; pebble: string };
  /** Stone of the build pads. */
  pad: Ramp;
  /** For UI tinting of the level (menus). */
  accent: string;
}

export const THEMES: Readonly<Record<ThemeId, ThemeStyle>> = {
  meadow: {
    ground: { light: '#8fcb55', dark: '#5f9e3a' },
    road: { edge: '#6e4a2a', fill: '#c99f66', center: '#e2c48e', pebble: '#8c6b45' },
    pad: { light: '#c9c3b5', dark: '#6b655b' },
    accent: '#6cc04a',
  },
  desert: {
    ground: { light: '#f0d293', dark: '#d6a868' },
    road: { edge: '#7a4c28', fill: '#b98149', center: '#cf9a5f', pebble: '#865a33' },
    pad: { light: '#ead0a0', dark: '#9a6c3e' },
    accent: '#e8a33d',
  },
  snow: {
    ground: { light: '#f6fbff', dark: '#c8dbea' },
    road: { edge: '#5a4c42', fill: '#a49787', center: '#c2b8aa', pebble: '#73675b' },
    pad: { light: '#cbd6e0', dark: '#5f7184' },
    accent: '#7cc8f0',
  },
  volcano: {
    ground: { light: '#6a5650', dark: '#3e302c' },
    road: { edge: '#1c1310', fill: '#86705f', center: '#9c8571', pebble: '#4a3c34' },
    pad: { light: '#958a82', dark: '#3f3733' },
    accent: '#ff6b2c',
  },
};
