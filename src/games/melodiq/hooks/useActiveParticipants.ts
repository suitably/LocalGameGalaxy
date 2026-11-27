import { useCallback, useMemo, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import {
  moveParticipant,
  toggleParticipant,
  type ToggleParticipantProfile,
} from '../logic/queueParticipantUtils';
import { type MelodiqParticipant, type MelodiqProfile } from '../types';
import { useCurrentParticipantsRoom } from './useCurrentParticipantsRoom';

const isClient = new URLSearchParams(window.location.search).get('role') === 'client';

const readActiveSession = () =>
  storage.getJson<MelodiqParticipant[]>(STORAGE_KEYS.ACTIVE_SESSION, []);

/**
 * Participants of the currently playing song (singers), persisted for page reloads. The host owns
 * the list; on a phone the shown list is the host's and edits go to the host as requests.
 */
export function useActiveParticipants() {
  const [activeParticipants, setActiveParticipants] = useState<MelodiqParticipant[] | null>(() =>
    storage.getJson<MelodiqParticipant[] | null>(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS, null),
  );

  const update = useCallback((change: (list: MelodiqParticipant[]) => MelodiqParticipant[]) => {
    setActiveParticipants((prev) => {
      const next = change(prev ?? readActiveSession());
      storage.setJson(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS, next);
      return next;
    });
  }, []);

  const toggleLocal = useCallback(
    (deviceId: string, profile?: ToggleParticipantProfile) =>
      update((list) => toggleParticipant(list, deviceId, profile)),
    [update],
  );

  const reorderLocal = useCallback(
    (startIndex: number, endIndex: number) =>
      update((list) => moveParticipant(list, startIndex, endIndex)),
    [update],
  );

  const hostParticipants = useMemo(
    () => activeParticipants ?? readActiveSession(),
    [activeParticipants],
  );

  const room = useCurrentParticipantsRoom(isClient, {
    participants: hostParticipants,
    toggle: toggleLocal,
    reorder: reorderLocal,
  });
  const { sendRequest } = room;

  const handleToggleCurrentParticipant = useCallback(
    (deviceId: string, profile: MelodiqProfile) => {
      if (!isClient) return toggleLocal(deviceId, profile);
      sendRequest({
        type: 'current_participants.toggle',
        deviceId,
        profile: {
          name: profile?.name,
          hue: profile?.hue,
          isRemote: profile?.isRemote,
          peerId: profile?.peerId,
        },
      });
    },
    [toggleLocal, sendRequest],
  );

  const handleReorderCurrentParticipant = useCallback(
    (startIndex: number, endIndex: number) => {
      if (!isClient) return reorderLocal(startIndex, endIndex);
      sendRequest({ type: 'current_participants.reorder', startIndex, endIndex });
    },
    [reorderLocal, sendRequest],
  );

  return {
    activeParticipants,
    setActiveParticipants,
    currentDisplayParticipants: isClient ? room.participants : hostParticipants,
    handleToggleCurrentParticipant,
    handleReorderCurrentParticipant,
  };
}
