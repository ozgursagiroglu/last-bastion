/**
 * Projectile pools diffed against the view each frame: new ids take a slot, vanished ids free theirs. Light trails are
 * anchored to the flight every frame and forgotten when a slot is reused.
 */
import type { ExodeUIEngine } from 'exodeui';
import { trailPartIds } from '../../art/world/effects';
import { buildProjectileSprite } from '../../art/world/projectiles';
import { poseProjectile } from '../../art/world/pose';
import type { ProjectileSprite } from '../../art/types';
import type { ProjectileKind, ProjectileState } from '../../game/types';
import { setPos, setVisible, setZ } from '../exodeRuntime';
import { bakeSprite, bindClip, loopBaked, type BoundClip } from './bakedClips';
import { anchorTrail, clearTrail } from './engineFx';
import { projectilePrefix } from './pools';
import { SlotPool } from './slots';

export const PROJECTILE_Z = 3000;
/** Loop phase offset per projectile id (seconds), so rocket flames do not flicker in step. */
const LOOP_PHASE_PER_ID = 0.05;

interface ProjectilePool {
  sprites: ProjectileSprite[];
  /** The 'loop' clip of each slot, for kinds that have one. */
  loops: (BoundClip | undefined)[];
  /** The LightTrail parts of each slot. */
  trails: string[][];
  slots: SlotPool;
}

export class ProjectileLayer {
  private readonly pools = new Map<ProjectileKind, ProjectilePool>();
  /** Projectiles of the last sync that found no free slot (not drawn). */
  dropped = 0;

  constructor(
    private readonly engine: ExodeUIEngine,
    sizes: Partial<Record<ProjectileKind, number>>,
  ) {
    for (const [kind, size] of Object.entries(sizes) as [ProjectileKind, number][]) {
      const sprites: ProjectileSprite[] = [];
      for (let i = 0; i < size; i++) {
        const sprite = buildProjectileSprite(kind, projectilePrefix(kind, i));
        const root = sprite.objects[0];
        if (root) root.visible = false;
        sprites.push(sprite);
      }
      const first = sprites[0];
      const loop = first ? bakeSprite(first).loop : undefined;
      const loops = sprites.map((s) => (loop ? bindClip(loop, s.rootId) : undefined));
      this.pools.set(kind, { sprites, loops, trails: sprites.map(trailPartIds), slots: new SlotPool(size) });
    }
  }

  /** The sprites of each kind's pool, by slot. */
  poolSprites(): ProjectileSprite[][] {
    return [...this.pools.values()].map((p) => p.sprites);
  }

  sync(projectiles: readonly ProjectileState[], sceneTime: number): void {
    this.dropped = 0;
    const live = new Set<number>();
    for (const p of projectiles) live.add(p.id);
    for (const pool of this.pools.values()) {
      for (const id of pool.slots.ids()) {
        if (live.has(id)) continue;
        const slot = pool.slots.release(id);
        const sprite = slot === undefined ? undefined : pool.sprites[slot];
        if (sprite) setVisible(this.engine, sprite.rootId, false);
      }
    }
    for (const p of projectiles) {
      const pool = this.pools.get(p.kind);
      const fresh = pool !== undefined && pool.slots.get(p.id) === undefined;
      const slot = pool?.slots.acquire(p.id);
      const sprite = slot === undefined ? undefined : pool?.sprites[slot];
      if (!sprite || slot === undefined) {
        this.dropped++;
        continue;
      }
      const id = sprite.rootId;
      const trails = pool?.trails[slot] ?? [];
      if (fresh) {
        setVisible(this.engine, id, true);
        for (const trail of trails) clearTrail(this.engine, trail);
      }
      setPos(this.engine, id, p.pos.x, p.pos.y);
      setZ(this.engine, id, PROJECTILE_Z + p.pos.y);
      poseProjectile(this.engine, sprite, p);
      const angle = sprite.headingPartId ? (p.heading * 180) / Math.PI : 0;
      for (const trail of trails) anchorTrail(this.engine, trail, p.pos.x, p.pos.y - p.height, angle);
      const loop = pool?.loops[slot];
      if (loop) loopBaked(this.engine, loop, sceneTime + p.id * LOOP_PHASE_PER_ID);
    }
  }

  /** Root id drawing the projectile `id`, if it has a slot. */
  rootOf(kind: ProjectileKind, id: number): string | undefined {
    const pool = this.pools.get(kind);
    const slot = pool?.slots.get(id);
    return slot === undefined ? undefined : pool?.sprites[slot]?.rootId;
  }
}
