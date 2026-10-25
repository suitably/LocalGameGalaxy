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
