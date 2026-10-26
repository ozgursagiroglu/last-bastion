# Last Bastion — project rules

A 10-level tower defense game with three difficulties (easy, normal, hard), built to try the **ExodeUI** runtime
(`exodeui@7.2.18`, pinned). ExodeUI renders every pixel: sprites, terrain, effects, HUD and menus are ExodeUI artboards
built in TypeScript. Game logic is plain TypeScript. UI text is English.

## Stack and commands

- Vite 8, TypeScript 7 (strict, `noUncheckedIndexedAccess`), Vitest 5, pnpm. Plain TS in the browser (no React
  components; react/three are only peer dependencies of exodeui).
- `pnpm typecheck` · `pnpm test` (vitest; `pnpm test src/game/sim` runs a subset) · `pnpm build`
- `pnpm art:render [filter]` renders every gallery entry (`src/**/*.gallery.ts`, see `src/art/gallery.ts`) to
  `out/renders/<name>.png`. Open the PNG with the Read tool to look at it.
- Never add, remove or upgrade dependencies; never edit `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`.

## Layout

| Path | What | Rules |
| --- | --- | --- |
| `src/game/types.ts`, `src/game/config/**` | shared contracts and stat tables | read-only for lanes |
| `src/game/sim/**` | simulation (`createSimulation`) | pure TS: no DOM, no exodeui, deterministic, no `Math.random`/`Date` |
| `src/game/levels/**` | the 10 `LevelDef`s | data + validation, no DOM, no exodeui |
| `src/art/exode.ts`, `src/art/types.ts`, `src/art/palette.ts`, `src/art/fonts.ts`, `src/art/gallery.ts` | shared art contracts | read-only for lanes |
| `src/art/towers/**`, `src/art/enemies/**`, `src/art/world/**`, `src/art/ui/**` | artboard builders | builders are pure (objects in, objects out). Only `pose.ts` files write engine state, and only through `src/render/exodeRuntime.ts`: they are the executable form of the sprite contract, shared by galleries and adapters |
| `src/render/stage.ts`, `src/render/exodeRuntime.ts` | shared runtime helpers | read-only for lanes |
| `src/render/scene/**` | world rendering adapter | reads the sim view, writes engine state |
| `src/ui/**` | HUD and menus (art + controllers) | |
| `src/app/**`, `src/main.ts` | app shell, loop, screens, audio, storage | the only code that touches `window`/`document` besides `Stage` users |
| `src/platform/nodeCanvas.ts` | Node rendering for tests and galleries | never imported by browser code |

## Code rules

- Strict types; no `any` (use `unknown` and narrow). No non-null assertions on array indexing; handle `undefined`.
- Small focused modules; no duplication — reuse `src/art/exode.ts`, `src/render/exodeRuntime.ts`, `src/game/config`.
- Relative imports. `import type` for type-only imports (`verbatimModuleSyntax`).
- Every module gets tests next to it (`foo.ts` → `foo.test.ts`). Tests are part of done.
- Comments only where the code cannot say it. No commented-out code, no TODOs left behind.
- Stay inside your lane's scope; read anything, change only what you own.

## ExodeUI facts (verified on 7.2.18; tests in `src/platform/nodeCanvas.test.ts`, `src/render/stage.test.ts`)

- Import from `'exodeui'` (ESM). The engine is `ExodeUIEngine`: `load(artboard)`, `advance(dt)`,
  `render(ctx, w, h)`, `applyAnimation(clip, t)`, `updateObjectProperty(id, prop, value)`, `getObjectState(id)`.
  We drive it ourselves through `Stage` (`src/render/stage.ts`); `ExodeUICanvas` (React) is not used.
- One engine renders one canvas: `render()` clears the whole canvas first. Layers are stacked canvases.
- There is no runtime API to add or remove objects: the object list is fixed at `load()`. Dynamic things (enemies,
  projectiles, effects) are pools of hidden instances that the adapter shows, moves and hides.
- Shapes are drawn centered on their transform (x, y). Children are positioned relative to the parent's origin and
  inherit its rotation, scale, flip and opacity. `visible: false` on a group hides its whole subtree.
