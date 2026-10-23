/**
 * Seat changes bound to this device [ID: MOD-PLAYER-SEAT-ACTIONS]
 *
 * Thin wrappers over the pure `playerSeats.ts` that fill in this device's id, its notification
 * channels and the current time. Games persist and publish the returned player list.
 */
import { getDeviceId } from '../../lib/deviceIdentity';
import { getDeviceChannels } from '../../lib/push/pushSettings';
import {
  adoptLegacySeats,
  attachDeviceChannels,
  invitePlayer,
  isPlayerOnDevice,
  mergeSeatedPlayers,
  mergeSeatsInto,
  newlyJoinedPlayers,
  seatAllOnDevice,
  seatsDiffer,
  seatStatus,
  takeSeat,
  type SeatStatus,
  type SeatedPlayer,
} from './playerSeats';

const now = () => new Date().toISOString();

/** New game: all players on this device, which can be reached through its channels. */
export function seatNewGame<T extends SeatedPlayer>(players: T[]): T[] {
  const deviceId = getDeviceId();
  return attachDeviceChannels(
    seatAllOnDevice(players, deviceId, now()),
    deviceId,
    getDeviceChannels(),
  ).players;
}

/** A player's link or QR code was shared. */
export function inviteSeat<T extends SeatedPlayer>(players: T[], playerId: string): T[] {
  return invitePlayer(players, playerId, now());
}

/** This device opened a player's link: it plays that player from now on. */
export function joinSeat<T extends SeatedPlayer>(
  players: T[],
  playerId: string,
  linkRelay?: string,
): T[] {
  return takeSeat(players, playerId, getDeviceId(), now(), {
    remote: true,
    channels: getDeviceChannels(linkRelay),
  });
}

/** The player is played on this device again. */
export function reclaimSeat<T extends SeatedPlayer>(players: T[], playerId: string): T[] {
  return takeSeat(players, playerId, getDeviceId(), now(), {
    remote: false,
    channels: getDeviceChannels(),
  });
}

/**
 * Brings this device's seats up to date: seats for records from before seats existed
 * (`legacyLocalIds`) and current notification channels. `changed`: persist and publish.
 */
export function refreshOwnSeats<T extends SeatedPlayer>(
  players: T[],
  legacyLocalIds: string[],
): { players: T[]; changed: boolean } {
  const deviceId = getDeviceId();
  const adopted = adoptLegacySeats(players, deviceId, legacyLocalIds, now());
  const attached = attachDeviceChannels(adopted.players, deviceId, getDeviceChannels());
  return { players: attached.players, changed: adopted.changed || attached.changed };
}

export function isLocalPlayer(
  player: SeatedPlayer,
  legacyIsLocal?: (playerId: string) => boolean,
): boolean {
  return isPlayerOnDevice(player, getDeviceId(), legacyIsLocal);
}

export function playerSeatStatus(player: SeatedPlayer): SeatStatus {
  return seatStatus(player, getDeviceId());
}

/**
 * Players after importing a snapshot: from a newer snapshot all players with the newer seats,
 * from an older one only seat changes (a join or invitation). `joined`: players another
 * device took a seat for, for a "joined" notice.
 */
export function mergeSnapshotPlayers<T extends SeatedPlayer>(
  existing: T[],
  incoming: T[],
  snapshotIsNewer: boolean,
): { players: T[]; changed: boolean; joined: T[] } {
  const deviceId = getDeviceId();
  const players = snapshotIsNewer
    ? mergeSeatedPlayers(incoming, existing, deviceId)
    : mergeSeatsInto(existing, incoming, deviceId);
  return {
    players,
    changed: snapshotIsNewer || seatsDiffer(players, existing),
    joined: newlyJoinedPlayers(existing, players, deviceId),
  };
}

/**
 * Seats after opening a player's shared link on this device, or `null` when nothing changes
 * (unknown player, or the seat is already here — opening the same link again is not a join).
 */
export function joinSeatFromLink<T extends SeatedPlayer>(
  players: T[],
  playerId: string,
  linkRelay?: string,
): T[] | null {
  const player = players.find((p) => p.id === playerId);
  if (!player || (player.seat && isPlayerOnDevice(player, getDeviceId()))) return null;
  return joinSeat(players, playerId, linkRelay);
}
