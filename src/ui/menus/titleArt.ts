/**
 * Title screen artboard (pure): a meadow with a road to a castle gate, towers on pads, a marching column of goblins and
 * a troll, the bobbing "LAST BASTION" title, the PLAY button and the sound toggle.
 */
import type { Artboard } from 'exodeui';
import { DESIGN_HEIGHT, DESIGN_WIDTH, PATH_WIDTH, type EnemyKind, type TowerKind, type TowerLevel, type Vec2 } from '../../game/types';
import { clipsOf, linear, makeArtboard, placeRoot, radial, solid, SpriteBuilder, type SpriteInstance } from '../../art/exode';
import { buildEnemySprite } from '../../art/enemies';
import { buildTowerSprite } from '../../art/towers';
import type { EnemySprite, TowerSprite } from '../../art/types';
import { circleRegion, rectRegion, type HitRegion } from '../../art/ui/hit';
import { addButton, addRoundButton, TEXT, type ButtonParts } from '../../art/ui/kit';
import { addLabel } from '../../art/ui/text';
import { OUTLINE, PALETTE } from '../../art/palette';
import { distanceToPaths, roundedRoadPoints } from '../../art/world/geometry';
import { addCastleGate, addDecor, addPad } from '../../art/world/parts';
import { createRng } from '../../art/world/rng';
import { ellipsePoints } from '../../art/world/shapes';
import { THEMES } from '../../art/world/themes';
import { addPatches, addRoad, tuftPoints } from './ground';

/** The marching road, from off the left edge to the castle door. */
export const TITLE_ROAD: readonly Vec2[] = [
  { x: -90, y: 590 },
  { x: 160, y: 594 },
  { x: 360, y: 632 },
  { x: 580, y: 614 },
  { x: 800, y: 572 },
  { x: 990, y: 560 },
  { x: 1120, y: 556 },
];

const GATE = { x: 1120, y: 562, scale: 1.45 };
export const TITLE_POS: Vec2 = { x: 640, y: 150 };
export const PLAY_BUTTON = { x: 640, y: 392, w: 290, h: 94 };
export const SOUND_BUTTON = { x: 1212, y: 66, r: 36 };

export interface TitleTower {
  sprite: TowerSprite;
  level: TowerLevel;
  pos: Vec2;
}

const TOWERS: readonly { kind: TowerKind; level: TowerLevel; x: number; y: number }[] = [
  { kind: 'cannon', level: 2, x: 215, y: 484 },
  { kind: 'rifle', level: 3, x: 880, y: 462 },
  { kind: 'frost', level: 2, x: 560, y: 684 },
];

/** Front to back of the column: goblins with the troll bringing up the rear. */
export const MARCH: readonly EnemyKind[] = ['grunt', 'grunt', 'grunt', 'grunt', 'grunt', 'brute'];

type Decor = readonly [kind: string, x: number, y: number, scale?: number];

/** Props behind the marching column (above the road). */
const BACK_DECOR: readonly Decor[] = [
  ['meadow.tree', 58, 132, 1.3],
  ['meadow.tree', 150, 250, 1.15],
  ['meadow.bush', 44, 350],
  ['meadow.rock', 330, 430],
  ['meadow.flowers', 470, 500],
  ['meadow.flowers', 760, 486],
  ['meadow.bush', 1010, 330],
  ['meadow.tree', 1176, 214, 1.2],
  ['meadow.tree', 1250, 352, 1.1],
  ['meadow.stump', 112, 520],
  ['meadow.flowers', 1236, 470],
];

/** Props in front of the column (below the road). */
const FRONT_DECOR: readonly Decor[] = [
  ['meadow.flowers', 118, 690],
  ['meadow.bush', 320, 708],
  ['meadow.rock', 830, 690],
  ['meadow.tree', 1000, 712, 1.1],
  ['meadow.bush', 1232, 690],
  ['meadow.flowers', 1120, 660],
];

/** King Sunny's portrait: left of the title and PLAY, above the cannon tower and the road. */
export const TITLE_MASCOT = { x: 130, y: 268, size: 250 } as const;

/**
 * Three stacked artboards: `backdrop` (meadow, road, back props, pads) and `front` (gate and front props, drawn over the
 * column) never change and are drawn once per resize; `artboard` holds everything that moves, on a transparent board.
 */
export interface TitleArt {
  backdrop: Artboard;
  artboard: Artboard;
  front: Artboard;
  /** Bobbing group holding the title and subtitle. */
  titleId: string;
  play: ButtonParts;
  soundOn: ButtonParts;
  soundOff: ButtonParts;
  towers: TitleTower[];
  enemies: EnemySprite[];
  regions: HitRegion[];
}

