import { describe, expect, it } from 'vitest';
import { DESIGN_HEIGHT, DESIGN_WIDTH, PATH_WIDTH, THEME_IDS, type LevelDef } from '../../game/types';
import { validateSprite } from '../exode';
import { pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { distance, distanceToPaths, exitPoints } from './geometry';
import { SAMPLE_LEVELS } from './sampleLevels';
import { DECOR_CLEARANCE } from './scatter';
import { buildTerrainArtboard, buildTerrainSprite, moltenSurfaces, terrainDecor } from './terrain';

function decorPoints(level: LevelDef): { x: number; y: number }[] {
  return buildTerrainSprite(level)
    .objects.filter((o) => /^terrain\.decor\d+$/.test(o.id))
    .map((o) => ({ x: o.transform.x, y: o.transform.y }));
}

describe('buildTerrainSprite', () => {
  it('is a valid sprite under 1000 objects for every theme', () => {
    for (const theme of THEME_IDS) {
      const sprite = buildTerrainSprite(SAMPLE_LEVELS[theme]);
      expect(validateSprite(sprite)).toEqual([]);
      expect(sprite.objects.length).toBeLessThan(1000);
      expect(Object.keys(sprite.clips)).toEqual([]);
    }
  });

  it('draws a pad per pad, a gate per distinct exit and a marker per spawn', () => {
    for (const theme of THEME_IDS) {
      const level = SAMPLE_LEVELS[theme];
      const ids = new Set(buildTerrainSprite(level).objects.map((o) => o.id));
      level.pads.forEach((_, i) => expect(ids.has(`terrain.pad${i}`)).toBe(true));
      const exits = exitPoints(level.paths);
      exits.forEach((_, i) => expect(ids.has(`terrain.gate${i}`)).toBe(true));
      expect(ids.has(`terrain.gate${exits.length}`)).toBe(false);
      level.paths.forEach((_, i) => expect(ids.has(`terrain.spawn${i}`)).toBe(true));
    }
  });

  it('keeps every decor item and spawn marker off roads, pads and exits', () => {
    for (const theme of THEME_IDS) {
      const level = SAMPLE_LEVELS[theme];
      const exits = exitPoints(level.paths);
      const decor = decorPoints(level);
      expect(decor.length).toBeGreaterThanOrEqual(70);
      for (const d of decor) {
        expect(d.y).toBeGreaterThanOrEqual(DECOR_CLEARANCE.top);
        expect(distanceToPaths(d, level.paths)).toBeGreaterThanOrEqual(DECOR_CLEARANCE.road);
        for (const p of level.pads) expect(distance(d, p)).toBeGreaterThanOrEqual(DECOR_CLEARANCE.pad);
        for (const e of exits) expect(distance(d, e)).toBeGreaterThanOrEqual(DECOR_CLEARANCE.exit);
      }
      const markers = buildTerrainSprite(level).objects.filter((o) => /^terrain\.spawn\d+$/.test(o.id));
      for (const m of markers) expect(distanceToPaths({ x: m.transform.x, y: m.transform.y }, level.paths)).toBeGreaterThan(PATH_WIDTH / 2 + 10);
    }
  });

  it('is deterministic for a seed and different for another seed', () => {
    const level = SAMPLE_LEVELS.snow;
    expect(JSON.stringify(buildTerrainSprite(level))).toBe(JSON.stringify(buildTerrainSprite({ ...level })));
    expect(decorPoints({ ...level, decorSeed: 5 })).not.toEqual(decorPoints(level));
  });
});

describe('buildTerrainArtboard', () => {
  it('renders an opaque board with the road drawn along the paths', () => {
    const level = SAMPLE_LEVELS.meadow;
    const artboard = buildTerrainArtboard(level);
    expect(artboard).toMatchObject({ width: DESIGN_WIDTH, height: DESIGN_HEIGHT, backgroundVisible: true });
    const c = renderArtboard(artboard);
    for (const [x, y] of [[0, 0], [DESIGN_WIDTH - 1, 0], [0, DESIGN_HEIGHT - 1], [DESIGN_WIDTH - 1, DESIGN_HEIGHT - 1], [640, 360]] as const) {
      expect(pixelAt(c, x, y)[3]).toBe(255);
    }
    const [r, g, b] = pixelAt(c, 500, 470);
    expect(r, 'road is earthy, not grass').toBeGreaterThan(g * 0.95);
    expect(r).toBeGreaterThan(b + 40);
    let red = 0;
    let green = 0;
    for (let x = 10; x < DESIGN_WIDTH; x += 40) {
      for (let y = 10; y < DESIGN_HEIGHT; y += 40) {
        const [pr, pg] = pixelAt(c, x, y);
        red += pr;
        green += pg;
      }
    }
    expect(green, 'the meadow is mostly green').toBeGreaterThan(red * 1.2);
  });
});

describe('moltenSurfaces', () => {
  it('lists the lava pools and vents the terrain draws, on the volcano only', () => {
    for (const theme of THEME_IDS) {
      const level = SAMPLE_LEVELS[theme];
      const surfaces = moltenSurfaces(level);
      const molten = terrainDecor(level).filter((d) => d.kind === 'volcano.lavaPool' || d.kind === 'volcano.vent');
      expect(surfaces).toHaveLength(molten.length);
      if (theme !== 'volcano') expect(surfaces).toEqual([]);
      surfaces.forEach((s, i) => {
        const d = molten[i];
        expect(s.x).toBe(d?.x);
        expect(s.y).toBeLessThan(d?.y ?? 0);
        expect(s.rx).toBeGreaterThan(s.ry);
      });
    }
    expect(moltenSurfaces(SAMPLE_LEVELS.volcano).length).toBeGreaterThan(0);
  });
});
