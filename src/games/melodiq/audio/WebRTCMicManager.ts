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
    private pendingTrackerPeers: Set<string> = new Set();


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
            port: 0,
            rtcConfig: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                ],
            },
        } as any);

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
        const trackerPeerId = trackerPeer._id || trackerPeer.channelName || Math.random().toString(36);
        console.log('[WebRTCMicManager] Tracker peer found. Waiting for connection...', trackerPeerId);

        // Receive remote signals via trackerPeer data channel
        const onData = (data: Uint8Array | string) => {
            console.log('[WebRTCMicManager] Received data from phone');
            try {
                const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                // Split by newline to handle multiple JSON objects in one chunk
                const parts = str.split('\n');
                for (const part of parts) {
                    if (!part.trim()) continue;

                    try {
                        const parsedData = JSON.parse(part);

                        // Check for identity signal (application-level, not SimplePeer)
                        if (parsedData.type === 'identify' && parsedData.connectionId) {
                            const remotePeer = Array.from(this.peers.values()).find(p =>
                                (trackerPeer as any)._audioPeerInstance === p.peer &&
                                (trackerPeer as any)._currentConnectionId === parsedData.connectionId
                            );
                            if (remotePeer) {
                                console.log('[WebRTCMicManager] Received identity from phone:', parsedData.name, parsedData.hue);
                                remotePeer.name = parsedData.name || remotePeer.name;
                                remotePeer.hue = parsedData.hue;
                                this.onPeerUpdated?.(remotePeer.peerId, remotePeer.name, remotePeer.hue);
                            } else {
                                console.warn('[WebRTCMicManager] Received identity for unknown or mismatched peer:', parsedData.connectionId);
                            }
                            return;
                        }

                        // If it's a wrapped SimplePeer signal
                        if (parsedData.connectionId && parsedData.signal) {
                            this.handleWrappedSignal(trackerPeer, parsedData);
                        } else {
                            // console.debug('[WebRTCMicManager] Ignoring legacy or malformed signal');
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

        // Cleanup tracker listener if tracker peer dies
        trackerPeer.on('close', () => {
            if ((trackerPeer as any)._audioPeerInstance) {
                (trackerPeer as any)._audioPeerInstance.destroy();
                delete (trackerPeer as any)._audioPeerInstance;
            }
            this.pendingTrackerPeers.delete(trackerPeerId);
            delete (trackerPeer as any)._currentConnectionId;
            trackerPeer.off('data', onData); // Remove data listener
        });
    }

    // Helper to process wrapped signals
    private handleWrappedSignal(trackerPeer: any, wrappedData: any) {
        const { connectionId, signal } = wrappedData;
        const currentConnectionId = (trackerPeer as any)._currentConnectionId;

        // If this is a new connection attempt (new ID), resets
        if (signal.type === 'offer' && connectionId !== currentConnectionId) {
            console.log('[WebRTCMicManager] New connection attempt detected:', connectionId);

            // Destroy existing if any
            const existingPeer = (trackerPeer as any)._audioPeerInstance;
            if (existingPeer) {
                existingPeer.destroy();
                delete (trackerPeer as any)._audioPeerInstance;
            }

            (trackerPeer as any)._currentConnectionId = connectionId;
            this.initAudioPeer(trackerPeer, connectionId);
        }

        const audioPeer = (trackerPeer as any)._audioPeerInstance;
        if (audioPeer && !audioPeer.destroyed && (trackerPeer as any)._currentConnectionId === connectionId) {
            // Host is non-initiator, so it should NEVER process an 'answer' signal (echo protection)
            if (signal.type === 'answer') {
                // console.log('[WebRTCMicManager] Ignoring echo answer (Host is responder)'); 
                return;
            }

            // console.log('[WebRTCMicManager] Processing verified signal:', signal.type);
            try {
                audioPeer.signal(signal);
            } catch (e) {
                console.error('[WebRTCMicManager] Signal error:', e);
            }
        } else {
            // console.debug('[WebRTCMicManager] Ignoring mismatched or orphan signal:', connectionId);
        }
    }

    private initAudioPeer(trackerPeer: any, connectionId: string) {
        console.log('[WebRTCMicManager] Initializing Audio Peer for:', connectionId);
        const peerId = this.generatePeerId();

        const audioPeer = new SimplePeer({
            initiator: false,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                ],
            },
        });

        // Store instance
        (trackerPeer as any)._audioPeerInstance = audioPeer;

        const remotePeer: RemotePeer = {
            peer: audioPeer,
            audioContext: null,
            analyser: null,
            buffer: null,
            peerId,
            name: `Phone ${this.peers.size + 1}`,
        };

        this.peers.set(peerId, remotePeer);

        // Send wrapped signals
        audioPeer.on('signal', (data: any) => {
            if (trackerPeer.connected) {
                try {
                    const payload = { connectionId, signal: data };
                    trackerPeer.send(JSON.stringify(payload) + '\n');
                } catch (e) { }
            }
        });

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

        audioPeer.on('close', () => {
            console.log('[WebRTCMicManager] Audio Peer closed:', peerId);
            this.removePeer(peerId);
            // Clear the current connection ID if this peer was the active one
            if ((trackerPeer as any)._currentConnectionId === connectionId) {
                delete (trackerPeer as any)._currentConnectionId;
                delete (trackerPeer as any)._audioPeerInstance;
            }
        });

        audioPeer.on('error', (e: any) => {
            console.error('[WebRTCMicManager] Audio Peer error:', peerId, e);
            this.removePeer(peerId);
            // Clear the current connection ID if this peer was the active one
            if ((trackerPeer as any)._currentConnectionId === connectionId) {
                delete (trackerPeer as any)._currentConnectionId;
                delete (trackerPeer as any)._audioPeerInstance;
            }
        });
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
            (this.trackerClient as any).stop();
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
