/**
 * Engine writes for the HUD that skip values already written, so the controller can re-pose everything every frame.
 * Every write goes through src/render/exodeRuntime.ts.
 */
import type { ExodeUIEngine } from 'exodeui';
import type { PathPoint } from '../../art/exode';
import { poseButton, type ButtonState } from '../../art/ui/pose';
import type { ButtonParts } from '../../art/ui/kit';
import { setFillColor, setOpacity, setPathPoints, setPos, setScale, setText, setVisible } from '../../render/exodeRuntime';

export class Poser {
  private readonly last = new Map<string, unknown>();

  constructor(readonly engine: ExodeUIEngine) {}

  private changed(key: string, value: unknown): boolean {
    if (this.last.get(key) === value) return false;
    this.last.set(key, value);
    return true;
  }

  visible(id: string, visible: boolean): void {
    if (this.changed(`${id}|v`, visible)) setVisible(this.engine, id, visible);
  }

  pos(id: string, x: number, y: number): void {
    if (this.changed(`${id}|p`, `${x},${y}`)) setPos(this.engine, id, x, y);
  }

  scale(id: string, scale: number): void {
    if (this.changed(`${id}|s`, scale)) setScale(this.engine, id, scale);
  }

  opacity(id: string, opacity: number): void {
    if (this.changed(`${id}|o`, opacity)) setOpacity(this.engine, id, opacity);
  }

  text(ids: readonly string[], text: string): void {
    const first = ids[0];
    if (first !== undefined && this.changed(`${first}|t`, text)) setText(this.engine, ids, text);
  }

  fill(id: string, color: string): void {
    if (this.changed(`${id}|f`, color)) setFillColor(this.engine, id, color);
  }

  /** `key` identifies the point set (the points themselves are not compared). */
  path(id: string, key: string, points: () => readonly PathPoint[]): void {
    if (this.changed(`${id}|path`, key)) setPathPoints(this.engine, id, points());
  }

  button(parts: ButtonParts, state: ButtonState): void {
    if (this.changed(`${parts.groupId}|b`, state)) poseButton(this.engine, parts, state);
  }
}
