/**
 * Host-run room game where each device sees only its own view [ID: MODULE-ROOM-SEALED-PEER]
 *
 * Replaces `useRoomReducer` for games with secrets (hands, roles, words). The host runs the
 * reducer and keeps the only copy of the state. Guests send `hello` (with their public key) and
 * `action`; the host answers with `views`: the public view in clear and, per player, that
 * player's view sealed with the key it shares with that device (`SealChannel`). Without WebCrypto
 * (plain-HTTP origins) a player's view goes unsealed, still only its own.
 */
import type { RoomTransport } from '../roomTransport';
import type { SealedBox } from './sealCrypto';
import { SealChannel, isSealingSupported } from './sealChannel';

/** What a game supplies: its rules and what each player (or the table, `null`) may see. */
export interface SealedGame<S, A, V> {
  reducer: (state: S, action: A) => S;
  /** Host-side rule; `hostId` is the device running the game. */
  allows: (state: S, action: A, from: string, hostId: string) => boolean;
  /** Player ids in seat order. */
  playerIds: (state: S) => string[];
  /** The view of one seat, or of the table (`null`: devices without a seat). */
  viewFor: (state: S, seat: number | null) => V;
}

export type SealedRoomMessage<A, V> =
  | { kind: 'hello'; from: string; key?: JsonWebKey }
  | { kind: 'action'; from: string; action: A }
  | {
      kind: 'views';
      from: string;
      rev: number;
      hostKey?: JsonWebKey;
      table: V;
      /** By player id: sealed, or the view itself when sealing is unavailable. */
      seats: Record<string, { sealed: SealedBox } | { clear: V }>;
    };

export interface SealedPeerOptions<S, V> {
  transport: RoomTransport;
  channel: string;
  playerId: string;
  isHost: boolean;
  initialState: S;
  /** Every view this device shows (host: for its own seat or the table). */
  onChange: (view: V, rev: number) => void;
  /** Host only: called after each applied action (persistence). */
  onState?: (state: S) => void;
  supported?: boolean;
}

export class SealedRoomPeer<S, A, V> {
  private opts: SealedPeerOptions<S, V>;
  private readonly game: SealedGame<S, A, V>;
  private state: S;
  private rev = 0;
  private view: V | null = null;
  private readonly channel: SealChannel;
  private readonly sealing: boolean;
  private readonly keys = new Map<string, string>();
  private readonly registered = new Map<number, string>();
  private unsubscribe: (() => void) | null = null;
  private chain: Promise<void> = Promise.resolve();

  constructor(game: SealedGame<S, A, V>, opts: SealedPeerOptions<S, V>) {
    this.game = game;
    this.opts = opts;
    this.state = opts.initialState;
    this.sealing = opts.supported ?? isSealingSupported();
    this.channel = new SealChannel(this.sealing);
    if (opts.isHost) this.view = this.ownView();
  }

  get current(): V | null {
    return this.view;
  }

  get isSynced(): boolean {
    return this.view !== null;
  }

  update(opts: Partial<Pick<SealedPeerOptions<S, V>, 'onChange' | 'onState'>>): void {
    this.opts = { ...this.opts, ...opts };
  }

  start(): void {
    this.stop();
    const { transport, channel, isHost } = this.opts;
    this.unsubscribe = transport.subscribe(channel, (msg) =>
      this.enqueue(() => this.receive(msg as SealedRoomMessage<A, V>)),
    );
    if (isHost) this.enqueue(() => this.publish());
    else this.enqueue(() => this.hello());
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async hello(): Promise<void> {
    this.send({ kind: 'hello', from: this.opts.playerId, key: await this.channel.publicKey() });
  }

  dispatch(action: A): void {
    if (this.opts.isHost) this.enqueue(() => this.applyAsHost(action, this.opts.playerId));
    else this.send({ kind: 'action', from: this.opts.playerId, action });
  }

  /** Resolves when everything received or dispatched so far has been handled (tests). */
  idle(): Promise<void> {
    return this.chain;
  }

  private enqueue(job: () => Promise<void>): void {
    this.chain = this.chain.then(job, job);
  }

  private send(msg: SealedRoomMessage<A, V>): void {
    this.opts.transport.publish(this.opts.channel, msg);
  }

  /** The host's own picture: its seat if it has one, else the table. */
  private ownView(): V {
    const seat = this.game.playerIds(this.state).indexOf(this.opts.playerId);
    return this.game.viewFor(this.state, seat >= 0 ? seat : null);
  }

  private async applyAsHost(action: A, from: string): Promise<void> {
    if (!this.game.allows(this.state, action, from, this.opts.playerId)) return;
    const next = this.game.reducer(this.state, action);
    if (next === this.state) return;
    this.state = next;
    this.rev += 1;
    this.opts.onState?.(next);
    this.view = this.ownView();
    this.opts.onChange(this.view, this.rev);
    await this.publish();
  }

  private async publish(): Promise<void> {
    const seats: Extract<SealedRoomMessage<A, V>, { kind: 'views' }>['seats'] = {};
    for (const [seat, id] of this.game.playerIds(this.state).entries()) {
      if (id === this.opts.playerId) continue;
      const mine = this.game.viewFor(this.state, seat);
      const box = await this.sealFor(seat, id, mine);
      if (box) seats[id] = { sealed: box };
      else if (!this.sealing) seats[id] = { clear: mine };
    }
    this.send({
      kind: 'views',
      from: this.opts.playerId,
      rev: this.rev,
      hostKey: await this.channel.publicKey(),
      table: this.game.viewFor(this.state, null),
      seats,
    });
  }

  private async sealFor(seat: number, id: string, view: V): Promise<SealedBox | undefined> {
    const jwk = this.keys.get(id);
    if (!jwk) return undefined;
    if (this.registered.get(seat) !== jwk) {
      await this.channel.registerSeat(seat, JSON.parse(jwk) as JsonWebKey);
      this.registered.set(seat, jwk);
    }
    return this.channel.sealFor(seat, view);
  }

  private async receive(msg: SealedRoomMessage<A, V> | null | undefined): Promise<void> {
    if (!msg || msg.from === this.opts.playerId) return;
    if (this.opts.isHost) {
      if (msg.kind === 'hello') {
        if (msg.key) this.keys.set(msg.from, JSON.stringify(msg.key));
        await this.publish();
      } else if (msg.kind === 'action') {
        await this.applyAsHost(msg.action, msg.from);
      }
      return;
    }
    if (msg.kind !== 'views' || msg.rev < this.rev) return;
    await this.channel.acceptHostKey(msg.hostKey);
    const mine = msg.seats[this.opts.playerId];
    let view: V | null = null;
    if (mine && 'clear' in mine) view = mine.clear;
    else if (mine) view = await this.channel.openFromHost<V>(mine.sealed);
    else if (!this.isSeated(msg)) view = msg.table;
    if (!view) return;
    this.rev = msg.rev;
    this.view = view;
    this.opts.onChange(view, msg.rev);
  }

  /** A device whose id has a seat waits for its own view instead of showing the table. */
  private isSeated(msg: Extract<SealedRoomMessage<A, V>, { kind: 'views' }>): boolean {
    return Object.hasOwn(msg.seats, this.opts.playerId) || this.seatedIn(msg.table);
  }

  private seatedIn(table: V): boolean {
    const players = (table as { players?: { id: string }[] } | null)?.players;
    return Array.isArray(players) && players.some((p) => p.id === this.opts.playerId);
  }
}
