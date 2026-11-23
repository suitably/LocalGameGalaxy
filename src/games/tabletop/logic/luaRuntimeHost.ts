/**
 * The host page's side of the Lua runtime [ID: LOGIC-TABLETOP-LUA-HOST]
 *
 * Owns the Worker (created through `deps.createWorker`, so tests use a fake): sends it the
 * table before each job, turns observed actions and table diffs into events (`luaEvents.ts`),
 * applies the script intents `acceptScriptIntent` allows, writes `onSave` results and unshimmed
 * calls into the game (`APPLY_EDIT_DELTA` on `scripts` / `importReport`), pauses while the tab
 * is hidden (events wait in a queue) and kills a Worker whose job runs past the timeout. Every
 * applied intent is a complete reducer action, so a killed Worker leaves a consistent table.
 */
import type { TabletopAction } from './tabletopReducer';
import type { ImportReport, TabletopGameDefinition } from './types';
import type { LuaFromWorker, LuaToWorker } from './luaProtocol';
import { LUA_JOB_TIMEOUT_MS, LUA_START_TIMEOUT_MS } from './luaProtocol';
import { acceptScriptIntent } from './luaScriptIntent';
import { applyLuaSave } from './luaScriptState';
import {
  actionEvents,
  diffEvents,
  LuaDragTracker,
  senderColor,
  type LuaRuntimeEvent,
} from './luaEvents';
import { newSeed } from './rng';
import { LUA_RUNTIME_BUTTON_PREFIX, LUA_TRANSLATED_BUTTON_PREFIX } from './luaShimTypes';

