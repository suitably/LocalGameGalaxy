import {
  WebRTCHostManager,
  type RemotePeerBase,
  type WebRTCHostManagerCallbacks,
} from '../../../lib/webrtc';
import { isNewerSeq, newestPitch, parsePitchMessage, type TimedPitch } from '../logic/pitchFrames';

/** A connected phone; it detects its pitch itself and sends it over the data channel. */
export type MicRemotePeer = RemotePeerBase & {
  /** Newest sung pitch, dated on the host clock (`capturedAt`); null after a silence frame. */
  lastPitch?: TimedPitch | null;
  /** Sequence number of the last pitch message taken. */
  lastPitchSeq?: number | null;
  /** When that message arrived (host clock). */
  lastPitchAt?: number;
};

/**
 * Without a new message for this long a phone counts as silent (the link stalled). Phones send
 * about every 100 ms while singing and a silence frame when they stop.
 */
const PITCH_STALE_MS = 250;

/**
 * `WebRTCMicManager` — remote phone singers for multi-player Melodiq sessions.
 *
 * Phones run `detectPitch()` themselves (`usePhoneMicStreaming.ts`) and send dated pitch frames
 * over the WebRTC DataChannel (`logic/pitchFrames.ts`); the host keeps the newest one per peer,
 * dated with the heartbeat round trip, and reports its age so scoring can use the note that was
 * due when it was sung. Phones send no audio track.
 *
 * @see {@link MicrophoneManager} for the local microphone equivalent.
 */
export class WebRTCMicManager extends WebRTCHostManager<MicRemotePeer> {
  constructor(
    partyId: string,
    trackerUrls: string[],
    callbacks?: WebRTCHostManagerCallbacks<MicRemotePeer>,
  ) {
    super(partyId, trackerUrls, {
      ...callbacks,
      createRemotePeer: (peerId, connectionId, name, peer) => ({
        peer,
        peerId,
        connectionId,
        name,
      }),
    });
  }

  protected handleCustomWebRTCMessage(msg: unknown, remotePeer: MicRemotePeer): boolean {
    const parsed = parsePitchMessage(msg);
    if (!parsed) return false;
    if (!isNewerSeq(parsed.seq, remotePeer.lastPitchSeq ?? null)) return true;
    const now = Date.now();
    remotePeer.lastPitchSeq = parsed.seq;
    remotePeer.lastPitchAt = now;
    remotePeer.lastPitch = newestPitch(parsed.frames, now, this.getRttMs(remotePeer.peerId));
    return true;
  }

  /** The phone's newest pitch with its age in ms, or null when silent or stale. */
  getPitch(peerId: string): TimedPitch | null {
    const peer = this.peers.get(peerId);
    const lastPitch = peer?.lastPitch;
    const now = Date.now();
    if (!lastPitch || now - (peer.lastPitchAt ?? 0) >= PITCH_STALE_MS) return null;
    return { ...lastPitch, ageMs: Math.max(0, now - lastPitch.capturedAt) };
  }

  getConnectedPeers(): Array<{ peerId: string; name: string; hue?: number; deviceId?: string }> {
    return Array.from(this.peers.values()).map((p) => ({
      peerId: p.peerId,
      name: p.name,
      hue: p.hue,
      deviceId: p.deviceId,
    }));
  }
}
