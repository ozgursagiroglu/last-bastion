import { ExodeUIEngine, type Artboard } from 'exodeui';
import { DESIGN_HEIGHT, DESIGN_WIDTH, type Vec2 } from '../game/types';

/** A browser canvas, or @napi-rs/canvas in Node. */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(contextId: '2d'): CanvasRenderingContext2D | null;
}

export interface ContainFit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Contain-fit of the design board into a w×h viewport, centered (the engine's 'Contain' + 'Center' layout). */
export function containFit(width: number, height: number, designWidth = DESIGN_WIDTH, designHeight = DESIGN_HEIGHT): ContainFit {
  const scale = Math.min(width / designWidth, height / designHeight);
  return { scale, offsetX: (width - designWidth * scale) / 2, offsetY: (height - designHeight * scale) / 2 };
}

/** Largest backing-store ratio we render at (keeps 4K/retina fill cost bounded). */
export const MAX_PIXEL_RATIO = 2;

/** One canvas driven by one ExodeUI engine. Every layer of every screen is a Stage. */
export class Stage {
  readonly engine: ExodeUIEngine;
  private cssWidth = DESIGN_WIDTH;
  private cssHeight = DESIGN_HEIGHT;

  constructor(readonly canvas: CanvasLike) {
    this.engine = new ExodeUIEngine();
    this.engine.setLayout('Contain', 'Center');
  }

  load(artboard: Artboard): void {
    this.engine.load(artboard);
  }

  /** Size the backing store for a canvas shown at cssWidth × cssHeight CSS pixels. */
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.cssWidth = Math.max(1, cssWidth);
    this.cssHeight = Math.max(1, cssHeight);
    const ratio = Math.min(MAX_PIXEL_RATIO, Math.max(1, devicePixelRatio));
    const w = Math.round(this.cssWidth * ratio);
    const h = Math.round(this.cssHeight * ratio);
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  /** Step engine-side time (state machine, particle emitters). Clips applied with playClip/loopClip do not need it. */
  advance(dt: number): void {
    this.engine.advance(dt);
  }

  render(): void {
    const ctx = this.canvas.getContext('2d');
    if (ctx) this.engine.render(ctx, this.canvas.width, this.canvas.height);
  }

  /** Point in CSS pixels relative to the canvas' top-left corner → design coords. */
  toDesign(cssX: number, cssY: number): Vec2 {
    const fit = containFit(this.cssWidth, this.cssHeight);
    return { x: (cssX - fit.offsetX) / fit.scale, y: (cssY - fit.offsetY) / fit.scale };
  }

  /** Design coords → CSS pixels relative to the canvas' top-left corner. */
  toCss(p: Vec2): Vec2 {
    const fit = containFit(this.cssWidth, this.cssHeight);
    return { x: p.x * fit.scale + fit.offsetX, y: p.y * fit.scale + fit.offsetY };
  }
}
