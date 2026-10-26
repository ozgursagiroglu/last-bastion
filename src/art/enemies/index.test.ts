import type { Canvas } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../game/config/enemies';
import { ENEMY_KINDS } from '../../game/types';
import { countPainted, loadEngine, renderArtboard, renderEngine } from '../../platform/nodeCanvas';
import { loopClip, playClip, setVisible } from '../../render/exodeRuntime';
import { clipsOf, makeArtboard, placeRoot, validateSprite } from '../exode';
import { buildEnemyIcon, buildEnemySprite, ENEMY_DESIGNS } from './index';

const W = 240;
const H = 200;
const ROOT_X = 120;
const ROOT_Y = 170;

/** Bounding box of painted pixels, in canvas pixels. */
function paintedBox(canvas: Canvas): { minX: number; maxX: number; minY: number; maxY: number } {
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if ((data[(y * canvas.width + x) * 4 + 3] ?? 0) === 0) continue;
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
    }
  }
  return box;
}

function staged(kind: (typeof ENEMY_KINDS)[number]) {
  const sprite = placeRoot(buildEnemySprite(kind, `e-${kind}`), ROOT_X, ROOT_Y);
  const artboard = makeArtboard('t', sprite.objects, { width: W, height: H, background: null, animations: clipsOf([sprite]) });
  return { sprite, artboard };
}

describe.each(ENEMY_KINDS)('%s sprite', (kind) => {
  const sprite = buildEnemySprite(kind, `e-${kind}`);
  const byId = new Map(sprite.objects.map((o) => [o.id, o]));
  const adapterIds = [sprite.facePartId, sprite.hpBar.groupId, sprite.hpBar.fillId, sprite.frostOverlayId, sprite.shieldBubbleId].filter((id) => id !== null);

  it('is structurally valid, within the part budget and follows the contract fields', () => {
    expect(validateSprite(sprite)).toEqual([]);
    expect(sprite.objects.length).toBeLessThanOrEqual(30);
    expect(sprite.kind).toBe(kind);
    const face = byId.get(sprite.facePartId);
    expect(face?.parentId).toBe(sprite.rootId);
    expect(face?.transform).toMatchObject({ x: 0, y: 0, rotation: 0, scale_x: 1, scale_y: 1, flip_x: false });
    expect(byId.get(sprite.bodyPartId)?.parentId).toBe(sprite.facePartId);
    expect(byId.get(sprite.frostOverlayId)?.visible).toBe(false);
    expect(byId.get(sprite.hpBar.groupId)?.visible).toBe(false);
    expect(byId.get(sprite.hpBar.groupId)?.parentId).toBe(sprite.rootId);
    expect(byId.get(sprite.hpBar.fillId)?.geometry).toMatchObject({ type: 'Rectangle', width: sprite.hpBar.fullWidth });
    expect(byId.get(sprite.hpBar.fillId)?.transform.x).toBe(sprite.hpBar.fillX);
    expect(sprite.shieldBubbleId !== null).toBe(kind === 'shield');
    expect(sprite.height).toBe(ENEMY_DESIGNS[kind].height);
  });

  it('has walk (loop), hit (≤ 0.2 s) and die (0.35–0.6 s, ends transparent) clips', () => {
    const { walk, hit, die } = sprite.clips;
    if (!walk || !hit || !die) throw new Error('missing clip');
    expect(hit.duration).toBeLessThanOrEqual(0.2);
    expect(die.duration).toBeGreaterThanOrEqual(0.35);
    expect(die.duration).toBeLessThanOrEqual(0.6);
    for (const track of walk.tracks) {
      const first = track.keyframes[0];
      const last = track.keyframes.at(-1);
      expect(first?.time).toBe(0);
      expect(last?.time).toBeCloseTo(walk.duration, 9);
      expect(last?.value).toEqual(first?.value);
      expect(new Set(track.keyframes.map((k) => k.value)).size).toBeGreaterThan(1);
    }
    const fade = die.tracks.find((t) => t.object_id === sprite.bodyPartId && t.property === 'opacity');
    expect(fade?.keyframes.at(-1)?.value).toBe(0);
  });

  it('keeps clips off adapter-driven parts and leaves the body part to hit and die', () => {
    for (const clip of Object.values(sprite.clips)) {
      for (const track of clip.tracks) expect(adapterIds).not.toContain(track.object_id);
    }
    expect(sprite.clips.walk?.tracks.map((t) => t.object_id)).not.toContain(sprite.bodyPartId);
  });

  it('starts hit and die at the authored rest pose, and hit ends there too', () => {
    const rest = (id: string, property: string): unknown => {
      const o = byId.get(id);
      if (!o) throw new Error(`missing ${id}`);
      if (property === 'visible') return o.visible;
      return (o.transform as unknown as Record<string, unknown>)[property];
    };
    for (const name of ['hit', 'die'] as const) {
      for (const track of sprite.clips[name]?.tracks ?? []) {
        expect(track.keyframes[0]?.time).toBe(0);
        if (track.property === 'opacity' && track.object_id.endsWith('.flash')) continue;
        expect(track.keyframes[0]?.value, `${name} ${track.object_id}.${track.property}`).toEqual(rest(track.object_id, track.property));
        if (name === 'hit') expect(track.keyframes.at(-1)?.value).toEqual(rest(track.object_id, track.property));
      }
    }
  });

  it('walks without sliding: the clip lasts one stride at the kind speed', () => {
    expect(sprite.stride).toBeGreaterThan(0);
    expect(sprite.clips.walk?.duration).toBeCloseTo(sprite.stride / ENEMIES[kind].speed, 9);
  });

  it('paints inside a box of its height above the ground point (shield bubble off)', () => {
    const { sprite: s, artboard } = staged(kind);
    const canvas = renderArtboard(artboard, { prepare: (engine) => s.shieldBubbleId && setVisible(engine, s.shieldBubbleId, false) });
    const box = paintedBox(canvas);
    expect(ROOT_Y - box.minY).toBeLessThanOrEqual(sprite.height + 2);
    expect(ROOT_Y - box.minY).toBeGreaterThanOrEqual(sprite.height - 3);
    expect(box.maxY - ROOT_Y).toBeLessThanOrEqual(ENEMY_DESIGNS[kind].shadow.height / 2 + 1);
    expect(countPainted(canvas, { x: ROOT_X - 20, y: ROOT_Y - sprite.height, w: 40, h: sprite.height })).toBeGreaterThan(sprite.height * 8);
  });

  it('draws the health bar above the head when shown', () => {
    const { sprite: s, artboard } = staged(kind);
    const engine = loadEngine(artboard);
    const hidden = paintedBox(renderEngine(engine, W, H));
    setVisible(engine, s.hpBar.groupId, true);
    const shown = paintedBox(renderEngine(engine, W, H));
    expect(hidden.minY - shown.minY).toBeGreaterThanOrEqual(12);
    expect(shown.maxX - shown.minX).toBeGreaterThanOrEqual(s.hpBar.fullWidth);
  });

  it('plays every clip at several times without leaving its pose broken', () => {
    const { sprite: s, artboard } = staged(kind);
    const engine = loadEngine(artboard);
    const rest = countPainted(renderEngine(engine, W, H));
    const walk = s.clips.walk;
    const die = s.clips.die;
    if (!walk || !die) throw new Error('missing clip');
    for (let i = 0; i < 4; i++) {
      loopClip(engine, walk, (walk.duration * i) / 4);
      expect(countPainted(renderEngine(engine, W, H))).toBeGreaterThan(rest * 0.8);
    }
    playClip(engine, die, die.duration);
    expect(countPainted(renderEngine(engine, W, H))).toBe(0);
    playClip(engine, die, 0);
    expect(countPainted(renderEngine(engine, W, H))).toBeGreaterThan(rest * 0.8);
  });
});

