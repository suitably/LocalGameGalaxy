/**
 * The song queue as host-run room state [ID: GAME-MELODIQ-QUEUE-ROOM]
 *
 * The host's `useQueue` stays the source of truth and mirrors `{ queue, nowPlaying }` into a
 * `useRoomReducer` room (`melodiq-queue`) with one action, `HOST_QUEUE`; phones render that state
 * (late joiners get it through the room's hello/state handshake). Phones change the queue only by
 * request events on the Melodiq room events channel; the host checks each one against the role of
 * the transport-stamped `from` and calls the matching `useQueue` function.
 */
import type { SongMeta } from '../db';
import type { QueueItem } from '../hooks/useQueue';

/** Room game key of the queue state channel (`melodiq-queue_<roomId>`). */
export const QUEUE_ROOM_GAME_KEY = 'melodiq-queue';

export interface QueueRoomState {
  queue: QueueItem[];
  nowPlaying: SongMeta | null;
}

/** The host mirrors its queue into the room; nothing else changes the room state. */
export interface HostQueueAction {
  type: 'HOST_QUEUE';
  queue: QueueItem[];
  nowPlaying: SongMeta | null;
}

export type QueueRoomAction = HostQueueAction;

export const INITIAL_QUEUE_ROOM: QueueRoomState = { queue: [], nowPlaying: null };

export function queueRoomReducer(state: QueueRoomState, action: QueueRoomAction): QueueRoomState {
  if (action.type === 'HOST_QUEUE') return { queue: action.queue, nowPlaying: action.nowPlaying };
  return state;
}

/** `authorize` for the queue room: only the host's own id may mirror the queue. */
export const queueRoomAllows =
  (hostId: string) =>
  (_state: QueueRoomState, action: QueueRoomAction, from: string): boolean =>
    action.type === 'HOST_QUEUE' && hostId !== '' && from === hostId;

/** Profile shown for a participant a phone adds to a queue entry. */
export interface QueueParticipantProfile {
  name?: string;
  hue?: number;
  isRemote?: boolean;
  peerId?: string;
}

/** Phone to host requests; `from` is stamped by the host transport (the phone's device id). */
export type QueueRequest =
  | { type: 'queue.add'; from: string; songId: string }
  | { type: 'queue.remove'; from: string; itemId: string }
  | {
      type: 'queue.toggle_participant';
      from: string;
      itemId: string;
      deviceId: string;
      profile?: QueueParticipantProfile;
    }
  | {
      type: 'queue.reorder_participant';
      from: string;
      itemId: string;
      startIndex: number;
      endIndex: number;
    }
  | { type: 'queue.select_song'; from: string; songId: string; forcePlay: boolean };

/** A request without the sender, as the phone builds it (`from` is added on send). */
type WithoutFrom<R> = R extends unknown ? Omit<R, 'from'> : never;
export type QueueRequestPayload = WithoutFrom<QueueRequest>;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
export const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;
export const isIndex = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0;

export function parseProfile(raw: unknown): QueueParticipantProfile | undefined {
  if (!isRecord(raw)) return undefined;
  const profile: QueueParticipantProfile = {};
  if (typeof raw.name === 'string') profile.name = raw.name;
  if (typeof raw.hue === 'number' && Number.isFinite(raw.hue)) profile.hue = raw.hue;
  if (typeof raw.isRemote === 'boolean') profile.isRemote = raw.isRemote;
  if (typeof raw.peerId === 'string') profile.peerId = raw.peerId;
  return profile;
}

/** Narrows a received room event to a valid queue request, or null. */
export function parseQueueRequest(data: unknown): QueueRequest | null {
  if (!isRecord(data) || !nonEmptyString(data.from)) return null;
  const from = data.from;
  switch (data.type) {
    case 'queue.add':
      return nonEmptyString(data.songId) ? { type: data.type, from, songId: data.songId } : null;
    case 'queue.remove':
      return nonEmptyString(data.itemId) ? { type: data.type, from, itemId: data.itemId } : null;
    case 'queue.toggle_participant': {
      if (!nonEmptyString(data.itemId) || !nonEmptyString(data.deviceId)) return null;
      const profile = parseProfile(data.profile);
      return {
        type: data.type,
        from,
        itemId: data.itemId,
        deviceId: data.deviceId,
        ...(profile ? { profile } : {}),
      };
    }
    case 'queue.reorder_participant':
      if (!nonEmptyString(data.itemId) || !isIndex(data.startIndex) || !isIndex(data.endIndex)) {
        return null;
      }
      return {
        type: data.type,
        from,
        itemId: data.itemId,
        startIndex: data.startIndex,
        endIndex: data.endIndex,
      };
    case 'queue.select_song':
      return nonEmptyString(data.songId)
        ? { type: data.type, from, songId: data.songId, forcePlay: data.forcePlay === true }
        : null;
    default:
      return null;
  }
}

