import { describe, expect, it } from 'vitest';
import { THEME_IDS, type LevelDef } from '../../game/types';
import { DECOR_KINDS } from './decor';
import { distance, distanceToPaths, exitPoints } from './geometry';
import { SAMPLE_LEVELS } from './sampleLevels';
import { DECOR_CLEARANCE, isClearOfLayout, scatterDecor } from './scatter';

function violations(level: LevelDef): string[] {
  const exits = exitPoints(level.paths);
  return scatterDecor(level).flatMap((d) => {
    const out: string[] = [];
    if (d.y < DECOR_CLEARANCE.top) out.push(`${d.kind} at y ${d.y} in the top strip`);
    if (distanceToPaths(d, level.paths) < DECOR_CLEARANCE.road) out.push(`${d.kind} at ${d.x},${d.y} on a road`);
    if (level.pads.some((p) => distance(d, p) < DECOR_CLEARANCE.pad)) out.push(`${d.kind} at ${d.x},${d.y} on a pad`);
    if (exits.some((e) => distance(d, e) < DECOR_CLEARANCE.exit)) out.push(`${d.kind} at ${d.x},${d.y} at an exit`);
    return out;
  });
}

describe('scatterDecor', () => {
  it('places 70–120 theme props clear of roads, pads, exits and the top strip, sorted by y', () => {
    for (const theme of THEME_IDS) {
      const level = SAMPLE_LEVELS[theme];
      const decor = scatterDecor(level);
      expect(decor.length).toBeGreaterThanOrEqual(70);
      expect(decor.length).toBeLessThanOrEqual(120);
      for (const d of decor) expect(DECOR_KINDS[theme]).toContain(d.kind);
      expect(decor.map((d) => d.y)).toEqual([...decor.map((d) => d.y)].sort((a, b) => a - b));
      expect(violations(level)).toEqual([]);
    }
  });

  it('is deterministic per seed and changes with the seed', () => {
    const level = SAMPLE_LEVELS.meadow;
    expect(scatterDecor(level)).toEqual(scatterDecor({ ...level }));
    expect(scatterDecor({ ...level, decorSeed: level.decorSeed + 1 })).not.toEqual(scatterDecor(level));
  });

  it('uses every kind of the theme across a few seeds', () => {
    for (const theme of THEME_IDS) {
      const used = new Set([1, 2, 3, 4, 5].flatMap((seed) => scatterDecor({ ...SAMPLE_LEVELS[theme], decorSeed: seed }).map((d) => d.kind)));
      expect([...used].sort()).toEqual([...DECOR_KINDS[theme]].sort());
    }
  });

  it('keeps out of the given circles', () => {
    const level = SAMPLE_LEVELS.desert;
    const keepOut = scatterDecor(level).slice(0, 10).map((d) => ({ at: { x: d.x, y: d.y }, radius: 40 }));
    for (const d of scatterDecor(level, keepOut)) for (const k of keepOut) expect(distance(d, k.at)).toBeGreaterThanOrEqual(40);
  });

  it('checks the layout clearances', () => {
    const roads = [[{ x: 0, y: 200 }, { x: 400, y: 200 }]];
    expect(isClearOfLayout({ x: 100, y: 300 }, roads, [], [])).toBe(true);
    expect(isClearOfLayout({ x: 100, y: 230 }, roads, [], [])).toBe(false);
    expect(isClearOfLayout({ x: 100, y: 50 }, roads, [], [])).toBe(false);
    expect(isClearOfLayout({ x: 100, y: 300 }, roads, [{ x: 120, y: 320 }], [])).toBe(false);
    expect(isClearOfLayout({ x: 100, y: 300 }, roads, [], [{ x: 150, y: 320 }])).toBe(false);
  });
});