describe('icons', () => {
  it.each(ENEMY_KINDS)('%s fits a 40×40 box centered on its root and fills it reasonably', (kind) => {
    const icon = placeRoot(buildEnemyIcon(kind, `icon-${kind}`), 50, 50);
    expect(validateSprite(icon)).toEqual([]);
    expect(Object.keys(icon.clips)).toEqual([]);
    const canvas = renderArtboard(makeArtboard('i', icon.objects, { width: 100, height: 100, background: null }));
    const box = paintedBox(canvas);
    expect(box.minX).toBeGreaterThanOrEqual(30);
    expect(box.maxX).toBeLessThan(70);
    expect(box.minY).toBeGreaterThanOrEqual(30);
    expect(box.maxY).toBeLessThan(70);
    expect(Math.max(box.maxX - box.minX, box.maxY - box.minY)).toBeGreaterThanOrEqual(30);
  });
});

describe('pools', () => {
  it('builds instances with distinct prefixes that share one artboard', () => {
    const sprites = ENEMY_KINDS.flatMap((kind) => [0, 1].map((i) => buildEnemySprite(kind, `pool.${kind}.${i}`)));
    const ids = sprites.flatMap((s) => s.objects.map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(() => loadEngine(makeArtboard('p', sprites.flatMap((s) => s.objects), { animations: clipsOf(sprites) }))).not.toThrow();
  });
});
