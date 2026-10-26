/** One tower instance per (pad, allowed kind); a built tower shows its pad's instance of its kind. */
import type { ExodeUIEngine } from 'exodeui';
import { buildTowerSprite } from '../../art/towers';
import { muzzleWorld, poseTower } from '../../art/towers/pose';
import type { TowerSprite } from '../../art/types';
import type { LevelDef, TowerKind, TowerState, Vec2 } from '../../game/types';
import { setPos, setVisible, setZ } from '../exodeRuntime';
import { bakeSprite, bindClip, loopBaked, playBaked, type BakedClip, type BoundClip } from './bakedClips';
import { clipTimeSince } from './motion';
import { towerPrefix } from './pools';

/** Idle phase offset per pad index (seconds), so neighbouring towers do not sway in lockstep. */
export const IDLE_PHASE_PER_PAD = 0.37;

interface TowerInstance {
  sprite: TowerSprite;
  idle: BoundClip | undefined;
  fire: BoundClip | undefined;
  shown: boolean;
  /** 'fire' was applied last frame, so its rest pose must be restored once it ends. */
  firing: boolean;
}

export class TowerLayer {
  private readonly instances = new Map<string, TowerInstance>();
  /** Towers without an instance (kind not allowed in the level) in the last sync. */
  dropped = 0;

  constructor(
    private readonly engine: ExodeUIEngine,
    private readonly level: LevelDef,
  ) {
    const baked = new Map<TowerKind, Record<string, BakedClip>>();
    level.pads.forEach((pad, i) => {
      for (const kind of level.towers) {
        const sprite = buildTowerSprite(kind, towerPrefix(i, kind));
        const root = sprite.objects[0];
        if (root) {
          root.visible = false;
          root.transform = { ...root.transform, x: pad.x, y: pad.y };
        }
        const clips = baked.get(kind) ?? bakeSprite(sprite);
        baked.set(kind, clips);
        const bind = (clip: BakedClip | undefined) => (clip ? bindClip(clip, sprite.rootId) : undefined);
        this.instances.set(sprite.rootId, { sprite, idle: bind(clips.idle), fire: bind(clips.fire), shown: false, firing: false });
      }
    });
  }

  /** One pool per allowed kind, indexed by pad. */
  poolSprites(): TowerSprite[][] {
    return this.level.towers.map((kind) => this.level.pads.flatMap((_, pad) => this.sprite(pad, kind) ?? []));
  }

  sprite(pad: number, kind: TowerKind): TowerSprite | undefined {
    return this.instances.get(towerPrefix(pad, kind))?.sprite;
  }

  /** World muzzle of a tower as it is aimed now, or its pad center when it has no instance. */
  muzzle(tower: TowerState): Vec2 {
    const sprite = this.sprite(tower.pad, tower.kind);
    return sprite ? muzzleWorld(sprite, tower.level, tower.aim, tower.pos) : { x: tower.pos.x, y: tower.pos.y };
  }

  /** Hide every instance on a pad (the tower there was sold). */
  hidePad(pad: number): void {
    for (const kind of this.level.towers) {
      const inst = this.instances.get(towerPrefix(pad, kind));
      if (inst?.shown) {
        inst.shown = false;
        setVisible(this.engine, inst.sprite.rootId, false);
      }
    }
  }

  /** Show and pose every tower of the view; hide the rest. `sceneTime` drives the idle loops. */
  sync(towers: readonly TowerState[], worldTime: number, sceneTime: number): void {
    this.dropped = 0;
    const seen = new Set<string>();
    for (const tower of towers) {
      const id = towerPrefix(tower.pad, tower.kind);
      const inst = this.instances.get(id);
      if (!inst) {
        this.dropped++;
        continue;
      }
      seen.add(id);
      const engine = this.engine;
      if (!inst.shown) {
        inst.shown = true;
        setVisible(engine, id, true);
      }
      setPos(engine, id, tower.pos.x, tower.pos.y);
      setZ(engine, id, tower.pos.y);
      poseTower(engine, inst.sprite, tower.level, tower.aim);
      const fireT = inst.fire ? clipTimeSince(worldTime, tower.lastFiredAt, inst.fire.clip.duration) : null;
      if (inst.fire && fireT !== null) {
        playBaked(engine, inst.fire, fireT);
        inst.firing = true;
      } else {
        if (inst.firing && inst.fire) playBaked(engine, inst.fire, inst.fire.clip.duration);
        inst.firing = false;
        if (inst.idle) loopBaked(engine, inst.idle, sceneTime + tower.pad * IDLE_PHASE_PER_PAD);
      }
    }
    for (const [id, inst] of this.instances) {
      if (inst.shown && !seen.has(id)) {
        inst.shown = false;
        setVisible(this.engine, id, false);
      }
    }
  }

  visibleIds(): string[] {
    return [...this.instances].filter(([, inst]) => inst.shown).map(([id]) => id);
  }
}
