import type { Canvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { makeArtboard, SpriteBuilder, validateSprite } from '../exode';
import { GAME_FONT } from '../fonts';
import { createNodeCanvas, renderArtboard } from '../../platform/nodeCanvas';
import { addLabel, TEXT, textWidth } from './text';

/** Painted bounding box (alpha > 0) of a canvas. */
function paintedBox(c: Canvas): { left: number; right: number; top: number; bottom: number } {
  const { data, width, height } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  const box = { left: width, right: -1, top: height, bottom: -1 };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) === 0) continue;
      box.left = Math.min(box.left, x);
      box.right = Math.max(box.right, x);
      box.top = Math.min(box.top, y);
      box.bottom = Math.max(box.bottom, y);
    }
  }
  return box;
}

function renderLabel(text: string, opts: Parameters<typeof addLabel>[4], preset: Parameters<typeof addLabel>[3] = { size: 40, fill: '#ffffff', outline: null }) {
  const b = new SpriteBuilder('t');
  const parts = addLabel(b, 'label', text, preset, opts);
  const sprite = b.build();
  return { parts, sprite, canvas: renderArtboard(makeArtboard('t', sprite.objects, { width: 400, height: 100, background: null })) };
}

describe('TEXT', () => {
  it('defines every preset with #rrggbb colors and outlines thinner than a fifth of the size', () => {
    expect(Object.keys(TEXT).sort()).toEqual(['body', 'button', 'heading', 'hud', 'small', 'title']);
    for (const style of Object.values(TEXT)) {
      expect(style.fill).toMatch(/^#[0-9a-f]{6}$/);
      if (style.outline) expect(style.outline.width).toBeLessThan(style.size / 5);
    }
    expect(TEXT.title.size).toBeGreaterThan(TEXT.heading.size);
    expect(TEXT.heading.size).toBeGreaterThan(TEXT.body.size);
    expect(TEXT.body.size).toBeGreaterThan(TEXT.small.size);
  });
});

describe('textWidth', () => {
  it('estimates the rendered width of the game font within 7%', () => {
    const ctx = createNodeCanvas(10, 10).getContext('2d');
    ctx.font = `40px "${GAME_FONT}"`;
    for (const s of ['1350', '3/10', 'PLAY', 'UPGRADE', 'RETRY', 'Wave 10', 'Build towers']) {
      const real = ctx.measureText(s).width;
      expect(Math.abs(textWidth(s, 40) - real) / real, s).toBeLessThan(0.07);
    }
  });
});

describe('addLabel', () => {
  it('builds outlined and plain labels with every text id', () => {
    const b = new SpriteBuilder('ui');
    const title = addLabel(b, 'title', 'Hello', 'title', { y: 10 });
    const small = addLabel(b, 'small', 'note', 'small');
    expect(title.groupId).toBe('ui.title');
    expect(title.textIds.length).toBeGreaterThanOrEqual(2);
    expect(title.textIds.at(-1)).toBe('ui.title.text.fill');
    expect(small.textIds).toEqual(['ui.small.text']);
    expect(validateSprite(b.build())).toEqual([]);
  });

  it('centers capitals and digits on y', () => {
    const { canvas } = renderLabel('HELLO 120', { x: 200, y: 50 });
    const box = paintedBox(canvas);
    expect(Math.abs((box.top + box.bottom) / 2 - 50)).toBeLessThanOrEqual(1);
    expect(Math.abs((box.left + box.right) / 2 - 200)).toBeLessThanOrEqual(2);
  });

  it('anchors left- and right-aligned text on x', () => {
    const left = paintedBox(renderLabel('120', { x: 100, y: 50, align: 'left' }).canvas);
    expect(left.left).toBeGreaterThanOrEqual(99);
    expect(left.left).toBeLessThanOrEqual(104);
    const right = paintedBox(renderLabel('120', { x: 300, y: 50, align: 'right' }).canvas);
    expect(right.right).toBeLessThanOrEqual(301);
    expect(right.right).toBeGreaterThanOrEqual(296);
  });

  it('keeps long text on one line', () => {
    const box = paintedBox(renderLabel('Build towers to stop the waves', { x: 200, y: 50, size: 20 }).canvas);
    expect(box.bottom - box.top).toBeLessThan(26);
  });
});
