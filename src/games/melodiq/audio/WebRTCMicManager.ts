import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';
import { type PitchResult } from './MicrophoneManager';

interface RemotePeer {
    peer: SimplePeer.Instance;
    audioContext: AudioContext | null;
    analyser: AnalyserNode | null;
    buffer: Float32Array | null;
    peerId: string;
    name: string; // Display name for the phone
}

export class WebRTCMicManager {
    private peers: Map<string, RemotePeer> = new Map();
    private trackerClient: Client | null = null;
    private partyId: string;
    private trackerUrls: string[];
    private onPeerConnected?: (peerId: string, name: string) => void;
    private onPeerDisconnected?: (peerId: string) => void;

    constructor(
        partyId: string,
        trackerUrls: string[],
        callbacks?: {
            onPeerConnected?: (peerId: string, name: string) => void;
            onPeerDisconnected?: (peerId: string) => void;
        }
    ) {
        this.partyId = partyId;
        this.trackerUrls = trackerUrls;
        this.onPeerConnected = callbacks?.onPeerConnected;
        this.onPeerDisconnected = callbacks?.onPeerDisconnected;
    }

    async start(): Promise<void> {
        // Create a tracker client as the "host"
        // We use the partyId as the infoHash
        const infoHash = this.stringToInfoHash(this.partyId);
        const peerId = this.generatePeerId();

        this.trackerClient = new Client({
            infoHash,
            peerId,
            announce: this.trackerUrls,
            port: 0, // Not used for WebRTC
        });

        // Listen for peers discovered by the tracker
        this.trackerClient.on('peer', (peer: any) => {
            console.log('[WebRTCMicManager] Tracker discovered peer:', peer);
            this.handleTrackerPeer(peer);
        });

        this.trackerClient.on('warning', (err: Error) => {
            console.warn('[WebRTCMicManager] Tracker warning:', err);
        });

        this.trackerClient.on('error', (err: Error) => {
            console.error('[WebRTCMicManager] Tracker error:', err);
        });

        // Start announcing to trackers
        this.trackerClient.start();
    }

    private handleTrackerPeer(trackerPeer: any): void {
        // trackerPeer is a simple-peer instance created by bittorrent-tracker
        // We are the "host" (initiator: true), phones are non-initiators
        const peerId = this.generatePeerId();

        const peer = new SimplePeer({
            initiator: true,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        });

        const remotePeer: RemotePeer = {
            peer,
            audioContext: null,
            analyser: null,
            buffer: null,
            peerId,
            name: `Phone ${this.peers.size + 1}`,
        };

        this.peers.set(peerId, remotePeer);

        peer.on('signal', (data: any) => {
            console.log('[WebRTCMicManager] Sending signal to phone:', peerId);
            // In a real tracker setup, we'd send this via the tracker's data channel
            // For now, we'll use the trackerPeer's signal method if available
            if (trackerPeer && typeof trackerPeer.signal === 'function') {
                trackerPeer.signal(data);
            }
        });

        peer.on('stream', (stream: MediaStream) => {
            console.log('[WebRTCMicManager] Received audio stream from phone:', peerId);
            this.setupAudioProcessing(peerId, stream);
            this.onPeerConnected?.(peerId, remotePeer.name);
        });

        peer.on('error', (err: Error) => {
            console.error('[WebRTCMicManager] Peer error:', peerId, err);
            this.removePeer(peerId);
        });

        peer.on('close', () => {
            console.log('[WebRTCMicManager] Peer closed:', peerId);
            this.removePeer(peerId);
        });

        // Connect to the tracker peer
        if (trackerPeer && typeof trackerPeer.signal === 'function') {
            trackerPeer.on('signal', (data: any) => {
                peer.signal(data);
            });
        }
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

    private removePeer(peerId: string): void {
        const remotePeer = this.peers.get(peerId);
        if (!remotePeer) return;

        remotePeer.peer.destroy();
        remotePeer.audioContext?.close();
        this.peers.delete(peerId);
        this.onPeerDisconnected?.(peerId);
    }

    getPitch(peerId: string): PitchResult | null {
        const remotePeer = this.peers.get(peerId);
        if (!remotePeer || !remotePeer.analyser || !remotePeer.buffer || !remotePeer.audioContext) {
            return null;
        }

        remotePeer.analyser.getFloatTimeDomainData(remotePeer.buffer as any);

        const volume = this.computeRMS(remotePeer.buffer);
        if (volume < 0.01) {
            return null;
        }

        const frequency = this.autoCorrelate(remotePeer.buffer, remotePeer.audioContext.sampleRate);
        if (frequency === -1) {
            return null;
        }

        const note = this.freqToMidi(frequency);

        return { frequency, note, volume };
    }

    getConnectedPeers(): Array<{ peerId: string; name: string }> {
        return Array.from(this.peers.values()).map(p => ({
            peerId: p.peerId,
            name: p.name,
        }));
    }

    stop(): void {
        this.peers.forEach((_, peerId) => this.removePeer(peerId));
        this.trackerClient?.destroy();
        this.trackerClient = null;
    }

    // Helper: Convert string to 20-byte infoHash (SHA-1 style)
    private stringToInfoHash(str: string): Uint8Array {
        const hash = new Uint8Array(20);
        const encoder = new TextEncoder();
        const strBuf = encoder.encode(str);
        for (let i = 0; i < 20; i++) {
            hash[i] = strBuf[i % strBuf.length];
        }
        return hash;
    }

    private generatePeerId(): string {
        return `peer-${Math.random().toString(36).substring(2, 15)}`;
    }

    // Audio analysis methods (copied from MicrophoneManager)
    private computeRMS(buffer: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i] * buffer[i];
        }
        return Math.sqrt(sum / buffer.length);
    }

    private autoCorrelate(buffer: Float32Array, sampleRate: number): number {
        const SIZE = buffer.length;
        let sumOfSquares = 0;
        for (let i = 0; i < SIZE; i++) {
            const val = buffer[i];
            sumOfSquares += val * val;
        }

        const rootMeanSquare = Math.sqrt(sumOfSquares / SIZE);
        if (rootMeanSquare < 0.01) {
            return -1;
        }

        let r1 = 0;
        let r2 = SIZE - 1;
        const threshold = 0.2;

        for (let i = 0; i < SIZE / 2; i++) {
            if (Math.abs(buffer[i]) < threshold) {
                r1 = i;
                break;
            }
        }
        for (let i = 1; i < SIZE / 2; i++) {
            if (Math.abs(buffer[SIZE - i]) < threshold) {
                r2 = SIZE - i;
                break;
            }
        }

        const trimmedBuffer = buffer.slice(r1, r2);
        const c = new Array(trimmedBuffer.length).fill(0);

        for (let i = 0; i < trimmedBuffer.length; i++) {
            for (let j = 0; j < trimmedBuffer.length - i; j++) {
                c[i] = c[i] + trimmedBuffer[j] * trimmedBuffer[j + i];
            }
        }

        let d = 0;
        while (c[d] > c[d + 1]) d++;

        let maxval = -1;
        let maxpos = -1;

        for (let i = d; i < c.length; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }

        let T0 = maxpos;

        const x1 = c[T0 - 1];
        const x2 = c[T0];
        const x3 = c[T0 + 1];
        const a = (x1 + x3 - 2 * x2) / 2;
        const b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        return sampleRate / T0;
    }

    private freqToMidi(frequency: number): number {
        return 69 + 12 * Math.log2(frequency / 440);
    }
}