- Rotation is in degrees, clockwise on screen. Opacity is 0..1 (values above 1 are read as percent: never use them).
- Root objects draw in `zIndex` order (`setZ`); siblings draw in `children` order (creation order in SpriteBuilder).
- A Group with a width/height clips its children; SpriteBuilder groups have none, so they never clip.
- Colors must be `'#rrggbb'` (gradient stop opacity is computed by parsing 6-digit hex).
- A Path is drawn relative to the bounding-box center of its points (handles included); `SpriteBuilder.path` handles
  that, so points land where given. Bezier handles are absolute (`inX/inY`, `outX/outY`).
- Paths whose points change at runtime must be built with `{ dynamic: true }` and updated with `setPathPoints`, with
  the same number of points (arrays merge by index).
- Text: the renderer reads the `text` property (use `setText` with every id of an outlined text). Never stroke text:
  the engine paints a text stroke over the glyph fill, with miter joins (spikes at sharp corners), sized in screen
  pixels. `SpriteBuilder.outlinedText` draws outlines as offset fill copies instead. The font is `GAME_FONT`
  ('Lilita One', self-hosted).
- Clip keyframes interpolate numbers and `'#rrggbb'` colors; the easing on a key applies to the segment it starts.
  Easing names are exact (`EaseInOutSine`, `EaseOutBack`, ... see `Easing` in `src/art/exode.ts`); unknown names fall
  back to linear. Animating `style.fill.color` turns a gradient fill into a solid one.
- `applyAnimation` looks each track's object up by a linear scan: keep clips to the parts that move.
- Found by lanes: a Star shape with a radial gradient paints nothing (use solid fills on stars); gradients on paths are
  sized from the path's points only, not its bezier handles (a path whose points lie on one line gets an empty
  gradient); animating a scale through 0 draws a stray line across the canvas (stop at a small positive scale).
- Built-in effects in use (measured; details in `src/art/world/ENGINE_EFFECTS.md`): `style.effects` Glow (outer;
  canvas shadow, about 55 µs per instance, blur in device pixels) on a few hero parts; LightTrail on projectiles (it
  reads `left`/`top`/`angle`, which the adapter writes every frame, and its history must be cleared when a pooled slot
  is reused: `src/render/scene/engineFx.ts`); ParticleEmitter only on root emitters of the small particle engine
  drawn over the world canvas (it emits `floor(rate × dt)` per step and keeps emitting while hidden).
- `advance()` walks every object: about 3.6 ms per frame on the 9.4k-object world artboard, so the world stage is
  never advanced; clips are baked and replayed (`src/render/scene/bakedClips.ts`).
- Do not use: other `behaviors` (Float, Pulse, ... accumulate per frame and use wall-clock time, so they drift),
  `style.adjustments` (logs to the console every time the filter changes), masks, `blur`/filters, `physics`,
  `codeAnimation(s)`, Inner Glow (paints over the outline), the glitch ArtEffect (random and costly). Canvas shadows
  (`shadow`) cost a lot per draw call: static art (terrain), a handful of UI panels and the measured Glow parts only.
  Use a translucent ellipse for contact shadows.
- Measured cost: about 3.5 µs of engine JS per visible shape per frame. Hidden subtrees are nearly free.
- The mascot is ExodeUI's own `<exode-mascot>` web component (script from exodeui.com, art served from
  `public/mascots` because exodeui.com sends no CORS headers); see `src/app/mascot.ts`.

## Art style

- Cartoon, 3/4 top-down (Kingdom Rush feel): chunky readable shapes, dark brown outline `OUTLINE` (2–3 px), vertical
  gradients from a palette ramp (light top → dark bottom) for volume, a soft white highlight (opacity 0.25–0.35) on
  top-left surfaces, a contact-shadow ellipse (black, opacity 0.25–0.35) under every unit and tower. Light from the
  top-left. Use `PALETTE` ramps from `src/art/palette.ts`; add local colors only when a ramp does not fit.
- No detail smaller than 2 px at 1× (the board is 1280×720 and usually shown at that size or larger).
- Look at what you build: write gallery entries (close-ups at scale 2–3, filmstrips of every clip at several times,
  every variant side by side) and open the PNGs. Iterate until it reads well at 1×.
- `src/art/exode.gallery.ts` is the reference for technique (outline, gradient, highlight, shadow, outlined text).

## Tests

- `pnpm test` must pass and `pnpm typecheck` must be clean before you finish.
- Art builders: `validateSprite` returns no errors for every variant; every clip the contract names exists; render
  each variant with `renderArtboard` and assert it paints where expected (`countPainted`, `pixelAt`).
- Adapters: drive a real engine via `loadEngine` and assert object state (`engine.getObjectState(id)`) or pixels.
