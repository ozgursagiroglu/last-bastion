/** Sound recipes (pure data) and the sim event → sound mapping. Audio synthesizes them. */
import type { GameEvent } from '../game/types';

export type Sfx =
  | 'rifle'
  | 'cannon'
  | 'frost'
  | 'tesla'
  | 'rocket'
  | 'explosion'
  | 'enemyDeath'
  | 'bossDeath'
  | 'leak'
  | 'coin'
  | 'build'
  | 'upgrade'
  | 'sell'
  | 'waveStart'
  | 'victory'
  | 'defeat'
  | 'click'
  | 'error';

/** An oscillator sweeping from → to Hz, or filtered white noise whose filter sweeps from → to Hz. */
export type Layer =
  | { kind: 'tone'; wave: OscillatorType; from: number; to: number; dur: number; gain: number; delay?: number }
  | { kind: 'noise'; filter: BiquadFilterType; from: number; to: number; dur: number; gain: number; delay?: number; q?: number };

const tone = (wave: OscillatorType, from: number, to: number, dur: number, gain: number, delay = 0): Layer => ({ kind: 'tone', wave, from, to, dur, gain, delay });
const noise = (filter: BiquadFilterType, from: number, to: number, dur: number, gain: number, delay = 0, q = 1): Layer => ({
  kind: 'noise',
  filter,
  from,
  to,
  dur,
  gain,
  delay,
  q,
});

export const SFX: Readonly<Record<Sfx, readonly Layer[]>> = {
  rifle: [noise('highpass', 2600, 1200, 0.06, 0.22), tone('square', 900, 280, 0.05, 0.05)],
  cannon: [tone('sine', 170, 45, 0.32, 0.5), noise('lowpass', 1400, 200, 0.26, 0.35)],
  frost: [tone('triangle', 1700, 2600, 0.12, 0.1), tone('sine', 2600, 1300, 0.16, 0.07, 0.03), noise('bandpass', 6000, 4000, 0.1, 0.08, 0, 4)],
  tesla: [tone('sawtooth', 1500, 220, 0.14, 0.08), noise('bandpass', 3000, 5200, 0.13, 0.14, 0, 3)],
  rocket: [noise('bandpass', 700, 2400, 0.3, 0.22, 0, 2), tone('sawtooth', 180, 520, 0.22, 0.04)],
  explosion: [noise('lowpass', 2200, 140, 0.45, 0.45), tone('sine', 130, 35, 0.4, 0.4)],
  enemyDeath: [tone('square', 540, 140, 0.12, 0.06), noise('lowpass', 1800, 400, 0.08, 0.1)],
  bossDeath: [tone('sawtooth', 320, 40, 0.9, 0.18), noise('lowpass', 1600, 80, 1.1, 0.45), tone('sine', 90, 30, 1.1, 0.4)],
  leak: [tone('square', 330, 220, 0.14, 0.1), tone('square', 240, 150, 0.22, 0.1, 0.12)],
  coin: [tone('square', 988, 988, 0.07, 0.06), tone('square', 1319, 1319, 0.22, 0.06, 0.07)],
  build: [noise('lowpass', 900, 250, 0.12, 0.35), tone('triangle', 330, 520, 0.1, 0.12, 0.06), tone('triangle', 660, 660, 0.14, 0.1, 0.13)],
  upgrade: [523, 659, 784, 1047].map((f, i) => tone('triangle', f, f, i === 3 ? 0.25 : 0.1, 0.14, i * 0.07)),
  sell: [tone('square', 784, 784, 0.06, 0.06), tone('square', 523, 523, 0.14, 0.06, 0.06), noise('highpass', 5000, 3000, 0.08, 0.06, 0.06)],
  waveStart: [tone('sawtooth', 220, 220, 0.22, 0.09), tone('sawtooth', 330, 330, 0.45, 0.1, 0.2), noise('lowpass', 600, 200, 0.3, 0.15)],
  victory: [523, 659, 784, 1047].map((f, i) => tone('triangle', f, f, i === 3 ? 0.6 : 0.16, 0.16, i * 0.15)),
  defeat: [tone('sawtooth', 392, 370, 0.3, 0.09), tone('sawtooth', 330, 311, 0.3, 0.09, 0.3), tone('sawtooth', 262, 180, 0.8, 0.1, 0.6)],
  click: [tone('square', 1200, 900, 0.03, 0.05)],
  error: [tone('square', 170, 160, 0.1, 0.09), tone('square', 140, 130, 0.14, 0.09, 0.12)],
};

/** Seconds from the start of a sound to the end of its last layer. */
export function sfxDuration(sfx: Sfx): number {
  return SFX[sfx].reduce((end, layer) => Math.max(end, (layer.delay ?? 0) + layer.dur), 0);
}

const FIRE_SFX: Readonly<Record<string, Sfx>> = { rifle: 'rifle', cannon: 'cannon', frost: 'frost', rocket: 'rocket' };

/** Sounds for one sim event. Tesla shots sound through chainLightning, not towerFired. */
export function sfxFor(event: GameEvent): readonly Sfx[] {
  switch (event.type) {
    case 'towerFired': {
      const sfx = FIRE_SFX[event.kind];
      return sfx ? [sfx] : [];
    }
    case 'chainLightning':
      return ['tesla'];
    case 'projectileHit':
      return event.kind === 'cannonball' || event.kind === 'rocket' ? ['explosion'] : [];
    case 'enemyKilled':
      return [event.kind === 'boss' ? 'bossDeath' : 'enemyDeath'];
    case 'enemyLeaked':
      return ['leak'];
    case 'towerBuilt':
      return ['build'];
    case 'towerUpgraded':
      return ['upgrade'];
    case 'towerSold':
      return ['sell'];
    case 'waveStarted':
      return event.early && event.bonus > 0 ? ['waveStart', 'coin'] : ['waveStart'];
    case 'levelWon':
      return ['victory'];
    case 'levelLost':
      return ['defeat'];
    case 'enemySpawned':
    case 'enemyHit':
      return [];
  }
}
