// SimplePeer import removed
import { type PitchResult, computeRMS, autoCorrelate, freqToMidi } from './AudioUtils';
import { WebRTCHostManager, type RemotePeerBase, type WebRTCHostManagerCallbacks } from '../../../lib/webrtc/WebRTCHostManager';

export type MicRemotePeer = RemotePeerBase & {
    audioContext: AudioContext | null;
    analyser: AnalyserNode | null;
    buffer: Float32Array | null;
    lastPitch?: PitchResult | null;
};

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
                volume: msg.volume
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
            return remotePeer.lastPitch;
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
