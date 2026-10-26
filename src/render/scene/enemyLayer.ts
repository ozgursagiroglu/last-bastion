/**
 * Enemy pools: a slot per live enemy id, posed from the view every frame, then kept for its 'die' clip after a kill.
 */
import type { ExodeUIEngine } from 'exodeui';
import { buildEnemySprite } from '../../art/enemies';
import { poseEnemy, type EnemyPose } from '../../art/enemies/pose';
import type { EnemySprite } from '../../art/types';
import { ENEMIES } from '../../game/config';
import type { EnemyKind, EnemyState, Vec2 } from '../../game/types';
import { setPos, setVisible, setZ } from '../exodeRuntime';
import { bakeSprite, bindClip, loopBaked, playBaked, type BoundClip } from './bakedClips';
import { clipTimeSince, initialFacingLeft, nextFacingLeft, walkTime } from './motion';
import { enemyPrefix } from './pools';
import { SlotPool } from './slots';

/** Flyers draw above every ground unit and tower. */
export const FLYER_Z = 2000;

export function enemyZ(kind: EnemyKind, y: number): number {
  return ENEMIES[kind].flying ? FLYER_Z + y : y;
}

interface Clips {
  walk: BoundClip;
  hit: BoundClip;
  die: BoundClip;
}

interface EnemyPool {
  sprites: EnemySprite[];
  clips: Clips[];
  slots: SlotPool;
}

interface EnemyEntry {
  id: number;
  kind: EnemyKind;
  sprite: EnemySprite;
  clips: Clips;
  /** Shown and reset to the rest pose since it took the slot. */
  active: boolean;
  facingLeft: boolean;
  /** 'hit' was applied last frame, so its rest pose must be restored once it ends. */
  hitActive: boolean;
  /** Seconds into 'die', or null while alive. */
  dying: number | null;
  /** Path index from the last view state (for the leak effect). */
  path: number;
  /** The pose last written by poseEnemy, or null before the first one; unchanged poses are not rewritten. */
  pose: EnemyPose | null;
}

function samePose(a: EnemyPose, b: EnemyPose): boolean {
  return a.facingLeft === b.facingLeft && a.hpRatio === b.hpRatio && a.showHp === b.showHp && a.slowed === b.slowed && a.shieldRatio === b.shieldRatio;
}

/** The walk, hit and die clips of a kind, baked once and bound to every instance of its pool. */
function poolClips(sprites: readonly EnemySprite[]): Clips[] {
  const first = sprites[0];
  if (!first) return [];
  const { walk, hit, die } = bakeSprite(first);
  if (!walk || !hit || !die) throw new Error(`Enemy ${first.kind} lacks a walk, hit or die clip`);
  return sprites.map((s) => ({ walk: bindClip(walk, s.rootId), hit: bindClip(hit, s.rootId), die: bindClip(die, s.rootId) }));
}

const durationOf = (bound: BoundClip): number => bound.clip.duration;

export class EnemyLayer {
  private readonly pools = new Map<EnemyKind, EnemyPool>();
  private readonly entries = new Map<number, EnemyEntry>();
  /** The pose being built for the current enemy (reused, so unchanged poses allocate nothing). */
  private readonly scratch: EnemyPose = { facingLeft: false, hpRatio: 1, showHp: false, slowed: false, shieldRatio: 0 };
  /** Enemies of the last sync that found no free slot (not drawn). */
  dropped = 0;

  constructor(
    private readonly engine: ExodeUIEngine,
    sizes: Partial<Record<EnemyKind, number>>,
  ) {
    for (const [kind, size] of Object.entries(sizes) as [EnemyKind, number][]) {
      const sprites: EnemySprite[] = [];
      for (let i = 0; i < size; i++) {
        const sprite = buildEnemySprite(kind, enemyPrefix(kind, i));
        const root = sprite.objects[0];
        if (root) root.visible = false;
        sprites.push(sprite);
      }
      this.pools.set(kind, { sprites, clips: poolClips(sprites), slots: new SlotPool(size) });
    }
  }

  /** The sprites of each kind's pool, by slot. */
  poolSprites(): EnemySprite[][] {
    return [...this.pools.values()].map((p) => p.sprites);
  }

  /** Height above the ground point of a kind's sprite (0 without a pool). */
  heightOf(kind: EnemyKind): number {
    return this.pools.get(kind)?.sprites[0]?.height ?? 0;
  }

  /** Assigns a slot to a new enemy; it is shown at the next sync. */
  spawn(id: number, kind: EnemyKind, path: number): void {
    const entry = this.entry(id, kind);
    if (entry) entry.path = path;
  }

  /** Path index of an enemy from its last view state. */
  pathOf(id: number): number | undefined {
    return this.entries.get(id)?.path;
  }

