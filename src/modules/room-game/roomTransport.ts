/**
 * The one transport of party-room games [ID: MOD-ROOM-GAME-TRANSPORT]
 *
 * Every room message — host-run state (`useRoomReducer`) and live events (`useRoomEvents`) —
 * goes over BroadcastChannel (same device) and this MQTT mailbox (`lgg/room`).
 */
import { MqttMailboxService } from '../sync/MqttMailboxService';

// One mailbox per message type would be equal; the payload is untyped on the wire anyway.
export const roomMailbox = new MqttMailboxService<unknown>({ topicPrefix: 'lgg/room' });
