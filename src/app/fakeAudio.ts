/** A recording fake of the Web Audio slice Audio uses, for tests. */
import type {
  AudioBufferLike,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  BiquadFilterNodeLike,
  BufferSourceNodeLike,
  GainNodeLike,
  OscillatorNodeLike,
} from './audio';

class FakeParam implements AudioParamLike {
  value = 1;
  readonly ramps: { kind: 'set' | 'linear' | 'exp'; value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number): void {
    this.ramps.push({ kind: 'set', value, time });
  }
  linearRampToValueAtTime(value: number, time: number): void {
    this.ramps.push({ kind: 'linear', value, time });
  }
  exponentialRampToValueAtTime(value: number, time: number): void {
    if (value <= 0) throw new RangeError('exponential ramp to a non-positive value');
    this.ramps.push({ kind: 'exp', value, time });
  }
}

class FakeNode implements AudioNodeLike {
  readonly outputs: AudioNodeLike[] = [];
  connect(destination: AudioNodeLike): void {
    this.outputs.push(destination);
  }
}

export class FakeAudioContext implements AudioContextLike {
  currentTime = 0;
  readonly sampleRate = 8000;
  state = 'suspended';
  readonly destination = new FakeNode();
  resumes = 0;
  readonly gains: (FakeNode & GainNodeLike)[] = [];
  /** Every oscillator or buffer source started, with its start time. */
  readonly started: { node: 'tone' | 'noise'; at: number }[] = [];

  resume(): Promise<void> {
    this.resumes++;
    this.state = 'running';
    return Promise.resolve();
  }

  createGain(): GainNodeLike {
    const node = Object.assign(new FakeNode(), { gain: new FakeParam() });
    this.gains.push(node);
    return node;
  }

  createOscillator(): OscillatorNodeLike {
    const started = this.started;
    return Object.assign(new FakeNode(), {
      type: 'sine' as OscillatorType,
      frequency: new FakeParam(),
      start(when = 0) {
        started.push({ node: 'tone', at: when });
      },
      stop() {},
    });
  }

  createBufferSource(): BufferSourceNodeLike {
    const started = this.started;
    return Object.assign(new FakeNode(), {
      buffer: null as AudioBufferLike | null,
      start(when = 0) {
        started.push({ node: 'noise', at: when });
      },
      stop() {},
    });
  }

  createBiquadFilter(): BiquadFilterNodeLike {
    return Object.assign(new FakeNode(), { type: 'lowpass' as BiquadFilterType, frequency: new FakeParam(), Q: new FakeParam() });
  }

  createBuffer(_channels: number, length: number): AudioBufferLike {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }

  /** The master gain (the first gain created, connected to the destination). */
  get master(): GainNodeLike | undefined {
    return this.gains[0];
  }
}
