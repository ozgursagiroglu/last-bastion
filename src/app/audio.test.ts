import { describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '../game/types';
import { Audio, MASTER_VOLUME, MAX_VOICES, PRIORITY_SFX, SFX_THROTTLE } from './audio';
import { FakeAudioContext } from './fakeAudio';
import { SFX, type Sfx } from './sfx';

function setup(): { audio: Audio; ctx: FakeAudioContext } {
  const ctx = new FakeAudioContext();
  const audio = new Audio(() => ctx);
  audio.unlock();
  return { audio, ctx };
}

describe('Audio', () => {
  it('creates the context lazily and resumes it on unlock', () => {
    const ctx = new FakeAudioContext();
    const create = vi.fn(() => ctx);
    const audio = new Audio(create);
    audio.play('click');
    expect(create).not.toHaveBeenCalled();
    expect(ctx.started).toHaveLength(0);
    audio.unlock();
    audio.unlock();
    expect(create).toHaveBeenCalledTimes(1);
    expect(ctx.resumes).toBe(1);
    expect(ctx.master?.gain.value).toBe(MASTER_VOLUME);
    audio.play('click');
    expect(ctx.started.length).toBeGreaterThan(0);
  });

  it('survives a missing or throwing AudioContext', () => {
    const none = new Audio(() => null);
    none.unlock();
    expect(none.unlocked).toBe(false);
    expect(() => none.play('cannon')).not.toThrow();
    const throwing = new Audio(() => {
      throw new Error('NotAllowedError');
    });
    expect(() => throwing.unlock()).not.toThrow();
    expect(throwing.unlocked).toBe(false);
  });

  it('synthesizes every sound with valid ramps', () => {
    const { audio, ctx } = setup();
    for (const sfx of Object.keys(SFX) as Sfx[]) {
      ctx.currentTime += 5;
      const before = ctx.started.length;
      expect(() => audio.play(sfx)).not.toThrow();
      expect(ctx.started.length - before).toBe(SFX[sfx].length);
    }
  });

  it('plays the same sound at most once per throttle window', () => {
    const { audio, ctx } = setup();
    audio.play('rifle');
    const one = ctx.started.length;
    audio.play('rifle');
    ctx.currentTime = SFX_THROTTLE * 0.5;
    audio.play('rifle');
    expect(ctx.started.length).toBe(one);
    audio.play('cannon');
    expect(ctx.started.length).toBeGreaterThan(one);
    ctx.currentTime = SFX_THROTTLE + 0.001;
    audio.play('rifle');
    expect(ctx.started.length).toBe(one * 2 + SFX.cannon.length);
  });

  it('caps the voices playing at once', () => {
    const { audio, ctx } = setup();
    const sounds: Sfx[] = ['cannon', 'rifle', 'explosion', 'waveStart', 'upgrade', 'build', 'frost', 'tesla'];
    for (const sfx of sounds) audio.play(sfx);
    expect(audio.activeVoices).toBe(MAX_VOICES);
    const started = ctx.started.length;
    audio.play('click');
    expect(ctx.started.length).toBe(started);
    ctx.currentTime = 3;
    expect(audio.activeVoices).toBe(0);
    audio.play('click');
    expect(ctx.started.length).toBe(started + SFX.click.length);
  });

  it('plays outcome sounds even when combat sounds fill every voice', () => {
    const { audio, ctx } = setup();
    for (const sfx of ['cannon', 'rifle', 'explosion', 'waveStart', 'upgrade', 'build'] as const) audio.play(sfx);
    expect(audio.activeVoices).toBe(MAX_VOICES);
    for (const sfx of PRIORITY_SFX) {
      const before = ctx.started.length;
      audio.play(sfx);
      expect(ctx.started.length - before).toBe(SFX[sfx].length);
    }
    expect([...PRIORITY_SFX].sort()).toEqual(['bossDeath', 'defeat', 'leak', 'victory']);
    expect(audio.activeVoices).toBe(MAX_VOICES + PRIORITY_SFX.size);
    const started = ctx.started.length;
    audio.play('frost');
    expect(ctx.started.length).toBe(started);
  });

  it('is silent while muted and restores the master gain', () => {
    const { audio, ctx } = setup();
    audio.setMuted(true);
    expect(ctx.master?.gain.value).toBe(0);
    audio.play('cannon');
    audio.onEvents([{ type: 'levelWon', stars: 3 }]);
    expect(ctx.started).toHaveLength(0);
    audio.setMuted(false);
    expect(ctx.master?.gain.value).toBe(MASTER_VOLUME);
    audio.play('cannon');
    expect(ctx.started.length).toBe(SFX.cannon.length);
  });

  it('applies a mute set before the context exists', () => {
    const ctx = new FakeAudioContext();
    const audio = new Audio(() => ctx);
    audio.setMuted(true);
    audio.unlock();
    expect(ctx.master?.gain.value).toBe(0);
  });

  it('maps a step of events to sounds', () => {
    const { audio } = setup();
    const played: Sfx[] = [];
    vi.spyOn(audio, 'play').mockImplementation((sfx) => played.push(sfx));
    const at = { x: 0, y: 0 };
    const events: GameEvent[] = [
      { type: 'towerFired', towerId: 1, kind: 'rifle', targetId: 2, from: at, to: at },
      { type: 'towerFired', towerId: 3, kind: 'tesla', targetId: 2, from: at, to: at },
      { type: 'chainLightning', towerId: 3, points: [at, at] },
      { type: 'projectileHit', id: 4, kind: 'rocket', pos: at, splashRadius: 40 },
      { type: 'projectileHit', id: 5, kind: 'iceShard', pos: at, splashRadius: 0 },
      { type: 'enemyKilled', id: 2, kind: 'boss', pos: at, bounty: 50 },
      { type: 'enemyLeaked', id: 6, kind: 'grunt', livesLost: 1 },
      { type: 'enemyHit', id: 7, amount: 3, damageType: 'physical', source: 'rifle' },
    ];
    audio.onEvents(events);
    expect(played).toEqual(['rifle', 'tesla', 'explosion', 'bossDeath', 'leak']);
  });
});
