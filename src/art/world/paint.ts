/** Paint shorthands shared by the world parts (art style of CLAUDE.md: dark outline, ramp gradients, soft shadows). */
import { linear, radial, solid, type ShadowSpec, type StrokeSpec } from '../exode';
import { OUTLINE, type Ramp } from '../palette';
import type { Fill } from 'exodeui';

export function outline(width = 2.5): StrokeSpec {
  return { color: OUTLINE, width, join: 'round', cap: 'round' };
}

/** Vertical light → dark gradient of a ramp. */
export function rampFill(ramp: Ramp): Fill {
  return linear([[0, ramp.light], [1, ramp.dark]]);
}

/** Radial gradient lit from the top-left. */
export function litBall(ramp: Ramp, core?: string): Fill {
  return radial(core ? [[0, core], [0.35, ramp.light], [1, ramp.dark]] : [[0, ramp.light], [1, ramp.dark]], [0.35, 0.3], 0.75);
}

/** Black contact shadow fill (the translucent ellipse under units and props). */
export const CONTACT_SHADOW: Fill = solid('#000000', 0.28);

/** Soft white highlight on top-left surfaces. */
export const HIGHLIGHT: Fill = solid('#ffffff', 0.3);

/** Canvas shadow cast down-right by tall static props (terrain only, never on pooled sprites). */
export const CAST_SHADOW: ShadowSpec = { color: '#000000', blur: 8, x: 5, y: 5, opacity: 0.45 };

/** Soft glow: a translucent radial fade for 'lighter' blending. */
export function glowFill(color: string, opacity = 1): Fill {
  return radial([[0, color, opacity], [1, color, 0]]);
}
