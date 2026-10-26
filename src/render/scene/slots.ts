/** Maps entity ids onto a fixed number of pooled instances. The lowest free slot is taken first. */
export class SlotPool {
  private readonly owner: (number | undefined)[];
  private readonly byId = new Map<number, number>();

  constructor(readonly size: number) {
    this.owner = Array.from({ length: size }, () => undefined);
  }

  /** The slot of `id`, assigning a free one if it has none; undefined when the pool is full. */
  acquire(id: number): number | undefined {
    const held = this.byId.get(id);
    if (held !== undefined) return held;
    const slot = this.owner.indexOf(undefined);
    if (slot < 0) return undefined;
    this.owner[slot] = id;
    this.byId.set(id, slot);
    return slot;
  }

  get(id: number): number | undefined {
    return this.byId.get(id);
  }

  /** Frees the slot of `id`; returns it (undefined if `id` held none). */
  release(id: number): number | undefined {
    const slot = this.byId.get(id);
    if (slot === undefined) return undefined;
    this.byId.delete(id);
    this.owner[slot] = undefined;
    return slot;
  }

  ids(): number[] {
    return [...this.byId.keys()];
  }

  get used(): number {
    return this.byId.size;
  }
}
