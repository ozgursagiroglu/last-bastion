import { describe, expect, it } from 'vitest';
import { TOWER_KINDS, type GameEvent } from '../game/types';
import { SFX, sfxDuration, sfxFor, type Sfx } from './sfx';

const at = { x: 0, y: 0 };

describe('SFX recipes', () => {
  it('are short and use positive frequencies and gains', () => {
    for (const [name, layers] of Object.entries(SFX)) {
      expect(layers.length, name).toBeGreaterThan(0);
      expect(sfxDuration(name as Sfx), name).toBeLessThanOrEqual(1.5);
      for (const layer of layers) {
        expect(layer.from, name).toBeGreaterThan(0);
        expect(layer.to, name).toBeGreaterThan(0);
        expect(layer.dur, name).toBeGreaterThan(0);
        expect(layer.gain, name).toBeGreaterThan(0);
        expect(layer.gain, name).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('sfxDuration covers the latest layer end', () => {
    expect(sfxDuration('click')).toBeCloseTo(0.03);
    expect(sfxDuration('victory')).toBeCloseTo(0.45 + 0.6);
  });
});

describe('sfxFor', () => {
  it('maps tower shots by kind, tesla through chainLightning', () => {
    const fired = TOWER_KINDS.map((kind): GameEvent => ({ type: 'towerFired', towerId: 1, kind, targetId: 2, from: at, to: at }));
    expect(fired.map(sfxFor)).toEqual([['rifle'], ['cannon'], ['frost'], [], ['rocket']]);
    expect(sfxFor({ type: 'chainLightning', towerId: 1, points: [at] })).toEqual(['tesla']);
  });

  it('explodes cannonballs and rockets only', () => {
    expect(sfxFor({ type: 'projectileHit', id: 1, kind: 'cannonball', pos: at, splashRadius: 50 })).toEqual(['explosion']);
    expect(sfxFor({ type: 'projectileHit', id: 1, kind: 'rocket', pos: at, splashRadius: 50 })).toEqual(['explosion']);
    expect(sfxFor({ type: 'projectileHit', id: 1, kind: 'iceShard', pos: at, splashRadius: 0 })).toEqual([]);
  });

  it('maps kills, leaks, the economy, waves and the outcome', () => {
    expect(sfxFor({ type: 'enemyKilled', id: 1, kind: 'grunt', pos: at, bounty: 5 })).toEqual(['enemyDeath']);
    expect(sfxFor({ type: 'enemyKilled', id: 1, kind: 'boss', pos: at, bounty: 5 })).toEqual(['bossDeath']);
    expect(sfxFor({ type: 'enemyLeaked', id: 1, kind: 'boss', livesLost: 10 })).toEqual(['leak']);
    expect(sfxFor({ type: 'towerBuilt', towerId: 1, pad: 0, kind: 'rifle' })).toEqual(['build']);
    expect(sfxFor({ type: 'towerUpgraded', towerId: 1, level: 2 })).toEqual(['upgrade']);
    expect(sfxFor({ type: 'towerSold', towerId: 1, pad: 0, refund: 30 })).toEqual(['sell']);
    expect(sfxFor({ type: 'waveStarted', wave: 0, early: false, bonus: 0 })).toEqual(['waveStart']);
    expect(sfxFor({ type: 'waveStarted', wave: 2, early: true, bonus: 7 })).toEqual(['waveStart', 'coin']);
    expect(sfxFor({ type: 'levelWon', stars: 2 })).toEqual(['victory']);
    expect(sfxFor({ type: 'levelLost' })).toEqual(['defeat']);
    expect(sfxFor({ type: 'enemySpawned', id: 1, kind: 'grunt' })).toEqual([]);
  });
});
