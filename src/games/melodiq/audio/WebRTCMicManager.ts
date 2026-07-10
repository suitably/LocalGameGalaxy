// SimplePeer import removed
import { type PitchResult, computeRMS, autoCorrelate, freqToMidi } from './AudioUtils';
import { WebRTCHostManager, type RemotePeerBase, type WebRTCHostManagerCallbacks } from '../../../lib/webrtc';

/**
 * Extends `RemotePeerBase` with audio analysis state for a connected phone client.
 * Each remote singer gets their own `AudioContext` + `AnalyserNode` pipeline.
 */
export type MicRemotePeer = RemotePeerBase & {
    audioContext: AudioContext | null;
    analyser: AnalyserNode | null;
    buffer: Float32Array | null;
    /** Most recent pitch result received via WebRTC DataChannel, with a `timestamp` for staleness checks. */
    lastPitch?: (PitchResult & { timestamp: number }) | null;
};

/**
 * `WebRTCMicManager` — Remote Peer Audio Streaming & Pitch Detection
 *
 * Extends `WebRTCHostManager` to manage **remote** phone client audio streams
 * for multi-player Melodiq sessions. Handles two parallel pitch detection paths:
 *
 * ## Pitch Detection Strategy
 *
 * ### Path 1: Phone-Sent Pitch (Preferred)
 * The phone client runs `autoCorrelate()` locally and sends the result over
 * the WebRTC DataChannel as `{ type: 'pitch', frequency, note, volume }`.
 * The host stores this in `remotePeer.lastPitch` and uses it if the timestamp
 * is less than 200ms old.
 *
 * ### Path 2: Local Analysis Fallback
 * If the DataChannel pitch data is stale (> 200ms) or absent, the host falls
 * back to analyzing the raw `MediaStream` received over WebRTC audio track
 * using the same autocorrelation pipeline as `MicrophoneManager`.
 *
 * ## Audio Pipeline (per remote peer)
 * ```
 * WebRTC MediaStream (remote audio track)
 *       ↓
 * AudioContext → MediaStreamAudioSourceNode
 *       ↓
 * AnalyserNode (fftSize=2048) → Float32Array buffer
 *       ↓
 * computeRMS() + autoCorrelate() + freqToMidi()
 * ```
 *
 * @see {@link MicrophoneManager} for the local microphone equivalent.
 */
export class WebRTCMicManager extends WebRTCHostManager<MicRemotePeer> {

    constructor(
        partyId: string,
        trackerUrls: string[],
        callbacks?: WebRTCHostManagerCallbacks<MicRemotePeer>
    ) {
        super(partyId, trackerUrls, {
            ...callbacks,
            createRemotePeer: (peerId, connectionId, name, peer) => {
                return {
                    peer,
                    peerId,
                    connectionId,
                    name,
                    audioContext: null,
                    analyser: null,
                    buffer: null,
                };
            },
            onStream: (peerId, stream) => {
                this.setupAudioProcessing(peerId, stream);
                // Also trigger original onStream if passed
                if (callbacks?.onStream) callbacks.onStream(peerId, stream);
            },
            onPeerRemoved: (peerId, remotePeer) => {
                remotePeer.audioContext?.close();
                if (callbacks?.onPeerRemoved) callbacks.onPeerRemoved(peerId, remotePeer);
            }
        });
    }

    protected handleCustomWebRTCMessage(msg: any, remotePeer: MicRemotePeer): boolean {
        if (msg.type === 'pitch') {
            remotePeer.lastPitch = {
                frequency: msg.frequency,
                note: msg.note,
                volume: msg.volume,
                timestamp: Date.now()
            };
            return true;
        }
        return false;
    }

    private setupAudioProcessing(peerId: string, stream: MediaStream): void {
        const remotePeer = this.peers.get(peerId);
        if (!remotePeer) return;

        try {
            const audioContext = new AudioContext({ latencyHint: 'interactive' });
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            remotePeer.audioContext = audioContext;
            remotePeer.analyser = analyser;
            remotePeer.buffer = new Float32Array(analyser.fftSize);
        } catch (err) {
            console.error('[WebRTCMicManager] Failed to setup audio processing:', err);
        }
    }

    getPitch(peerId: string): PitchResult | null {
        const remotePeer = this.peers.get(peerId);
        if (!remotePeer) return null;

        // Prefer the pitch calculated by the phone itself
        if (remotePeer.lastPitch) {
            if (Date.now() - remotePeer.lastPitch.timestamp < 200) {
                return remotePeer.lastPitch;
            } else {
                remotePeer.lastPitch = null; // Clear stale pitch
            }
        }

        // Fallback to local calculation if we have raw audio but no data stream
        if (!remotePeer.analyser || !remotePeer.buffer || !remotePeer.audioContext) {
            return null;
        }

        remotePeer.analyser.getFloatTimeDomainData(remotePeer.buffer as any);

        const volume = computeRMS(remotePeer.buffer);
        if (volume < 0.01) {
            return null;
        }

        const frequency = autoCorrelate(remotePeer.buffer, remotePeer.audioContext.sampleRate);
        if (frequency === -1) {
            return null;
        }

        const note = freqToMidi(frequency);

        return { frequency, note, volume };
    }

    getConnectedPeers(): Array<{ peerId: string; name: string; hue?: number; deviceId?: string }> {
        return Array.from(this.peers.values()).map(p => ({
            peerId: p.peerId,
            name: p.name,
            hue: p.hue,
            deviceId: p.deviceId
        }));
    }
}
