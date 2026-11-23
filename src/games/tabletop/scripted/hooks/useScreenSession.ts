/**
 * Read-only observer of a scripted room game, for a TV [ID: HOOK-TABLETOP-SCRIPT-SCREEN]
 *
 * Joins the host's `SealedRoomPeer` channel as a guest with a throw-away id that is no party
 * member and no seat: the host answers with the public table packet only (never a hand), and
 * the hook exposes no way to send a move.
 */
import { useEffect, useMemo, useState } from 'react';
import { getRoomTransport, retainRoomPeer } from '../../../../modules/room-game';
import { SealedRoomPeer } from '../logic/sealedRoomPeer';
import { emptySession } from '../logic/session';

const randomId = () => `screen-${Math.random().toString(36).slice(2, 10)}`;

export function useScreenSession(scriptId: string, roomId: string) {
  const [screenId] = useState(randomId);
  const [, setTick] = useState(0);
  const peer = useMemo(() => {
    const channel = `cards-${scriptId}_${roomId}`;
    return retainRoomPeer(
      `${channel}|${screenId}|screen|sealed`,
      roomId,
      () =>
        new SealedRoomPeer({
          transport: getRoomTransport(roomId),
          channel,
          playerId: screenId,
          isHost: false,
          initialState: emptySession(scriptId),
          onChange: () => {},
        }),
    );
  }, [scriptId, roomId, screenId]);

  useEffect(() => {
    peer.update({ onChange: () => setTick((n) => n + 1) });
    peer.start();
    return () => peer.stop();
  }, [peer]);

  const synced = peer.isSynced;
  useEffect(() => {
    if (synced) return;
    const timer = setInterval(() => void peer.hello(), 2000);
    return () => clearInterval(timer);
  }, [synced, peer]);

  return { packet: peer.current, synced };
}
