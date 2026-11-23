/**
 * `RoomTransport` over a WebRTC star [ID: MOD-ROOM-GAME-PEER-TRANSPORT]
 *
 * One host (e.g. `WebRTCHostManager`) and its phones (e.g. `useWebRTCClient`). Room messages
 * travel on the data channel as `{ type: 'room', channel, msg }`; every other data-channel
 * message is ignored. Host publishes go to every phone (or only to the phone named in `to`);
 * phone publishes go to the host only, and the host never relays them. On the host, an incoming
 * message's `from` is overwritten with the sender's `deviceId ?? peerId`, so a phone cannot act
 * as someone else. Both sides also deliver their own publishes locally (room semantics).
 */
import type { RoomTransport } from './roomTransport';

/** What the host transport needs from a WebRTC host manager. */
export interface PeerHostLike {
  on(event: 'message', listener: (peerId: string, data: unknown) => void): () => void;
  sendToPeer(peerId: string, data: unknown): void;
  broadcast(data: unknown): void;
  getConnectedPeers(): { peerId: string; deviceId?: string }[];
}

/** What the phone transport needs from a WebRTC client link to the host. */
export interface PeerClientLike {
  send(data: unknown): void;
  /** Registers a listener for every data-channel message from the host; returns unsubscribe. */
  onMessage(listener: (data: unknown) => void): () => void;
}

export type DisposableRoomTransport = RoomTransport & { dispose(): void };

export interface RoomEnvelope {
  type: 'room';
  channel: string;
  msg: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** The room envelope in a data-channel message, or `null` for any other message. */
export function parseRoomEnvelope(data: unknown): RoomEnvelope | null {
  if (!isRecord(data) || data.type !== 'room' || typeof data.channel !== 'string') return null;
  return { type: 'room', channel: data.channel, msg: data.msg };
}

/** The `to` address of a message, if it has one. */
const targetOf = (msg: unknown): string | undefined =>
  isRecord(msg) && typeof msg.to === 'string' ? msg.to : undefined;

/** `msg` with `from` replaced by `sender` when it carries a `from` field; otherwise unchanged. */
export function stampSender(msg: unknown, sender: string): unknown {
  return isRecord(msg) && 'from' in msg ? { ...msg, from: sender } : msg;
}

/** Local subscribers per channel, shared by both factories. */
function createLocalHub() {
  const subs = new Map<string, Set<(msg: unknown) => void>>();
  return {
    deliver(channel: string, msg: unknown) {
      for (const fn of [...(subs.get(channel) ?? [])]) fn(msg);
    },
    subscribe(channel: string, fn: (msg: unknown) => void) {
      const set = subs.get(channel) ?? new Set();
      set.add(fn);
      subs.set(channel, set);
      return () => {
        set.delete(fn);
      };
    },
    clear() {
      subs.clear();
    },
  };
}

const peerAddress = (peer: { peerId: string; deviceId?: string }) => peer.deviceId ?? peer.peerId;

/**
 * Host side. `selfId` (the host's own player id) keeps a message addressed to the host itself
 * off the wire; it is still delivered locally like every host publish.
 */
export function createHostPeerTransport(
  manager: PeerHostLike,
  opts: { selfId?: string } = {},
): DisposableRoomTransport {
  const hub = createLocalHub();
  const stopListening = manager.on('message', (peerId, data) => {
    const envelope = parseRoomEnvelope(data);
    if (!envelope) return;
    const peer = manager.getConnectedPeers().find((p) => p.peerId === peerId);
    hub.deliver(envelope.channel, stampSender(envelope.msg, peer ? peerAddress(peer) : peerId));
  });

  return {
    publish(channel, msg) {
      const envelope: RoomEnvelope = { type: 'room', channel, msg };
      const to = targetOf(msg);
      if (to === undefined) manager.broadcast(envelope);
      else if (to !== opts.selfId) {
        for (const peer of manager.getConnectedPeers()) {
          if (peerAddress(peer) === to) manager.sendToPeer(peer.peerId, envelope);
        }
      }
      hub.deliver(channel, msg);
    },
    subscribe: hub.subscribe,
    dispose() {
      stopListening();
      hub.clear();
    },
  };
}

/** Phone side. `selfId` is the phone's device id; events addressed to others are dropped. */
export function createClientPeerTransport(
  link: PeerClientLike,
  opts: { selfId: string },
): DisposableRoomTransport {
  const hub = createLocalHub();
  const stopListening = link.onMessage((data) => {
    const envelope = parseRoomEnvelope(data);
    if (!envelope) return;
    const to = targetOf(envelope.msg);
    if (to !== undefined && to !== opts.selfId) return;
    hub.deliver(envelope.channel, envelope.msg);
  });

  return {
    publish(channel, msg) {
      link.send({ type: 'room', channel, msg } satisfies RoomEnvelope);
      hub.deliver(channel, msg);
    },
    subscribe: hub.subscribe,
    dispose() {
      stopListening();
      hub.clear();
    },
  };
}
