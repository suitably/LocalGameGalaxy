/**
 * Party session rules: room state on create/join and host takeover [ID: LOGIC-PARTY-SESSION]
 *
 * Pure — `UniversalPartyManager` is the adapter that adds storage, timers and transport (#467 S2).
 *
 * Host takeover: every device sends a presence ping every 3 s. When the host has not been heard
 * for `HOST_TIMEOUT_MS` (tab closed, device gone) or left the roster, the live player with the
 * lowest seat takes over and raises `hostEpoch`. The higher epoch always wins a merge, so an old
 * host that comes back steps down instead of splitting the room.
 */
import { markHost, resolveHostId, seatOf, upsertHost, upsertJoiningPlayer } from './partyRoster';
import type { PartyPlayer, PartyRoomState } from './universalPartyManager';

export const HOST_TIMEOUT_MS = 20_000;

/** State after this device creates (or re-opens) its room as host. */
export function createdState(
  roomId: string,
  hostId: string,
  hostName: string,
  previous: Pick<PartyRoomState, 'status' | 'activeGame' | 'players' | 'hostEpoch'> | null,
  now: number,
): { state: PartyRoomState; host: PartyPlayer } {
  const { players, host } = upsertHost(previous?.players ?? [], { hostId, name: hostName, now });
  return {
    host,
    state: {
      roomId,
      hostId,
      hostEpoch: previous?.hostEpoch ?? 0,
      status: previous?.status || 'lobby',
      activeGame: previous?.activeGame || null,
      players,
      updatedAt: now,
    },
  };
}

/** State after this device joins (or renames itself in) a room; `known` is the last state seen. */
export function joinedState(
  roomId: string,
  { myId, name, spectator, isRoomCreator }: JoinOptions,
  known: PartyRoomState | null,
  now: number,
): { state: PartyRoomState; player: PartyPlayer } {
  const hostId = known
    ? resolveHostId({ isRoomCreator, myId, incoming: known })
    : isRoomCreator
      ? myId
      : '';
  const base: PartyRoomState =
    known && known.roomId === roomId
      ? known
      : { roomId, hostId, status: 'lobby', activeGame: null, players: [], updatedAt: now };
  const { players, player } = upsertJoiningPlayer(base.players, {
    playerId: myId,
    name,
    isHost: isRoomCreator || hostId === myId,
    spectator,
    now,
  });
  return { player, state: { ...base, players, hostId, updatedAt: now } };
}

interface JoinOptions {
  myId: string;
  name: string;
  spectator?: boolean;
  isRoomCreator: boolean;
}

/**
 * Whether this device should take over as host: the host is gone (not in the roster, or silent
 * for `HOST_TIMEOUT_MS`) and this device is the live player with the lowest seat. `seenAt` gives
 * a player's last presence ping (or when this device started listening, if none yet).
 */
export function shouldTakeOverHost(
  state: PartyRoomState,
  myId: string,
  seenAt: (playerId: string) => number,
  now: number,
): boolean {
  // No host known yet (just joined, no state received): that is not a missing host.
  if (!state.hostId || state.hostId === myId) return false;
  if (!state.players.some((p) => p.id === myId)) return false;
  const alive = (id: string) => id === myId || now - seenAt(id) < HOST_TIMEOUT_MS;
  const host = state.players.find((p) => p.id === state.hostId);
  if (host && alive(host.id)) return false;
  const candidates = state.players.filter((p) => p.id !== state.hostId && alive(p.id));
  const seated = candidates.filter((p) => !p.spectator);
  const pool = seated.length > 0 ? seated : candidates;
  const order = (p: PartyPlayer) => seatOf(state.players, p.id);
  const next = [...pool].sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id))[0];
  return next?.id === myId;
}

/** This device becomes host with a higher epoch than the one it replaces. */
export function takeOverHost(state: PartyRoomState, myId: string, now: number): PartyRoomState {
  return {
    ...state,
    hostId: myId,
    hostEpoch: (state.hostEpoch ?? 0) + 1,
    players: markHost(state.players, myId),
    updatedAt: now,
  };
}
