/**
 * Pure roster rules for the party lobby [ID: LOGIC-PARTY-ROSTER]
 *
 * No storage, timers or transport — `UniversalPartyManager` does the I/O and calls these.
 */
import { ensureUniquePlayerName } from '../../../lib/disambiguateName';
import type { PartyPlayer, PartyRoomState } from './universalPartyManager';

export const PLAYER_COLORS = [
  '#f44336',
  '#e91e63',
  '#9c27b0',
  '#3f51b5',
  '#2196f3',
  '#00bcd4',
  '#009688',
  '#4caf50',
  '#ff9800',
  '#795548',
] as const;

export const colorForSlot = (index: number): string => PLAYER_COLORS[index % PLAYER_COLORS.length];

/**
 * Who is host: the room creator on this device always is; otherwise the first known hint wins —
 * incoming hostId, our hostId, an incoming player flagged isHost, one of ours flagged isHost.
 */
export function resolveHostId({
  isRoomCreator,
  myId,
  incoming,
  current,
}: {
  isRoomCreator: boolean;
  myId: string;
  incoming: Pick<PartyRoomState, 'hostId' | 'players'>;
  current?: Pick<PartyRoomState, 'hostId' | 'players'> | null;
}): string {
  if (isRoomCreator) return myId;
  return (
    incoming.hostId ||
    current?.hostId ||
    incoming.players.find((p) => p.isHost)?.id ||
    current?.players.find((p) => p.isHost)?.id ||
    ''
  );
}

/** Sets `isHost` from the resolved host; without a known host the players' own flags stay. */
export function markHost(players: PartyPlayer[], hostId: string): PartyPlayer[] {
  return players.map((p) => ({ ...p, isHost: p.id === hostId || Boolean(p.isHost && !hostId) }));
}

/**
 * Union of both rosters by id; incoming fields win, the score never decreases and a known
 * slot is kept when the incoming copy has none (only the host assigns slots).
 */
export function mergeRoster(local: PartyPlayer[], incoming: PartyPlayer[]): PartyPlayer[] {
  const merged = new Map<string, PartyPlayer>(local.map((p) => [p.id, p]));
  for (const p of incoming) {
    const existing = merged.get(p.id);
    merged.set(p.id, {
      ...p,
      score: existing ? Math.max(existing.score, p.score || 0) : p.score || 0,
      slot: p.slot ?? existing?.slot,
    });
  }
  return Array.from(merged.values());
}

/**
 * Gives every player a stable slot (0, 1, 2 …): kept once assigned, new players get the
 * lowest free one in join order. The slot is the player's seat in tabletop games, so it must
 * not depend on the roster order, which differs between devices. Run by the host only.
 */
export function assignSlots(players: PartyPlayer[]): PartyPlayer[] {
  const taken = new Set<number>();
  const keep = new Set<string>();
  for (const p of players) {
    if (typeof p.slot === 'number' && p.slot >= 0 && !taken.has(p.slot)) {
      taken.add(p.slot);
      keep.add(p.id);
    }
  }
  if (keep.size === players.length) return players;
  let next = 0;
  const byJoin = [...players].sort((a, b) => a.joinedAt - b.joinedAt);
  const slots = new Map<string, number>();
  for (const p of byJoin) {
    if (keep.has(p.id)) continue;
    while (taken.has(next)) next++;
    taken.add(next);
    slots.set(p.id, next);
  }
  return players.map((p) => (slots.has(p.id) ? { ...p, slot: slots.get(p.id) } : p));
}

/** A player's seat in party games: the host-assigned slot, else the roster position. */
export function seatOf(players: PartyPlayer[], playerId: string): number {
  const index = players.findIndex((p) => p.id === playerId);
  const slot = players[index]?.slot;
  return typeof slot === 'number' ? slot : Math.max(0, index);
}

/**
 * Room state after receiving `incoming` from another device. `current` is our state for the
 * same room, or `null` if we have none (then the incoming roster is taken as is).
 */
export function mergeIncomingState(
  current: PartyRoomState | null,
  incoming: PartyRoomState,
  { myId, isRoomCreator, now }: { myId: string; isRoomCreator: boolean; now: number },
): PartyRoomState {
  const hostId = resolveHostId({ isRoomCreator, myId, incoming, current });

  if (!current) {
    return { ...incoming, hostId, players: markHost(incoming.players, hostId) };
  }
  return {
    ...incoming,
    hostId,
    players: markHost(mergeRoster(current.players, incoming.players), hostId),
    updatedAt: now,
  };
}

/** Adds a player announced by a presence ping; `null` if the player is already listed. */
export function addPresencePlayer(
  state: PartyRoomState,
  player: PartyPlayer,
  now: number,
): PartyRoomState | null {
  if (state.players.some((p) => p.id === player.id)) return null;
  const name = ensureUniquePlayerName(player.name, state.players, player.id);
  return { ...state, players: [...state.players, { ...player, name }], updatedAt: now };
}

/** Roster when this device creates (or re-creates) the party as host. */
export function upsertHost(
  players: PartyPlayer[],
  { hostId, name, now }: { hostId: string; name: string; now: number },
): { players: PartyPlayer[]; host: PartyPlayer } {
  const uniqueName = ensureUniquePlayerName(name || 'Host', players, hostId);
  const host: PartyPlayer = {
    id: hostId,
    name: uniqueName,
    avatarColor: PLAYER_COLORS[0],
    isHost: true,
    score: 0,
    joinedAt: now,
  };
  const index = players.findIndex((p) => p.id === hostId);
  if (index < 0) return { players: [host, ...players], host };
  const next = [...players];
  next[index] = { ...next[index], name: uniqueName, isHost: true };
  return { players: next, host };
}

/** Roster when this device joins (or renames itself); keeps slot colour and score of a returning player. */
export function upsertJoiningPlayer(
  players: PartyPlayer[],
  { playerId, name, isHost, now }: { playerId: string; name: string; isHost: boolean; now: number },
): { players: PartyPlayer[]; player: PartyPlayer } {
  const index = players.findIndex((p) => p.id === playerId);
  const player: PartyPlayer = {
    id: playerId,
    name: ensureUniquePlayerName(name || 'Spieler', players, playerId),
    avatarColor: colorForSlot(index >= 0 ? index : players.length),
    isHost,
    score: index >= 0 ? players[index].score : 0,
    joinedAt: now,
  };
  const next = [...players];
  if (index >= 0) next[index] = player;
  else next.push(player);
  return { players: next, player };
}
