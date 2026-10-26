import type { Artboard } from 'exodeui';
import type { Vec2 } from '../../game/types';
import { Stage, type CanvasLike } from '../../render/stage';
import type { MenuAction, PointerKind } from '../types';

/**
 * A full-board menu screen drawn on stacked canvases: static layers drawn once per resize, and one live Stage the app
 * redraws every frame. The app forwards input and calls render once per frame.
 */
export interface MenuScreen {
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void;
  /** p in design coords. Controls act on 'up' over the control that received 'down'; 'move' drives hover. */
  pointer(kind: PointerKind, p: Vec2): MenuAction | null;
  key(key: string): MenuAction | null;
  /** dt: real seconds since the last frame. Redraws the live layer only. */
  render(dt: number, soundOn: boolean): void;
}

/**
 * Stages whose artboards never change (backdrops with canvas shadows and hundreds of shapes): each is drawn right
 * after its backing store changes size (resizing clears it), never per frame.
 */
export class StaticStages {
  private readonly stages: { stage: Stage; size: string }[];
  private drawn = 0;

  constructor(layers: readonly { canvas: CanvasLike; artboard: Artboard }[]) {
    this.stages = layers.map(({ canvas, artboard }) => {
      const stage = new Stage(canvas);
      stage.load(artboard);
      return { stage, size: '' };
    });
  }

  /** How many resize calls redrew static layers. */
  get draws(): number {
    return this.drawn;
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    let drew = false;
    for (const entry of this.stages) {
      entry.stage.resize(cssWidth, cssHeight, devicePixelRatio);
      const { width, height } = entry.stage.canvas;
      const size = `${width}x${height}`;
      if (size === entry.size) continue;
      entry.size = size;
      entry.stage.render();
      drew = true;
    }
    if (drew) this.drawn++;
  }
}
