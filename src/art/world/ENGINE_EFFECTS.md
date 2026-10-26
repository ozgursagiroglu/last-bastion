# ExodeUI built-in effects (exodeui 7.2.18), measured

Read from `node_modules/exodeui/dist/index.mjs`. Rendered in `src/art/world/engineEffects.gallery.ts`
(`pnpm art:render effects`) and `src/render/scene/scene.gallery.ts` (`scene-fx-*`). Measured with
`src/art/world/engineEffects.test.ts`: N copies of the same energy orb (r 12, radial gradient, 2.5 px stroke) on a
1280×720 Node canvas, moving 3 px per frame, mean of 60 frames after 30 warm-up frames. That is Node canvas time:
the engine's JS plus N-API calls plus Skia CPU rasterization.

## Cost table (ms per frame, `engine.render`; `advance` is listed only where it matters)

| case | 1 | 10 | 40 | extra per instance at 40 |
| --- | --- | --- | --- | --- |
| plain orb (baseline) | 0.13 | 0.48–0.51 | 1.62–1.77 | — |
| hand-made glow (2 radial circles, `lighter`) | 0.15–0.19 | 0.89–0.94 | 3.1–3.3 | ≈ 40 µs |
| `Glow` outer (blur 12) | 0.19–0.32 | 1.16–1.36 | 3.8–4.2 | ≈ 55–60 µs |
| `Glow` inner (blur 10) | 0.12 | 0.53–0.56 | 2.0–2.1 | ≈ 9 µs |
| `Glow` outer on a group (2 children) | 0.24–0.28 | 1.64–1.76 | 6.4–7.7 | ≈ 120–150 µs |
| `LightTrail` length 12, not anchored | 0.21–0.22 | 1.31–1.42 | 5.2–7.0 | ≈ 90–130 µs (draws 11 copies in place) |
| `LightTrail` length 12, anchored | 0.21–0.38 | 1.31–2.59 | 4.9–5.4 | ≈ 85–90 µs |
| `ArtEffect` shimmer | 0.12–0.15 | 0.53–0.62 | 1.8–2.0 | ≈ 4–5 µs (+ needs `advance`) |
| `ArtEffect` glitch | 0.24 | 1.83–1.95 | 7.3–8.5 | ≈ 140–170 µs |
| `ParticleEmitter` (rate 60/s, life 1 s ≈ 45 live particles each) | 0.25 | 1.69–1.71 | 6.7 | ≈ 125 µs (≈ 2.8 µs per particle); advance 0.08 ms at 40 |

Ranges are two runs on a loaded machine.

**`engine.advance(dt)` on the game's world artboard (9.4k pooled objects) costs ≈ 3.6–3.9 ms per frame** whatever
is in it: `evaluateCodeAnimations` (2.2 ms) and `evaluateContinuousInteractions` (1.0 ms) walk every object.
`solveBehaviors` (the emitters) is only 0.09 ms. So the game never advances the world engine. Particles run on a
second, small engine (see below), and nothing else in this list needs engine time except shimmer.

## Glow — `style.effects: [{ type: 'Glow', mode: 'outer' | 'inner', color, blur, intensity }]`

- Outer (`applyOuterGlowUnderlay`): draws the object again, shifted 10 000 px away with a canvas shadow offset back
  (the shadow-offset trick), so only the shadow lands. It takes 2 passes (blur × 0.45, blur × 1.15) below
  intensity 2.5; each whole step above 1.5 adds a pass (up to 3 more), so 2.5 already draws 3 (`glowPasses` in
  `effects.ts`, checked against the engine in `effects.test.ts`). The game keeps every glow at 2 passes. Filled non-group shapes are clipped
  (even-odd) so the halo stays outside the shape. Groups are not clipped, and the pass re-renders the **whole
  subtree**, so cost scales with the children.
- Inner (`applyInnerGlowOverlay`): clips to the path and strokes it (width blur + 5) with a shadow. Cheap, but the
  stroke paints over the outline, so the shape looks washed out. Not used.
- `blur` is in device pixels (shadowBlur ignores the canvas transform): the halo is half as wide on a 2× backing
  store. Intensity 2 reads well; at intensity 1 the halo is faint.
