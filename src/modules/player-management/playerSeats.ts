/**
 * Player seats: which device plays which player [ID: MOD-PLAYER-SEATS]
 *
 * Whether a player is local is derived from the synced game record and this device's id
 * (`getDeviceId()`), not from per-game lists in device storage:
 * - a new game seats every player on the creating device (all local),
 * - sharing a player's link or QR code turns the seat into an open invitation (remote),
 * - opening the link on another device takes the seat there (joined),
 * - "play here again" takes it back.
 * When two snapshots meet, the seat with the newer `updatedAt` wins.
 */

export interface PlayerSeat {
  /** Device that plays this player; `null` while an invitation is open. */
  deviceId: string | null;
  invitedAt?: string;
  joinedAt?: string;
  /** Last change of this seat (ISO time); the newer seat wins when snapshots merge. */
  updatedAt: string;
}

/** How the device that plays a player can be reached for turn notifications. */
export interface PlayerChannels {
  ntfyTopic?: string;
  relayUrl?: string;
  notificationMethod?: 'auto' | 'webpush' | 'ntfy' | 'both';
}

export interface SeatedPlayer extends PlayerChannels {
  id: string;
  name?: string;
  isRemote?: boolean;
  seat?: PlayerSeat;
}

/** `unknown`: record from before seats existed — callers fall back to their legacy lists. */
export type SeatStatus = 'local' | 'invited' | 'remote' | 'unknown';

export function seatStatus(player: SeatedPlayer, deviceId: string): SeatStatus {
  const seat = player.seat;
  if (!seat) return 'unknown';
  if (seat.deviceId === deviceId) return 'local';
  return seat.deviceId ? 'remote' : 'invited';
}

/** Is this player played on this device? Legacy records ask `legacyIsLocal`. */
export function isPlayerOnDevice(
  player: SeatedPlayer,
  deviceId: string,
  legacyIsLocal: (playerId: string) => boolean = () => false,
): boolean {
  const status = seatStatus(player, deviceId);
  return status === 'unknown' ? legacyIsLocal(player.id) : status === 'local';
}

const updateSeat = <T extends SeatedPlayer>(
  players: T[],
  playerId: string,
  change: (player: T) => T,
): T[] => players.map((p) => (p.id === playerId ? change(p) : p));

/** A new game: every player sits on the creating device. */
export function seatAllOnDevice<T extends SeatedPlayer>(
  players: T[],
  deviceId: string,
  now: string,
): T[] {
  return players.map((p) => ({ ...p, isRemote: false, seat: { deviceId, updatedAt: now } }));
}

/** Sharing a player's link: the seat becomes an open invitation and the player counts as remote. */
export function invitePlayer<T extends SeatedPlayer>(
  players: T[],
  playerId: string,
  now: string,
): T[] {
  return updateSeat(players, playerId, (p) =>
    p.seat && !p.seat.deviceId
      ? p // already invited — keep the original time so repeated shares change nothing
      : { ...p, isRemote: true, seat: { deviceId: null, invitedAt: now, updatedAt: now } },
  );
}

/**
 * Takes a player's seat on `deviceId` with that device's notification channels. `remote`:
 * joined from a shared link (else the player is played on the creating device again).
 */
export function takeSeat<T extends SeatedPlayer>(
  players: T[],
  playerId: string,
  deviceId: string,
  now: string,
  options: { remote: boolean; channels?: PlayerChannels },
): T[] {
  return updateSeat(players, playerId, (p) => ({
    ...p,
    ...options.channels,
    isRemote: options.remote,
    seat: {
      deviceId,
      invitedAt: options.remote ? p.seat?.invitedAt : undefined,
      joinedAt: options.remote ? now : undefined,
      updatedAt: now,
    },
  }));
}

const seatTime = (p?: SeatedPlayer) => (p?.seat ? Date.parse(p.seat.updatedAt) || 0 : -1);

