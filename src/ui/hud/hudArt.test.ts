import type { ExodeUIEngine } from 'exodeui';
import { describe, expect, it } from 'vitest';
import { validateSprite } from '../../art/exode';
import { poseButton } from '../../art/ui/pose';
import { setPos, setVisible } from '../../render/exodeRuntime';
import { LEVELS, getLevel } from '../../game/levels';
import { countPainted, renderArtboard } from '../../platform/nodeCanvas';
import { buildHud } from './hudArt';
import { CALL, TOP_BAR, TOP_BUTTONS } from './layout';

describe('buildHud', () => {
  it('is a valid sprite for every level, with one build option per allowed kind', () => {
    for (const level of LEVELS) {
      const hud = buildHud(level);
      expect(validateSprite(hud.sprite)).toEqual([]);
      expect(hud.build.map((o) => o.kind)).toEqual(level.towers);
      expect(hud.artboard.backgroundVisible).toBe(false);
    }
  });

  it('puts each tower icon inside its option button, under the disabled cover', () => {
    const hud = buildHud(getLevel(6));
    for (const option of hud.build) {
      const group = hud.sprite.objects.find((o) => o.id === option.button.groupId);
      const children = group?.children ?? [];
      const icon = `hud.ticon.${option.kind}`;
      expect(children).toContain(icon);
      expect(children.indexOf(icon)).toBeLessThan(children.indexOf(option.button.disabledId));
    }
  });

  it('shows only the counters, the top buttons and nothing over the board at first', () => {
    const hud = buildHud(getLevel(1));
    const canvas = renderArtboard(hud.artboard);
    const bar = { x: TOP_BAR.x - TOP_BAR.w / 2, y: TOP_BAR.y - TOP_BAR.h / 2, w: TOP_BAR.w, h: TOP_BAR.h };
    expect(countPainted(canvas, bar)).toBeGreaterThan(bar.w * bar.h * 0.9);
    const pause = TOP_BUTTONS.pause;
    expect(countPainted(canvas, { x: pause.x - 20, y: pause.y - 20, w: 40, h: 40 })).toBe(1600);
    expect(countPainted(canvas, { x: 0, y: 80, w: 1280, h: 500 })).toBe(0);
  });

  it('paints a build option with its tower icon and greys it when disabled', () => {
    const hud = buildHud(getLevel(1));
    const option = hud.build[0];
    if (!option) throw new Error('no option');
    const at = { x: 300, y: 300 };
    const region = { x: at.x - 30, y: at.y - 30, w: 60, h: 60 };
    const show = (engine: ExodeUIEngine) => {
      setVisible(engine, option.groupId, true);
      setPos(engine, option.groupId, at.x, at.y);
    };
    const canvas = renderArtboard(hud.artboard, { prepare: show });
    expect(countPainted(canvas, region)).toBeGreaterThan(2500);
    const grey = renderArtboard(hud.artboard, {
      prepare: (engine) => {
        show(engine);
        poseButton(engine, option.button, 'disabled');
      },
    });
    const ctxA = canvas.getContext('2d').getImageData(region.x, region.y, region.w, region.h).data;
    const ctxB = grey.getContext('2d').getImageData(region.x, region.y, region.w, region.h).data;
    let changed = 0;
    for (let i = 0; i < ctxA.length; i += 4) if (ctxA[i] !== ctxB[i]) changed++;
    expect(changed).toBeGreaterThan(1000);
  });

  it('places the call-wave group in the bottom-right corner', () => {
    const hud = buildHud(getLevel(1));
    const group = hud.sprite.objects.find((o) => o.id === hud.call.groupId);
    expect(group?.transform).toMatchObject({ x: CALL.x, y: CALL.y });
  });
});
