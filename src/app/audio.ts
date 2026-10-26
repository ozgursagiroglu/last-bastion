/** Procedural Web Audio: every sound is synthesized from the recipes in sfx.ts, no asset files. */
import type { GameEvent } from '../game/types';
import { SFX, sfxDuration, sfxFor, type Layer, type Sfx } from './sfx';

export type { Sfx } from './sfx';

/** The slice of the Web Audio API Audio uses (a real AudioContext satisfies it; tests pass a fake). */
export interface AudioParamLike {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
}
export interface AudioNodeLike {
  connect(destination: AudioNodeLike): unknown;
}
export interface GainNodeLike extends AudioNodeLike {
  readonly gain: AudioParamLike;
}
export interface OscillatorNodeLike extends AudioNodeLike {
  type: OscillatorType;
  readonly frequency: AudioParamLike;
  start(when?: number): void;
  stop(when?: number): void;
}
export interface AudioBufferLike {
  getChannelData(channel: number): Float32Array;
}
export interface BufferSourceNodeLike extends AudioNodeLike {
  buffer: AudioBufferLike | null;
  start(when?: number, offset?: number): void;
  stop(when?: number): void;
}
export interface BiquadFilterNodeLike extends AudioNodeLike {
  type: BiquadFilterType;
  readonly frequency: AudioParamLike;
  readonly Q: AudioParamLike;
}
export interface AudioContextLike {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly state: string;
  readonly destination: AudioNodeLike;
  resume(): Promise<void>;
  createGain(): GainNodeLike;
  createOscillator(): OscillatorNodeLike;
  createBufferSource(): BufferSourceNodeLike;
  createBiquadFilter(): BiquadFilterNodeLike;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
}

export const MASTER_VOLUME = 0.5;
/** The same sound plays at most once per this many seconds. */
export const SFX_THROTTLE = 0.04;
/** At most this many sounds play at once; extra ones are dropped, except PRIORITY_SFX. */
export const MAX_VOICES = 6;
/** Sounds that tell the player something happened; they play even when combat sounds fill every voice. */
export const PRIORITY_SFX: ReadonlySet<Sfx> = new Set<Sfx>(['victory', 'defeat', 'leak', 'bossDeath']);

const SILENT = 0.0001;
const ATTACK = 0.005;
const NOISE_SECONDS = 1;

/** Deterministic white noise (a small LCG), so no two contexts sound different. */
function fillNoise(data: Float32Array): void {
  let seed = 0x2545f491;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = (seed / 0xffffffff) * 2 - 1;
  }
}

export class Audio {
  private ctx: AudioContextLike | null = null;
  private master: GainNodeLike | null = null;
  private noise: AudioBufferLike | null = null;
  private muted = false;
  private readonly lastPlayed = new Map<Sfx, number>();
  /** End times (context seconds) of the sounds started so far that may still be playing. */
  private voices: number[] = [];

  constructor(private readonly createContext: () => AudioContextLike | null) {}

  /** Create/resume the context; call from the first user gesture. */
  unlock(): void {
    if (!this.ctx) {
      const ctx = this.tryCreate();
      if (!ctx) return;
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      this.master.connect(ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
  }

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : MASTER_VOLUME;
  }

  /** Sounds started that have not ended yet. */
  get activeVoices(): number {
    const now = this.ctx?.currentTime ?? 0;
    return this.voices.filter((end) => end > now).length;
  }

  play(sfx: Sfx): void {
    const { ctx, master } = this;
    if (this.muted || !ctx || !master) return;
    const now = ctx.currentTime;
    const last = this.lastPlayed.get(sfx);
    if (last !== undefined && now - last < SFX_THROTTLE) return;
    this.voices = this.voices.filter((end) => end > now);
    if (this.voices.length >= MAX_VOICES && !PRIORITY_SFX.has(sfx)) return;
    this.lastPlayed.set(sfx, now);
    this.voices.push(now + sfxDuration(sfx));
    for (const layer of SFX[sfx]) this.layer(ctx, master, layer, now + (layer.delay ?? 0));
  }

  /** Map one sim step's events to sounds. */
  onEvents(events: readonly GameEvent[]): void {
    if (this.muted || !this.ctx) return;
    for (const event of events) for (const sfx of sfxFor(event)) this.play(sfx);
  }

  private tryCreate(): AudioContextLike | null {
    try {
      return this.createContext();
    } catch {
      return null;
    }
  }

  private layer(ctx: AudioContextLike, master: GainNodeLike, layer: Layer, start: number): void {
    const end = start + layer.dur;
    const env = ctx.createGain();
    env.gain.setValueAtTime(SILENT, start);
    env.gain.linearRampToValueAtTime(layer.gain, start + Math.min(ATTACK, layer.dur / 2));
    env.gain.exponentialRampToValueAtTime(SILENT, end);
    env.connect(master);
    if (layer.kind === 'tone') {
      const osc = ctx.createOscillator();
      osc.type = layer.wave;
      osc.frequency.setValueAtTime(layer.from, start);
      if (layer.to !== layer.from) osc.frequency.exponentialRampToValueAtTime(layer.to, end);
      osc.connect(env);
      osc.start(start);
      osc.stop(end);
      return;
    }
    const filter = ctx.createBiquadFilter();
    filter.type = layer.filter;
    filter.Q.value = layer.q ?? 1;
    filter.frequency.setValueAtTime(layer.from, start);
    if (layer.to !== layer.from) filter.frequency.exponentialRampToValueAtTime(layer.to, end);
    filter.connect(env);
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer(ctx);
    source.connect(filter);
    source.start(start, 0);
    source.stop(end);
  }

  private noiseBuffer(ctx: AudioContextLike): AudioBufferLike {
    if (!this.noise) {
      const length = Math.max(1, Math.round(ctx.sampleRate * NOISE_SECONDS));
      this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
      fillNoise(this.noise.getChannelData(0));
    }
    return this.noise;
  }
}
