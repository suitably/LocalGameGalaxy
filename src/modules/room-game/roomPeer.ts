/**
 * Host-run room state without React [ID: MOD-ROOM-GAME-PEER]
 *
 * The protocol behind `useRoomReducer` on any `RoomTransport`: the host reduces and publishes
 * `{kind: 'state', rev}`; guests send actions and keep the newest state; a guest says hello
 * until the first state arrives, and the host answers a hello with its current state.
 */
import { guestAccept, hostApply, type RoomHost, type RoomMessage } from './roomSync';
import type { RoomTransport } from './roomTransport';

export interface RoomPeerOptions<S, A> {
  transport: RoomTransport;
  channel: string;
  playerId: string;
  isHost: boolean;
  reducer: (state: S, action: A) => S;
  authorize?: (state: S, action: A, from: string) => boolean;
  initialState: S;
  /** Called with every state this peer shows (host: after each applied action). */
  onChange: (host: RoomHost<S>, synced: boolean) => void;
}

export class RoomStatePeer<S, A> {
  private opts: RoomPeerOptions<S, A>;
  private host: RoomHost<S>;
  private synced: boolean;
  private unsubscribe: (() => void) | null = null;

  constructor(opts: RoomPeerOptions<S, A>) {
    this.opts = opts;
    this.host = { state: opts.initialState, rev: 0 };
    this.synced = opts.isHost;
  }

  get current(): RoomHost<S> {
    return this.host;
  }

  get isSynced(): boolean {
    return this.synced;
  }

  /** Reducer, authorize and callback may change on every render; ids and roles may not. */
  update(opts: Pick<RoomPeerOptions<S, A>, 'reducer' | 'authorize' | 'onChange'>): void {
    this.opts = { ...this.opts, ...opts };
  }

  start(): void {
    this.stop();
    const { transport, channel, isHost } = this.opts;
    this.unsubscribe = transport.subscribe(channel, (msg) =>
      this.receive(msg as RoomMessage<S, A>),
    );
    if (isHost) this.publishState();
    else this.hello();
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  hello(): void {
    this.send({ kind: 'hello', from: this.opts.playerId });
  }

  dispatch(action: A): void {
    if (this.opts.isHost) this.applyAsHost(action, this.opts.playerId);
    else this.send({ kind: 'action', from: this.opts.playerId, action });
  }

  private send(msg: RoomMessage<S, A>): void {
    this.opts.transport.publish(this.opts.channel, msg);
  }

  private publishState(): void {
    this.send({
      kind: 'state',
      from: this.opts.playerId,
      rev: this.host.rev,
      state: this.host.state,
    });
  }

  private applyAsHost(action: A, from: string): void {
    const next = hostApply(this.host, action, from, this.opts.reducer, this.opts.authorize);
    if (!next) return;
    this.host = next;
    this.opts.onChange(next, true);
    this.publishState();
  }

  private receive(msg: RoomMessage<S, A> | null | undefined): void {
    if (!msg || msg.from === this.opts.playerId) return;
    if (this.opts.isHost) {
      if (msg.kind === 'hello') this.publishState();
      else if (msg.kind === 'action') this.applyAsHost(msg.action, msg.from);
    } else if (msg.kind === 'state' && guestAccept(this.host.rev, msg.rev)) {
      this.host = { state: msg.state, rev: msg.rev };
      this.synced = true;
      this.opts.onChange(this.host, true);
    }
  }
}
