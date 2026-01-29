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
    hue?: number; // Hue for avatar
}

export class WebRTCMicManager {
    private peers: Map<string, RemotePeer> = new Map();
    private pendingTrackerPeers: Set<string> = new Set(); // Track tracker peer IDs to avoid duplicate audio peers
    private trackerClient: Client | null = null;
    private partyId: string;
    private trackerUrls: string[];

    // Callbacks
    private onPeerConnected?: (peerId: string, name: string, hue?: number) => void;
    private onPeerDisconnected?: (peerId: string) => void;
    private onPeerUpdated?: (peerId: string, name: string, hue?: number) => void;

    constructor(
        partyId: string,
        trackerUrls: string[],
        callbacks?: {
            onPeerConnected?: (peerId: string, name: string, hue?: number) => void;
            onPeerDisconnected?: (peerId: string) => void;
            onPeerUpdated?: (peerId: string, name: string, hue?: number) => void;
        }
    ) {
        this.partyId = partyId;
        this.trackerUrls = trackerUrls;
        this.onPeerConnected = callbacks?.onPeerConnected;
        this.onPeerDisconnected = callbacks?.onPeerDisconnected;
        this.onPeerUpdated = callbacks?.onPeerUpdated;
    }

    async start(): Promise<void> {
        // Create a tracker client as the "host"
        // We use the partyId as the infoHash
        const infoHash = this.stringToInfoHash(this.partyId);
        console.log('[WebRTCMicManager] Generated InfoHash for Party ID:', this.partyId);
        const infoHashHex = Array.from(infoHash).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('[WebRTCMicManager] InfoHash (Hex):', infoHashHex);
        const peerId = this.generatePeerId();

        const isSecure = window.location.protocol === 'https:';

        // Filter and process tracker URLs based on environment
        const validTrackers = this.trackerUrls.map(url => {
            // If we are on HTTPS, we MUST use WSS
            if (isSecure && url.startsWith('ws:')) {
                return url.replace('ws:', 'wss:');
            }
            return url;
        }).filter(url => {
            // Remove local trackers in production unless we are on localhost
            if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes(':8000')) {
                return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            }
            return true;
        });

        // Merge and deduplicate
        const finalTrackers = Array.from(new Set(validTrackers));
        console.log('[WebRTCMicManager] Using trackers:', finalTrackers);

        if (finalTrackers.length === 0) {
            console.warn('[WebRTCMicManager] No trackers provided. Connection will not be possible.');
        }

