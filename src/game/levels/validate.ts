import { DESIGN_HEIGHT, DESIGN_WIDTH, PAD_RADIUS, PATH_WIDTH, type EnemyKind, type LevelDef, type Vec2 } from '../types';
import { kindsOf, specOf, type LevelSpec } from './design';
import { dist, distToPolyline, distToSegment, inRect, samePoint, segmentHitsRect, segmentsOf, turnAngle, type Rect } from './geometry';

/** Areas covered by the HUD (design coords). Pads, exits and road must stay out of them. */
export const HUD_ZONES: readonly Rect[] = [
  { x: 0, y: 0, w: DESIGN_WIDTH, h: 70 },
  { x: 1080, y: 590, w: 200, h: 130 },
];

/** A spawn may sit at most this far outside the board edge. */
export const MAX_SPAWN_OUTSIDE = 80;
export const ROAD_MIN_Y = 90;
export const MIN_POINT_GAP = 60;
/** Degrees between consecutive segment directions. */
export const MAX_TURN = 120;
export const EXIT_BOUNDS: Rect = { x: 60, y: 110, w: 1160, h: 550 };
export const PAD_BOUNDS: Rect = { x: 50, y: 100, w: 1180, h: 580 };
export const PAD_ROAD_CLEARANCE = PATH_WIDTH / 2 + PAD_RADIUS + 6;
export const PAD_GAP = 2 * PAD_RADIUS + 8;
export const PAD_MAX_ROAD_DISTANCE = 140;
export const PAD_EXIT_CLEARANCE = 90;
/** Two exits that are not the identical point must be at least this far apart (one castle gate each). */
export const MIN_EXIT_GAP = 120;
/** Seconds within which a wave spawns everything. */
export const MAX_WAVE_SPAWN_TIME = 45;
/** A vertex this close to another road counts as joining it. */
const JOIN_TOLERANCE = 1;

const fmt = (p: Vec2): string => `(${p.x}, ${p.y})`;

function checkRoads(level: LevelDef, errors: string[]): void {
  if (level.paths.length === 0) errors.push('the level has no road');
  level.paths.forEach((path, i) => {
    const name = `path ${i}`;
    if (path.length < 2) {
      errors.push(`${name} needs at least 2 points (spawn and exit), has ${path.length}`);
      return;
    }
    path.forEach((p, k) => {
      if (k === 0) {
        const onEdge = p.x <= 0 || p.x >= DESIGN_WIDTH || p.y >= DESIGN_HEIGHT;
        if (p.y <= 0) errors.push(`${name} spawn ${fmt(p)} is on the top edge (the HUD is there)`);
        else if (!onEdge) errors.push(`${name} spawn ${fmt(p)} is not on or outside the left, right or bottom edge`);
        if (p.x < -MAX_SPAWN_OUTSIDE || p.x > DESIGN_WIDTH + MAX_SPAWN_OUTSIDE || p.y > DESIGN_HEIGHT + MAX_SPAWN_OUTSIDE) {
          errors.push(`${name} spawn ${fmt(p)} is more than ${MAX_SPAWN_OUTSIDE} px outside the board`);
        }
        return;
      }
      if (p.x < 0 || p.x > DESIGN_WIDTH || p.y < ROAD_MIN_Y || p.y > DESIGN_HEIGHT) {
        errors.push(`${name} point ${k} ${fmt(p)} is outside the board or above y = ${ROAD_MIN_Y}`);
      }
      const prev = path[k - 1];
      if (prev && dist(prev, p) < MIN_POINT_GAP) {
        errors.push(`${name} points ${k - 1} and ${k} are ${dist(prev, p).toFixed(1)} px apart (minimum ${MIN_POINT_GAP})`);
      }
      const prev2 = path[k - 2];
      if (prev && prev2) {
        const turn = turnAngle(prev2, prev, p);
        if (turn > MAX_TURN + 1e-9) errors.push(`${name} turns ${turn.toFixed(1)}° at point ${k - 1} ${fmt(prev)} (hairpin; maximum ${MAX_TURN}°)`);
      }
    });
    segmentsOf(path).forEach(([a, b], s) => {
      HUD_ZONES.forEach((zone, z) => {
        if (segmentHitsRect(a, b, zone)) errors.push(`${name} segment ${s} ${fmt(a)}–${fmt(b)} passes through HUD zone ${z}`);
      });
    });
    const exit = path[path.length - 1];
    if (exit && !inRect(exit, EXIT_BOUNDS)) {
      errors.push(`${name} exit ${fmt(exit)} is outside x ∈ [60, 1220], y ∈ [110, 660]`);
    }
  });
}

