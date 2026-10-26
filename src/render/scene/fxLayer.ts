/** Pooled effects: started from events, advanced by game time, hidden when their 'play' clip ends. */
import type { ExodeUIEngine } from 'exodeui';
import { buildFxSprite } from '../../art/world/fx';
import { fxFrame, startFx, type FxSpec } from '../../art/world/pose';
import type { FxSprite } from '../../art/types';
import { setVisible, setZ } from '../exodeRuntime';
import { fxPrefix, type SceneFxKind } from './pools';

export const FX_Z = 4000;
/** Bolts and streaks span the board, so they draw above every point effect. */
export const FX_LINE_Z = 4500;

interface FxInstance {
  sprite: FxSprite;
  t: number;
  running: boolean;
  /** Start order, to find the oldest running instance. */
  seq: number;
}

export class FxLayer {
  private readonly pools = new Map<SceneFxKind, FxInstance[]>();
  private seq = 0;

  constructor(
    private readonly engine: ExodeUIEngine,
    sizes: Partial<Record<SceneFxKind, number>>,
  ) {
    for (const [kind, size] of Object.entries(sizes) as [SceneFxKind, number][]) {
      const pool: FxInstance[] = [];
      for (let i = 0; i < size; i++) {
        const sprite = buildFxSprite(kind, fxPrefix(kind, i));
        const root = sprite.objects[0];
        if (root) root.visible = false;
        pool.push({ sprite, t: 0, running: false, seq: 0 });
      }
      this.pools.set(kind, pool);
    }
  }

  /** The sprites of each kind's pool, by slot. */
  poolSprites(): FxSprite[][] {
    return [...this.pools.values()].map((pool) => pool.map((fx) => fx.sprite));
  }

  /** Starts an effect on a free instance, or on the oldest running one when all are busy. False without a pool. */
  start(kind: SceneFxKind, spec: FxSpec): boolean {
    const pool = this.pools.get(kind);
    if (!pool || pool.length === 0) return false;
    let pick: FxInstance | undefined;
    for (const fx of pool) {
      if (!fx.running) {
        pick = fx;
        break;
      }
      if (!pick || fx.seq < pick.seq) pick = fx;
    }
    if (!pick) return false;
    pick.t = 0;
    pick.running = true;
    pick.seq = ++this.seq;
    const id = pick.sprite.rootId;
    setVisible(this.engine, id, true);
    setZ(this.engine, id, (kind === 'tracer' || kind === 'lightning' ? FX_LINE_Z : FX_Z) + spec.at.y);
    startFx(this.engine, pick.sprite, spec);
    return true;
  }

  /** Advance every running effect by dt game seconds; hide the finished ones. */
  advance(dt: number): void {
    for (const pool of this.pools.values()) {
      for (const fx of pool) {
        if (!fx.running) continue;
        fx.t += dt;
        if (!fxFrame(this.engine, fx.sprite, fx.t)) {
          fx.running = false;
          setVisible(this.engine, fx.sprite.rootId, false);
        }
      }
    }
  }

  /** Root ids of the running instances of a kind (all kinds when omitted). */
  runningIds(kind?: SceneFxKind): string[] {
    const out: string[] = [];
    for (const [k, pool] of this.pools) {
      if (kind !== undefined && k !== kind) continue;
      for (const fx of pool) if (fx.running) out.push(fx.sprite.rootId);
    }
    return out;
  }
}