export interface LuaWorkerLike {
  postMessage(message: LuaToWorker): void;
  terminate(): void;
  onmessage: ((event: { data: LuaFromWorker }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

export type LuaRuntimeStatus = 'starting' | 'running' | 'stopped' | 'killed' | 'failed';

export interface LuaLogLine {
  text: string;
  to: string;
}

export interface LuaHostDeps {
  createWorker(): LuaWorkerLike;
  dispatch(action: TabletopAction): void;
  getGame(): TabletopGameDefinition;
  viewerSeat(): number | null;
  now(): number;
  /** Status or log changed (for the UI). */
  onChange(): void;
}

/** Lines kept in the script log; events queued while hidden. */
export const MAX_LUA_LOG = 200;
export const MAX_LUA_QUEUE = 500;
/** `onSave` is collected this often while running. */
export const LUA_SAVE_EVERY_MS = 10_000;

/** The report with the unshimmed names added, or the same object when none are new. */
export function withUnshimmed(report: ImportReport | undefined, names: string[]) {
  const known = new Set(report?.unshimmed ?? []);
  const fresh = names.filter((n) => !known.has(n));
  if (!report || fresh.length === 0) return report;
  return { ...report, unshimmed: [...known, ...fresh].slice(0, MAX_LUA_LOG) };
}

/**
 * Back to the static table when the runtime stops: script buttons go, the translator's buttons
 * (hidden while scripts ran, `luaSession.ts`) come back.
 */
export function runtimeButtonCleanup(game: TabletopGameDefinition): TabletopAction[] {
  const ids = Object.keys(game.widgets);
  const runtime = ids.filter((id) => id.startsWith(LUA_RUNTIME_BUTTON_PREFIX));
  const hidden = ids.filter(
    (id) => id.startsWith(LUA_TRANSLATED_BUTTON_PREFIX) && game.widgets[id].display === false,
  );
  const actions: TabletopAction[] = [];
  if (runtime.length > 0) actions.push({ type: 'DELETE_WIDGETS', payload: { ids: runtime } });
  if (hidden.length > 0) {
    const patches = Object.fromEntries(hidden.map((id) => [id, { display: true }]));
    actions.push({ type: 'PATCH_WIDGETS', payload: { patches } });
  }
  return actions;
}

export class LuaRuntimeHost {
  status: LuaRuntimeStatus = 'stopped';
  readonly log: LuaLogLine[] = [];
  readonly unshimmed = new Set<string>();
  private worker: LuaWorkerLike | null = null;
  private pending = 0;
  private busySince = 0;
  private sentGame: TabletopGameDefinition | null = null;
  private userActed = false;
  private hidden = false;
  private queue: LuaRuntimeEvent[] = [];
  private lastTick = 0;
  private lastSave = 0;
  private stopping = false;
  private readonly drags = new LuaDragTracker();

  private readonly deps: LuaHostDeps;

  constructor(deps: LuaHostDeps) {
    this.deps = deps;
  }

  start(): void {
    this.stopping = false; // a restart while a shutdown waits for onSave keeps running
    if (this.worker) return;
    const worker = this.deps.createWorker();
    this.worker = worker;
    worker.onmessage = (event) => this.receive(event.data);
    worker.onerror = () => this.fail('worker error');
    this.status = 'starting';
    this.lastTick = this.lastSave = this.deps.now();
    this.sentGame = this.deps.getGame();
    this.post({ t: 'start', game: this.sentGame, seed: newSeed() });
    this.deps.onChange();
  }

  /** Turned off by the user: collect `onSave()` first, then stop and restore the buttons. */
  shutdown(): void {
    if (this.status === 'running' && this.pending === 0) {
      this.stopping = true;
      this.save();
    } else this.stop();
  }

  /** Stops the Worker; the game keeps everything the scripts did. */
  stop(status: LuaRuntimeStatus = 'stopped'): void {
    if (this.worker)
      for (const a of runtimeButtonCleanup(this.deps.getGame())) this.deps.dispatch(a);
    this.stopping = false;
    this.worker?.terminate();
    this.worker = null;
    this.pending = 0;
    this.queue = [];
    this.status = status;
    this.deps.onChange();
  }

  /** Every action the host applies (not the scripts' own) passes here first. */
  observe(action: TabletopAction): void {
    if (!this.worker) return;
    this.userActed = true;
    const game = this.deps.getGame();
    const color = senderColor(action, game, this.deps.viewerSeat());
    this.deliver(actionEvents(action, game, color, this.drags, this.deps.now()));
  }

  /** The host's table changed (after a render). */
  gameChanged(prev: TabletopGameDefinition, next: TabletopGameDefinition): void {
    if (!this.worker || !this.userActed) return;
    this.userActed = false;
    this.deliver(diffEvents(prev, next));
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (hidden) this.save();
    else this.deliver([]);
  }

  /** Host tick: wait timers, idle drops, periodic save, watchdog. */
  tick(): void {
    if (!this.worker) return;
    const now = this.deps.now();
    const limit = this.status === 'starting' ? LUA_START_TIMEOUT_MS : LUA_JOB_TIMEOUT_MS;
    if (this.pending > 0 && now - this.busySince > limit) {
      this.note('script timeout: Worker stopped', 'error');
      this.stop('killed');
      return;
    }
    if (this.hidden || this.status !== 'running' || this.pending > 0) return;
    this.deliver(this.drags.due(now));
    this.syncGame();
    this.post({ t: 'tick', dt: (now - this.lastTick) / 1000 });
    this.lastTick = now;
    if (now - this.lastSave >= LUA_SAVE_EVERY_MS) this.save();
  }

  /** Collects `onSave()` now (also on pause and stop). */
  save(): void {
    if (this.status !== 'running') return;
    this.lastSave = this.deps.now();
    this.post({ t: 'save' });
  }

  private deliver(events: LuaRuntimeEvent[]): void {
    this.queue.push(...events);
    if (this.queue.length > MAX_LUA_QUEUE) this.queue.splice(0, this.queue.length - MAX_LUA_QUEUE);
    if (this.hidden || this.status !== 'running' || this.queue.length === 0) return;
    this.syncGame();
    for (const e of this.queue.splice(0)) {
      if (e.kind === 'click') this.post({ t: 'click', buttonId: e.buttonId, color: e.color });
      else if (e.kind === 'turn') this.post({ t: 'turn', color: e.color, previous: e.previous });
      else this.post({ t: 'event', name: e.name, args: e.args, owner: e.owner });
    }
  }

  private syncGame(): void {
    const game = this.deps.getGame();
    if (game === this.sentGame) return;
    this.sentGame = game;
    this.post({ t: 'game', game });
  }

  private post(message: LuaToWorker): void {
    if (!this.worker) return;
    if (this.pending === 0) this.busySince = this.deps.now();
    this.pending += 1;
    this.worker.postMessage(message);
  }

  private note(text: string, to: string): void {
    this.log.push({ text, to });
    if (this.log.length > MAX_LUA_LOG) this.log.splice(0, this.log.length - MAX_LUA_LOG);
    this.deps.onChange();
  }

  private fail(message: string): void {
    this.note(message, 'error');
    this.stop('failed');
  }

  private receive(message: LuaFromWorker): void {
    switch (message.t) {
      case 'intent':
        if (acceptScriptIntent(message.action, this.deps.getGame())) {
          this.deps.dispatch(message.action);
        } else this.note(`rejected ${message.action.type}`, 'error');
        break;
      case 'print':
        this.note(message.text, message.to);
        break;
      case 'unshimmed':
        if (!this.unshimmed.has(message.name)) {
          this.unshimmed.add(message.name);
          this.deps.onChange();
        }
        break;
      case 'saved':
        this.persist(message);
        if (this.stopping) this.stop();
        break;
      case 'done':
        this.pending = Math.max(0, this.pending - 1);
        this.busySince = this.deps.now();
        if (this.status === 'starting') {
          this.status = 'running';
          this.deps.onChange();
          this.deliver([]);
        }
        break;
      case 'failed':
        if (this.status === 'starting') this.fail(message.message);
        else this.note(message.message, 'error');
        this.pending = Math.max(0, this.pending - 1);
        break;
    }
  }

  private persist(saved: Extract<LuaFromWorker, { t: 'saved' }>): void {
    const game = this.deps.getGame();
    if (!game.scripts) return;
    const scripts = applyLuaSave(game.scripts, saved);
    const importReport = withUnshimmed(game.importReport, [...this.unshimmed]);
    const fields = {
      ...(scripts !== game.scripts ? { scripts } : {}),
      ...(importReport !== game.importReport ? { importReport } : {}),
    };
    if (Object.keys(fields).length === 0) return;
    this.deps.dispatch({ type: 'APPLY_EDIT_DELTA', payload: { widgets: {}, fields } });
  }
}