- Defaults: blur 12 (outer) / 10 (inner), color white, intensity 1.
- Halos reach past the shape by about the blur. Bounding-box tests (tower box, decor ground line) needed smaller
  blurs, and build-menu icons drop the effect (`withoutEffects`).

## LightTrail — `style.effects: [{ type: 'LightTrail', length, fade, colorOverride }]`

- `applyLightTrailUnderlay`, run in `render`, before the shape's fill. It keeps a per-object history (private
  `engine.trailHistories`, keyed by object id) of the state keys **`left`, `top`, `angle`, `scaleX`, `scaleY`,
  `opacity`**, the last `length` (default 12, min 2) **rendered frames**. It draws a copy of the shape at each older
  entry, offset by (old − current) rotated by −angle, scaled 0.88–1, alpha `(1 − age/length) × 0.85`. It uses the
  shape's own fill, stroke and blend.
- **The engine never sets `left/top/angle`** (our state has x/y/rotation), so an unanchored trail draws its copies
  all at offset 0: no trail, just overdraw. The adapter must write `left/top` (the part's position; only
  differences matter) and `angle` (the rotation of the part's frame) every frame:
  `src/render/scene/engineFx.ts#anchorTrail`.
- **Pooled reuse**: hidden objects are not rendered, so their history freezes. A slot reused elsewhere draws ghost
  copies at its old place for `length` frames (`effects-trail-pooled.png`). There is no API to reset it;
  `clearTrail` deletes the id from the private map (tested, so an engine change shows up).
- Length is counted in rendered frames, not time: half as long at 120 Hz. While paused (scene renders with dt 0)
  the trail shrinks into the shape. Copies with a stroke look like a dark smear: carriers must be soft, stroke-less
  shapes.
- Cost is one full shape draw per copy, so keep `length` short and the carrier simple.

## ArtEffect — `style.effects: [{ type: 'ArtEffect', effectType, intensity, speed, scale, ... }]`

- `applyArtEffectOverlay`: clips to the path, then shimmer, glint_overlay, halftone, noise, scanlines,
  chromatic_aberration, pixelate, glitch, fold/crumple overlays, acid gradients, image_* tints.
- shimmer: a white band (alpha intensity × 0.8, `screen` blend) sweeping a diagonal gradient twice the box size.
  Its position comes from **`engine.currentTime`, which only `advance` moves**, so on our world it needs the 3.6 ms
  advance. It is also invisible half of each cycle (`2/speed` s). Cheap to draw (≈ 4 µs), unusable here:
  **not used** (the level-3 gold trim keeps its static look).
- glitch, pixelate: `drawImage` of the canvas itself, `Math.random`, `document.createElement` (crumple, halftone)
  every frame. Expensive and nondeterministic: never use.

## ParticleEmitter — `behaviors: [{ type: 'ParticleEmitter', settings: { ... } }]`

- `solveBehaviors` (in `advance`) spawns `floor(rate × dt)` particles per step (plus `_pendingBurst`, only set by
  state-machine EMIT nodes). Each spawns at the emitter's **state x/y**: artboard space for roots, but a child's
  local x/y would be read as artboard coordinates, so **emitters must be roots**. Direction is uniform over 360°,
  speed is speed × 0.5–1, life is lifetime × 0.5–1, size is size × 0.5–1.5. Each step applies
  `vy += gravity × dt × 10`. All randomness is `Math.random` (not deterministic). One color per emitter.
- Settings use `||` defaults: rate 10, speed 100, size 5, lifetime 2, gravity 0, color white, maxParticles 200.
  **`rate: 0` means 10.** `rateInputId` / `speedInputId` / `gravityInputId` read engine inputs
  (`setInputNumber`, works without a state machine, cleared by `load`), and an input of 0 does stop emission.
- **`floor(rate × dt)` drops fractions**: at 60 fps any rate below 60/s emits nothing. The adapter does the
  bookkeeping: it sets the rate input to `(count + 0.5) / dt` for one step, then back to 0.
- Drawing (`render`): after all roots, `arc` at (x, y), radius `max(1, size × opacity)`, alpha = remaining life.
  Particles are drawn on top of everything, ignore zIndex, and are drawn **even when the emitter is hidden**.
  Hidden emitters also keep emitting. Visibility does nothing; the rate is the only switch.
- The engine draws particles in `render` but moves them only in `advance`: with dt 0 (paused) they freeze.

## CustomEffect

Not needed: everything wanted was covered above or by hand-made art.

## What the game uses

| where | effect | settings |
| --- | --- | --- |
| tesla sphere (one tier part per level) | outer Glow | energy light, blur 10, intensity 2 |
| frost core crystal (one tier part per level) | outer Glow | ice light, blur 8 (L3: 5, keeps the tower box) |
| lightning core path | outer Glow | `#9ff2ff`, blur 10, intensity 2 (2 passes) |
| explosion core | outer Glow | `#ffd27a`, blur 20 |
| rocket / ice shard / cannonball | LightTrail on a soft `lightTrail` carrier part | length 9 / 8 / 6 |
| explosions | particles | sparks (11 × r/50) + debris (5 × r/50) |
| frost bursts | particles | 10 ice motes |
| volcano lava pools and vents | particles | embers, 2.5/s each, rising |
| lava pools, vent craters (terrain, rendered once) | canvas `shadow` | `#ff6a10`, blur 6 |

A glowing part covered by a bigger one still draws its glow, so the tesla sphere and frost core are tier parts: each
level shows only its own, and a tower never draws more than one glow.

Particles live on a **second engine drawn over the world canvas** (`src/render/scene/particleLayer.ts`). Its
artboard holds only root emitters (12 burst emitters + one per molten surface), and `overlayCanvas` gives it a
context whose `clearRect` is a no-op, so it draws over the world instead of clearing it. Its `advance` costs
microseconds.

## Budget (level-10 perf fixture, 120 enemies, 30 moving projectiles, explosions, frost bursts, lightning)

`src/render/scene/gameScene.perf.test.ts` renders a scene with engine effects and one without
(`{ engineEffects: false }`) in lockstep, and takes the per-frame difference:

- Engine JS (no-op 2D context, so no rasterizer): **+0.15 / +0.90 / +1.27 ms median per frame** in three runs, over
  42–54 ms without effects. With `PERF_BUDGET=1` the test asserts at most 2.0 ms median; without it (as on
  shared CI runners) it only measures, prints and checks that both scenes rendered every frame. Effects to add later should
  be paid for elsewhere.
- Node canvas (16×9, so N-API and Skia CPU cost included): **+3.7–3.8 ms median** over ≈ 114–133 ms (≈ +3%).
  Inside that, trails ≈ 2.6 ms, glows ≈ 2.3 ms, particle overlay ≈ 1.6 ms, measured inside the engine routines
  on a loaded machine. This is mostly per-draw-call native cost, which Node pays far more than a browser does.

## Switching effects off at runtime

`GameScene.setEngineEffects(on)` is the runtime form of `GameSceneOptions.engineEffects`. Object state merges arrays
by index, so emptying `style.effects` would not remove an authored effect: each Glow entry gets
`isEnabled: false` (`engineFx.ts#setEffectEnabled`; the engine skips disabled entries), trail carriers are hidden
(their history is cleared when they come back), and particles are no longer thrown, advanced or drawn.

The app's quality guard (`src/app/qualityGuard.ts`) is fed by `Shell` with the real interval between animation
frames, because the raster and compositing cost of glows and trails is paid by the browser after the frame's JS and
only shows up there. It first learns the device's own pace from menu frames (the median of the first 90; if a level
starts earlier, the median of those seen, or 60 Hz with fewer than 20), so a display capped at 30 Hz is not mistaken
for a slow one: the threshold is max(22 ms, 1.35 × that pace). It drops the effects once the average of the last 120
level frames, each counted at most 100 ms so a single stall is not a trend, has stayed above the threshold for 3 s of
real time, measured afresh for each level. A frame-rate cap that starts mid-level (an energy saver) also drops them,
which is intended. It logs one `console.info` line, and effects stay off for the rest of the
session, new levels included.
