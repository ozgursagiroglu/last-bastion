import { describe, expect, it } from 'vitest';
import {
  DYNAMIC_PATH_BOX,
  linear,
  makeArtboard,
  outlineCopies,
  pathCenter,
  placeRoot,
  radial,
  ROOT,
  solid,
  SpriteBuilder,
  validateSprite,
} from './exode';

describe('paints', () => {
  it('builds solid and gradient fills', () => {
    expect(solid('#112233', 0.5)).toEqual({ type: 'Solid', color: '#112233', opacity: 0.5 });
    const g = linear([[0, '#000000'], [1, '#ffffff', 0.25]]);
    expect(g).toMatchObject({ type: 'LinearGradient', start: [0.5, 0], end: [0.5, 1], opacity: 1 });
    expect(g.stops).toEqual([
      { offset: 0, color: '#000000', opacity: 1 },
      { offset: 1, color: '#ffffff', opacity: 0.25 },
    ]);
    expect(radial([[0, '#ff0000'], [1, '#00ff00']], [0.3, 0.3], 0.7)).toMatchObject({ type: 'RadialGradient', center: [0.3, 0.3], radius: 0.7 });
  });

  it('rejects colors that are not #rrggbb and opacities outside 0..1', () => {
    expect(() => solid('#fff')).toThrow();
    expect(() => solid('red')).toThrow();
    expect(() => solid('#ffffff', 50)).toThrow();
    expect(() => linear([[0, '#000000']])).toThrow();
  });
});

describe('SpriteBuilder', () => {
  it('prefixes ids, wires parents and keeps creation order', () => {
    const b = new SpriteBuilder('enemy.3', { x: 10 });
    b.group('body');
    b.rect('torso', 20, 30, { fill: '#336699', radius: 6 }, 'body');
    b.circle('head', 8, { y: -20, fill: '#ffcc99' }, 'body');
    b.ellipse('shadow', 30, 10, { y: 4, fill: solid('#000000', 0.3) });
    const s = b.build();
    expect(s.rootId).toBe('enemy.3');
    expect(s.objects.map((o) => o.id)).toEqual(['enemy.3', 'enemy.3.body', 'enemy.3.torso', 'enemy.3.head', 'enemy.3.shadow']);
    const byId = new Map(s.objects.map((o) => [o.id, o]));
    expect(byId.get('enemy.3')?.children).toEqual(['enemy.3.body', 'enemy.3.shadow']);
    expect(byId.get('enemy.3.body')?.children).toEqual(['enemy.3.torso', 'enemy.3.head']);
    expect(byId.get('enemy.3.head')?.parentId).toBe('enemy.3.body');
    expect(byId.get('enemy.3')?.transform.x).toBe(10);
    expect(byId.get('enemy.3.head')?.geometry).toMatchObject({ type: 'Ellipse', width: 16, height: 16 });
    expect(validateSprite(s)).toEqual([]);
  });

  it('refuses duplicate parts, unknown parents and bad names', () => {
    const b = new SpriteBuilder('x');
    b.group('a');
    expect(() => b.group('a')).toThrow(/Duplicate/);
    expect(() => b.group('b', {}, 'nope')).toThrow(/Unknown parent/);
    expect(() => b.group(ROOT)).toThrow(/Invalid/);
    expect(() => b.group('has space')).toThrow(/Invalid/);
    expect(() => new SpriteBuilder('bad prefix')).toThrow();
  });

  it('places path geometry at its bounding-box center so points land where given', () => {
    const b = new SpriteBuilder('p');
    b.path('road', [{ x: 0, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 300 }], { stroke: { color: '#aa8855', width: 10 } });
    b.path('bolt', [{ x: 0, y: 0 }, { x: 10, y: 10 }], { dynamic: true, stroke: { color: '#ffffff', width: 2 } });
    b.path('curve', [{ x: 0, y: 0, outX: 0, outY: -50 }, { x: 100, y: 0, inX: 100, inY: -50 }], { closed: true, fill: '#00ff00' });
    const [, road, bolt, curve] = b.build().objects;
    expect(road?.transform).toMatchObject({ x: 100, y: 200 });
    expect(road?.geometry).toMatchObject({ type: 'Path', isClosed: false });
    expect(bolt?.geometry).toMatchObject({ width: DYNAMIC_PATH_BOX, height: DYNAMIC_PATH_BOX });
    expect(curve?.transform).toMatchObject({ x: 50, y: -25 });
    expect((curve?.geometry as { points: unknown[] }).points[0]).toEqual({ x: 0, y: 0, out_x: 0, out_y: -50 });
    expect(pathCenter([{ x: -10, y: 0 }, { x: 10, y: 4, inX: 30, inY: 4 }])).toEqual({ x: 10, y: 2 });
  });

  it('builds text and outlined text', () => {
    const b = new SpriteBuilder('ui');
    b.text('label', 'Wave 1', { size: 20 });
    const { groupId, textIds } = b.outlinedText('title', 'Hi', { size: 40, outline: { color: '#000000', width: 4 }, y: 10 });
    const s = b.build();
    const byId = new Map(s.objects.map((o) => [o.id, o]));
    expect(byId.get('ui.label')?.geometry).toMatchObject({ type: 'Text', text: 'Wave 1', fontSize: 20, fontFamily: 'Lilita One', textAlign: 'center' });
    expect(groupId).toBe('ui.title');
    expect(textIds).toHaveLength(outlineCopies(4) + 1);
    expect(textIds.at(-1)).toBe('ui.title.fill');
    expect(byId.get('ui.title')?.transform.y).toBe(10);
    const first = byId.get('ui.title.o0');
    expect(first?.transform).toMatchObject({ x: 4, y: 0 });
    expect(first?.style.fill).toMatchObject({ type: 'Solid', color: '#000000' });
    for (const id of textIds) expect(byId.get(id)?.style.stroke).toBeUndefined();
    expect(validateSprite(s)).toEqual([]);
  });

  it('uses more outline copies for wider outlines, within 8..16', () => {
    expect(outlineCopies(1)).toBe(8);
    expect(outlineCopies(6)).toBe(13);
    expect(outlineCopies(20)).toBe(16);
  });

  it('builds clips with resolved ids and refuses clips on the root or outside the duration', () => {
    const b = new SpriteBuilder('t');
    b.group('barrel');
    const fire = b.clip('fire', 0.3, {
      barrel: { x: [[0, 0], [0.05, -6, 'EaseOutQuad'], [0.3, 0]] },
    });
    expect(fire).toMatchObject({ id: 't#fire', name: 'fire', duration: 0.3 });
    expect(fire.tracks).toEqual([
      {
        object_id: 't.barrel',
        property: 'x',
        keyframes: [
          { time: 0, value: 0, easing: 'Linear' },
          { time: 0.05, value: -6, easing: 'EaseOutQuad' },
          { time: 0.3, value: 0, easing: 'Linear' },
        ],
      },
    ]);
    expect(b.build().clips.fire).toBe(fire);
    expect(() => b.clip('bad', 0.3, { [ROOT]: { x: [[0, 0]] } })).toThrow(/root/);
    expect(() => b.clip('late', 0.3, { barrel: { x: [[0, 0], [0.5, 1]] } })).toThrow(/outside/);
    expect(() => b.clip('ghost', 0.3, { nothing: { x: [[0, 0]] } })).toThrow(/Unknown part/);
    expect(() => b.clip('fire', 0.3, { barrel: { x: [[0, 0]] } })).toThrow(/Duplicate/);
  });
});

