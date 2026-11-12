/** Message a phone sends so the host switches its singer to another duet part (P1/P2). */
export interface TrackSelectMessage {
  type: 'trackSelect';
  trackIndex: number;
}

/** Duets have more than one track; a solo song offers nothing to choose. */
export function isDuet(trackCount: number): boolean {
  return trackCount > 1;
}

/** Builds the `trackSelect` message, or null when `trackIndex` is not a track of the song. */
export function buildTrackSelectMessage(
  trackIndex: number,
  trackCount: number,
): TrackSelectMessage | null {
  if (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex >= trackCount) return null;
  return { type: 'trackSelect', trackIndex };
}

/** Window event the phone fires when the host reports the song's parts and the one its singer has. */
export const TRACK_ASSIGNED_EVENT = 'melodiq_track_assigned';

/** What the host's `songInfo` tells a phone: the song's part names and this phone's part. */
export interface TrackAssignment {
  tracks: string[];
  trackIndex: number;
  /** False while the phone's player is hidden (spectator); older hosts omit it. */
  singing: boolean;
}

/** Reads the host's `songInfo`; null without a valid part (e.g. a host that does not send one). */
export function parseAssignedTrack(data: Record<string, unknown>): TrackAssignment | null {
  const { trackIndex, tracks, singing } = data;
  if (!Array.isArray(tracks) || !tracks.every((t) => typeof t === 'string')) return null;
  if (typeof trackIndex !== 'number' || !Number.isInteger(trackIndex)) return null;
  if (trackIndex < 0 || trackIndex >= tracks.length) return null;
  return { tracks, trackIndex, singing: singing !== false };
}

/**
 * Part this phone still has to ask the host for: `desired` while the host reports another part
 * (e.g. right after a spectator joined and got a new singer on P1), otherwise null.
 */
export function pendingTrackRequest(
  desired: number | null,
  assignment: TrackAssignment | null,
): number | null {
  if (desired === null || !assignment || !assignment.singing) return desired;
  return assignment.trackIndex === desired ? null : desired;
}
