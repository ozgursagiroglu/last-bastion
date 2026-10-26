/** Title screen controller: animates the backdrop and title, maps PLAY and the sound toggle to menu actions. */
import type { Animation, ExodeUIEngine } from 'exodeui';
import type { Vec2 } from '../../game/types';
import { poseEnemy } from '../../art/enemies/pose';
import { poseTower } from '../../art/towers/pose';
import { poseButton } from '../../art/ui/pose';
import { distance, pointAlong } from '../../art/world/geometry';
import { loopClip, setPos, setRotation, setScale, setVisible } from '../../render/exodeRuntime';
import { Stage, type CanvasLike } from '../../render/stage';
import type { MenuAction, PointerKind } from '../types';
import { Controls } from './controls';
import { StaticStages, type MenuScreen } from './menuScreen';
import { buildTitleArt, TITLE_POS, TITLE_ROAD, type TitleArt } from './titleArt';

/** Column speed in px/s (walk clips follow the distance, so feet never slide). */
export const MARCH_SPEED = 42;
/** Spacing between marchers along the road. */
export const MARCH_GAP = 62;
/** Seconds per title bob. */
const BOB_PERIOD = 3.2;
const TOWER_RANGE = 300;
/** Radians per second a tower turns toward its target. */
const TURN_SPEED = 3;
/** The column starts this far along the road, so the first frame already shows it marching. */
const MARCH_START = 520;

const ROAD_LENGTH = TITLE_ROAD.reduce((sum, p, i) => sum + distance(TITLE_ROAD[i - 1] ?? p, p), 0);

function clipOf(clips: Readonly<Record<string, Animation>>, name: string): Animation {
  const clip = clips[name];
  if (!clip) throw new Error(`missing clip '${name}'`);
  return clip;
}

/** Distance along the road of marcher `index` at `time`, or null while it is inside the gate. */
export function marchDistance(time: number, index: number, count: number): number | null {
  const cycle = ROAD_LENGTH + count * MARCH_GAP;
  const raw = MARCH_START + time * MARCH_SPEED - index * MARCH_GAP;
  const d = ((raw % cycle) + cycle) % cycle;
  return d < ROAD_LENGTH ? d : null;
}

function turnToward(from: number, to: number, maxStep: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + Math.max(-maxStep, Math.min(maxStep, delta));
}

/** Bottom to top: the static backdrop, everything that moves, the static gate and front props. */
export interface TitleLayers {
  back: CanvasLike;
  live: CanvasLike;
  front: CanvasLike;
}

export class TitleScreen implements MenuScreen {
  private readonly stage: Stage;
  private readonly statics: StaticStages;
  private readonly art: TitleArt;
  private readonly controls: Controls;
  private readonly walks: Animation[];
  private readonly idles: Animation[];
  private readonly aims: number[];
  private time = 0;

  constructor(layers: TitleLayers) {
    this.art = buildTitleArt();
    this.statics = new StaticStages([
      { canvas: layers.back, artboard: this.art.backdrop },
      { canvas: layers.front, artboard: this.art.front },
    ]);
    this.stage = new Stage(layers.live);
    this.stage.load(this.art.artboard);
    this.controls = new Controls(this.art.regions);
    this.walks = this.art.enemies.map((e) => clipOf(e.clips, 'walk'));
    this.idles = this.art.towers.map((t) => clipOf(t.sprite.clips, 'idle'));
    this.aims = this.art.towers.map(() => 0.4);
    for (const e of this.art.enemies) poseEnemy(this.stage.engine, e, { facingLeft: false, hpRatio: 1, showHp: false, slowed: false, shieldRatio: 0 });
    this.pose(0, true);
  }

  /** The loaded engine (tests and galleries read object state from it). */
  get engine(): ExodeUIEngine {
    return this.stage.engine;
  }

  /** Times the static layers were drawn (once per backing-store size change, never per frame). */
  get staticDraws(): number {
    return this.statics.draws;
  }

  /** The pointer is over PLAY. */
  get playHovered(): boolean {
    return this.controls.hovered === 'play';
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.stage.resize(cssWidth, cssHeight, devicePixelRatio);
    this.statics.resize(cssWidth, cssHeight, devicePixelRatio);
  }

  pointer(kind: PointerKind, p: Vec2): MenuAction | null {
    const id = this.controls.pointer(kind, p);
    if (id === 'play') return { type: 'goto', screen: 'levels' };
    if (id === 'sound') return { type: 'toggleSound' };
    return null;
  }

  key(key: string): MenuAction | null {
    return key === 'Enter' || key === ' ' ? { type: 'goto', screen: 'levels' } : null;
  }

  render(dt: number, soundOn: boolean): void {
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    this.time += step;
    this.pose(step, soundOn);
    this.stage.render();
  }

  private pose(dt: number, soundOn: boolean): void {
    const engine = this.stage.engine;
    const t = this.time;
    const phase = (t / BOB_PERIOD) * Math.PI * 2;
    setPos(engine, this.art.titleId, TITLE_POS.x, TITLE_POS.y + Math.sin(phase) * 7);
    setRotation(engine, this.art.titleId, Math.sin(phase * 0.5) * 1.2);

    const marchers: Vec2[] = [];
    this.art.enemies.forEach((enemy, i) => {
      const d = marchDistance(t, i, this.art.enemies.length);
      setVisible(engine, enemy.rootId, d !== null);
      if (d === null) return;
      const { at } = pointAlong(TITLE_ROAD, d);
      setPos(engine, enemy.rootId, at.x, at.y);
      const walk = this.walks[i];
      if (walk) loopClip(engine, walk, (d / enemy.stride) * walk.duration);
      marchers.push(at);
    });

    this.art.towers.forEach((tower, i) => {
      const idle = this.idles[i];
      if (idle) loopClip(engine, idle, t + i * 0.7);
      const target = marchers
        .filter((m) => distance(m, tower.pos) <= TOWER_RANGE)
        .sort((a, b) => distance(a, tower.pos) - distance(b, tower.pos))[0];
      const current = this.aims[i] ?? 0;
      const aim = target ? turnToward(current, Math.atan2(target.y - tower.pos.y, target.x - tower.pos.x), TURN_SPEED * dt) : current;
      this.aims[i] = aim;
      poseTower(engine, tower.sprite, tower.level, aim);
    });

    const play = this.controls.state('play');
    poseButton(engine, this.art.play, play);
    if (play === 'normal') setScale(engine, this.art.play.groupId, 1 + Math.sin(phase * 1.5) * 0.025);
    setVisible(engine, this.art.soundOn.groupId, soundOn);
    setVisible(engine, this.art.soundOff.groupId, !soundOn);
    poseButton(engine, soundOn ? this.art.soundOn : this.art.soundOff, this.controls.state('sound'));
  }
}
