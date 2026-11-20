/**
 * Host-run scripted game with sealed per-seat views [ID: LOGIC-TABLETOP-SCRIPT-SEALED-PEER]
 *
 * Replaces `useRoomReducer` for scripted card games. The host runs `sessionReducer` and keeps
 * the only copy of the state. Guests send `hello` (with their public key) and `action`; the
 * host answers with `views`: the public table packet in clear and, per seat, that seat's
 * `SeatPacket` sealed with the key it shares with that device (`PrivateHandChannel`). Hands,
 * stock and the skat never leave the host unsealed. Without WebCrypto (plain-HTTP origins) a
 * seat's packet goes unsealed, still only its own.
 */
import { PrivateHandChannel, isSealingSupported } from '../../logic/privateHandChannel';
import type { SealedBox } from '../../logic/sealCrypto';
import type { RoomTransport } from '../../../../modules/room-game';
import { seatPacket, type SeatPacket } from './sealedViews';
import { sessionAllows, sessionReducer, type SessionAction, type SessionState } from './session';

export type SealedRoomMessage =
  | { kind: 'hello'; from: string; key?: JsonWebKey }
  | { kind: 'action'; from: string; action: SessionAction }
  | {
      kind: 'views';
      from: string;
      rev: number;
      hostKey?: JsonWebKey;
      table: SeatPacket;
      /** By player id: sealed, or the packet itself when sealing is unavailable. */
      seats: Record<string, { sealed: SealedBox } | { clear: SeatPacket }>;
    };

export interface SealedRoomOptions {
  transport: RoomTransport;
  channel: string;
  playerId: string;
  isHost: boolean;
  initialState: SessionState;
  /** Every packet this device shows (host: for its own seat or the table). */
  onChange: (packet: SeatPacket, rev: number) => void;
  /** Host only: called after each applied action (persistence). */
  onState?: (state: SessionState) => void;
  supported?: boolean;
}

export class SealedRoomPeer {
  private opts: SealedRoomOptions;
  private state: SessionState;
  private rev = 0;
  private packet: SeatPacket | null = null;
  private readonly hands: PrivateHandChannel;
  private readonly sealing: boolean;
  private readonly keys = new Map<string, string>();
  private readonly registered = new Map<number, string>();
  private unsubscribe: (() => void) | null = null;
  private chain: Promise<void> = Promise.resolve();

  constructor(opts: SealedRoomOptions) {
    this.opts = opts;
    this.state = opts.initialState;
    this.sealing = opts.supported ?? isSealingSupported();
    this.hands = new PrivateHandChannel(this.sealing);
    if (opts.isHost) this.packet = this.ownPacket();
  }

  get current(): SeatPacket | null {
    return this.packet;
  }

  get isSynced(): boolean {
    return this.packet !== null;
  }

  update(opts: Partial<Pick<SealedRoomOptions, 'onChange' | 'onState'>>): void {
    this.opts = { ...this.opts, ...opts };
  }

  start(): void {
    this.stop();
    const { transport, channel, isHost } = this.opts;
    this.unsubscribe = transport.subscribe(channel, (msg) =>
      this.enqueue(() => this.receive(msg as SealedRoomMessage)),
    );
    if (isHost) this.enqueue(() => this.publish());
    else this.enqueue(() => this.hello());
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async hello(): Promise<void> {
    this.send({ kind: 'hello', from: this.opts.playerId, key: await this.hands.publicKey() });
  }

  dispatch(action: SessionAction): void {
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

  private send(msg: SealedRoomMessage): void {
    this.opts.transport.publish(this.opts.channel, msg);
  }

  /** The host's own picture: its seat if it has one, else the table. */
  private ownPacket(): SeatPacket {
    const seat = this.state.players.findIndex((p) => p.id === this.opts.playerId);
    return seatPacket(this.state, seat >= 0 ? seat : null);
  }

  private async applyAsHost(action: SessionAction, from: string): Promise<void> {
    if (!sessionAllows(this.state, action, from, this.opts.playerId)) return;
    const next = sessionReducer(this.state, action);
    if (next === this.state) return;
    this.state = next;
    this.rev += 1;
    this.opts.onState?.(next);
    this.packet = this.ownPacket();
    this.opts.onChange(this.packet, this.rev);
    await this.publish();
  }

  private async publish(): Promise<void> {
    const seats: Extract<SealedRoomMessage, { kind: 'views' }>['seats'] = {};
    for (const [seat, player] of this.state.players.entries()) {
      if (player.id === this.opts.playerId) continue;
      const mine = seatPacket(this.state, seat);
      const box = await this.sealFor(seat, player.id, mine);
      if (box) seats[player.id] = { sealed: box };
      else if (!this.sealing) seats[player.id] = { clear: mine };
    }
    this.send({
      kind: 'views',
      from: this.opts.playerId,
      rev: this.rev,
      hostKey: await this.hands.publicKey(),
      table: seatPacket(this.state, null),
      seats,
    });
  }

  private async sealFor(
    seat: number,
    id: string,
    packet: SeatPacket,
  ): Promise<SealedBox | undefined> {
    const jwk = this.keys.get(id);
    if (!jwk) return undefined;
    if (this.registered.get(seat) !== jwk) {
      await this.hands.registerSeat(seat, JSON.parse(jwk) as JsonWebKey);
      this.registered.set(seat, jwk);
    }
    return this.hands.sealFor(seat, packet);
  }

  private async receive(msg: SealedRoomMessage | null | undefined): Promise<void> {
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
    await this.hands.acceptHostKey(msg.hostKey);
    const mine = msg.seats[this.opts.playerId];
    let packet: SeatPacket | null = null;
    if (mine && 'clear' in mine) packet = mine.clear;
    else if (mine) packet = await this.hands.openFromHost<SeatPacket>(mine.sealed);
    else if (!msg.table.players.some((p) => p.id === this.opts.playerId)) packet = msg.table;
    if (!packet) return;
    this.rev = msg.rev;
    this.packet = packet;
    this.opts.onChange(packet, msg.rev);
  }
}
