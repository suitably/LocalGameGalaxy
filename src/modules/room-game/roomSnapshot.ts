/**
 * Resuming a room game after a host change [ID: MOD-ROOM-GAME-SNAPSHOT]
 *
 * The host's `RoomStatePeer` is the only authoritative copy of a room game. When another device
 * becomes host, it continues from the newest state it knows instead of starting over: the copy
 * its own guest peer received, or a snapshot every device keeps per party room (Stammtisch), which
 * also survives the app being closed. A snapshot is valid only for the same channel and `tag`
 * (the party's `statusAt` of the running game), so a later game never resumes an older one.
 */
import { storage, STORAGE_PREFIXES } from '../../lib/storage';
import type { RoomHost } from './roomSync';

interface RoomSnapshot<S> extends RoomHost<S> {
  channel: string;
  tag: string;
}

const keyOf = (roomId: string) => `${STORAGE_PREFIXES.ROOM_GAME_SNAPSHOT}${roomId}`;

export function saveRoomSnapshot<S>(
  roomId: string,
  channel: string,
  tag: string,
  host: RoomHost<S>,
): void {
  storage.setJson<RoomSnapshot<S>>(keyOf(roomId), {
    channel,
    tag,
    rev: host.rev,
    state: host.state,
  });
}

export function loadRoomSnapshot<S>(
  roomId: string,
  channel: string,
  tag: string,
): RoomHost<S> | null {
  const snap = storage.getJson<RoomSnapshot<S> | null>(keyOf(roomId), null);
  if (!snap || snap.channel !== channel || snap.tag !== tag || !(snap.rev > 0)) return null;
  return { state: snap.state, rev: snap.rev };
}

/** The newest of the known copies (highest `rev`, only started games), adopted by the new host. */
export function resumeFrom<S>(
  copies: (RoomHost<S> | null | undefined)[],
  adopt: (state: S) => S = (s) => s,
): RoomHost<S> | null {
  const newest = copies
    .filter((c): c is RoomHost<S> => Boolean(c) && (c as RoomHost<S>).rev > 0)
    .sort((a, b) => b.rev - a.rev)[0];
  return newest ? { state: adopt(newest.state), rev: newest.rev } : null;
}