type Role = string | undefined;

export const isQueueManager = (role: Role) => role === 'admin' || role === 'queue_manager';

/** Everyone but singers may add or select songs. */
export const canRequestSong = (role: Role): boolean => role !== 'singer';

/** Admins and queue managers may start a song at once instead of queueing it. */
export const canForcePlay = (role: Role): boolean => isQueueManager(role);

/** Managers edit every entry; contributors only the ones they added. */
export function canEditQueueItem(role: Role, item: QueueItem | undefined, from: string): boolean {
  if (isQueueManager(role)) return true;
  return role === 'queue_contributor' && item?.requesterId === from;
}

/** The phone the request came from, as the host's WebRTC manager knows it. */
export interface QueuePeer {
  peerId: string;
  name: string;
  hue?: number;
}

/** A song selection forwarded to the host's playback (`melodiq_remote_select_song`). */
export interface RemoteSongSelection {
  songId: string;
  forcePlay: boolean;
  requester: string;
  requesterId: string;
}

export interface QueueHostDeps {
  /** Role of a device id (`getRoleForDevice`); called with the transport-stamped `from` only. */
  getRole: (deviceId: string) => Role;
  /** The connected phone with this device id; requests from unknown senders are ignored. */
  getPeer: (deviceId: string) => QueuePeer | undefined;
  getQueue: () => QueueItem[];
  findSong: (songId: string) => SongMeta | undefined;
  addToQueue: (song: SongMeta, requester: string, requesterId: string) => void;
  removeFromQueue: (itemId: string) => void;
  toggleQueueParticipant: (
    itemId: string,
    deviceId: string,
    profile: QueueParticipantProfile,
  ) => void;
  reorderQueueParticipant: (itemId: string, startIndex: number, endIndex: number) => void;
  selectSong: (selection: RemoteSongSelection) => void;
  onDenied?: (request: QueueRequest, role: Role) => void;
}

/**
 * Host handler for one room event: ignores everything but a valid queue request from a connected
 * phone, checks the sender's role (and entry ownership) and calls the matching queue function.
 */
export function handleQueueEvent(event: unknown, deps: QueueHostDeps): void {
  const req = parseQueueRequest(event);
  if (!req) return;
  const peer = deps.getPeer(req.from);
  if (!peer) return;
  const role = deps.getRole(req.from);
  const itemOf = (itemId: string) => deps.getQueue().find((item) => item.id === itemId);
  const deny = () => deps.onDenied?.(req, role);

  switch (req.type) {
    case 'queue.add': {
      const song = deps.findSong(req.songId);
      if (!song) return;
      if (!canRequestSong(role)) return deny();
      return deps.addToQueue(song, peer.name, req.from);
    }
    case 'queue.select_song':
      if (!canRequestSong(role)) return deny();
      return deps.selectSong({
        songId: req.songId,
        forcePlay: canForcePlay(role) && req.forcePlay,
        requester: peer.name,
        requesterId: req.from,
      });
    case 'queue.remove':
      if (!canEditQueueItem(role, itemOf(req.itemId), req.from)) return deny();
      return deps.removeFromQueue(req.itemId);
    case 'queue.reorder_participant':
      if (!canEditQueueItem(role, itemOf(req.itemId), req.from)) return deny();
      return deps.reorderQueueParticipant(req.itemId, req.startIndex, req.endIndex);
    case 'queue.toggle_participant': {
      const isSelf = req.deviceId === req.from || req.deviceId === peer.peerId;
      if (!isSelf && !canEditQueueItem(role, itemOf(req.itemId), req.from)) return deny();
      return deps.toggleQueueParticipant(
        req.itemId,
        req.deviceId,
        req.profile ?? { name: peer.name, hue: peer.hue },
      );
    }
  }
}
