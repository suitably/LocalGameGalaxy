/**
 * Singers of the playing song as host-run room state [ID: GAME-MELODIQ-CURRENT-PARTICIPANTS-ROOM]
 *
 * The host's `useActiveParticipants` stays the source of truth and mirrors its list into the
 * `melodiq-current-participants` room (`HOST_CURRENT_PARTICIPANTS`). Phones render that list and
 * change it only by request events on the Melodiq room events channel; the host checks the role
 * of the transport-stamped `from` (managers edit everyone, anyone may toggle themselves).
 */
import type { MelodiqParticipant } from '../types';
import {
  isIndex,
  isQueueManager,
  isRecord,
  nonEmptyString,
  parseProfile,
  type QueueParticipantProfile,
  type QueuePeer,
} from './queueRoom';

/** Room game key of the state channel (`melodiq-current-participants_<roomId>`). */
export const CURRENT_PARTICIPANTS_ROOM_GAME_KEY = 'melodiq-current-participants';

export interface CurrentParticipantsState {
  participants: MelodiqParticipant[];
}

export interface CurrentParticipantsAction {
  type: 'HOST_CURRENT_PARTICIPANTS';
  participants: MelodiqParticipant[];
}

export const INITIAL_CURRENT_PARTICIPANTS: CurrentParticipantsState = { participants: [] };

export function currentParticipantsReducer(
  state: CurrentParticipantsState,
  action: CurrentParticipantsAction,
): CurrentParticipantsState {
  if (action.type === 'HOST_CURRENT_PARTICIPANTS') return { participants: action.participants };
  return state;
}

/** `authorize` for the room: only the host's own id may mirror the list. */
export const currentParticipantsAllows =
  (hostId: string) =>
  (_state: CurrentParticipantsState, action: CurrentParticipantsAction, from: string): boolean =>
    action.type === 'HOST_CURRENT_PARTICIPANTS' && hostId !== '' && from === hostId;

/** Phone to host requests; `from` is stamped by the host transport (the phone's device id). */
export type CurrentParticipantsRequest =
  | {
      type: 'current_participants.toggle';
      from: string;
      deviceId: string;
      profile?: QueueParticipantProfile;
    }
  | { type: 'current_participants.reorder'; from: string; startIndex: number; endIndex: number };

type WithoutFrom<R> = R extends unknown ? Omit<R, 'from'> : never;
export type CurrentParticipantsRequestPayload = WithoutFrom<CurrentParticipantsRequest>;

/** Narrows a received room event to a valid request, or null. */
export function parseCurrentParticipantsRequest(data: unknown): CurrentParticipantsRequest | null {
  if (!isRecord(data) || !nonEmptyString(data.from)) return null;
  const from = data.from;
  if (data.type === 'current_participants.toggle') {
    if (!nonEmptyString(data.deviceId)) return null;
    const profile = parseProfile(data.profile);
    return { type: data.type, from, deviceId: data.deviceId, ...(profile ? { profile } : {}) };
  }
  if (data.type === 'current_participants.reorder') {
    if (!isIndex(data.startIndex) || !isIndex(data.endIndex)) return null;
    return { type: data.type, from, startIndex: data.startIndex, endIndex: data.endIndex };
  }
  return null;
}

export interface CurrentParticipantsHostDeps {
  getRole: (deviceId: string) => string | undefined;
  /** The connected phone with this device id; requests from unknown senders are ignored. */
  getPeer: (deviceId: string) => QueuePeer | undefined;
  toggle: (deviceId: string, profile: QueueParticipantProfile) => void;
  reorder: (startIndex: number, endIndex: number) => void;
  onDenied?: (request: CurrentParticipantsRequest, role: string | undefined) => void;
}

/** Host handler for one room event: applies a permitted request from a connected phone. */
export function handleCurrentParticipantsEvent(
  event: unknown,
  deps: CurrentParticipantsHostDeps,
): void {
  const req = parseCurrentParticipantsRequest(event);
  if (!req) return;
  const peer = deps.getPeer(req.from);
  if (!peer) return;
  const role = deps.getRole(req.from);
  const manager = isQueueManager(role);
  if (req.type === 'current_participants.reorder') {
    if (!manager) return deps.onDenied?.(req, role);
    return deps.reorder(req.startIndex, req.endIndex);
  }
  const isSelf = req.deviceId === req.from || req.deviceId === peer.peerId;
  if (!isSelf && !manager) return deps.onDenied?.(req, role);
  deps.toggle(req.deviceId, req.profile ?? { name: peer.name, hue: peer.hue });
}
