import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../game/levels';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '../../game/types';
import { distance } from '../../art/world/geometry';
import { mapRegions, MAP_TOP, MAP_WIDTH, NODE_RADIUS, NODE_STARS_DY, nodePositions, regionDecor, regionOutline, sampleTrail, trailPoints } from './mapLayout';

const nodes = nodePositions(LEVELS.length);

describe('nodePositions', () => {
  it('runs left to right inside the map, below the top bar and above the bottom edge (stars included)', () => {
    expect(nodes).toHaveLength(10);
    nodes.forEach((n, i) => {
      if (i > 0) expect(n.x).toBeGreaterThan(nodes[i - 1]?.x ?? Infinity);
      expect(n.x - NODE_RADIUS).toBeGreaterThan(0);
      expect(n.x + NODE_RADIUS).toBeLessThan(MAP_WIDTH);
      expect(n.y - NODE_RADIUS - 40).toBeGreaterThan(MAP_TOP);
      expect(n.y + NODE_STARS_DY + 12).toBeLessThan(DESIGN_HEIGHT);
    });
  });

  it('keeps neighbouring nodes apart', () => {
    for (let i = 1; i < nodes.length; i++) expect(distance(nodes[i] ?? { x: 0, y: 0 }, nodes[i - 1] ?? { x: 0, y: 0 })).toBeGreaterThan(NODE_RADIUS * 4);
  });
});

describe('trail', () => {
  it('enters from the left edge and passes through every node', () => {
    const trail = trailPoints(nodes);
    expect(trail[0]?.x).toBeLessThan(0);
    const sampled = sampleTrail(trail);
    for (const n of nodes) expect(sampled.some((p) => distance(p, n) < 1e-6)).toBe(true);
  });

  it('is empty without nodes', () => {
    expect(trailPoints([])).toEqual([]);
  });
});

describe('mapRegions', () => {
  const regions = mapRegions(LEVELS, nodes);

  it('has the four themes left to right covering the board, each holding its levels', () => {
    expect(regions.map((r) => r.theme)).toEqual(['meadow', 'desert', 'snow', 'volcano']);
    expect(regions[0]?.x0).toBe(0);
    expect(regions[3]?.x1).toBe(DESIGN_WIDTH);
    regions.forEach((r, i) => {
      if (i > 0) expect(r.x0).toBe(regions[i - 1]?.x1);
    });
    LEVELS.forEach((level, i) => {
      const n = nodes[i];
      const r = regions.find((x) => n && n.x >= x.x0 && n.x < x.x1);
      expect(r?.theme).toBe(level.theme);
    });
  });

  it('outlines a closed shape reaching the right edge', () => {
    const outline = regionOutline(regions[1] ?? { theme: 'desert', x0: 0, x1: 0 }, 1);
    expect(Math.max(...outline.map((p) => p.x))).toBeGreaterThan(DESIGN_WIDTH);
    expect(Math.min(...outline.map((p) => p.y))).toBeLessThan(0);
    expect(Math.max(...outline.map((p) => p.y))).toBeGreaterThan(DESIGN_HEIGHT);
  });

  it('places theme decor inside each visible region, clear of the trail and nodes', () => {
    const sampled = sampleTrail(trailPoints(nodes));
    regions.forEach((r, i) => {
      const decor = regionDecor(r, i, sampled, nodes);
      expect(decor.length).toBeGreaterThanOrEqual(3);
      for (const d of decor) {
        expect(d.kind.startsWith(`${r.theme}.`)).toBe(true);
        expect(d.x).toBeGreaterThan(r.x0);
        expect(d.x).toBeLessThan(Math.min(r.x1, MAP_WIDTH));
        expect(Math.min(...sampled.map((p) => distance(p, d)))).toBeGreaterThan(30);
        for (const n of nodes) expect(distance(n, d)).toBeGreaterThan(NODE_RADIUS + 20);
      }
    });
  });
});