const pickChannels = (from: PlayerChannels): PlayerChannels => ({
  ntfyTopic: from.ntfyTopic,
  relayUrl: from.relayUrl,
  notificationMethod: from.notificationMethod,
});

/**
 * Merges an incoming player list into the stored one. Other fields come from `incoming`; the
 * seat (with its channels) comes from whichever side changed it last. On a tie, channels of a
 * player seated on this device stay as stored — this device is the authority for them.
 */
export function mergeSeatedPlayers<T extends SeatedPlayer>(
  incoming: T[],
  existing: T[],
  deviceId: string,
): T[] {
  return incoming.map((inP) => {
    const exP = existing.find((p) => p.id === inP.id);
    if (!exP) return inP;
    const inTime = seatTime(inP);
    const exTime = seatTime(exP);
    if (exTime > inTime) {
      return { ...exP, ...inP, ...pickChannels(exP), isRemote: exP.isRemote, seat: exP.seat };
    }
    if (inTime > exTime) return { ...exP, ...inP };
    const keepMine = exP.seat?.deviceId === deviceId;
    const channels = keepMine
      ? pickChannels(exP)
      : {
          ntfyTopic: inP.ntfyTopic || exP.ntfyTopic,
          relayUrl: inP.relayUrl || exP.relayUrl,
          notificationMethod: inP.notificationMethod || exP.notificationMethod,
        };
    return { ...exP, ...inP, ...channels };
  });
}

/** Did merging change anything about seats or channels? */
export function seatsDiffer(a: SeatedPlayer[], b: SeatedPlayer[]): boolean {
  const key = (list: SeatedPlayer[]) =>
    JSON.stringify(
      list.map((p) => [p.id, p.seat ?? null, p.ntfyTopic, p.relayUrl, p.notificationMethod]),
    );
  return key(a) !== key(b);
}

/** Players whose seat was taken by another device between `before` and `after`. */
export function newlyJoinedPlayers<T extends SeatedPlayer>(
  before: T[],
  after: T[],
  deviceId: string,
): T[] {
  return after.filter((p) => {
    if (seatStatus(p, deviceId) !== 'remote' || !p.seat?.joinedAt) return false;
    const prev = before.find((b) => b.id === p.id);
    return prev?.seat?.deviceId !== p.seat.deviceId || prev?.seat?.joinedAt !== p.seat.joinedAt;
  });
}

/**
 * Gives seats to a record from before seats existed: the players this device listed as local
 * sit here. Players of other devices stay seat-less until those devices do the same.
 */
export function adoptLegacySeats<T extends SeatedPlayer>(
  players: T[],
  deviceId: string,
  legacyLocalIds: string[],
  now: string,
): { players: T[]; changed: boolean } {
  let changed = false;
  const next = players.map((p) => {
    if (p.seat || !legacyLocalIds.includes(p.id)) return p;
    changed = true;
    return { ...p, seat: { deviceId, updatedAt: now } };
  });
  return { players: next, changed };
}

/** Writes this device's notification channels onto every player seated here. */
export function attachDeviceChannels<T extends SeatedPlayer>(
  players: T[],
  deviceId: string,
  channels: PlayerChannels,
): { players: T[]; changed: boolean } {
  let changed = false;
  const next = players.map((p) => {
    if (seatStatus(p, deviceId) !== 'local') return p;
    const merged = {
      ntfyTopic: channels.ntfyTopic || p.ntfyTopic,
      relayUrl: channels.relayUrl || p.relayUrl,
      notificationMethod: channels.notificationMethod || p.notificationMethod,
    };
    if (
      merged.ntfyTopic === p.ntfyTopic &&
      merged.relayUrl === p.relayUrl &&
      merged.notificationMethod === p.notificationMethod
    ) {
      return p;
    }
    changed = true;
    return { ...p, ...merged };
  });
  return { players: next, changed };
}
