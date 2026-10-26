/**
 * Level select artboard (pure): the themed world map with the trail and ten level nodes, difficulty tabs, BACK, and
 * the info panel on the right. Everything the controller changes exists once here; it shows, hides and moves it.
 */
import type { Artboard } from 'exodeui';
import { DIFFICULTY } from '../../game/config';
import { DESIGN_HEIGHT, DESIGN_WIDTH, DIFFICULTIES, TOWER_KINDS, type Difficulty, type LevelDef, type TowerKind, type Vec2 } from '../../game/types';
import { linear, makeArtboard, placeRoot, radial, solid, SpriteBuilder, type SpriteInstance } from '../../art/exode';
import { OUTLINE, PALETTE } from '../../art/palette';
import { buildTowerIcon } from '../../art/towers';
import { circleRegion, rectRegion, type HitRegion } from '../../art/ui/hit';
import { addIcon } from '../../art/ui/icons';
import { addButton, addPanel, addStars, TEXT, type ButtonParts } from '../../art/ui/kit';
import { addLabel } from '../../art/ui/text';
import { addDecor } from '../../art/world/parts';
import { createRng } from '../../art/world/rng';
import { THEMES } from '../../art/world/themes';
import { addPatches } from './ground';
import { mapRegions, MAP_TOP, MAP_WIDTH, NODE_RADIUS, NODE_STARS_DY, nodePositions, regionDecor, regionOutline, sampleTrail, trailPoints } from './mapLayout';

export const PANEL = { x: 1103, y: 362, w: 334, h: 676 };
export const BACK_BUTTON = { x: 84, y: 46, w: 136, h: 54 };
export const TAB = { y: 46, w: 140, h: 52, x0: 350, step: 152 };
/** PLAY in the panel, relative to the panel center. */
export const PANEL_PLAY = { dy: 262, w: 250, h: 78 };
export const SLOT = { dy: -74, size: 54, step: 58 };
/** Tower icons are scaled from the 56 px build-menu box to fit a slot. */
export const SLOT_ICON_SCALE = 0.82;
const STAR_ROWS = { dy: 40, step: 52 };

type Stars = { groupIds: string[]; filledIds: string[]; emptyIds: string[] };

export interface NodeParts {
  levelId: number;
  pos: Vec2;
  /** Region id 'node:<levelId>'. */
  controlId: string;
  badgeId: string;
  litId: string;
  lockedId: string;
  starsId: string;
  stars: Stars;
}

export interface PanelParts {
  levelIds: string[];
  nameIds: string[];
  themeIds: string[];
  swatchId: string;
  wavesIds: string[];
  slotIds: string[];
  /** Root ids of the tower icon sprites, in design coords. */
  iconIds: Record<TowerKind, string>;
  rowHighlightId: string;
  rowStars: Record<Difficulty, Stars>;
  play: ButtonParts;
}

/**
 * King Sunny's portrait over the info panel's top-left corner. The panel header sits right of center to clear it.
 */
export const LEVELS_MASCOT = { x: 932, y: 94, size: 140 } as const;
const HEADER_DX = 30;
const THEME_ROW_DX = 12;

/**
 * Two stacked artboards: `backdrop` (map, trail, top bar, the info panel's frame) never changes and is drawn once per
 * resize; `artboard` holds nodes, selection, buttons and panel content on a transparent board.
 */
export interface LevelSelectArt {
  backdrop: Artboard;
  artboard: Artboard;
  nodes: NodeParts[];
  selectId: string;
  pointerId: string;
  tabs: Record<Difficulty, { on: ButtonParts; off: ButtonParts }>;
  back: ButtonParts;
  panel: PanelParts;
  regions: HitRegion[];
}

export const tabX = (i: number) => TAB.x0 + i * TAB.step;
export const rowY = (i: number) => PANEL.y + STAR_ROWS.dy + i * STAR_ROWS.step;

const TRAIL = { edge: '#5a3a1e', fill: '#ecd6a2', dash: '#b08850' };
const LOCKED = { light: '#a7a5a0', dark: '#57544f' };