  /** Starts the 'die' clip at `pos` (the slot keeps its pose otherwise). */
  kill(id: number, kind: EnemyKind, pos: Vec2): void {
    const entry = this.entry(id, kind);
    if (!entry || entry.dying !== null) return;
    const engine = this.engine;
    if (!entry.active) {
      this.activate(entry, 0);
      poseEnemy(engine, entry.sprite, { facingLeft: false, hpRatio: 1, showHp: false, slowed: false, shieldRatio: 0 });
    }
    if (entry.hitActive) playBaked(engine, entry.clips.hit, durationOf(entry.clips.hit));
    entry.hitActive = false;
    setVisible(engine, entry.sprite.hpBar.groupId, false);
    setPos(engine, entry.sprite.rootId, pos.x, pos.y);
    setZ(engine, entry.sprite.rootId, enemyZ(kind, pos.y));
    entry.dying = 0;
  }

  /** Hides and frees an enemy that left the board; returns its last path index. */
  leak(id: number): number | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    this.free(entry);
    return entry.path;
  }

  /** Pose every enemy of the view, advance dying bodies by dt, and free slots of enemies that vanished. */
  sync(enemies: readonly EnemyState[], worldTime: number, dt: number): void {
    this.dropped = 0;
    const engine = this.engine;
    const live = new Set<number>();
    for (const e of enemies) live.add(e.id);
    for (const entry of this.entries.values()) {
      if (entry.dying === null && !live.has(entry.id)) this.free(entry);
    }
    for (const e of enemies) {
      const entry = this.entry(e.id, e.kind);
      if (!entry) {
        this.dropped++;
        continue;
      }
      if (entry.dying !== null) continue;
      if (!entry.active) this.activate(entry, e.heading);
      else entry.facingLeft = nextFacingLeft(entry.facingLeft, e.heading);
      entry.path = e.path;
      const { sprite, clips } = entry;
      setPos(engine, sprite.rootId, e.pos.x, e.pos.y);
      setZ(engine, sprite.rootId, enemyZ(e.kind, e.pos.y));
      const pose = this.scratch;
      pose.facingLeft = entry.facingLeft;
      pose.hpRatio = e.maxHp > 0 ? e.hp / e.maxHp : 0;
      pose.showHp = e.hp < e.maxHp || e.shield < e.maxShield;
      pose.slowed = e.slowTimer > 0;
      pose.shieldRatio = e.maxShield > 0 ? e.shield / e.maxShield : 0;
      if (!entry.pose || !samePose(entry.pose, pose)) {
        poseEnemy(engine, sprite, pose);
        entry.pose = { ...pose };
      }
      loopBaked(engine, clips.walk, walkTime(e.distance, sprite.stride, durationOf(clips.walk)));
      const hitT = clipTimeSince(worldTime, e.lastHitAt, durationOf(clips.hit));
      if (hitT !== null) {
        playBaked(engine, clips.hit, hitT);
        entry.hitActive = true;
      } else if (entry.hitActive) {
        playBaked(engine, clips.hit, durationOf(clips.hit));
        entry.hitActive = false;
      }
    }
    for (const entry of this.entries.values()) {
      if (entry.dying === null) continue;
      entry.dying += dt;
      playBaked(engine, entry.clips.die, entry.dying);
      if (entry.dying >= durationOf(entry.clips.die)) this.free(entry);
    }
  }

  /** Enemy id → root id of enemies drawn alive (not dying). */
  aliveIds(): Map<number, string> {
    const out = new Map<number, string>();
    for (const entry of this.entries.values()) if (entry.dying === null && entry.active) out.set(entry.id, entry.sprite.rootId);
    return out;
  }

  /** Enemy id → root id of bodies playing 'die'. */
  dyingIds(): Map<number, string> {
    const out = new Map<number, string>();
    for (const entry of this.entries.values()) if (entry.dying !== null) out.set(entry.id, entry.sprite.rootId);
    return out;
  }

  rootOf(id: number): string | undefined {
    return this.entries.get(id)?.sprite.rootId;
  }

  private entry(id: number, kind: EnemyKind): EnemyEntry | undefined {
    const known = this.entries.get(id);
    if (known) return known;
    const pool = this.pools.get(kind);
    const slot = pool?.slots.acquire(id);
    if (!pool || slot === undefined) return undefined;
    const sprite = pool.sprites[slot];
    const clips = pool.clips[slot];
    if (!sprite || !clips) return undefined;
    const entry: EnemyEntry = { id, kind, sprite, clips, active: false, facingLeft: false, hitActive: false, dying: null, path: 0, pose: null };
    this.entries.set(id, entry);
    return entry;
  }

  private activate(entry: EnemyEntry, heading: number): void {
    this.rest(entry);
    setVisible(this.engine, entry.sprite.rootId, true);
    entry.active = true;
    entry.facingLeft = initialFacingLeft(heading);
  }

  /** The rest pose of 'hit' (its end) and 'die' (its start), whatever the slot played last. */
  private rest(entry: EnemyEntry): void {
    playBaked(this.engine, entry.clips.hit, durationOf(entry.clips.hit));
    playBaked(this.engine, entry.clips.die, 0);
    entry.hitActive = false;
  }

  private free(entry: EnemyEntry): void {
    if (entry.active) {
      this.rest(entry);
      setVisible(this.engine, entry.sprite.rootId, false);
    }
    this.pools.get(entry.kind)?.slots.release(entry.id);
    this.entries.delete(entry.id);
  }
}
