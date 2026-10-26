/** Runtime poses of UI pieces, shared by galleries and controllers (writes through src/render/exodeRuntime.ts only). */
import type { ExodeUIEngine } from 'exodeui';
import { setScale, setVisible } from '../../render/exodeRuntime';
import type { ButtonParts } from './kit';

export type ButtonState = 'normal' | 'hover' | 'pressed' | 'disabled';

export const BUTTON_SCALE: Readonly<Record<ButtonState, number>> = { normal: 1, hover: 1.06, pressed: 0.94, disabled: 1 };

/** Scale and disabled cover for a button. */
export function poseButton(engine: ExodeUIEngine, button: ButtonParts, state: ButtonState): void {
  setScale(engine, button.groupId, BUTTON_SCALE[state]);
  setVisible(engine, button.disabledId, state === 'disabled');
}

/** Show `filled` of the stars filled (clamped to the star count). */
export function poseStars(engine: ExodeUIEngine, stars: { filledIds: string[]; emptyIds: string[] }, filled: number): void {
  stars.filledIds.forEach((id, i) => setVisible(engine, id, i < filled));
  stars.emptyIds.forEach((id, i) => setVisible(engine, id, i >= filled));
}
