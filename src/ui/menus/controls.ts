/** Pointer state of a screen's controls: hover, press, and activation on release over the pressed control. */
import { hitTest, type HitRegion } from '../../art/ui/hit';
import type { ButtonState } from '../../art/ui/pose';
import type { Vec2 } from '../../game/types';
import type { PointerKind } from '../types';

export class Controls {
  private regions: readonly HitRegion[];
  private readonly disabled = new Set<string>();
  private hoveredId: string | null = null;
  private pressedId: string | null = null;

  constructor(regions: readonly HitRegion[]) {
    this.regions = regions;
  }

  /** Disabled controls ignore the pointer (hit testing falls through to what lies under them). */
  setEnabled(id: string, enabled: boolean): void {
    if (enabled) this.disabled.delete(id);
    else this.disabled.add(id);
    if (!enabled && this.hoveredId === id) this.hoveredId = null;
    if (!enabled && this.pressedId === id) this.pressedId = null;
  }

  get hovered(): string | null {
    return this.hoveredId;
  }

  /** The id of the control activated by this event, or null. */
  pointer(kind: PointerKind, p: Vec2): string | null {
    const hit = hitTest(
      this.regions.filter((r) => !this.disabled.has(r.id)),
      p,
    );
    this.hoveredId = hit;
    if (kind === 'down') {
      this.pressedId = hit;
      return null;
    }
    if (kind === 'up') {
      const activated = hit !== null && hit === this.pressedId ? hit : null;
      this.pressedId = null;
      return activated;
    }
    return null;
  }

  /** Visual state of a control: pressed while held over it, hover while over it. */
  state(id: string): ButtonState {
    if (this.disabled.has(id)) return 'disabled';
    if (this.hoveredId !== id) return 'normal';
    return this.pressedId === id ? 'pressed' : 'hover';
  }
}
