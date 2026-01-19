import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';

const statusEl = document.getElementById('status')!;
const reconnectBtn = document.getElementById('reconnect')!;

let peer: SimplePeer.Instance | null = null;
let trackerClient: Client | null = null;
let mediaStream: MediaStream | null = null;

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
    return `phone-${Math.random().toString(36).substring(2, 15)}`;
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
    peer = new SimplePeer({
        initiator: false,
        trickle: true,
        stream: mediaStream!,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
        },
    });

    peer.on('signal', (data: any) => {
        console.log('[Phone] Sending signal to host');
        if (trackerPeer && typeof trackerPeer.signal === 'function') {
            trackerPeer.signal(data);
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
    });

    peer.on('close', () => {
        console.log('[Phone] Connection closed');
        setStatus('Disconnected', 'status-disconnected');
        reconnectBtn.style.display = 'block';
    });

    if (trackerPeer && typeof trackerPeer.signal === 'function') {
        trackerPeer.on('signal', (data: any) => {
            peer!.signal(data);
        });
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

function reconnect() {
    cleanup();
    const partyId = getPartyIdFromUrl();
    if (partyId) {
        const trackerUrls = [
            'wss://tracker.openwebtorrent.com',
            'wss://tracker.fastcast.nz',
        ];
        connect(partyId, trackerUrls);
    }
}

// Initialize
const partyId = getPartyIdFromUrl();
if (!partyId) {
    setStatus('❌ No Party ID', 'status-error');
} else {
    const trackerUrls = [
        'wss://tracker.openwebtorrent.com',
        'wss://tracker.fastcast.nz',
    ];
    connect(partyId, trackerUrls);
}

reconnectBtn.addEventListener('click', reconnect);

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
