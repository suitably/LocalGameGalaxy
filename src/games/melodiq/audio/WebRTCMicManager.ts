import { type PitchResult } from './AudioUtils';
import {
  WebRTCHostManager,
  type RemotePeerBase,
  type WebRTCHostManagerCallbacks,
} from '../../../lib/webrtc';

/** A connected phone; it detects its pitch itself and sends it over the data channel. */
export type MicRemotePeer = RemotePeerBase & {
  /** Most recent pitch result received via WebRTC DataChannel, with a `timestamp` for staleness checks. */
  lastPitch?: (PitchResult & { timestamp: number }) | null;
};

/** A phone's pitch older than this counts as silence (it stopped singing or the link stalled). */
const PITCH_STALE_MS = 200;

/**
 * `WebRTCMicManager` — remote phone singers for multi-player Melodiq sessions.
 *
 * Phones run `detectPitch()` themselves (`usePhoneMicStreaming.ts`) and send
 * `{ type: 'pitch', frequency, note, volume }` over the WebRTC DataChannel about 30 times a
 * second; the host keeps the latest one per peer. Phones send no audio track.
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

  protected handleCustomWebRTCMessage(msg: any, remotePeer: MicRemotePeer): boolean {
    if (msg.type === 'pitch') {
      remotePeer.lastPitch = {
        frequency: msg.frequency,
        note: msg.note,
        volume: msg.volume,
        timestamp: Date.now(),
      };
      return true;
    }
    return false;
  }

  getPitch(peerId: string): PitchResult | null {
    const lastPitch = this.peers.get(peerId)?.lastPitch;
    if (!lastPitch || Date.now() - lastPitch.timestamp >= PITCH_STALE_MS) return null;
    return lastPitch;
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