        this.trackerClient = new Client({
            infoHash,
            peerId,
            announce: finalTrackers,
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
        // connected via the tracker's signaling.
        // We will use this established connection as a signaling channel for our Audio Peer.

        // Use the trackerPeer's unique ID to prevent duplicate audio peer creation
        // The bittorrent-tracker library might emit 'peer' multiple times for the same connection
        const trackerPeerId = trackerPeer._id || trackerPeer.channelName || Math.random().toString(36);

        if (this.pendingTrackerPeers.has(trackerPeerId)) {
            console.log('[WebRTCMicManager] Ignoring known/pending tracker peer:', trackerPeerId);
            return;
        }
        this.pendingTrackerPeers.add(trackerPeerId);

        console.log('[WebRTCMicManager] Tracker peer found. Waiting for connection...', trackerPeerId);

        const setupAudioPeer = () => {
            // DOUBLE CHECK: Even if we added to pending, check if we've already set up an audio peer for this
            // specific signaling channel to be absolutely safe against race conditions.
            if ((trackerPeer as any)._audioPeerSetup) {
                console.log('[WebRTCMicManager] Audio peer already set up for this tracker peer. Skipping.');
                return;
            }
            (trackerPeer as any)._audioPeerSetup = true;

            console.log('[WebRTCMicManager] Tracker peer connected. Establishing Audio Peer...');

            // We use a unique ID for the audio connection to avoid cross-talk if multiple
            // simple-peers are multiplexed (though here we just have one)
            const peerId = this.generatePeerId();

            const audioPeer = new SimplePeer({
                initiator: false, // Phone will initiate with the stream
                trickle: true,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                    ],
                },
            });

            const remotePeer: RemotePeer = {
                peer: audioPeer,
                audioContext: null,
                analyser: null,
                buffer: null,
                peerId,
                name: `Phone ${this.peers.size + 1}`,
            };

            this.peers.set(peerId, remotePeer);

            // 1. Send our signals via the trackerPeer data channel
            audioPeer.on('signal', (data: any) => {
                console.log('[WebRTCMicManager] Sending signal to phone:', data.type);
                if (trackerPeer.connected) {
                    try {
                        // Use NDJSON (Newline Delimited JSON) to handle multiple signals in one chunk
                        trackerPeer.send(JSON.stringify(data) + '\n');
                    } catch (e) {
                        console.error('[WebRTCMicManager] Failed to send signal:', e);
                    }
                } else {
                    console.warn('[WebRTCMicManager] Tracker peer not connected, cannot send signal');
                }
            });

            // 2. Receive remote signals via trackerPeer data channel
            const processedSignals = new Set<string>();

            const onData = (data: Uint8Array | string) => {
                console.log('[WebRTCMicManager] Received data from phone');
                try {
                    const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                    // Split by newline to handle multiple JSON objects in one chunk
                    const parts = str.split('\n');
                    for (const part of parts) {
                        if (!part.trim()) continue;

                        if (processedSignals.has(part)) {
                            console.log('[WebRTCMicManager] Ignoring duplicate signal');
                            continue;
                        }
                        processedSignals.add(part);

                        try {
                            const signal = JSON.parse(part);

                            // Check for identity signal
                            if (signal.type === 'identify') {
                                console.log('[WebRTCMicManager] Received identity from phone:', signal.name, signal.hue);
                                remotePeer.name = signal.name || remotePeer.name;
                                remotePeer.hue = signal.hue;

                                // Notify listener of update
                                this.onPeerUpdated?.(peerId, remotePeer.name, remotePeer.hue);
                                return;
                            }

                            if (audioPeer && !(audioPeer as any).destroyed) {
                                console.log('[WebRTCMicManager] Processing signal from phone:', signal.type);
                                try {
                                    audioPeer.signal(signal);
                                } catch (err) {
                                    console.warn('[WebRTCMicManager] Error signaling peer (might be destroyed):', err);
                                }
                            } else {
                                console.log('[WebRTCMicManager] Ignoring signal, peer is destroyed:', signal.type);
                            }
                        } catch (e) {
                            console.error('[WebRTCMicManager] Failed to parse individual signal chunk:', part, e);
                        }
                    }
                } catch (e) {
                    console.error('[WebRTCMicManager] Failed to process received data:', e);
                }
            };
            trackerPeer.on('data', onData);

            audioPeer.on('connect', () => {
                console.log('[WebRTCMicManager] Audio Peer connected:', peerId);
            });

            audioPeer.on('track', (track: MediaStreamTrack, stream: MediaStream) => {
                console.log('[WebRTCMicManager] Received track from phone:', track.kind, stream.id, peerId);
            });

            audioPeer.on('stream', (stream: MediaStream) => {
                console.log('[WebRTCMicManager] Received audio stream from phone:', peerId);
                this.setupAudioProcessing(peerId, stream);
                this.onPeerConnected?.(peerId, remotePeer.name, remotePeer.hue);
            });

            audioPeer.on('error', (err: Error) => {
                console.error('[WebRTCMicManager] Audio Peer error:', peerId, err);
                this.removePeer(peerId);
                this.pendingTrackerPeers.delete(trackerPeerId);
                trackerPeer.off('data', onData);
                // Clean up flag so we can retry if needed (though usually tracker peer dies too)
                delete (trackerPeer as any)._audioPeerSetup;
            });

            audioPeer.on('close', () => {
                console.log('[WebRTCMicManager] Audio Peer closed:', peerId);
                this.removePeer(peerId);
                this.pendingTrackerPeers.delete(trackerPeerId);
                trackerPeer.off('data', onData);
                delete (trackerPeer as any)._audioPeerSetup;
            });

            // Cleanup tracker listener if tracker peer dies
            trackerPeer.on('close', () => {
                audioPeer.destroy();
                this.pendingTrackerPeers.delete(trackerPeerId);
                delete (trackerPeer as any)._audioPeerSetup;
            });
        };

        if (trackerPeer.connected) {
            setupAudioPeer();
        } else {
            trackerPeer.on('connect', setupAudioPeer);
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
        if (this.trackerClient) {
            this.trackerClient.destroy();
            this.trackerClient = null;
        }
        this.peers.forEach(p => {
            p.peer.destroy();
        });
        this.peers.clear();
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
        const array = new Uint8Array(10); // 10 bytes = 20 hex chars
        crypto.getRandomValues(array);
        return '01234567890123456789' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
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
