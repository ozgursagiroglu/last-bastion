/** One level being played: the sim, the world scene and the HUD on three stacked canvases, driven at a fixed step. */
import { createSimulation } from '../game/sim';
import type { Difficulty, GameEvent, LevelDef, Simulation, Vec2, WorldView } from '../game/types';
import { GameScene } from '../render/scene/gameScene';
import type { CanvasLike } from '../render/stage';
import { GameHud, overlayOf, type OverlayKind } from '../ui/hud/gameHud';
import type { MascotBubblePose } from '../ui/hud/mascotBubble';
import type { HudAction, HudState, PointerKind } from '../ui/types';
import type { Audio } from './audio';
import { planSteps } from './loop';
import { NO_MASCOT, type MascotPort } from './mascot';
import { INITIAL_MEMORY, mascotPose, overlayExpression, react, type MascotMemory } from './reactions';
import { Shaker, shakeFor } from './shake';
import type { Settings } from './storage';

export type SessionAction = { type: 'quit' } | { type: 'restart' } | { type: 'continue' } | { type: 'won'; stars: 1 | 2 | 3 } | { type: 'toggleSound' };

export interface GameLayers {
  bg: CanvasLike;
  world: CanvasLike;
  hud: CanvasLike;
}

export class GameSession {
  readonly sim: Simulation;
  readonly scene: GameScene;
  readonly hud: GameHud;
  private speed: 1 | 2 = 1;
  private paused = false;
  private carry = 0;
  /** Real seconds the session has run unpaused (mascot reactions and shake run on it, not on sim time). */
  private clock = 0;
  private memory: MascotMemory = INITIAL_MEMORY;
  private overlay: OverlayKind = 'none';
  private readonly shaker = new Shaker();

  constructor(
    layers: GameLayers,
    readonly level: LevelDef,
    readonly difficulty: Difficulty,
    private readonly audio: Audio,
    private readonly mascot: MascotPort = NO_MASCOT,
  ) {
    this.sim = createSimulation(level, difficulty);
    this.scene = new GameScene(layers.bg, layers.world, level);
    this.hud = new GameHud(layers.hud, level);
    mascot.hide();
    mascot.setFollow(false);
  }

  /** CSS offset to shake the bg and world layers by this frame. */
  get shake(): Vec2 {
    return this.shaker.offset;
  }

  /** What King Sunny remembers of this level (tests read it). */
  get mascotMemory(): MascotMemory {
    return this.memory;
  }

  get view(): WorldView {
    return this.sim.view;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get currentSpeed(): 1 | 2 {
    return this.speed;
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number): void {
    this.scene.resize(cssWidth, cssHeight, devicePixelRatio);
    this.hud.resize(cssWidth, cssHeight, devicePixelRatio);
  }

  /** Pause a running level (the tab was hidden). Only the player resumes. */
  pause(): void {
    if (this.view.status === 'running') this.paused = true;
  }

  /** Advance by one display frame and draw it. Returns 'won' on the frame the level is won. */
  frame(realDt: number, settings: Settings): SessionAction | null {
    const dt = Math.max(0, realDt);
    const live = this.paused ? 0 : dt;
    this.clock += live;
    this.shaker.advance(live);
    const plan = planSteps(this.carry, dt, this.speed, this.paused);
    this.carry = plan.carry;
    let won: SessionAction | null = null;
    for (let i = 0; i < plan.steps; i++) {
      const events = this.sim.step();
      this.scene.onEvents(events, this.view);
      this.hud.onEvents(events, this.view);
      this.audio.onEvents(events);
      this.react(events);
      for (const e of events) if (e.type === 'levelWon') won = { type: 'won', stars: e.stars };
    }
    if (this.view.status !== 'running') this.paused = false;
    const bubble = this.poseMascot();
    this.scene.render(this.view, this.paused ? 0 : dt * this.speed);
    this.hud.render(this.view, { ...this.hudState(settings), mascot: bubble }, dt);
    return won;
  }

  private react(events: readonly GameEvent[]): void {
    const shake = shakeFor(events);
    if (shake) this.shaker.start(shake);
    const r = react(this.memory, events, this.view, this.clock);
    this.memory = r.memory;
    if (r.started) this.mascot.play(r.started.expression);
  }

  /** Place the portrait for this frame; returns the bubble the HUD draws beside it. */
  private poseMascot(): MascotBubblePose | null {
    const overlay = overlayOf(this.view, this.paused);
    if (overlay !== this.overlay) {
      this.overlay = overlay;
      const expression = overlayExpression(overlay, this.view.stars);
      if (expression) this.mascot.play(expression);
    }
    const pose = mascotPose(overlay, this.memory, this.clock);
    if (!pose) {
      this.mascot.hide();
      return null;
    }
    this.mascot.show(pose.portrait, (p) => this.hud.stage.toCss(p));
    return pose.bubble;
  }

  /** A pointer event at CSS pixels relative to the canvases' top-left corner. */
  pointer(kind: PointerKind, cssX: number, cssY: number): SessionAction | null {
    const action = this.hud.pointer(kind, this.hud.stage.toDesign(cssX, cssY), this.view);
    return action ? this.handle(action) : null;
  }

  /** A KeyboardEvent.key value. */
  key(key: string): SessionAction | null {
    const action = this.hud.key(key, this.view);
    return action ? this.handle(action) : null;
  }

  private hudState(settings: Settings): HudState {
    return { speed: this.speed, paused: this.paused, soundOn: settings.soundOn };
  }

  private handle(action: HudAction): SessionAction | null {
    if (action.type === 'command') {
      const result = this.sim.command(action.command);
      if (!result.ok) {
        this.hud.commandFailed(result.reason);
        this.audio.play('error');
      }
      return null;
    }
    this.audio.play('click');
    switch (action.type) {
      case 'pause':
        this.pause();
        return null;
      case 'resume':
        this.paused = false;
        return null;
      case 'toggleSpeed':
        this.speed = this.speed === 1 ? 2 : 1;
        return null;
      case 'toggleSound':
      case 'restart':
      case 'quit':
      case 'continue':
        return { type: action.type };
    }
  }
}