/** Number of identical points two paths share from the start (`fromEnd`: from the end). */
function sharedRun(a: readonly Vec2[], b: readonly Vec2[], fromEnd: boolean): number {
  const n = Math.min(a.length, b.length);
  let k = 0;
  while (k < n) {
    const p = fromEnd ? a[a.length - 1 - k] : a[k];
    const q = fromEnd ? b[b.length - 1 - k] : b[k];
    if (!p || !q || !samePoint(p, q)) break;
    k++;
  }
  return k;
}

function checkJoins(level: LevelDef, errors: string[]): void {
  level.paths.forEach((a, i) => {
    level.paths.forEach((b, j) => {
      if (j <= i || a.length < 2 || b.length < 2) return;
      const prefix = sharedRun(a, b, false);
      const suffix = sharedRun(a, b, true);
      if (prefix === a.length && a.length === b.length) {
        errors.push(`paths ${i} and ${j} are identical`);
        return;
      }
      const exitA = a[a.length - 1];
      const exitB = b[b.length - 1];
      if (suffix === 0 && exitA && exitB && dist(exitA, exitB) < MIN_EXIT_GAP) {
        errors.push(`paths ${i} and ${j} end ${dist(exitA, exitB).toFixed(1)} px apart: merging paths must end on the identical exit, separate exits need ${MIN_EXIT_GAP} px`);
      }
      const joins = (from: readonly Vec2[], fromIndex: number, onto: readonly Vec2[], ontoIndex: number) => {
        for (let k = prefix; k < from.length - suffix; k++) {
          const p = from[k];
          if (p && distToPolyline(p, onto) <= JOIN_TOLERANCE) {
            errors.push(`path ${fromIndex} point ${k} ${fmt(p)} joins path ${ontoIndex} without sharing identical points from there to the exit`);
          }
        }
      };
      joins(a, i, b, j);
      joins(b, j, a, i);
    });
  });
}

function checkPads(level: LevelDef, errors: string[]): void {
  const exits = level.paths.map((p) => p[p.length - 1]).filter((p): p is Vec2 => p !== undefined);
  const segments = level.paths.flatMap(segmentsOf);
  level.pads.forEach((pad, i) => {
    const name = `pad ${i} ${fmt(pad)}`;
    if (!inRect(pad, PAD_BOUNDS)) errors.push(`${name} is outside x ∈ [50, 1230], y ∈ [100, 680]`);
    HUD_ZONES.forEach((zone, z) => {
      if (inRect(pad, zone)) errors.push(`${name} is inside HUD zone ${z}`);
    });
    const nearest = Math.min(Infinity, ...segments.map(([a, b]) => distToSegment(pad, a, b)));
    if (nearest < PAD_ROAD_CLEARANCE) errors.push(`${name} is ${nearest.toFixed(1)} px from a road (minimum ${PAD_ROAD_CLEARANCE})`);
    if (nearest > PAD_MAX_ROAD_DISTANCE) errors.push(`${name} is ${nearest.toFixed(1)} px from the nearest road (maximum ${PAD_MAX_ROAD_DISTANCE})`);
    for (const exit of exits) {
      if (dist(pad, exit) < PAD_EXIT_CLEARANCE) errors.push(`${name} is ${dist(pad, exit).toFixed(1)} px from the exit ${fmt(exit)} (minimum ${PAD_EXIT_CLEARANCE})`);
    }
    level.pads.forEach((other, j) => {
      if (j > i && dist(pad, other) < PAD_GAP) errors.push(`pads ${i} and ${j} are ${dist(pad, other).toFixed(1)} px apart (minimum ${PAD_GAP})`);
    });
  });
}

function checkWaves(level: LevelDef, errors: string[]): void {
  level.waves.forEach((wave, w) => {
    const name = `wave ${w + 1}`;
    if (wave.groups.length === 0) errors.push(`${name} has no group`);
    wave.groups.forEach((g, k) => {
      const group = `${name} group ${k} (${g.enemy})`;
      if (!Number.isInteger(g.path) || g.path < 0 || g.path >= level.paths.length) errors.push(`${group} uses path ${g.path}, which does not exist`);
      if (!Number.isInteger(g.count) || g.count < 1) errors.push(`${group} has count ${g.count} (must be an integer ≥ 1)`);
      if (!(g.interval > 0)) errors.push(`${group} has interval ${g.interval} (must be > 0)`);
      if (!(g.delay >= 0)) errors.push(`${group} has delay ${g.delay} (must be ≥ 0)`);
      const last = g.delay + (g.count - 1) * g.interval;
      if (last > MAX_WAVE_SPAWN_TIME + 1e-9) errors.push(`${group} spawns its last enemy at ${last.toFixed(1)} s (maximum ${MAX_WAVE_SPAWN_TIME} s)`);
    });
  });
}

/** Wave number (1-based) of each kind's first appearance. */
function firstAppearances(level: LevelDef): Map<EnemyKind, number> {
  const first = new Map<EnemyKind, number>();
  level.waves.forEach((wave, w) => {
    for (const g of wave.groups) if (!first.has(g.enemy)) first.set(g.enemy, w + 1);
  });
  return first;
}