describe('engine effects and behaviors', () => {
  it('passes style effects and behaviors through to the objects', () => {
    const b = new SpriteBuilder('fx', { behaviors: [{ type: 'ParticleEmitter', settings: { rate: 20 } }] });
    b.circle('orb', 10, { fill: '#4fc3ff', effects: [{ type: 'Glow', mode: 'outer', color: '#4fc3ff', blur: 12 }] });
    const [root, orb] = b.build().objects;
    expect((orb?.style as { effects?: unknown }).effects).toEqual([{ isEnabled: true, type: 'Glow', mode: 'outer', color: '#4fc3ff', blur: 12 }]);
    expect((root as { behaviors?: unknown }).behaviors).toEqual([{ id: 'b0', sensors: [], enabled: true, type: 'ParticleEmitter', settings: { rate: 20 } }]);
    expect((orb as { behaviors?: unknown }).behaviors).toBeUndefined();
  });
});

describe('validateSprite', () => {
  it('reports broken structure', () => {
    const b = new SpriteBuilder('v');
    b.rect('a', 10, 10, { fill: '#ffffff' });
    const s = b.build();
    const a = s.objects[1];
    if (!a) throw new Error('missing part');
    a.parentId = 'v.missing';
    a.style = { fill: { type: 'Solid', color: 'red', opacity: 1 } };
    s.clips.c = { id: 'v#c', name: 'c', duration: 1, tracks: [{ object_id: 'v', property: 'x', keyframes: [{ time: 2, value: 0, easing: 'Linear' }] }] };
    const errors = validateSprite(s);
    expect(errors).toContain('v.a has missing parent v.missing');
    expect(errors).toContain('v.a color red is not #rrggbb');
    expect(errors).toContain('clip c targets the root');
    expect(errors).toContain('clip c key 2s outside 0..1s');
  });
});

describe('artboard helpers', () => {
  it('makes transparent layers and moves roots', () => {
    const b = new SpriteBuilder('s');
    b.circle('dot', 5, { fill: '#ffffff' });
    const sprite = placeRoot(b.build(), 30, 40, 2);
    expect(sprite.objects[0]?.transform).toMatchObject({ x: 30, y: 40, scale_x: 2, scale_y: 2 });
    const layer = makeArtboard('layer', sprite.objects, { background: null });
    expect(layer).toMatchObject({ width: 1280, height: 720, backgroundVisible: false });
    expect(makeArtboard('bg', [], { background: '#123456', width: 200, height: 100 })).toMatchObject({ backgroundColor: '#123456', backgroundVisible: true, width: 200 });
  });
});
