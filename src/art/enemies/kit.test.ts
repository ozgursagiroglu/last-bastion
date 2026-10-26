import { describe, expect, it } from 'vitest';
import { pixelAt, renderArtboard } from '../../platform/nodeCanvas';
import { makeArtboard, placeRoot, SpriteBuilder, type PathPoint } from '../exode';
import { BAR_GAP, BAR_HEIGHT, bobKeys, buildEnemy, buildIcon, ellipsePoints, legTracks, limb, loopKeys, poly, walkStride, type EnemyDesign } from './kit';

function paint(points: PathPoint[]) {
  const b = new SpriteBuilder('k');
  b.path('p', points, { closed: true, fill: '#ffffff' });
  return renderArtboard(makeArtboard('k', b.build().objects, { width: 100, height: 100, background: null }));
}

describe('shapes', () => {
  it('draws a bezier ellipse where it is given', () => {
    const c = paint(ellipsePoints({ x: 50, y: 40, rx: 20, ry: 10 }));
    expect(pixelAt(c, 50, 40)[3]).toBe(255);
    expect(pixelAt(c, 32, 40)[3]).toBe(255);
    expect(pixelAt(c, 50, 32)[3]).toBe(255);
    expect(pixelAt(c, 50, 53)[3]).toBe(0);
    expect(pixelAt(c, 33, 31)[3]).toBe(0);
  });

  it('draws a tapered limb with round ends', () => {
    const c = paint(limb(20, 50, 80, 50, 10, 4));
    expect(pixelAt(c, 50, 50)[3]).toBe(255);
    expect(pixelAt(c, 17, 50)[3]).toBe(255);
    expect(pixelAt(c, 22, 53)[3]).toBe(255);
    expect(pixelAt(c, 79, 54)[3]).toBe(0);
    expect(pixelAt(c, 86, 50)[3]).toBe(0);
    expect(() => limb(1, 1, 1, 1, 2)).toThrow();
  });

  it('keeps several sub-paths in one path', () => {
    const points = [...poly([[10, 10], [30, 10], [30, 30], [10, 30]]), ...poly([[60, 10], [80, 10], [80, 30]])];
    expect(points.filter((p) => p.moveTo)).toHaveLength(2);
    expect(points.filter((p) => p.close)).toHaveLength(2);
    const c = paint(points);
    expect(pixelAt(c, 20, 20)[3]).toBe(255);
    expect(pixelAt(c, 45, 20)[3]).toBe(0);
    expect(pixelAt(c, 75, 15)[3]).toBe(255);
  });
});

describe('walk keys', () => {
  it('loops through values at even times and closes on the first value', () => {
    expect(loopKeys(1, [0, 4], 'Linear')).toEqual([[0, 0, 'Linear'], [0.5, 4, 'Linear'], [1, 0]]);
    expect(() => loopKeys(1, [])).toThrow();
  });

  it('swings the legs in opposition around the hip and lifts each during its forward swing', () => {
    const tracks = legTracks(1, 20, 3, -10, 'a', 'b');
    expect(tracks.a?.rotation?.map((k) => k[1])).toEqual([-20, 20, -20]);
    expect(tracks.b?.rotation?.map((k) => k[1])).toEqual([20, -20, 20]);
    expect(tracks.a?.y?.map((k) => k[1])).toEqual([-10, -10, -10, -13, -10]);
    expect(tracks.b?.y?.map((k) => k[1])).toEqual([-10, -13, -10, -10, -10]);
  });

  it('bobs lowest at each foot plant', () => {
    expect(bobKeys(2, -8, 2).map((k) => [k[0], k[1]])).toEqual([[0, -8], [0.5, -10], [1, -8], [1.5, -10], [2, -8]]);
  });

  it('derives the stride from leg length and swing', () => {
    expect(walkStride(10, 30)).toBeCloseTo(20);
    expect(walkStride(9, 25)).toBeCloseTo(15.2, 1);
  });
});

const TINY: EnemyDesign = {
  kind: 'flyer',
  height: 20,
  barWidth: 16,
  stride: 21,
  shadow: { width: 10, height: 4, opacity: 0.2 },
  bodyY: -12,
  die: 'drop',
  draw(b) {
    b.group('bob', {}, 'body');
    b.circle('ball', 6, { fill: '#ff0000' }, 'bob');
  },
  overlayParent: 'bob',
  silhouette: [{ x: 0, y: 0, rx: 6, ry: 6 }],
  walk: (d) => ({ bob: { y: loopKeys(d, [0, -2]) } }),
  icon: { scale: 2, centerX: 0, centerY: -10 },
};

describe('buildEnemy', () => {
  it('lays out shadow, face › body › art + overlays, and the bar above the head', () => {
    const s = buildEnemy(TINY, 'tiny');
    const byId = new Map(s.objects.map((o) => [o.id, o]));
    expect(byId.get('tiny')?.children).toEqual(['tiny.shadow', 'tiny.face', 'tiny.hp']);
    expect(byId.get('tiny.body')?.transform.y).toBe(-12);
    expect(byId.get('tiny.bob')?.children).toEqual(['tiny.ball', 'tiny.frost', 'tiny.flash']);
    expect(byId.get('tiny.hp')?.transform.y).toBe(-(20 + BAR_GAP + BAR_HEIGHT / 2));
    expect(s.shieldBubbleId).toBeNull();
    expect(s.clips.walk?.duration).toBeCloseTo(21 / 70);
  });

  it('drops a flyer by 30 px while it dies', () => {
    const y = buildEnemy(TINY, 'tiny').clips.die?.tracks.find((t) => t.object_id === 'tiny.body' && t.property === 'y');
    expect(y?.keyframes[0]?.value).toBe(-12);
    expect(y?.keyframes.at(-1)?.value).toBe(18);
  });

  it('adds a shield bubble when the design has one', () => {
    const s = buildEnemy({ ...TINY, bubble: { x: 0, y: 0, rx: 9, ry: 9 } }, 'b');
    expect(s.shieldBubbleId).toBe('b.bubble');
    expect(s.objects.find((o) => o.id === 'b.bubble')?.style.compositeOperation).toBe('lighter');
  });
});

describe('buildIcon', () => {
  it('scales the figure and centers the framing point on the root, without overlays or bar', () => {
    const icon = buildIcon(TINY, 'i');
    const ids = icon.objects.map((o) => o.id);
    expect(ids).not.toContain('i.hp');
    expect(ids).not.toContain('i.frost');
    expect(icon.objects.find((o) => o.id === 'i.face')?.transform).toMatchObject({ x: 0, y: 20, scale_x: 2, scale_y: 2 });
    const c = renderArtboard(makeArtboard('i', placeRoot(icon, 50, 50).objects, { width: 100, height: 100, background: null }));
    expect(pixelAt(c, 50, 46)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(c, 50, 36)[3]).toBe(255);
    expect(pixelAt(c, 50, 31)[3]).toBe(0);
  });
});