function addMeadow(b: SpriteBuilder): void {
  const theme = 'meadow';
  const rng = createRng(0x7173);
  b.rect('ground', DESIGN_WIDTH, DESIGN_HEIGHT, { x: DESIGN_WIDTH / 2, y: DESIGN_HEIGHT / 2, fill: linear([[0, THEMES[theme].ground.light], [1, THEMES[theme].ground.dark]]) });
  addPatches(b, 'patch', theme, { x0: -60, x1: DESIGN_WIDTH + 60, y0: 0, y1: DESIGN_HEIGHT }, 14, rng);
  const road = [TITLE_ROAD.map((p) => ({ ...p }))];
  const spots: Vec2[] = [];
  while (spots.length < 90) {
    const p = { x: rng.range(10, DESIGN_WIDTH - 10), y: rng.range(10, DESIGN_HEIGHT - 4) };
    if (distanceToPaths(p, road) > PATH_WIDTH / 2 + 8) spots.push(p);
  }
  b.path('tuftsDark', spots.slice(0, 50).flatMap((p) => tuftPoints(p, rng.range(0.8, 1.2))), { stroke: { color: '#3f7a2a', width: 2.2 } });
  b.path('tuftsLight', spots.slice(50, 70).flatMap((p) => tuftPoints(p, rng.range(0.7, 1))), { stroke: { color: '#b8e880', width: 2 } });
  b.path('flowersWhite', spots.slice(70, 80).flatMap((p) => ellipsePoints(p.x, p.y, 2.4)), { fill: '#ffffff' });
  b.path('flowersYellow', spots.slice(80).flatMap((p) => ellipsePoints(p.x, p.y, 2.4)), { fill: '#ffd84a' });
  addRoad(b, 'road', roundedRoadPoints(TITLE_ROAD, 60), theme);
}

function addProps(b: SpriteBuilder, prefix: string, decor: readonly Decor[]): void {
  [...decor].sort((a, c) => a[2] - c[2]).forEach(([kind, x, y, scale], i) => addDecor(b, `${prefix}${i}`, kind, x, y, scale ?? 1));
}

function buildBackdrop(): SpriteInstance {
  const b = new SpriteBuilder('title-bg');
  addMeadow(b);
  addProps(b, 'back', BACK_DECOR);
  TOWERS.forEach((t, i) => addPad(b, `pad${i}`, t.x, t.y, 'meadow'));
  return b.build();
}

function buildFront(): SpriteInstance {
  const b = new SpriteBuilder('title-front');
  b.group('gate', { x: GATE.x, y: GATE.y, scale: GATE.scale });
  addCastleGate(b, 'gate.house', 0, 0, 'gate');
  addProps(b, 'front', FRONT_DECOR);
  return b.build();
}

interface UiParts {
  sprite: SpriteInstance;
  titleId: string;
  play: ButtonParts;
  soundOn: ButtonParts;
  soundOff: ButtonParts;
}

function buildUi(): UiParts {
  const b = new SpriteBuilder('title-ui');
  b.ellipse('shade', 1000, 330, { x: TITLE_POS.x, y: TITLE_POS.y + 40, fill: radial([[0, '#000000', 0.4], [0.6, '#000000', 0.22], [1, '#000000', 0]]) });
  const titleId = b.group('title', { x: TITLE_POS.x, y: TITLE_POS.y });
  b.rect('title.ribbon', 420, 58, { y: 92, radius: 10, fill: linear([[0, PALETTE.red.light], [1, PALETTE.red.dark]]), stroke: { color: OUTLINE, width: 3 } }, 'title');
  b.rect('title.ribbonShine', 396, 8, { y: 72, radius: 4, fill: solid('#ffffff', 0.3) }, 'title');
  addLabel(b, 'title.sub', 'TOWER DEFENSE', TEXT.heading, { y: 92, size: 38 }, 'title');
  addLabel(b, 'title.name', 'LAST BASTION', TEXT.title, { size: 120 }, 'title');
  const play = addButton(b, 'play', { ...PLAY_BUTTON, variant: 'gold', label: 'PLAY', icon: 'play', labelSize: 46 });
  const sound = { x: SOUND_BUTTON.x, y: SOUND_BUTTON.y, r: SOUND_BUTTON.r, variant: 'blue' as const };
  const soundOn = addRoundButton(b, 'soundOn', { ...sound, icon: 'soundOn' });
  const soundOff = addRoundButton(b, 'soundOff', { ...sound, icon: 'soundOff' });
  return { sprite: b.build(), titleId, play, soundOn, soundOff };
}

export function buildTitleArt(): TitleArt {
  const towers: TitleTower[] = TOWERS.map((t, i) => ({
    sprite: placeRoot(buildTowerSprite(t.kind, `title-tower${i}`), t.x, t.y),
    level: t.level,
    pos: { x: t.x, y: t.y },
  }));
  const start = TITLE_ROAD[0] ?? { x: 0, y: 0 };
  const enemies = MARCH.map((kind, i) => placeRoot(buildEnemySprite(kind, `title-enemy${i}`), start.x, start.y));
  const ui = buildUi();
  const behind = towers.filter((t) => t.pos.y < 560);
  // The tower below the road stands clear of the front props, so it can live under the static front layer.
  const inFront = towers.filter((t) => t.pos.y >= 560);
  const sprites: SpriteInstance[] = [...behind.map((t) => t.sprite), ...enemies, ...inFront.map((t) => t.sprite), ui.sprite];
  return {
    backdrop: makeArtboard('menus-title-back', buildBackdrop().objects, { background: THEMES.meadow.ground.dark }),
    artboard: makeArtboard('menus-title', sprites.flatMap((s) => s.objects), {
      background: null,
      animations: clipsOf([...towers.map((t) => t.sprite), ...enemies]),
    }),
    front: makeArtboard('menus-title-front', buildFront().objects, { background: null }),
    titleId: ui.titleId,
    play: ui.play,
    soundOn: ui.soundOn,
    soundOff: ui.soundOff,
    towers,
    enemies,
    regions: [
      rectRegion('play', PLAY_BUTTON.x, PLAY_BUTTON.y, PLAY_BUTTON.w, PLAY_BUTTON.h),
      circleRegion('sound', SOUND_BUTTON.x, SOUND_BUTTON.y, SOUND_BUTTON.r),
    ],
  };
}
