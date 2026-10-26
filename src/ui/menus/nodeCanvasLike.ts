/** A Node canvas behind the CanvasLike interface, for the menu tests and gallery. Never imported by browser code. */
import type { Canvas } from '@napi-rs/canvas';
import { context2d, createNodeCanvas } from '../../platform/nodeCanvas';
import type { CanvasLike } from '../../render/stage';

export type NodeCanvasLike = CanvasLike & { node: Canvas };

/** One Node canvas per layer name (a menu screen's stacked layers). */
export function nodeLayers<K extends string>(names: readonly K[], width: number, height: number): Record<K, NodeCanvasLike> {
  return Object.fromEntries(names.map((name) => [name, nodeCanvasLike(width, height)])) as Record<K, NodeCanvasLike>;
}

/** The layers drawn bottom to top onto one new canvas the size of the first. */
export function flatten(layers: readonly NodeCanvasLike[]): Canvas {
  const first = layers[0];
  const out = createNodeCanvas(first?.width ?? 1, first?.height ?? 1);
  const ctx = out.getContext('2d');
  for (const layer of layers) ctx.drawImage(layer.node, 0, 0);
  return out;
}

/**
 * Stand-in for the DOM mascot portrait in galleries: a royal blue disc in the gold ring the app frames it with, so the
 * slot can be judged against the art.
 */
export function drawPortraitStandIn(canvas: Canvas, p: { x: number; y: number; size: number }): void {
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = '#1d3b78';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffd95a';
  ctx.stroke();
}

export function nodeCanvasLike(width: number, height: number): NodeCanvasLike {
  const node = createNodeCanvas(width, height);
  return {
    node,
    get width() {
      return node.width;
    },
    set width(v: number) {
      node.width = v;
    },
    get height() {
      return node.height;
    },
    set height(v: number) {
      node.height = v;
    },
    getContext: () => context2d(node),
  };
}
