/**
 * The one transport of party-room games [ID: MOD-ROOM-GAME-TRANSPORT]
 *
 * Every room message — host-run state (`useRoomReducer`) and live events (`useRoomEvents`) —
 * goes through a `RoomTransport`. The default sends over BroadcastChannel (same device,
 * channel `room_<channel>`) and the MQTT mailbox `lgg/room`. `getRoomTransport()` is the one
 * place that picks the transport per room, so another one (e.g. a WebRTC data channel) can be
 * swapped in without touching games.
 */
import { MqttMailboxService } from '../sync/MqttMailboxService';
import { getRoomKey } from '../sync/roomKeys';

export interface RoomTransport {
  publish(channel: string, msg: unknown): void;
  /** Delivers every message on `channel` (possibly the sender's own); returns unsubscribe. */
  subscribe(channel: string, fn: (msg: unknown) => void): () => void;
}

/** Room of each channel used through `getRoomTransport(roomId)`: its key encrypts the channel. */
const channelRooms = new Map<string, string>();

const isStateMessage = (msg: unknown): boolean =>
  typeof msg === 'object' && msg !== null && (msg as { kind?: unknown }).kind === 'state';

// One mailbox per message type would be equal; the payload is untyped on the wire anyway.
export const roomMailbox = new MqttMailboxService<unknown>({
  topicPrefix: 'lgg/room',
  keyFor: (channel) => getRoomKey(channelRooms.get(channel)),
  // Only the host's last state helps a late joiner; hello, actions and live events are not kept.
  retain: isStateMessage,
});

/** Binds every channel used through `transport` to `roomId`, so the room's key applies. */
export function bindTransportToRoom(transport: RoomTransport, roomId: string): RoomTransport {
  return {
    publish(channel, msg) {
      channelRooms.set(channel, roomId);
      transport.publish(channel, msg);
    },
    subscribe(channel, fn) {
      channelRooms.set(channel, roomId);
      return transport.subscribe(channel, fn);
    },
  };
}

const BROADCAST_PREFIX = 'room';

/** BroadcastChannel + MQTT mailbox: the behaviour every room game had before `RoomTransport`. */
export function createBroadcastMqttTransport(
  mailbox: MqttMailboxService<unknown> = roomMailbox,
): RoomTransport {
  return {
    publish(channel, msg) {
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel(`${BROADCAST_PREFIX}_${channel}`);
          bc.postMessage(msg);
          bc.close();
        }
      } catch (err) {
        console.warn('[RoomTransport] BroadcastChannel post failed:', err);
      }
      mailbox.publish(channel, msg).catch((err) => {
        console.warn('[RoomTransport] MQTT publish failed:', err);
      });
    },
    subscribe(channel, fn) {
      let bc: BroadcastChannel | null = null;
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          bc = new BroadcastChannel(`${BROADCAST_PREFIX}_${channel}`);
          bc.onmessage = (event: MessageEvent<unknown>) => {
            if (event.data) fn(event.data);
          };
        }
      } catch (err) {
        console.warn('[RoomTransport] BroadcastChannel init failed:', err);
      }
      const unsubscribeMqtt = mailbox.subscribe(channel, (payload) => {
        if (payload) fn(payload);
      });
      return () => {
        bc?.close();
        unsubscribeMqtt();
      };
    },
  };
}

/** In-memory transport: every subscriber of a channel gets every message (tests, one tab). */
export function createMemoryTransport(): RoomTransport {
  const subs = new Map<string, Set<(msg: unknown) => void>>();
  return {
    publish(channel, msg) {
      for (const fn of [...(subs.get(channel) ?? [])]) fn(msg);
    },
    subscribe(channel, fn) {
      const set = subs.get(channel) ?? new Set();
      set.add(fn);
      subs.set(channel, set);
      return () => set.delete(fn);
    },
  };
}

type RoomTransportFactory = (roomId: string) => RoomTransport;

let defaultTransport: RoomTransport | null = null;
const boundTransports = new Map<string, RoomTransport>();
const defaultFactory: RoomTransportFactory = (roomId) => {
  let bound = boundTransports.get(roomId);
  if (!bound) {
    bound = bindTransportToRoom((defaultTransport ??= createBroadcastMqttTransport()), roomId);
    boundTransports.set(roomId, bound);
  }
  return bound;
};
let factory: RoomTransportFactory = defaultFactory;

/** The transport for a party room. */
export function getRoomTransport(roomId: string): RoomTransport {
  return factory(roomId);
}

/** Replaces the transport choice (tests, a later WebRTC transport); returns a restore function. */
export function setRoomTransportFactory(next: RoomTransportFactory): () => void {
  const previous = factory;
  factory = next;
  return () => {
    factory = previous;
  };
}
