import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';

const statusEl = document.getElementById('status')!;
const reconnectBtn = document.getElementById('reconnect')!;

let peer: SimplePeer.Instance | null = null;
let trackerClient: Client | null = null;
let mediaStream: MediaStream | null = null;
const handledTrackerPeers: Set<string> = new Set(); // Track handled tracker peers to avoid duplicates
let audioPeerCreated = false; // Global flag: only ONE audio peer ever

function setStatus(message: string, className: string) {
    statusEl.textContent = message;
    statusEl.className = className;
}

function getPartyIdFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('party');
}

async function startMicrophone(): Promise<MediaStream> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
            },
            video: false,
        });
        return stream;
    } catch (err) {
        console.error('Failed to get microphone:', err);
        throw new Error('Microphone permission denied');
    }
}

function stringToInfoHash(str: string): Uint8Array {
    const hash = new Uint8Array(20);
    const encoder = new TextEncoder();
    const strBuf = encoder.encode(str);
    for (let i = 0; i < 20; i++) {
        hash[i] = strBuf[i % strBuf.length];
    }
    return hash;
}

function generatePeerId(): string {
    const array = new Uint8Array(10);
    crypto.getRandomValues(array);
    return '01234567890123456789' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function connect(partyId: string, trackerUrls: string[]) {
    try {
        setStatus('Requesting microphone...', 'status-connecting');
        mediaStream = await startMicrophone();

        setStatus('Connecting to party...', 'status-connecting');

        const infoHash = stringToInfoHash(partyId);
        const peerId = generatePeerId();

        trackerClient = new Client({
            infoHash,
            peerId,
            announce: trackerUrls,
            port: 0,
        });

        trackerClient.on('peer', (trackerPeer: any) => {
            console.log('[Phone] Tracker discovered host:', trackerPeer);
            setupPeerConnection(trackerPeer);
        });

        trackerClient.on('warning', (err: Error) => {
            console.warn('[Phone] Tracker warning:', err);
        });

        trackerClient.on('error', (err: Error) => {
            console.error('[Phone] Tracker error:', err);
            setStatus('Connection error', 'status-error');
            reconnectBtn.style.display = 'block';
        });

        trackerClient.start();
    } catch (err: any) {
        setStatus(err.message || 'Failed to connect', 'status-error');
        reconnectBtn.style.display = 'block';
    }
}

function setupPeerConnection(trackerPeer: any) {
    // Use the trackerPeer's unique ID to prevent duplicate audio peer creation
    const trackerPeerId = trackerPeer._id || trackerPeer.channelName || Math.random().toString(36);
    if (handledTrackerPeers.has(trackerPeerId)) {
        console.log('[Phone] Ignoring duplicate tracker peer:', trackerPeerId);
        return;
    }
    handledTrackerPeers.add(trackerPeerId);

    console.log('[Phone] Tracker peer found. Waiting for Host signal...', trackerPeerId);

    const setupAudioPeer = () => {
        console.log('[Phone] Tracker peer connected. Waiting for Host to initiate...');

        // Wait for the Host to send the first signal (offer), then create our peer
        const onData = (data: Uint8Array | string) => {
            try {
                const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                const parts = str.split('\n');

                for (const part of parts) {
                    if (!part.trim()) continue;
                    try {
                        const signal = JSON.parse(part);

                        // Create peer on first signal from Host (and only if we haven't created one already)
                        if (!audioPeerCreated) {
                            console.log('[Phone] Received first signal from Host. Creating audio peer...');
                            audioPeerCreated = true;

                            peer = new SimplePeer({
                                initiator: false,
                                trickle: true,
                                stream: mediaStream!,
                                config: {
                                    iceServers: [
                                        { urls: 'stun:stun.l.google.com:19302' },
                                        { urls: 'stun:global.stun.twilio.com:3478' },
                                    ],
                                },
                            });

                            // Send our signals back to Host
                            peer.on('signal', (data: any) => {
                                console.log('[Phone] Sending signal to host');
                                if (trackerPeer.connected) {
                                    try {
                                        trackerPeer.send(JSON.stringify(data) + '\n');
                                    } catch (e) {
                                        console.error('[Phone] Failed to send signal:', e);
                                    }
                                }
                            });

                            peer.on('connect', () => {
                                console.log('[Phone] Connected to host!');
                                setStatus('✅ Connected', 'status-connected');
                                reconnectBtn.style.display = 'none';
                            });

                            peer.on('error', (err: Error) => {
                                console.error('[Phone] Peer error:', err);
                                setStatus('Connection lost', 'status-error');
                                reconnectBtn.style.display = 'block';
                                trackerPeer.off('data', onData);
                            });

                            peer.on('close', () => {
                                console.log('[Phone] Connection closed');
                                setStatus('Disconnected', 'status-disconnected');
                                reconnectBtn.style.display = 'block';
                                trackerPeer.off('data', onData);
                            });

                            trackerPeer.on('close', () => {
                                if (peer) peer.destroy();
                            });

                            // Process the first signal immediately
                            peer.signal(signal);
                        } else {
                            // Forward subsequent signals to existing peer
                            peer?.signal(signal);
                        }
                    } catch (e) {
                        console.error('[Phone] Failed to parse individual signal chunk:', part, e);
                    }
                }
            } catch (e) {
                console.error('[Phone] Failed to process received data:', e);
            }
        };

        trackerPeer.on('data', onData);
    };

    if (trackerPeer.connected) {
        setupAudioPeer();
    } else {
        trackerPeer.on('connect', setupAudioPeer);
    }
}

function cleanup() {
    if (peer) {
        peer.destroy();
        peer = null;
    }
    if (trackerClient) {
        trackerClient.destroy();
        trackerClient = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
}

function getTrackersFromUrl(): string[] {
    const params = new URLSearchParams(window.location.search);
    const trackers = params.getAll('tracker');
    return [...trackers, 'wss://tracker.openwebtorrent.com'];
}

async function reconnect() {
    cleanup();
    const partyId = getPartyIdFromUrl();
    if (partyId) {
        const trackers = getTrackersFromUrl();
        const uniqueTrackers = Array.from(new Set(trackers));
        console.log('[Phone] Starting with trackers:', uniqueTrackers);
        await connect(partyId, uniqueTrackers);
    }
}

// Initialize
const partyId = getPartyIdFromUrl();
if (!partyId) {
    setStatus('❌ No Party ID', 'status-error');
} else {
    const trackers = getTrackersFromUrl();
    const uniqueTrackers = Array.from(new Set(trackers));
    console.log('[Phone] Starting with trackers:', uniqueTrackers);
    connect(partyId, uniqueTrackers);
}

reconnectBtn.addEventListener('click', reconnect);

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
