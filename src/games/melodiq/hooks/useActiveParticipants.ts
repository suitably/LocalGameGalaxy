import { useCallback, useMemo, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { type MelodiqParticipant, type MelodiqProfile } from '../types';

/** Participants of the currently playing song (singers), persisted for page reloads. */
export function useActiveParticipants() {
  const [activeParticipants, setActiveParticipants] = useState<MelodiqParticipant[] | null>(() =>
    storage.getJson<MelodiqParticipant[] | null>(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS, null),
  );

  const handleToggleCurrentParticipant = useCallback(
    (deviceId: string, profile: MelodiqProfile) => {
      setActiveParticipants((prev) => {
        const participants =
          prev ?? storage.getJson<MelodiqParticipant[]>(STORAGE_KEYS.ACTIVE_SESSION, []);
        const exists = participants.find(
          (p: MelodiqParticipant) =>
            p.deviceId === deviceId ||
            p.profileId === deviceId ||
            (profile?.peerId && p.deviceId === profile.peerId),
        );
        let next: MelodiqParticipant[];
        if (exists) {
          next = participants.filter(
            (p: MelodiqParticipant) =>
              p.deviceId !== deviceId &&
              p.profileId !== deviceId &&
              !(profile?.peerId && p.deviceId === profile.peerId),
          );
        } else {
          next = [
            ...participants,
            {
              profileId: deviceId,
              deviceId: deviceId,
              volume: 0.8,
              muted: false,
              latency: 0,
              isRemote: profile?.isRemote || false,
              name: profile?.name,
              hue: profile?.hue,
            },
          ];
        }
        storage.setJson(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS, next);
        return next;
      });
    },
    [],
  );

  const handleReorderCurrentParticipant = useCallback((startIndex: number, endIndex: number) => {
    setActiveParticipants((prev) => {
      const base = prev ?? storage.getJson<MelodiqParticipant[]>(STORAGE_KEYS.ACTIVE_SESSION, []);
      const next = Array.from(base);
      const [removed] = next.splice(startIndex, 1);
      next.splice(endIndex, 0, removed);
      storage.setJson(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS, next);
      return next;
    });
  }, []);

  const currentDisplayParticipants = useMemo(() => {
    if (activeParticipants !== null) return activeParticipants;
    return storage.getJson<MelodiqParticipant[]>(STORAGE_KEYS.ACTIVE_SESSION, []);
  }, [activeParticipants]);

  return {
    activeParticipants,
    setActiveParticipants,
    currentDisplayParticipants,
    handleToggleCurrentParticipant,
    handleReorderCurrentParticipant,
  };
}
