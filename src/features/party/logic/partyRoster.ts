/**
 * Pure roster rules for the party lobby [ID: LOGIC-PARTY-ROSTER]
 *
 * No storage, timers or transport — `UniversalPartyManager` does the I/O and calls these.
 */
import { ensureUniquePlayerName } from '../../../lib/disambiguateName';
import { PIECE_ORDER, piecePalette } from '../../../themeTokens';
import type { PartyPlayer, PartyRoomState } from './universalPartyManager';

export const PLAYER_COLORS: readonly string[] = PIECE_ORDER.map((c) => piecePalette[c]);

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

/** Last change of a player's own entry (join or rename); older records fall back to `joinedAt`. */
const changedAt = (p: PartyPlayer): number => p.updatedAt ?? p.joinedAt ?? 0;

/** Departures of both states; the later one wins per player. */
export function mergeDepartures(
  a: Record<string, number> = {},
  b: Record<string, number> = {},
): Record<string, number> {
  const merged = { ...a };
  for (const [id, at] of Object.entries(b)) merged[id] = Math.max(merged[id] ?? 0, at);
  return merged;
}

/** A player is gone when they left (or were removed) after their last join or rename. */
export const hasLeft = (player: PartyPlayer, left: Record<string, number> = {}): boolean =>
  (left[player.id] ?? -1) >= changedAt(player);

/**
 * Union of both rosters by id. The newer copy of a player wins (so a rename is not undone by a
 * stale state), the score never decreases and a known slot is kept when the winning copy has none
 * (only the host assigns slots). Players in `left` are dropped.
 */
export function mergeRoster(
  local: PartyPlayer[],
  incoming: PartyPlayer[],
  left: Record<string, number> = {},
): PartyPlayer[] {
  const merged = new Map<string, PartyPlayer>(local.map((p) => [p.id, p]));
  for (const p of incoming) {
    const existing = merged.get(p.id);
    const winner = existing && changedAt(existing) > changedAt(p) ? existing : p;
    merged.set(p.id, {
      ...winner,
      score: Math.max(existing?.score ?? 0, p.score || 0),
      slot: winner.slot ?? p.slot ?? existing?.slot,
    });
  }
  return Array.from(merged.values()).filter((p) => !hasLeft(p, left));
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
    const players = incoming.players.filter((p) => !hasLeft(p, incoming.left));
    return { ...incoming, hostId, players: markHost(players, hostId) };
  }
  const left = mergeDepartures(current.left, incoming.left);
  return {
    ...incoming,
    hostId,
    left,
    players: markHost(mergeRoster(current.players, incoming.players, left), hostId),
    updatedAt: now,
  };
}

/**
 * Removes a player from the room and records the departure, so devices that still list the
 * player drop them on the next merge instead of adding them back. Used for leaving and kicking.
 */
export function removePlayer(state: PartyRoomState, playerId: string, now: number): PartyRoomState {
  return {
    ...state,
    players: state.players.filter((p) => p.id !== playerId),
    left: mergeDepartures(state.left, { [playerId]: now }),
    updatedAt: now,
  };
}

/** True when another device removed this player from the room. */
export const wasRemoved = (state: PartyRoomState, playerId: string, joinedAt: number): boolean =>
  (state.left?.[playerId] ?? -1) >= joinedAt;

/**
 * Adds a player announced by a presence ping, or takes their newer name; `null` if nothing
 * changes. A ping from before the player left does not bring them back.
 */
export function addPresencePlayer(
  state: PartyRoomState,
  player: PartyPlayer,
  now: number,
): PartyRoomState | null {
  if (hasLeft(player, state.left)) return null;
  const index = state.players.findIndex((p) => p.id === player.id);
  if (index >= 0) {
    const known = state.players[index];
    if (changedAt(player) <= changedAt(known) || player.name === known.name) return null;
    const players = [...state.players];
    const name = ensureUniquePlayerName(player.name, state.players, player.id);
    players[index] = { ...known, name, updatedAt: changedAt(player) };
    return { ...state, players, updatedAt: now };
  }
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
    updatedAt: now,
  };
  const index = players.findIndex((p) => p.id === hostId);
  if (index < 0) return { players: [host, ...players], host };
  const next = [...players];
  next[index] = { ...next[index], name: uniqueName, isHost: true, updatedAt: now };
  return { players: next, host: next[index] };
}

/** Roster when this device joins (or renames itself); keeps slot colour and score of a returning player. */
export function upsertJoiningPlayer(
  players: PartyPlayer[],
  { playerId, name, isHost, now }: { playerId: string; name: string; isHost: boolean; now: number },
): { players: PartyPlayer[]; player: PartyPlayer } {
  const index = players.findIndex((p) => p.id === playerId);
  const known = index >= 0 ? players[index] : null;
  const player: PartyPlayer = {
    id: playerId,
    name: ensureUniquePlayerName(name || 'Spieler', players, playerId),
    avatarColor: colorForSlot(index >= 0 ? index : players.length),
    isHost,
    score: known?.score ?? 0,
    // A rename keeps the join time (slot order); `updatedAt` marks the newer copy.
    joinedAt: known?.joinedAt ?? now,
    updatedAt: now,
    slot: known?.slot,
  };
  const next = [...players];
  if (index >= 0) next[index] = player;
  else next.push(player);
  return { players: next, player };
}
