/**
 * The Stammtisch side of the party lobby [ID: HOOK-PARTY-STAMMTISCH]
 *
 * Whether this room is a Stammtisch and saved on this device, saving/removing it, opening it on
 * app start, taking over hosting, and who is here right now (`universalPartyManager.isPresent`).
 */
import { useCallback, useEffect, useState } from 'react';
import { getRoomKey } from '../../../modules/sync/roomKeys';
import { universalPartyManager, type PartyRoomState } from '../logic/universalPartyManager';
import {
  DEFAULT_STAMMTISCH_NAME,
  cleanStammtischName,
  findStammtisch,
  getAutoOpenStammtisch,
  loadStammtische,
  removeStammtisch,
  saveStammtische,
  setAutoOpenStammtisch,
  upsertStammtisch,
} from '../logic/stammtisch';

const presentIdsOf = (state: PartyRoomState | null): string =>
  (state?.players ?? [])
    .filter((p) => universalPartyManager.isPresent(p.id))
    .map((p) => p.id)
    .join(',');

export function useStammtisch(roomId: string, roomState: PartyRoomState | null) {
  const [list, setList] = useState(loadStammtische);
  const [autoOpen, setAutoOpenState] = useState(getAutoOpenStammtisch);
  // A string, so a presence change re-renders even when the room state object stays the same.
  const [presentIds, setPresentIds] = useState(() => presentIdsOf(roomState));
  useEffect(
    () =>
      universalPartyManager.onPartyUpdate(
        (s) => s.roomId === roomId && setPresentIds(presentIdsOf(s)),
      ),
    [roomId],
  );

  const saved = findStammtisch(list, roomId);
  const roomName = roomState?.stammtisch;
  const name = roomName ?? saved?.name ?? null;
  const myId = universalPartyManager.getMyPlayerId();

  const commit = useCallback((next: typeof list) => {
    saveStammtische(next);
    setList(next);
    setAutoOpenState(getAutoOpenStammtisch());
  }, []);

  const save = (newName: string = name ?? DEFAULT_STAMMTISCH_NAME) => {
    const clean = cleanStammtischName(newName);
    commit(
      upsertStammtisch(list, {
        roomId,
        roomKey: getRoomKey(roomId),
        name: clean,
        playerId: myId,
        savedAt: saved?.savedAt ?? Date.now(),
      }),
    );
    universalPartyManager.markStammtisch(roomId, clean);
  };

  // The hub shows the room's current name (storage only: this hook already reads it from the room).
  useEffect(() => {
    if (saved && roomName && saved.name !== roomName)
      saveStammtische(upsertStammtisch(loadStammtische(), { ...saved, name: roomName }));
  }, [saved, roomName]);

  const present = new Set(presentIds.split(',').filter(Boolean));
  const players = roomState?.players ?? [];
  return {
    isStammtisch: Boolean(roomName),
    name,
    saved: Boolean(saved),
    save,
    remove: () => commit(removeStammtisch(list, roomId)),
    autoOpen: autoOpen === roomId,
    setAutoOpen: (on: boolean) => {
      setAutoOpenStammtisch(on ? roomId : null);
      setAutoOpenState(getAutoOpenStammtisch());
    },
    /** In a Stammtisch: whether a member is here now (the roster also lists absent members). */
    isAway: (playerId: string) => Boolean(roomName) && !present.has(playerId),
    othersHere: players.some((p) => p.id !== myId && present.has(p.id)),
    canClaimHost: Boolean(roomName) && roomState?.status === 'lobby' && roomState.hostId !== myId,
    claimHost: () => universalPartyManager.claimHost(roomId),
  };
}

export type StammtischLobby = ReturnType<typeof useStammtisch>;
