import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import {
  createClientPeerTransport,
  createHostPeerTransport,
  type PeerClientLike,
} from '../../../modules/room-game/peerTransport';
import type { RoomTransport } from '../../../modules/room-game/roomTransport';
import { useWebRTC } from '../audio/webRTCContextCore';

/** Room game key of every Melodiq room event channel (`melodiq_<roomId>_live`). */
export const MELODIQ_GAME_KEY = 'melodiq';

/** Everything `useRoomEvents({ gameKey: MELODIQ_GAME_KEY, roomId, transport })` needs. */
export interface MelodiqRoomTransport {
  transport: RoomTransport;
  /** The Melodiq party id (also the WebRTC room code). */
  roomId: string;
  /** This device's id on the wire: the sender's `from` and the address of replies (`to`). */
  selfId: string;
}

/** Phone side: the link to the host as `PhoneClientEngine` gets it from `useWebRTCClient`. */
interface PhoneRoomInput {
  link: PeerClientLike;
  roomId: string;
  /** The id the host sees for this phone (`identify` deviceId). */
  selfId: string;
  isConnected: boolean;
}

/**
 * Phone side: a client peer transport around the host link, or null until connected. Call it
 * once (in `PhoneClientEngine`) and share the result with `PhoneRoomTransportProvider`.
 */
export function usePhoneRoomTransport({
  link,
  roomId,
  selfId,
  isConnected,
}: PhoneRoomInput): MelodiqRoomTransport | null {
  const active = isConnected && roomId !== '';
  const transport = useMemo(
    () => (active ? createClientPeerTransport(link, { selfId }) : null),
    // `link` is rebuilt every render by the caller; its methods are stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, selfId, link.send, link.onMessage],
  );
  useEffect(() => () => transport?.dispose(), [transport]);
  return useMemo(
    () => (transport ? { transport, roomId, selfId } : null),
    [transport, roomId, selfId],
  );
}

const PhoneRoomContext = createContext<MelodiqRoomTransport | null>(null);

/** Phone side: makes the engine's transport reachable for hooks below it. */
export const PhoneRoomTransportProvider = ({
  value,
  children,
}: {
  value: MelodiqRoomTransport | null;
  children: ReactNode;
}) => createElement(PhoneRoomContext.Provider, { value }, children);

/**
 * Phone side only: the engine's transport (null on the host and until connected). For hooks that
 * run on both sides but act only on a phone, without building a second host transport.
 */
export function usePhoneRoom(): MelodiqRoomTransport | null {
  return useContext(PhoneRoomContext);
}

/** Host side: a host peer transport over the WebRTC manager; null without a manager. */
function useHostRoomTransport(): MelodiqRoomTransport | null {
  const { manager, partyId } = useWebRTC();
  const transport = useMemo(() => (manager ? createHostPeerTransport(manager) : null), [manager]);
  useEffect(() => () => transport?.dispose(), [transport]);
  return useMemo(
    () => (transport && partyId ? { transport, roomId: partyId, selfId: 'host' } : null),
    [transport, partyId],
  );
}

/**
 * The room transport for the current Melodiq screen: on the host the transport over the
 * `WebRTCHostManager`, on a phone the one `PhoneClientEngine` provides. Null until connected.
 * Use as `useRoomEvents({ gameKey: MELODIQ_GAME_KEY, roomId, transport, enabled: !!room, … })`.
 */
export function useMelodiqRoomTransport(): MelodiqRoomTransport | null {
  const host = useHostRoomTransport();
  const phone = useContext(PhoneRoomContext);
  return host ?? phone;
}
