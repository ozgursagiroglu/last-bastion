import { describe, expect, it } from 'vitest';
import { buildEnemySprite } from '../../art/enemies';
import type { SpriteInstance } from '../../art/exode';
import { buildTowerSprite } from '../../art/towers';
import { buildFxSprite } from '../../art/world/fx';
import { buildProjectileSprite } from '../../art/world/projectiles';
import { ENEMY_KINDS, TOWER_KINDS } from '../../game/types';
import { BAKE_RATE, bakeSprite, bindClip, canBake, loopBaked, playBaked } from './bakedClips';
import { loadSprites, newEngine, stateOf } from './testSupport';

const SPRITES: SpriteInstance[] = [
  ...ENEMY_KINDS.map((k) => buildEnemySprite(k, `en.${k}.0`)),
  ...TOWER_KINDS.map((k) => buildTowerSprite(k, `tw.0.${k}`)),
  buildProjectileSprite('rocket', 'pr.rocket.0'),
];

// Baked values are linear between samples taken every 1/BAKE_RATE s: within a quarter pixel or degree of the
// engine's eased value, and within 0.01 for scales and opacities.
describe('baked clips', () => {
  for (const sprite of SPRITES) {
    it(`replay the engine's poses for ${sprite.rootId}`, () => {
      const reference = newEngine();
      loadSprites(reference, [sprite]);
      const replay = newEngine();
      loadSprites(replay, [sprite]);
      const baked = bakeSprite(sprite);
      expect(Object.keys(baked).sort()).toEqual(Object.keys(sprite.clips).sort());
      for (const [name, clip] of Object.entries(sprite.clips)) {
        const bakedClip = baked[name];
        if (!bakedClip) throw new Error(`missing ${name}`);
        const bound = bindClip(bakedClip, sprite.rootId);
        for (let k = 0; k <= 13; k++) {
          const t = (clip.duration * k) / 13;
          reference.applyAnimation(clip, t);
          playBaked(replay, bound, t);
          for (const track of clip.tracks) {
            const want = stateOf(reference, track.object_id)[track.property];
            const got = stateOf(replay, track.object_id)[track.property];
            if (typeof want === 'number') {
              const tolerance = track.property === 'x' || track.property === 'y' || track.property === 'rotation' ? 0.25 : 0.01;
              expect(Math.abs((got as number) - want), `${name} ${track.object_id}.${track.property} at ${t}`).toBeLessThanOrEqual(tolerance);
            } else {
              const nearKey = track.keyframes.some((key) => Math.abs(key.time - t) <= 1 / BAKE_RATE);
              if (!nearKey) expect(got, `${name} ${track.object_id}.${track.property} at ${t}`).toBe(want);
            }
          }
        }
      }
    });
  }

  it('wraps looping clips', () => {
    const sprite = buildEnemySprite('grunt', 'en.grunt.0');
    const engine = newEngine();
    loadSprites(engine, [sprite]);
    const walk = bakeSprite(sprite).walk;
    const track = sprite.clips.walk?.tracks[0];
    if (!walk || !track) throw new Error('grunt has no walk');
    const bound = bindClip(walk, sprite.rootId);
    const read = () => stateOf(engine, track.object_id)[track.property] as number;
    loopBaked(engine, bound, walk.duration * 0.3);
    const a = read();
    loopBaked(engine, bound, walk.duration * 2.3);
    expect(read()).toBeCloseTo(a, 5);
    loopBaked(engine, bound, -walk.duration * 0.7);
    expect(read()).toBeCloseTo(a, 5);
  });

  it('binds one baked clip to every instance of a pool', () => {
    const a = buildEnemySprite('runner', 'en.runner.0');
    const b = buildEnemySprite('runner', 'en.runner.7');
    const engine = newEngine();
    loadSprites(engine, [a, b]);
    const die = bakeSprite(a).die;
    if (!die) throw new Error('runner has no die');
    playBaked(engine, bindClip(die, b.rootId), die.duration);
    expect(stateOf(engine, b.bodyPartId).opacity).toBeCloseTo(0, 5);
    expect(stateOf(engine, a.bodyPartId).opacity).toBe(1);
  });

  it('refuses clips with properties the setters do not cover', () => {
    const tracer = buildFxSprite('tracer', 'fx.tracer.0');
    const play = tracer.clips.play;
    if (!play) throw new Error('tracer has no play');
    expect(canBake(play)).toBe(false);
    expect(() => bakeSprite(tracer)).toThrow(/cannot be baked/);
  });
});
