import { describe, expect, it } from 'vitest';
import { makeArtboard, SpriteBuilder } from '../../art/exode';
import { textWidth } from '../../art/ui/text';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../game/types';
import { countPainted, renderArtboard } from '../../platform/nodeCanvas';
import { setPos, setVisible } from '../../render/exodeRuntime';
import { CALL_ZONE, VICTORY_PANEL } from './layout';
import { addMascotBubbles, BUBBLE_LINE_IDS, BUBBLE_LINES, bubbleCenter, bubbleSize, CORNER_PORTRAIT, OVERLAY_PORTRAIT, PORTRAIT_SLIDE } from './mascotBubble';

describe('mascot bubbles', () => {
  it('has the decided lines, each bubble wide enough for its text', () => {
    expect(BUBBLE_LINES).toEqual({
      firstWave: 'Here they come!',
      boss: 'A Warlord approaches!',
      holdTheLine: 'Hold the line!',
      breaking: "They're breaking through!",
      splendid: 'Splendid!',
      victory: 'The bastion stands!',
      defeat: "We'll be back...",
    });
    for (const line of BUBBLE_LINE_IDS) expect(bubbleSize(line).w).toBeGreaterThan(textWidth(BUBBLE_LINES[line], 20) + 30);
  });

  it('puts the corner bubble right of the portrait and the overlay bubble above it, all on the board', () => {
    const right = bubbleCenter(CORNER_PORTRAIT, 'left', 200, 48);
    expect(right.y).toBe(CORNER_PORTRAIT.y);
    expect(right.x - 100).toBeGreaterThan(CORNER_PORTRAIT.x + CORNER_PORTRAIT.size / 2);
    const above = bubbleCenter(OVERLAY_PORTRAIT, 'down', 200, 48);
    expect(above.x).toBe(OVERLAY_PORTRAIT.x);
    expect(above.y + 24).toBeLessThan(OVERLAY_PORTRAIT.y - OVERLAY_PORTRAIT.size / 2);
    for (const line of BUBBLE_LINE_IDS) {
      const { w, h } = bubbleSize(line);
      const corner = bubbleCenter(CORNER_PORTRAIT, 'left', w, h);
      expect(corner.x + w / 2).toBeLessThan(CALL_ZONE.x);
      expect(corner.y + h / 2).toBeLessThan(DESIGN_HEIGHT);
      const overlay = bubbleCenter(OVERLAY_PORTRAIT, 'down', w, h);
      expect(overlay.x - w / 2).toBeGreaterThan(0);
      if (line === 'victory' || line === 'defeat') expect(overlay.x + w / 2).toBeLessThan(VICTORY_PANEL.x - VICTORY_PANEL.w / 2);
    }
  });

  it('keeps the portraits on the board at rest and fully off it before sliding in', () => {
    for (const p of [CORNER_PORTRAIT, OVERLAY_PORTRAIT]) {
      expect(p.x - p.size / 2).toBeGreaterThanOrEqual(0);
      expect(p.y + p.size / 2).toBeLessThanOrEqual(DESIGN_HEIGHT);
      expect(p.x + p.size / 2).toBeLessThan(DESIGN_WIDTH);
    }
    expect(CORNER_PORTRAIT.x - PORTRAIT_SLIDE + CORNER_PORTRAIT.size / 2).toBeLessThan(0);
  });

  it('builds hidden-able bubbles that paint where placed', () => {
    const b = new SpriteBuilder('bubbles');
    const parts = addMascotBubbles(b);
    const artboard = makeArtboard('bubbles', b.build().objects, { background: null });
    const { w, h } = bubbleSize('splendid');
    const at = bubbleCenter(CORNER_PORTRAIT, 'left', w, h);
    const canvas = renderArtboard(artboard, {
      prepare: (engine) => {
        for (const line of BUBBLE_LINE_IDS) setVisible(engine, parts[line].groupId, line === 'splendid');
        setPos(engine, parts.splendid.groupId, at.x, at.y);
        setVisible(engine, parts.splendid.tailLeftId, true);
      },
    });
    expect(countPainted(canvas, { x: at.x - w / 2 + 4, y: at.y - h / 2 + 4, w: w - 8, h: h - 8 })).toBeGreaterThan((w - 8) * (h - 8) * 0.95);
    expect(countPainted(canvas, { x: at.x - w / 2 - 14, y: at.y - 3, w: 10, h: 6 })).toBeGreaterThan(10);
    expect(countPainted(canvas, { x: 0, y: 0, w: 400, h: 400 })).toBe(0);
  });
});