/** '#rrggbb' scaled toward black by `factor` (0..1). */
export function darken(color: string, factor: number): string {
  const n = Number.parseInt(color.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 0xff) * factor).toString(16).padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

export function themeName(theme: string): string {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

function addMap(b: SpriteBuilder, levels: readonly LevelDef[], nodes: readonly Vec2[]): void {
  const regions = mapRegions(levels, nodes);
  const trail = trailPoints(nodes);
  const sampled = sampleTrail(trail);
  regions.forEach((region, i) => {
    const ground = THEMES[region.theme].ground;
    const fill = linear([[0, ground.light], [1, ground.dark]]);
    if (i === 0) b.rect(`region${i}`, DESIGN_WIDTH, DESIGN_HEIGHT, { x: DESIGN_WIDTH / 2, y: DESIGN_HEIGHT / 2, fill });
    else b.path(`region${i}`, regionOutline(region, i), { closed: true, fill, stroke: { color: OUTLINE, width: 3, opacity: 0.35 } });
    addPatches(b, `region${i}.patch`, region.theme, { x0: region.x0 + 20, x1: region.x1 - 20, y0: MAP_TOP, y1: DESIGN_HEIGHT }, 6, createRng(0x9e37 + i));
  });
  regions.forEach((region, i) => {
    regionDecor(region, i, sampled, nodes).forEach((d, j) => addDecor(b, `decor${i}-${j}`, d.kind, d.x, d.y));
  });
  b.path('trailEdge', trail, { stroke: { color: TRAIL.edge, width: 22 } });
  b.path('trailFill', trail, { stroke: { color: TRAIL.fill, width: 13 } });
  b.path('trailDash', trail, { stroke: { color: TRAIL.dash, width: 3, dash: [3, 12] } });
}

function addNode(b: SpriteBuilder, level: LevelDef, pos: Vec2): NodeParts {
  const n = `node${level.id}`;
  const accent = THEMES[level.theme].accent;
  b.group(n, { x: pos.x, y: pos.y });
  b.ellipse(`${n}.shadow`, NODE_RADIUS * 2 + 6, 18, { y: NODE_RADIUS - 4, fill: solid('#000000', 0.3) }, n);
  const badgeId = b.group(`${n}.badge`, {}, n);
  const litId = b.group(`${n}.lit`, {}, `${n}.badge`);
  b.circle(`${n}.lit.ring`, NODE_RADIUS, { fill: linear([[0, accent], [1, darken(accent, 0.5)]]), stroke: { color: OUTLINE, width: 3 } }, `${n}.lit`);
  b.circle(`${n}.lit.face`, NODE_RADIUS - 7, { fill: linear([[0, PALETTE.gold.light], [1, PALETTE.gold.dark]]), stroke: { color: OUTLINE, width: 2 } }, `${n}.lit`);
  b.ellipse(`${n}.lit.shine`, 22, 9, { y: -11, fill: solid('#ffffff', 0.35) }, `${n}.lit`);
  addLabel(b, `${n}.lit.num`, String(level.id), TEXT.button, { size: level.id >= 10 ? 21 : 24 }, `${n}.lit`);
  const lockedId = b.group(`${n}.locked`, { visible: false }, `${n}.badge`);
  b.circle(`${n}.locked.disk`, NODE_RADIUS - 2, { fill: linear([[0, LOCKED.light], [1, LOCKED.dark]]), stroke: { color: OUTLINE, width: 3 } }, `${n}.locked`);
  addIcon(b, `${n}.locked.icon`, 'lock', { size: 28, y: 1 }, `${n}.locked`);
  const starsId = b.group(`${n}.starsBox`, { y: NODE_STARS_DY }, n);
  b.rect(`${n}.starsBox.bg`, 66, 24, { radius: 12, fill: solid('#120d0a', 0.45) }, `${n}.starsBox`);
  const stars = addStars(b, `${n}.starsBox.stars`, { count: 3, size: 19, gap: 2 }, `${n}.starsBox`);
  return { levelId: level.id, pos, controlId: `node:${level.id}`, badgeId, litId, lockedId, starsId, stars };
}

function addSelection(b: SpriteBuilder): string {
  const id = b.group('select', { visible: false });
  b.circle('select.glow', NODE_RADIUS + 24, { fill: radial([[0, PALETTE.gold.light, 0.75], [0.6, PALETTE.gold.light, 0.35], [1, PALETTE.gold.light, 0]]), blend: 'lighter' }, 'select');
  b.circle('select.ring', NODE_RADIUS + 7, { stroke: { color: '#fff3b0', width: 4 } }, 'select');
  return id;
}

function addPointer(b: SpriteBuilder): string {
  const id = b.group('pointer', { visible: false });
  b.triangle('pointer.arrow', 26, 20, { rotation: 180, fill: linear([[0, PALETTE.gold.dark], [1, PALETTE.gold.light]]), stroke: { color: OUTLINE, width: 3, join: 'round' } }, 'pointer');
  return id;
}

/** The info panel's content, under a plain group at the panel center (its frame is on the static layer). */
function addInfoPanel(b: SpriteBuilder): Omit<PanelParts, 'iconIds'> {
  const p = 'panel';
  b.group(p, { x: PANEL.x, y: PANEL.y });
  const gold = PALETTE.gold.light;
  const levelIds = addLabel(b, `${p}.level`, 'LEVEL 1', TEXT.body, { x: HEADER_DX, y: -296, fill: gold, width: 300 }, p).textIds;
  const nameIds = addLabel(b, `${p}.name`, 'Level', TEXT.heading, { x: HEADER_DX, y: -258, size: 30, width: 320 }, p).textIds;
  const row = { y: -214, dx: THEME_ROW_DX };
  const swatchId = b.circle(`${p}.swatch`, 8, { x: -104 + row.dx, y: row.y, fill: '#ffffff', stroke: { color: OUTLINE, width: 2.5 } }, p);
  const themeIds = addLabel(b, `${p}.theme`, 'Meadow', TEXT.body, { x: -88 + row.dx, y: row.y, align: 'left', width: 220 }, p).textIds;
  addIcon(b, `${p}.wavesIcon`, 'swords', { size: 24, x: 36 + row.dx, y: row.y }, p);
  const wavesIds = addLabel(b, `${p}.waves`, '0 waves', TEXT.body, { x: 52 + row.dx, y: row.y, align: 'left', width: 120 }, p).textIds;
  b.rect(`${p}.rule1`, 280, 3, { y: -184, radius: 1.5, fill: solid(OUTLINE, 0.5) }, p);
  addLabel(b, `${p}.towersTitle`, 'TOWERS', TEXT.body, { y: -150, fill: gold }, p);
  const slotIds = TOWER_KINDS.map((kind, i) =>
    b.rect(`${p}.slot${i}`, SLOT.size, SLOT.size, { x: (i - 2) * SLOT.step, y: SLOT.dy, radius: 10, fill: solid('#2a170a', 0.55), stroke: { color: OUTLINE, width: 2 } }, p),
  );
  b.rect(`${p}.rule2`, 280, 3, { y: -26, radius: 1.5, fill: solid(OUTLINE, 0.5) }, p);
  addLabel(b, `${p}.bestTitle`, 'BEST', TEXT.body, { y: 2, fill: gold }, p);
  const rowHighlightId = b.rect(`${p}.rowHi`, 290, 46, { y: STAR_ROWS.dy, radius: 12, fill: solid(PALETTE.gold.light, 0.22), stroke: { color: PALETTE.gold.light, width: 2.5 } }, p);
  const rowStars = {} as Record<Difficulty, Stars>;
  DIFFICULTIES.forEach((d, i) => {
    const y = STAR_ROWS.dy + i * STAR_ROWS.step;
    addLabel(b, `${p}.row-${d}`, DIFFICULTY[d].name, TEXT.body, { x: -128, y, size: 21, align: 'left', width: 160 }, p);
    rowStars[d] = addStars(b, `${p}.stars-${d}`, { count: 3, size: 30, x: 72, y }, p);
  });
  const play = addButton(b, `${p}.play`, { y: PANEL_PLAY.dy, w: PANEL_PLAY.w, h: PANEL_PLAY.h, variant: 'green', label: 'PLAY', icon: 'play', labelSize: 36 }, p);
  return { levelIds, nameIds, themeIds, swatchId, wavesIds, slotIds, rowHighlightId, rowStars, play };
}

function buildUi(): { sprite: SpriteInstance; tabs: LevelSelectArt['tabs']; back: ButtonParts; panel: Omit<PanelParts, 'iconIds'> } {
  const b = new SpriteBuilder('ls-ui');
  const back = addButton(b, 'back', { ...BACK_BUTTON, variant: 'red', label: 'BACK', icon: 'home' });
  const tabs = {} as LevelSelectArt['tabs'];
  DIFFICULTIES.forEach((d, i) => {
    const at = { x: tabX(i), y: TAB.y, w: TAB.w, h: TAB.h, label: DIFFICULTY[d].name };
    tabs[d] = { on: addButton(b, `tab-${d}-on`, { ...at, variant: 'gold' }), off: addButton(b, `tab-${d}-off`, { ...at, variant: 'stone' }) };
  });
  const panel = addInfoPanel(b);
  return { sprite: b.build(), tabs, back, panel };
}

function buildBackdrop(levels: readonly LevelDef[], positions: readonly Vec2[]): SpriteInstance {
  const b = new SpriteBuilder('ls-back');
  addMap(b, levels, positions);
  b.rect('topBar', MAP_WIDTH + 40, 92, { x: (MAP_WIDTH + 40) / 2 - 20, y: 36, radius: 20, fill: solid('#120d0a', 0.5) });
  addPanel(b, 'panel', { ...PANEL, variant: 'wood' });
  return b.build();
}

export function buildLevelSelectArt(levels: readonly LevelDef[]): LevelSelectArt {
  const positions = nodePositions(levels.length);
  const map = new SpriteBuilder('ls-map');
  const selectId = addSelection(map);
  const nodes = levels.map((level, i) => addNode(map, level, positions[i] ?? { x: 0, y: 0 }));
  const pointerId = addPointer(map);
  const ui = buildUi();
  const icons = TOWER_KINDS.map((kind, i) => ({
    kind,
    sprite: placeRoot(buildTowerIcon(kind, `ls-icon-${kind}`), PANEL.x + (i - 2) * SLOT.step, PANEL.y + SLOT.dy, SLOT_ICON_SCALE),
  }));
  const iconIds = Object.fromEntries(icons.map((i) => [i.kind, i.sprite.rootId])) as Record<TowerKind, string>;
  const regions: HitRegion[] = [
    ...nodes.map((n) => circleRegion(n.controlId, n.pos.x, n.pos.y, NODE_RADIUS + 6)),
    rectRegion('back', BACK_BUTTON.x, BACK_BUTTON.y, BACK_BUTTON.w, BACK_BUTTON.h),
    ...DIFFICULTIES.map((d, i) => rectRegion(`tab:${d}`, tabX(i), TAB.y, TAB.w, TAB.h)),
    rectRegion('play', PANEL.x, PANEL.y + PANEL_PLAY.dy, PANEL_PLAY.w, PANEL_PLAY.h),
  ];
  const objects = [map.build(), ui.sprite, ...icons.map((i) => i.sprite)].flatMap((s) => s.objects);
  return {
    backdrop: makeArtboard('menus-levels-back', buildBackdrop(levels, positions).objects, { background: '#1d140e' }),
    artboard: makeArtboard('menus-levels', objects, { background: null }),
    nodes,
    selectId,
    pointerId,
    tabs: ui.tabs,
    back: ui.back,
    panel: { ...ui.panel, iconIds },
    regions,
  };
}