function checkKinds(level: LevelDef, spec: LevelSpec, errors: string[]): void {
  const allowed = new Set(kindsOf(level.id));
  const first = firstAppearances(level);
  level.waves.forEach((wave, w) => {
    for (const g of wave.groups) {
      if (g.enemy !== 'boss' && !allowed.has(g.enemy)) errors.push(`wave ${w + 1} uses ${g.enemy}, which level ${level.id} does not have yet`);
    }
  });
  for (const kind of allowed) {
    const seen = first.get(kind);
    const intro = spec.introduces[kind];
    if (seen === undefined) errors.push(`${kind} never appears (every kind of the level must)`);
    else if (intro !== undefined && seen !== intro) errors.push(`${kind} first appears in wave ${seen}, the table introduces it in wave ${intro}`);
  }
  const bossGroups = level.waves.flatMap((wave, w) => wave.groups.map((g, k) => ({ g, w: w + 1, k })).filter(({ g }) => g.enemy === 'boss'));
  if (!spec.bosses) {
    for (const { w } of bossGroups) errors.push(`wave ${w} has a boss, but level ${level.id} has none`);
    return;
  }
  const bosses = spec.bosses;
  let total = 0;
  for (const { g, w, k } of bossGroups) {
    total += g.count;
    if (w !== bosses.wave) errors.push(`wave ${w} has a boss; bosses belong in wave ${bosses.wave} only`);
    if (g.count !== 1) errors.push(`wave ${w} group ${k} is a boss group of count ${g.count} (a boss is a group of count 1)`);
    const wave = level.waves[w - 1];
    if (bosses.alone && wave) {
      const others = wave.groups.filter((other) => other !== g);
      if (k !== wave.groups.length - 1) errors.push(`wave ${w}: the boss must be the last group`);
      const lastOther = Math.max(0, ...others.map((o) => o.delay + (o.count - 1) * o.interval));
      if (g.delay < lastOther) {
        errors.push(`wave ${w}: the boss spawns at ${g.delay.toFixed(1)} s, before the other groups finish (${lastOther.toFixed(1)} s); it must come alone`);
      }
    }
  }
  if (total !== bosses.count) errors.push(`level has ${total} boss(es), the table wants ${bosses.count} in wave ${bosses.wave}`);
}

function checkTable(level: LevelDef, spec: LevelSpec, errors: string[]): void {
  if (level.name !== spec.name) errors.push(`name is '${level.name}', the table says '${spec.name}'`);
  if (level.theme !== spec.theme) errors.push(`theme is ${level.theme}, the table says ${spec.theme}`);
  if (level.paths.length !== spec.roads) errors.push(`has ${level.paths.length} road(s), the table says ${spec.roads}`);
  if (level.pads.length !== spec.pads) errors.push(`has ${level.pads.length} pads, the table says ${spec.pads}`);
  if (level.waves.length !== spec.waves) errors.push(`has ${level.waves.length} waves, the table says ${spec.waves}`);
  const towers = new Set(level.towers);
  const sameTowers = towers.size === level.towers.length && towers.size === spec.towers.length && spec.towers.every((t) => towers.has(t));
  if (!sameTowers) errors.push(`towers are [${level.towers.join(', ')}], the table says [${spec.towers.join(', ')}]`);
  checkKinds(level, spec, errors);
}

/** Every broken constraint below as a readable message; empty when the level is valid. */
export function validateLevel(level: LevelDef): string[] {
  const errors: string[] = [];
  const spec = specOf(level.id);
  if (!spec) errors.push(`id ${level.id} is not a level of the design table (1..10)`);
  if (!Number.isInteger(level.decorSeed)) errors.push(`decorSeed ${level.decorSeed} is not an integer`);
  checkRoads(level, errors);
  checkJoins(level, errors);
  checkPads(level, errors);
  checkWaves(level, errors);
  if (spec) checkTable(level, spec, errors);
  return errors;
}

/** validateLevel for every level (messages prefixed with the level id), plus ids 1..n in order and distinct decor seeds. */
export function validateLevels(levels: readonly LevelDef[]): string[] {
  const errors: string[] = [];
  const seeds = new Map<number, number>();
  levels.forEach((level, i) => {
    if (level.id !== i + 1) errors.push(`LEVELS[${i}] has id ${level.id}, expected ${i + 1}`);
    const twin = seeds.get(level.decorSeed);
    if (twin !== undefined) errors.push(`levels ${twin} and ${level.id} share decorSeed ${level.decorSeed}`);
    seeds.set(level.decorSeed, level.id);
    for (const e of validateLevel(level)) errors.push(`level ${level.id}: ${e}`);
  });
  return errors;
}
