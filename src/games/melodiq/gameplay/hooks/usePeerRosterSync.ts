/**
 * Keeps phone players in step with connected WebRTC peers [ID: HOOK-MELODIQ-PEER-ROSTER]
 *
 * Attaches peers to their players, adds new phone guests the host wants, refreshes name/hue
 * and drops guests whose phone disconnected.
 */
import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { PlayerRuntime } from './PlayerRuntime';
import type { ActivePlayer } from '../../types';
import type { MicRemotePeer, WebRTCMicManager } from '../../audio/WebRTCMicManager';
import { isWantedByHost } from '../logic/sessionRoster';

interface UsePeerRosterSyncProps {
  manager: WebRTCMicManager | null;
  activePeers: MicRemotePeer[];
  activeSessionOverride?: ActivePlayer[] | null;
  setPlayers: Dispatch<SetStateAction<PlayerRuntime[]>>;
  playersRef: MutableRefObject<PlayerRuntime[]>;
}

function newGuest(manager: WebRTCMicManager, peer: MicRemotePeer): PlayerRuntime {
  console.log(`[Session] New Phone Guest selected in session: ${peer.name}`);
  const player = new PlayerRuntime(
    {
      id: peer.peerId,
      name: peer.name,
      hue: peer.hue || Math.floor(Math.random() * 360),
      deviceId: peer.deviceId || peer.peerId,
      volume: 1.0,
      muted: false,
      latency: 0,
      isRemote: true,
      hidePitch: false,
    },
    manager,
  );
  player.attachRemotePeer(manager, peer.peerId);
  return player;
}

/** Updates an existing player from its peer; returns whether anything changed. */
function refreshFromPeer(
  manager: WebRTCMicManager,
  player: PlayerRuntime,
  peer: MicRemotePeer,
  wanted: boolean,
): boolean {
  let changed = false;
  if (player.config.hidePitch !== !wanted) {
    player.config.hidePitch = !wanted;
    changed = true;
  }
  if (player.config.name !== peer.name || player.config.hue !== peer.hue) {
    console.log(`[Session] Updating details for ${player.config.name} -> ${peer.name}`);
    player.config.name = peer.name;
    if (peer.hue !== undefined) player.config.hue = peer.hue;
    changed = true;
  }
  if (!player.webRtcManager) {
    console.log(`[Session] Attaching Phone ${peer.name} to existing player ${player.config.name}`);
    player.attachRemotePeer(manager, peer.peerId);
    changed = true;
  }
  return changed;
}

export function usePeerRosterSync({
  manager,
  activePeers,
  activeSessionOverride,
  setPlayers,
  playersRef,
}: UsePeerRosterSyncProps) {
  useEffect(() => {
    if (!manager) return;

    setPlayers((prev) => {
      const updated = [...prev];
      let changed = false;

      for (const peer of activePeers) {
        const idx = updated.findIndex(
          (p) =>
            (peer.deviceId && p.config.deviceId === peer.deviceId) ||
            p.config.deviceId === peer.peerId ||
            p.config.id === peer.peerId,
        );
        const wanted = isWantedByHost(activeSessionOverride, [peer.deviceId, peer.peerId]);
        if (idx !== -1) {
          changed = refreshFromPeer(manager, updated[idx], peer, wanted) || changed;
        } else if (wanted) {
          updated.push(newGuest(manager, peer));
          changed = true;
        }
      }

      // Guests (id === deviceId, i.e. not from the active session) leave with their phone
      const peerIds = new Set(activePeers.map((p) => p.peerId));
      const kept = updated.filter((p) => {
        const gone = p.config.isRemote && (!p.remotePeerId || !peerIds.has(p.remotePeerId));
        if (gone && p.config.id === p.config.deviceId) {
          console.log(`[Session] removing disconnected guest ${p.config.name}`);
          return false;
        }
        return true;
      });
      if (kept.length !== updated.length) changed = true;

      if (!changed) return prev;
      playersRef.current = kept;
      return kept;
    });
    // Re-run on peer changes only, as before the split; the override is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeers, manager]);
}
