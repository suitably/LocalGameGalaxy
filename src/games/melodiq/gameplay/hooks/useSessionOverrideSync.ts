/**
 * Mid-session roster updates from the host's participant list [ID: HOOK-MELODIQ-SESSION-OVERRIDE]
 *
 * Adds and removes players when `activeSessionOverride` changes and syncs mute/volume.
 * Mic device ids of players already running are not re-assigned.
 */
import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { PlayerRuntime } from './PlayerRuntime';
import type { ActivePlayer } from '../../types';
import type { MicRemotePeer, WebRTCMicManager } from '../../audio/WebRTCMicManager';
import { BOT_PLAYER_CONFIG, BOT_PROFILE_ID, loadSessionInputs } from '../logic/sessionRoster';

interface UseSessionOverrideSyncProps {
  manager: WebRTCMicManager | null;
  activePeers: MicRemotePeer[];
  activeSessionOverride?: ActivePlayer[] | null;
  ready: boolean;
  isPassive: boolean;
  setPlayers: Dispatch<SetStateAction<PlayerRuntime[]>>;
  playersRef: MutableRefObject<PlayerRuntime[]>;
}

/** Ids under which the current remote players are known. */
function knownRemoteIds(players: PlayerRuntime[]): Set<string> {
  const ids = new Set<string>();
  for (const p of players) {
    if (!p.config.isRemote) continue;
    if (p.config.id) ids.add(p.config.id);
    if (p.config.deviceId) ids.add(p.config.deviceId);
    if (p.remotePeerId) ids.add(p.remotePeerId);
  }
  return ids;
}

export function useSessionOverrideSync({
  manager,
  activePeers,
  activeSessionOverride,
  ready,
  isPassive,
  setPlayers,
  playersRef,
}: UseSessionOverrideSyncProps) {
  useEffect(() => {
    if (!ready || isPassive) return; // Passive/TV displays get players from the host via GAME_STATE
    if (activeSessionOverride === null || activeSessionOverride === undefined) return;

    const { profiles, micSlots } = loadSessionInputs(activeSessionOverride);
    const allProfiles = profiles ?? [];
    const peerDeviceIds = new Set(activePeers.map((p) => p.deviceId).filter(Boolean));
    const peerIds = new Set(activePeers.map((p) => p.peerId));
    const existingRemoteIds = knownRemoteIds(playersRef.current || []);
    const isKnownRemote = (id: string) =>
      peerDeviceIds.has(id) || peerIds.has(id) || existingRemoteIds.has(id);
    const isRemoteParticipant = (p: ActivePlayer) =>
      Boolean(p.isRemote) || isKnownRemote(p.profileId || p.deviceId) || isKnownRemote(p.deviceId);

    const desiredLocalIds = new Set<string>();
    const desiredRemoteKeys = new Set<string>();
    for (const p of activeSessionOverride) {
      if (isRemoteParticipant(p)) {
        if (p.deviceId) desiredRemoteKeys.add(p.deviceId);
        if (p.profileId) desiredRemoteKeys.add(p.profileId);
      } else {
        desiredLocalIds.add(p.profileId || p.deviceId);
      }
    }

    const createPlayer = (p: ActivePlayer, isRemote: boolean, micSlot: string) => {
      const profileId = p.profileId || p.deviceId;
      if (isRemote) {
        const peer = activePeers.find(
          (ap) =>
            ap.deviceId === p.deviceId || ap.peerId === p.deviceId || ap.peerId === p.profileId,
        );
        const player = new PlayerRuntime(
          {
            id: profileId,
            name: p.name || peer?.name || 'Phone User',
            hue: p.hue || peer?.hue || Math.floor(Math.random() * 360),
            deviceId: p.deviceId || profileId,
            volume: 1.0,
            muted: false,
            latency: 0,
            isRemote: true,
            hidePitch: false,
          },
          manager ?? undefined,
        );
        if (peer && manager) player.attachRemotePeer(manager, peer.peerId);
        return player;
      }
      if (profileId === BOT_PROFILE_ID) return new PlayerRuntime(BOT_PLAYER_CONFIG);
      const profile = allProfiles.find((prof) => prof.id === profileId);
      if (!profile || !micSlot) return null;
      return new PlayerRuntime({
        ...profile,
        deviceId: micSlot,
        volume: p.volume ?? 1.0,
        muted: p.muted ?? false,
        latency: p.latency ?? 0,
        isRemote: false,
        hidePitch: false,
      });
    };

    setPlayers((prev) => {
      const updated = [...prev];
      let changed = false;

      // 1. Add participants that are listed but not playing yet
      let localMicIndex = 0;
      for (const p of activeSessionOverride) {
        const profileId = p.profileId || p.deviceId;
        const isRemote = isRemoteParticipant(p);
        const exists = updated.some(
          (e) =>
            e.config.id === profileId ||
            (p.deviceId && (e.config.deviceId === p.deviceId || e.remotePeerId === p.deviceId)),
        );
        if (!exists) {
          const player = createPlayer(p, isRemote, micSlots[localMicIndex] || '');
          if (player) {
            if (!isRemote) {
              player
                .start()
                .catch((e) => console.warn('[Session] Failed to start new player mic:', e));
            }
            console.log('[Session] Participant added live:', profileId, 'isRemote:', isRemote);
            updated.push(player);
            changed = true;
          }
        }
        if (!isRemote) localMicIndex++;
      }

      // 2. Remove participants that are no longer listed
      const isListed = (id: string | undefined) =>
        Boolean(id) && (desiredLocalIds.has(id as string) || desiredRemoteKeys.has(id as string));
      const kept = updated.filter((e) => {
        const wanted =
          isListed(e.config.id) ||
          isListed(e.config.deviceId) ||
          Boolean(e.remotePeerId && desiredRemoteKeys.has(e.remotePeerId));
        if (wanted) return true;
        console.log('[Session] Participant removed live:', e.config.id);
        if (!e.config.isRemote) {
          e.stop().catch((err) => console.warn('[Session] Error stopping removed player:', err));
        }
        changed = true;
        return false;
      });

      // 3. Listed phones show their pitch; mute/volume follow the host list
      for (const e of kept) {
        if (e.config.isRemote && e.config.hidePitch !== false) {
          e.config.hidePitch = false;
          changed = true;
        }
        const match = activeSessionOverride.find(
          (p) =>
            p.profileId === e.config.id ||
            p.deviceId === e.config.deviceId ||
            (e.remotePeerId && p.deviceId === e.remotePeerId),
        );
        if (match?.muted !== undefined && e.config.muted !== match.muted) {
          e.config.muted = match.muted;
          changed = true;
        }
        if (match?.volume !== undefined && e.config.volume !== match.volume) {
          e.config.volume = match.volume;
          changed = true;
        }
      }

      if (!changed) return prev;
      playersRef.current = kept;
      return [...kept];
    });
    // `manager` and the setters are stable for the session; re-run only on roster inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionOverride, ready, activePeers]);
}
