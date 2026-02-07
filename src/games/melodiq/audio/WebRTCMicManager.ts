import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';
import { type PitchResult, computeRMS, autoCorrelate, freqToMidi } from './AudioUtils';

interface RemotePeer {
    peer: SimplePeer.Instance;
    audioContext: AudioContext | null;
    analyser: AnalyserNode | null;
    buffer: Float32Array | null;
    peerId: string;
    connectionId?: string; // The ID used by Phone for signaling
    name: string; // Display name for the phone
    hue?: number; // Hue for avatar
    lastPitch?: PitchResult | null; // Latest pitch received from phone
}

export class WebRTCMicManager {
    private peers: Map<string, RemotePeer> = new Map();
    private pendingTrackerPeers: Set<string> = new Set();


    private trackerClient: Client | null = null;
    private partyId: string;
    private trackerUrls: string[];

    // Callbacks
    private onPeerConnected?: (peerId: string, name: string, hue?: number, connectionId?: string) => void;
    private onPeerDisconnected?: (peerId: string) => void;
    private onPeerUpdated?: (peerId: string, name: string, hue?: number, connectionId?: string) => void;
    public onMessage?: (peerId: string, data: any) => void; // Legacy single listener
    private messageListeners: Set<(peerId: string, data: any) => void> = new Set();

    constructor(
        partyId: string,
        trackerUrls: string[],
        callbacks?: {
            onPeerConnected?: (peerId: string, name: string, hue?: number, connectionId?: string) => void;
            onPeerDisconnected?: (peerId: string) => void;
            onPeerUpdated?: (peerId: string, name: string, hue?: number, connectionId?: string) => void;
            onMessage?: (peerId: string, data: any) => void;
        }
    ) {
        this.partyId = partyId;
        this.trackerUrls = trackerUrls;
        this.onPeerConnected = callbacks?.onPeerConnected;
        this.onPeerDisconnected = callbacks?.onPeerDisconnected;
        this.onPeerUpdated = callbacks?.onPeerUpdated;
        this.onMessage = callbacks?.onMessage;
    }

    on(event: 'message', listener: (peerId: string, data: any) => void): void {
        if (event === 'message') {
            this.messageListeners.add(listener);
        }
    }

    off(event: 'message', listener: (peerId: string, data: any) => void): void {
        if (event === 'message') {
            this.messageListeners.delete(listener);
        }
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
            // console.log('[WebRTCMicManager] Received data from phone');
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
                                this.onPeerUpdated?.(remotePeer.peerId, remotePeer.name, remotePeer.hue, remotePeer.connectionId);
                            } else {
                                console.warn('[WebRTCMicManager] Received identity for unknown or mismatched peer:', parsedData.connectionId);
                            }
                            return;
                        }

                        // Check for pitch signal
                        if (parsedData.type === 'pitch') {
                            // Find the peer associated with this tracker peer
                            // Note: Incoming pitch via tracker channel is possible but prefer WebRTC channel.
                            // However, we must support it if phone sends via tracker fall back.
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
            connectionId,
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

        // Listen for data from the phone (Pitch data!)
        audioPeer.on('data', (data: Uint8Array | string) => {
            try {
                const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                const parts = str.split('\n');
                for (const part of parts) {
                    if (!part.trim()) continue;
                    const msg = JSON.parse(part);

                    if (msg.type === 'pitch') {
                        remotePeer.lastPitch = {
                            frequency: msg.frequency,
                            note: msg.note,
                            volume: msg.volume
                        };
                    } else if (msg.type === 'identify') {
                        console.log('[WebRTCMicManager] Received identity (WebRTC):', msg.name, msg.hue);
                        remotePeer.name = msg.name || remotePeer.name;
                        remotePeer.hue = msg.hue;
                        remotePeer.hue = msg.hue;
                        this.onPeerUpdated?.(remotePeer.peerId, remotePeer.name, remotePeer.hue, remotePeer.connectionId);
                    } else {
                        // Pass generic messages to consumer
                        this.onMessage?.(peerId, msg);
                        this.messageListeners.forEach(listener => listener(peerId, msg));
                    }
                }
            } catch (e) {
                // console.error('[WebRTCMicManager] Error parsing WebRTC data:', e);
            }
        });

        audioPeer.on('track', (track: MediaStreamTrack, stream: MediaStream) => {
            console.log('[WebRTCMicManager] Received track from phone:', track.kind, stream.id, peerId);
        });

        audioPeer.on('stream', (stream: MediaStream) => {
            console.log('[WebRTCMicManager] Received audio stream from phone:', peerId);
            this.setupAudioProcessing(peerId, stream);
            this.onPeerConnected?.(peerId, remotePeer.name, remotePeer.hue, remotePeer.connectionId);
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
        if (!remotePeer) return null;

        // Prefer the pitch calculated by the phone itself
        if (remotePeer.lastPitch) {
            // Optional: Age check? If data is stale (> 200ms), maybe return null 
            // or fallback. For now, we trust the stream.
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

    sendToPeer(peerId: string, data: any): void {
        const remotePeer = this.peers.get(peerId);
        if (remotePeer && remotePeer.peer && (remotePeer.peer as any).connected) {
            try {
                remotePeer.peer.send(JSON.stringify(data));
            } catch (e) {
                console.error(`[WebRTCMicManager] Failed to send data to ${peerId}:`, e);
            }
        } else {
            console.warn(`[WebRTCMicManager] Cannot send to ${peerId} - not connected`);
        }
    }

    broadcast(data: any): void {
        this.peers.forEach(p => {
            if (p.peer && (p.peer as any).connected) {
                try {
                    p.peer.send(JSON.stringify(data));
                } catch (e) {
                    console.error(`[WebRTCMicManager] Failed to broadcast to ${p.peerId}:`, e);
                }
            }
        });
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
}
