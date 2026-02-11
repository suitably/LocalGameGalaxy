import { useEffect, useState, useRef } from 'react';
import { Snackbar, Alert } from '@mui/material';
import SimplePeer from 'simple-peer';
import Client from 'bittorrent-tracker';
import { computeRMS, autoCorrelate, freqToMidi } from './audio/AudioUtils';

const MAX_CANDIDATES = 5;
const CONNECTION_TIMEOUT_MS = 15000;

export const MelodiqPhoneClient = () => {
    const [status, setStatus] = useState<{ message: string; className: string }>({
        message: 'Initializing...',
        className: 'status-connecting'
    });
    const [playerName, setPlayerName] = useState(() => localStorage.getItem('melodiq_phone_name') || `Phone ${Math.floor(Math.random() * 1000)}`);
    const [playerHue, setPlayerHue] = useState<number>(() => {
        const stored = localStorage.getItem('melodiq_phone_hue');
        return stored ? parseInt(stored) : Math.floor(Math.random() * 360);
    });
    const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => localStorage.getItem('melodiq_mic_id') || '');
    const [isActive, setIsActive] = useState(true);

    // UI state for notifications
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const handleSnackbarClose = () => {
        setSnackbarOpen(false);
    };
    const [showReconnect, setShowReconnect] = useState(false);

    // Audio visualization refs (Direct DOM manipulation for performance)
    const volumeBarRef = useRef<HTMLDivElement>(null);
    const pitchIndicatorRef = useRef<HTMLDivElement>(null);
    const noteNameRef = useRef<HTMLDivElement>(null);

    const [latestStats, setLatestStats] = useState<{ song: string, score: number, date: string } | null>(null);
    const [availableTracks, setAvailableTracks] = useState<string[]>([]);
    const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);

    const handleTrackSelect = (index: number) => {
        setSelectedTrackIndex(index);

        // Send to host
        if (isWebRTCConnectedRef.current && peerRef.current && (peerRef.current as any).connected) {
            const msg = {
                type: 'trackSelect',
                trackIndex: index
            };
            peerRef.current.send(JSON.stringify(msg));
        }
    };

    // Refs
    // Queue for pending peers to avoid overwhelming the browser
    const pendingPeerCandidatesRef = useRef<any[]>([]);
    const peerRef = useRef<SimplePeer.Instance | null>(null);
    const trackerClientRef = useRef<Client | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const handledTrackerPeersRef = useRef<Set<string>>(new Set()); // Track handled tracker peers to avoid duplicates
    // const audioPeerCreatedRef = useRef<boolean>(false); // REMOVE (Replaced by race mode)
    const candidatePeersRef = useRef<Set<any>>(new Set()); // Track all racing peers
    const isWebRTCConnectedRef = useRef<boolean>(false); // For suppressing discovery spam

    // Audio processing refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const bufferRef = useRef<Float32Array | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const lastPitchSendTimeRef = useRef<number>(0);

    // --- Queue & Library State ---
    const [activeTab, setActiveTab] = useState<'mic' | 'queue' | 'remote'>('mic');
    const [queueSearchQuery, setQueueSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        genre: 'All',
        year: 'All',
        language: 'All'
    });

    const [libraryResults, setLibraryResults] = useState<any[]>([]);
    const [hostQueue, setHostQueue] = useState<any[]>([]);
    const [nowPlaying, setNowPlaying] = useState<any>(null);

    // Initial load of songs when switching to queue tab
    useEffect(() => {
        if (activeTab === 'queue' && peerRef.current && status.className === 'status-connected') {
            sendSearch(queueSearchQuery);
        }
    }, [activeTab, status.className]);

    // Save settings when changed
    // Save settings when changed
    useEffect(() => {
        localStorage.setItem('melodiq_phone_name', playerName);
        localStorage.setItem('melodiq_phone_hue', String(playerHue));
        if (selectedDeviceId) localStorage.setItem('melodiq_mic_id', selectedDeviceId);

        // Send update to Host if connected
        if (isWebRTCConnectedRef.current && peerRef.current && (peerRef.current as any).connected) {
            const identityMsg = {
                type: 'identify',
                name: playerName,
                hue: playerHue,
                connectionId: (peerRef.current as any)._connectionId
            };
            try {
                peerRef.current.send(JSON.stringify(identityMsg));
            } catch (e) {
                console.error('[Phone] Failed to send identity update:', e);
            }
        }
    }, [playerName, playerHue, selectedDeviceId]);

    // Enumerate Devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                setAudioInputDevices(audioInputs);

                // If we have a stored ID but it's not in the list (anymore), default to empty (default device)
                // actually, we might want to keep it if it's just temporarily unplugged, but for now let's leave it.
            } catch (err) {
                console.error('[Phone] Error enumerating devices:', err);
            }
        };
        // Ask for permissions first to get labels? 
        // We usually need an active stream to get labels on some browsers.
        // We will call this again after getting the stream.
        getDevices();

        navigator.mediaDevices.ondevicechange = getDevices;
        return () => { navigator.mediaDevices.ondevicechange = null; };
    }, []);

    const updateStatus = (message: string, className: string) => {
        setStatus({ message, className });
    };

    const getPartyIdFromUrl = (): string | null => {
        const params = new URLSearchParams(window.location.search);
        return params.get('party');
    };

    const stringToInfoHash = (str: string): Uint8Array => {
        const hash = new Uint8Array(20);
        const encoder = new TextEncoder();
        const strBuf = encoder.encode(str);
        for (let i = 0; i < 20; i++) {
            hash[i] = strBuf[i % strBuf.length];
        }
        return hash;
    };

    const generatePeerId = (): string => {
        const array = new Uint8Array(10);
        crypto.getRandomValues(array);
        return '01234567890123456789' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // Cleanup function
    const cleanup = () => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        if (trackerClientRef.current) {
            (trackerClientRef.current as any).stop();
            trackerClientRef.current.destroy();
            trackerClientRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        // Reset state refs
        handledTrackerPeersRef.current.clear();
        candidatePeersRef.current.forEach(p => {
            try { p.destroy(); } catch (e) { }
        });
        candidatePeersRef.current.clear();
        isWebRTCConnectedRef.current = false;
    };

    // Audio Loop
    const startAudioProcessing = (stream: MediaStream) => {
        try {
            const audioContext = new AudioContext({ latencyHint: 'interactive' });
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            bufferRef.current = new Float32Array(analyser.fftSize);

            const processAudio = () => {
                if (!analyserRef.current || !bufferRef.current || !audioContextRef.current) return;

                analyserRef.current.getFloatTimeDomainData(bufferRef.current as any);
                const volume = computeRMS(bufferRef.current);

                // Update Visualization State (Direct DOM manipulation)
                const visVolume = Math.min(1, volume * 5);
                if (volumeBarRef.current) {
                    volumeBarRef.current.style.width = `${visVolume * 100}%`;
                }

                if (volume > 0.01) {
                    const frequency = autoCorrelate(bufferRef.current, audioContextRef.current.sampleRate);
                    if (frequency !== -1) {
                        const note = freqToMidi(frequency);

                        // Calculate note name
                        const roundedNote = Math.round(note);
                        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                        const noteIndex = ((roundedNote % 12) + 12) % 12;
                        const noteName = noteNames[noteIndex];
                        const octave = Math.floor(roundedNote / 12) - 1;

                        if (noteNameRef.current) noteNameRef.current.innerText = `${noteName}${octave}`;
                        if (pitchIndicatorRef.current) {
                            pitchIndicatorRef.current.style.display = 'block';
                            pitchIndicatorRef.current.style.left = `${((note - 36) / (84 - 36)) * 100}%`;
                        }

                        // SEND TO HOST
                        const now = Date.now();
                        // Send at max 30 times per second (approx every 33ms)
                        if (isWebRTCConnectedRef.current && peerRef.current && (peerRef.current as any).connected) {
                            if (now - lastPitchSendTimeRef.current > 33) {
                                const msg = JSON.stringify({
                                    type: 'pitch',
                                    frequency,
                                    note,
                                    volume
                                });
                                try {
                                    peerRef.current.send(msg);
                                    lastPitchSendTimeRef.current = now;
                                } catch (e) { /* Ignore send errors */ }
                            }
                        }
                    } else {
                        if (noteNameRef.current) noteNameRef.current.innerText = '';
                        if (pitchIndicatorRef.current) pitchIndicatorRef.current.style.display = 'none';
                    }
                } else {
                    if (noteNameRef.current) noteNameRef.current.innerText = '';
                    if (pitchIndicatorRef.current) pitchIndicatorRef.current.style.display = 'none';
                }

                animFrameRef.current = requestAnimationFrame(processAudio);
            };

            processAudio();

        } catch (err) {
            console.error('[Phone] Failed to start local audio processing:', err);
        }
    };

    const setupPeerConnection = (trackerPeer: any) => {
        // Use the trackerPeer's unique ID to prevent duplicate audio peer creation
        const trackerPeerId = trackerPeer._id || trackerPeer.channelName || Math.random().toString(36);
        if (handledTrackerPeersRef.current.has(trackerPeerId)) {
            // console.log('[Phone] Ignoring duplicate tracker peer:', trackerPeerId);
            return;
        }
        handledTrackerPeersRef.current.add(trackerPeerId);

        // Check concurrency limit
        if (candidatePeersRef.current.size >= MAX_CANDIDATES) {
            console.log(`[Phone] Queueing peer ${trackerPeerId} (Limit reached: ${candidatePeersRef.current.size}/${MAX_CANDIDATES})`);
            pendingPeerCandidatesRef.current.push(trackerPeer);
            return;
        }

        initiateConnection(trackerPeer, trackerPeerId);
    };

    const processNextPendingPeer = () => {
        if (candidatePeersRef.current.size < MAX_CANDIDATES && pendingPeerCandidatesRef.current.length > 0) {
            const nextPeer = pendingPeerCandidatesRef.current.shift();
            // We already added it to handledTrackerPeersRef when we queued it, so we can just initiate
            const trackerPeerId = nextPeer._id || nextPeer.channelName; // Re-derive ID simply
            console.log('[Phone] Processing queued peer:', trackerPeerId);
            initiateConnection(nextPeer, trackerPeerId);
        }
    };

    const initiateConnection = (trackerPeer: any, trackerPeerId: string) => {
        console.log('[Phone] Tracker peer found. Waiting for Host signal...', trackerPeerId);

        const setupAudioPeer = () => {
            // No early return for audioPeerCreatedRef - we allow racing!

            console.log('[Phone] Tracker peer connected. Initiating audio handshake (Race Candidate)...');

            let connectionTimeout: any = null;

            try {
                const peer = new SimplePeer({
                    initiator: true, // Phone initiates to send stream immediately
                    trickle: true,
                    stream: mediaStreamRef.current!,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:global.stun.twilio.com:3478' },
                        ],
                    },
                });

                const connectionId = Math.random().toString(36).substring(2) + Date.now().toString(36);

                // Track wrapped state
                (peer as any)._connectionId = connectionId;

                // Add to race candidates
                candidatePeersRef.current.add(peer);

                // Set safety timeout
                connectionTimeout = setTimeout(() => {
                    if (peer && !(peer as any).destroyed && !(peer as any).connected) {
                        console.warn('[Phone] Connection timeout for candidate:', connectionId);
                        peer.destroy();
                        // This will trigger 'close' which handles cleanup and next peer
                    }
                }, CONNECTION_TIMEOUT_MS);


                // Send our signals back to Host
                peer.on('signal', (data: any) => {
                    if (data.type !== 'candidate') {
                        console.log('[Phone] Sending signal to host:', data.type, 'ConnID:', connectionId);
                    }
                    if (trackerPeer.connected) {
                        try {
                            const payload = { connectionId, signal: data };
                            trackerPeer.send(JSON.stringify(payload) + '\n');
                        } catch (e) {
                            console.error('[Phone] Failed to send signal:', e);
                        }
                    }
                });

                const onData = (data: Uint8Array | string) => {
                    try {
                        const str = (typeof data === 'string') ? data : new TextDecoder().decode(data);
                        const parts = str.split('\n');

                        for (const part of parts) {
                            if (!part.trim()) continue;

                            try {
                                const parsed = JSON.parse(part);

                                if (parsed.type === 'songInfo') {
                                    console.log('[Phone] Received song info:', parsed);
                                    if (parsed.tracks && Array.isArray(parsed.tracks)) {
                                        setAvailableTracks(parsed.tracks);
                                        // Reset selection to 0 when song changes
                                        setSelectedTrackIndex(0);
                                    }
                                    continue;
                                }

                                if (parsed.type === 'stats') {
                                    console.log('[Phone] Received stats:', parsed);
                                    const statsEntry = {
                                        song: parsed.songTitle,
                                        score: parsed.score,
                                        date: new Date().toISOString()
                                    };

                                    // Store in localStorage
                                    const historyStr = localStorage.getItem('melodiq_history');
                                    const history = historyStr ? JSON.parse(historyStr) : [];
                                    history.unshift(statsEntry);
                                    // Limit history to 50 items
                                    if (history.length > 50) history.pop();

                                    localStorage.setItem('melodiq_history', JSON.stringify(history));
                                    setLatestStats(statsEntry);

                                    // Clear notify after 5s
                                    // Clear notify after 5s
                                    setTimeout(() => setLatestStats(null), 5000);
                                    continue;
                                }

                                if (parsed.type === 'roster.update') {
                                    if (peer && (peer as any)._connectionId) {
                                        const myId = (peer as any)._connectionId;
                                        // Check against connectionId, not peerId (which is host-assigned)
                                        const amIInRoster = parsed.roster.some((p: any) => p.connectionId === myId);

                                        console.log('[Phone] Roster Update. My ConnectionID:', myId);
                                        console.log('[Phone] Roster:', parsed.roster);
                                        console.log('[Phone] Am I in roster?', amIInRoster);

                                        setIsActive(amIInRoster);
                                    }
                                    continue;
                                }

                                if (parsed.type === 'queue.update') {
                                    console.log('[Phone] Received Queue Update:', parsed);
                                    setHostQueue(parsed.queue || []);
                                    setNowPlaying(parsed.nowPlaying);
                                    continue;
                                }

                                if (parsed.type === 'library.results') {
                                    console.log('[Phone] Received Library Results:', parsed);
                                    setLibraryResults(parsed.results || []);
                                    continue;
                                }

                                if (parsed.connectionId === connectionId && parsed.signal) {
                                    const signal = parsed.signal;
                                    if (peer && !(peer as any).destroyed) {
                                        if (signal.type !== 'candidate') {
                                            console.log('[Phone] Processing matched signal:', signal.type);
                                        }
                                        peer.signal(signal);
                                    }
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
                peer.on('data', onData);

                peer.on('connect', () => {
                    clearTimeout(connectionTimeout);

                    if (isWebRTCConnectedRef.current) {
                        console.log('[Phone] Another peer won the race. Destroying late arrival.');
                        peer.destroy();
                        return;
                    }

                    console.log('[Phone] Connected to host! (We won the race)');
                    isWebRTCConnectedRef.current = true;
                    peerRef.current = peer; // Set winner as main peer
                    updateStatus('✅ Connected', 'status-connected');
                    setShowReconnect(false);
                    updateStatus('✅ Connected', 'status-connected');
                    setShowReconnect(false);
                    // Send identity inside an envelope too? No, Host expects specific format for identity.
                    // But we modified Host to check connectionId for identity too.
                    const identityMsg = {
                        type: 'identify',
                        name: playerName,
                        hue: playerHue,
                        connectionId // Include matching connectionId
                    };
                    // Send via WebRTC data (fastest) and Tracker (fallback)
                    if ((peer as any).connected) peer.send(JSON.stringify(identityMsg));
                    if (trackerPeer.connected) trackerPeer.send(JSON.stringify(identityMsg) + '\n');

                    // Destroy all other candidates
                    candidatePeersRef.current.delete(peer);

                    // Clear pending queue too? No, keep them just in case? 
                    // Actually if we are connected, we don't need pending.
                    // But if we disconnect, we might need them?
                    // For now, let's just destroy candidates.
                    candidatePeersRef.current.forEach(p => {
                        try { p.destroy(); } catch (e) { }
                    });
                    candidatePeersRef.current.clear();

                    // We don't clear pendingPeersRef because maybe we lose connection and want to try them? 
                    // But usually we just reload or reconnect.
                    // Let's clear them to be safe.
                    pendingPeerCandidatesRef.current = [];

                    // Request initial queue state
                    // Request initial queue state and library
                    // Retry a few times to ensure host is ready
                    [500, 1500, 3000].forEach(delay => {
                        setTimeout(() => {
                            if ((peerRef.current as any).connected) {
                                (peerRef.current as any).send(JSON.stringify({ type: 'queue.get' }));
                                // Also fetch library if we are in queue tab (or just pre-fetch it)
                                // Pre-fetching library ensures it's ready when user clicks tab
                                peer.send(JSON.stringify({ type: 'library.search', query: '' }));
                            }
                        }, delay);
                    });
                });

                peer.on('error', (err: Error) => {
                    clearTimeout(connectionTimeout);
                    candidatePeersRef.current.delete(peer);

                    // Only show error if THIS was the connected peer
                    if (isWebRTCConnectedRef.current && peerRef.current === peer) {
                        console.error('[Phone] Peer error:', err);
                        isWebRTCConnectedRef.current = false;
                        updateStatus(`Connection lost: ${err.message}`, 'status-error');
                        setShowReconnect(true);
                        handledTrackerPeersRef.current.delete(trackerPeerId); // Allow retry
                    } else {
                        console.warn('[Phone] Candidate peer failed (ignored):', err.message);
                        // If we are NOT connected, and this was the last candidate... maybe show error?
                        // But usually better to stay "Connecting..."
                    }
                    trackerPeer.off('data', onData);

                    // Trigger next
                    if (!isWebRTCConnectedRef.current) {
                        processNextPendingPeer();
                    }
                });

                peer.on('close', () => {
                    clearTimeout(connectionTimeout);
                    candidatePeersRef.current.delete(peer);

                    if (isWebRTCConnectedRef.current && peerRef.current === peer) {
                        console.log('[Phone] Connection closed');
                        isWebRTCConnectedRef.current = false;
                        updateStatus('Disconnected', 'status-disconnected');
                        setShowReconnect(true);
                        handledTrackerPeersRef.current.delete(trackerPeerId);
                    }
                    trackerPeer.off('data', onData);

                    // Trigger next
                    if (!isWebRTCConnectedRef.current) {
                        processNextPendingPeer();
                    }
                });

                trackerPeer.on('close', () => {
                    clearTimeout(connectionTimeout);
                    peer.destroy();
                    candidatePeersRef.current.delete(peer);
                    handledTrackerPeersRef.current.delete(trackerPeerId);

                    // Trigger next
                    if (!isWebRTCConnectedRef.current) {
                        processNextPendingPeer();
                    }
                });

            } catch (err) {
                console.error('[Phone] Failed to create/signal peer:', err);
                handledTrackerPeersRef.current.delete(trackerPeerId);
                if (connectionTimeout) clearTimeout(connectionTimeout);
                processNextPendingPeer();
            }
        };

        if (trackerPeer.connected) {
            setupAudioPeer();
        } else {
            trackerPeer.on('connect', setupAudioPeer);
        }
    };

    const connect = async (partyId: string, trackerUrls: string[]) => {
        try {
            updateStatus('Requesting microphone...', 'status-connecting');

            const constraints: MediaStreamConstraints = {
                audio: {
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                },
                video: false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Re-enumerate to get labels now that we have permission
            const devices = await navigator.mediaDevices.enumerateDevices();
            setAudioInputDevices(devices.filter(d => d.kind === 'audioinput'));

            mediaStreamRef.current = stream;
            // START LOCAL PROCESSING
            startAudioProcessing(stream);

            updateStatus('Connecting to party...', 'status-connecting');

            const infoHash = stringToInfoHash(partyId);
            console.log('[Phone] Generated InfoHash for Party ID:', partyId);
            // Convert Uint8Array to hex string manually for logging
            const infoHashHex = Array.from(infoHash).map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('[Phone] InfoHash (Hex):', infoHashHex);

            const peerId = generatePeerId();

            const trackerClient = new Client({
                infoHash,
                peerId,
                announce: trackerUrls,
                port: 0,
                rtcConfig: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                    ],
                },
                numWant: 4,
            } as any);

            trackerClientRef.current = trackerClient;

            trackerClient.on('peer', (trackerPeer: any) => {
                if (isWebRTCConnectedRef.current) {
                    return; // Ignore spam if we already have a live WebRTC link
                }

                // Prevent connecting to self
                const tpId = trackerPeer._id || trackerPeer.id;
                if (tpId === (trackerClient as any).peerId) {
                    return;
                }

                console.log('[Phone] Tracker discovered host (Peer info):', trackerPeer);
                setupPeerConnection(trackerPeer);
            });

            trackerClient.on('update', (data: any) => {
                console.log('[Phone] Tracker Announce Update:', data);
            });

            trackerClient.on('warning', (err: Error) => {
                console.warn('[Phone] Tracker warning:', err);
            });

            trackerClient.on('error', (err: Error) => {
                console.error('[Phone] Tracker fatal error:', err);
                updateStatus(`Connection error: ${err.message}`, 'status-error');
                setShowReconnect(true);
            });

            trackerClient.start();
        } catch (err: any) {
            console.error('[Phone] Connect error:', err);
            if (err.message && err.message.includes('Cannot create so many PeerConnections')) {
                updateStatus('❌ Browser resource limit reached. Please close tab and restart browser.', 'status-error');
            } else {
                updateStatus(err.message || 'Failed to connect', 'status-error');
            }
            setShowReconnect(true);
        }
    };

    const handleReconnect = () => {
        cleanup();
        const partyId = getPartyIdFromUrl();
        if (partyId) {
            const params = new URLSearchParams(window.location.search);
            const urlTrackers = params.getAll('tracker');

            // Reliable public trackers only - SINGLE default to ensure matching
            const reliableTrackers: string[] = [];



            const uniqueTrackers = Array.from(new Set([...urlTrackers, ...reliableTrackers]));
            connect(partyId, uniqueTrackers);
        }
    };

    useEffect(() => {
        const partyId = getPartyIdFromUrl();
        let startupTimeout: any;

        if (!partyId) {
            updateStatus('❌ No Party ID', 'status-error');
        } else {
            // Get trackers from URL params
            const params = new URLSearchParams(window.location.search);
            const urlTrackers = params.getAll('tracker');

            // Reliable public trackers 
            const reliableTrackers: string[] = [];

            // Combine reliable trackers with URL-provided trackers
            const allTrackers = [...urlTrackers, ...reliableTrackers];

            // Deduplicate
            const uniqueTrackers = Array.from(new Set(allTrackers));

            console.log('[Phone] Connecting with trackers:', uniqueTrackers);

            // Add a small delay to allow previous instances/GC to cleanup
            startupTimeout = setTimeout(() => {
                connect(partyId, uniqueTrackers);
            }, 1000);
        }

        return () => {
            if (startupTimeout) clearTimeout(startupTimeout);
            cleanup();
        };
    }, []);

    // --- Remote Configuration State ---
    const [showRemoteSettings, setShowRemoteSettings] = useState(false);
    const [remoteUrl, setRemoteUrl] = useState('');
    const [remoteToken, setRemoteToken] = useState('');

    const sendRemoteConfig = () => {
        if (!peerRef.current || !(peerRef.current as any).connected) {
            alert('Not connected to Host');
            return;
        }

        const msg = {
            type: 'configure',
            config: {
                url: remoteUrl,
                token: remoteToken
            }
        };

        try {
            peerRef.current.send(JSON.stringify(msg));
            alert('Settings sent to Host! The TV should reload shortly.');
            setShowRemoteSettings(false);
        } catch (e) {
            alert('Failed to send settings');
            console.error(e);
        }
    };

    // --- Queue Actions ---
    const sendSearch = (query: string) => {
        if (!peerRef.current) {
            alert('Not connected (No Peea Ref)');
            return;
        }
        if (!(peerRef.current as any).connected) {
            alert('Not connected (Peer State: ' + (peerRef.current as any).connected + ')');
            return;
        }

        const msg = {
            type: 'library.search',
            query,
            filters: {
                genre: filters.genre === 'All' ? undefined : filters.genre,
                year: filters.year === 'All' ? undefined : filters.year,
                language: filters.language === 'All' ? undefined : filters.language
            }
        };

        try {
            peerRef.current.send(JSON.stringify(msg));
        } catch (e) {
            console.error('Failed to send search:', e);
            alert('Failed to send search: ' + e);
        }
    };

    // Re-trigger search when filters change
    useEffect(() => {
        if (activeTab === 'queue') {
            sendSearch(queueSearchQuery);
        }
    }, [filters]);

    const addToQueue = (songId: string) => {
        if (!peerRef.current || !(peerRef.current as any).connected) return;
        const msg = { type: 'queue.add', songId };
        peerRef.current.send(JSON.stringify(msg));
        setSnackbarMessage('Added to Queue!');
        setSnackbarOpen(true);
    };

    // --- Remote Control Actions ---
    const sendRemoteCommand = (command: string, value?: any) => {
        if (!peerRef.current || !(peerRef.current as any).connected) return;
        const msg = { type: 'remote.command', command, value };
        peerRef.current.send(JSON.stringify(msg));
        // vibration feedback
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const removeFromQueue = (itemId: string) => {
        if (!peerRef.current || !(peerRef.current as any).connected) return;
        const msg = { type: 'queue.remove', itemId };
        peerRef.current.send(JSON.stringify(msg));
    };

    const GENRES = ['All', 'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Electronic', 'Jazz', 'Metal', 'Folk', 'Reggae', 'Blues', 'Soundtrack', 'Holiday'];
    const YEARS = ['All', '2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s', '1950s'];
    const LANGUAGES = ['All', 'English', 'Spanish', 'French', 'German', 'Italian', 'Japanese', 'Korean', 'Chinese'];


    if (showRemoteSettings) {
        return (
            <div className="phone-client" style={{ padding: 20, textAlign: 'left' }}>
                <h2>Host Settings</h2>
                <p>Configure the TV/Host Server Connection remotely.</p>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>Helper URL</label>
                    <input
                        type="text"
                        value={remoteUrl}
                        onChange={e => setRemoteUrl(e.target.value)}
                        placeholder="http://192.168.1.50:3000"
                        style={{ width: '100%', padding: 10, fontSize: 16 }}
                    />
                </div>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>Security Token</label>
                    <input
                        type="text"
                        value={remoteToken}
                        onChange={e => setRemoteToken(e.target.value)}
                        placeholder="Token from Helper Console"
                        style={{ width: '100%', padding: 10, fontSize: 16 }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={sendRemoteConfig} style={{ flex: 1, padding: 15, background: '#4caf50', color: 'white', border: 'none', borderRadius: 8 }}>
                        Send to TV
                    </button>
                    <button onClick={() => setShowRemoteSettings(false)} style={{ flex: 1, padding: 15, background: '#666', color: 'white', border: 'none', borderRadius: 8 }}>
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`melodiq-phone-client ${status.className}`}>
            {/* Header / Status Bar */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                padding: '10px 15px',
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                zIndex: 100,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 10, height: 10, borderRadius: '50%',
                        backgroundColor: status.className === 'status-connected' ? '#4ade80' :
                            status.className === 'status-connecting' ? '#fbbf24' : '#f87171'
                    }} />
                    <div style={{ fontWeight: 'bold' }}>{status.message}</div>
                </div>
                <button
                    onClick={() => setShowRemoteSettings(true)}
                    style={{ background: 'transparent', border: '1px solid #666', color: '#aaa', padding: '5px 10px', borderRadius: 4, fontSize: 12 }}
                >
                    ⚙️ Host
                </button>
            </div>

            {/* Tab Navigation */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                height: 60, background: '#1a1a1a', borderTop: '1px solid #333',
                display: 'flex', zIndex: 100
            }}>
                <button
                    onClick={() => setActiveTab('mic')}
                    style={{
                        flex: 1, background: activeTab === 'mic' ? '#333' : 'transparent',
                        border: 'none', color: activeTab === 'mic' ? '#fff' : '#888',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <span style={{ fontSize: 20 }}>🎤</span>
                    <span style={{ fontSize: 12 }}>Mic</span>
                </button>
                <button
                    onClick={() => setActiveTab('queue')}
                    style={{
                        flex: 1, background: activeTab === 'queue' ? '#333' : 'transparent',
                        border: 'none', color: activeTab === 'queue' ? '#fff' : '#888',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <span style={{ fontSize: 20 }}>🎵</span>
                    <span style={{ fontSize: 12 }}>Queue</span>
                </button>
                <button
                    onClick={() => setActiveTab('remote')}
                    style={{
                        flex: 1, background: activeTab === 'remote' ? '#333' : 'transparent',
                        border: 'none', color: activeTab === 'remote' ? '#fff' : '#888',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <span style={{ fontSize: 20 }}>🎮</span>
                    <span style={{ fontSize: 12 }}>Remote</span>
                </button>
            </div>

            <div className="main-content" style={{ marginTop: 60, paddingBottom: 100, paddingLeft: 10, paddingRight: 10, width: '100%', boxSizing: 'border-box' }}>

                {activeTab === 'mic' && (
                    <>
                        {/* VISUALIZATION BAR */}
                        <div style={{
                            width: '100%',
                            height: '40px',
                            background: '#222',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            marginBottom: '20px',
                            marginTop: '20px',
                            position: 'relative',
                            border: '1px solid #444',
                            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)'
                        }}>
                            <div
                                ref={volumeBarRef}
                                style={{
                                    width: '0%',
                                    height: '100%',
                                    background: `linear-gradient(90deg, hsl(${playerHue}, 100%, 30%) 0%, hsl(${playerHue}, 100%, 50%) 100%)`,
                                    transition: 'width 0.05s linear',
                                    opacity: 0.5
                                }}
                            />

                            {/* Note Name Display */}
                            <div
                                ref={noteNameRef}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '1.2rem',
                                    color: 'white',
                                    textShadow: '0 2px 4px black'
                                }}
                            >
                            </div>

                            <div
                                ref={pitchIndicatorRef}
                                style={{
                                    position: 'absolute',
                                    left: '0%',
                                    top: '5px',
                                    bottom: '5px',
                                    width: '6px',
                                    borderRadius: '3px',
                                    background: 'white',
                                    boxShadow: '0 0 10px white, 0 0 5px ' + `hsl(${playerHue}, 100%, 50%)`,
                                    transition: 'left 0.1s cubic-bezier(0.1, 0.7, 1.0, 0.1)',
                                    display: 'none'
                                }}
                            />
                        </div>

                        {/* Stats Notification */}
                        {latestStats && (
                            <div style={{
                                animation: 'fadeIn 0.5s',
                                background: 'rgba(255, 255, 255, 0.1)',
                                padding: '15px',
                                borderRadius: '10px',
                                marginTop: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <div style={{ fontSize: '0.9rem', color: '#aaa' }}>Last Performance</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '5px 0' }}>{latestStats.song}</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4ade80' }}>{latestStats.score} pts</div>
                            </div>
                        )}

                        {/* Track Selector */}
                        {availableTracks.length > 1 && (
                            <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#ccc' }}>Select Your Singer Part</div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {availableTracks.map((track, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleTrackSelect(idx)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                background: selectedTrackIndex === idx ? `hsl(${playerHue}, 80%, 40%)` : 'rgba(255,255,255,0.1)',
                                                border: selectedTrackIndex === idx ? `1px solid hsl(${playerHue}, 100%, 70%)` : '1px solid transparent',
                                                color: 'white',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: selectedTrackIndex === idx ? 'bold' : 'normal',
                                                minWidth: '100px'
                                            }}
                                        >
                                            {track}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Roster Toggle */}
                        <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#ccc' }}>
                                {isActive ? 'You are in the game! 🎤' : 'You are sitting out. 💤'}
                            </div>
                            <button
                                onClick={() => {
                                    console.log('[Phone] Toggle Button Clicked'); // DEBUG LOG
                                    if (peerRef.current && (peerRef.current as any).connected) {
                                        // Send toggle
                                        console.log('[Phone] Sending roster.toggle request...'); // DEBUG LOG
                                        const msg = { type: 'roster.toggle' };
                                        peerRef.current.send(JSON.stringify(msg));
                                        // Optimistic update
                                        setIsActive(!isActive);
                                    } else {
                                        console.warn('[Phone] Cannot toggle: Peer not connected'); // DEBUG LOG
                                    }
                                }}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: isActive ? '#f44336' : '#4caf50',
                                    color: 'white',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    width: '100%'
                                }}
                            >
                                {isActive ? 'Leave Game' : 'Join Game'}
                            </button>
                        </div>

                        {/* Identity Settings */}
                        <div className="identity-settings" style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>Your Name</label>
                                <input
                                    type="text"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        width: '100%',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>Your Color</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            backgroundColor: `hsl(${playerHue}, 100%, 50%)`,
                                            border: '2px solid white'
                                        }}
                                    />
                                    <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={playerHue}
                                        onChange={(e) => setPlayerHue(parseInt(e.target.value))}
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '15px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>Microphone</label>
                                <select
                                    value={selectedDeviceId}
                                    onChange={(e) => {
                                        setSelectedDeviceId(e.target.value);
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        width: '100%',
                                        fontSize: '1rem'
                                    }}
                                >
                                    <option value="">Default</option>
                                    {audioInputDevices.map((device, i) => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Microphone ${i + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {showReconnect && (
                            <button onClick={handleReconnect} className="reconnect-btn">
                                Retry Connection
                            </button>
                        )}
                    </>
                )}

                {activeTab === 'queue' && (
                    <div style={{ paddingTop: 10 }}>
                        {/* Now Playing */}
                        {nowPlaying && (
                            <div style={{ padding: 10, background: '#333', borderRadius: 8, marginBottom: 15, borderLeft: '4px solid #4caf50' }}>
                                <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#888', marginBottom: 2 }}>Now Playing</div>
                                <div style={{ fontWeight: 'bold', fontSize: 16 }}>{nowPlaying.title}</div>
                                <div style={{ fontSize: 12, color: '#bbb' }}>{nowPlaying.artist}</div>
                            </div>
                        )}

                        {/* Search */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                            <input
                                type="text"
                                value={queueSearchQuery}
                                onChange={(e) => {
                                    setQueueSearchQuery(e.target.value);
                                    sendSearch(e.target.value); // Live search
                                }}
                                placeholder="Search songs..."
                                style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#333', color: 'white', fontSize: 16 }}
                            />
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                style={{
                                    padding: '0 15px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: showFilters ? '#2196f3' : '#444',
                                    color: 'white'
                                }}
                            >
                                🌪️
                            </button>
                        </div>

                        {/* Filters Panel */}
                        {showFilters && (
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
                                marginBottom: 15, padding: 10, background: '#222', borderRadius: 8
                            }}>
                                <select
                                    value={filters.genre}
                                    onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value }))}
                                    style={{ padding: 8, borderRadius: 4, background: '#333', color: 'white', border: 'none' }}
                                >
                                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                                <select
                                    value={filters.year}
                                    onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                                    style={{ padding: 8, borderRadius: 4, background: '#333', color: 'white', border: 'none' }}
                                >
                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select
                                    value={filters.language}
                                    onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                                    style={{ padding: 8, borderRadius: 4, background: '#333', color: 'white', border: 'none' }}
                                >
                                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Search Results */}
                        {libraryResults.length > 0 ? (
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#888' }}>
                                    {queueSearchQuery || filters.genre !== 'All' ? 'Results' : 'Library'}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {libraryResults.map(song => (
                                        <div key={song.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: '#222', borderRadius: 8 }}>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                                                <div style={{ fontSize: 12, color: '#888' }}>{song.artist}</div>
                                            </div>
                                            <button
                                                onClick={() => addToQueue(song.id)}
                                                style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: '#4caf50', color: 'white', marginLeft: 10 }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: 20, textAlign: 'center', padding: 20, color: '#666', background: '#222', borderRadius: 8 }}>
                                <div>{queueSearchQuery ? 'No matches found' : 'Library not loaded'}</div>
                                <button
                                    className="load-lib-btn"
                                    onClick={() => sendSearch(queueSearchQuery)}
                                    style={{ marginTop: 10, padding: '12px 24px', borderRadius: 8, border: 'none', background: '#444', color: 'white', fontSize: '16px', fontWeight: 'bold' }}
                                >
                                    ↻ Load Library
                                </button>
                            </div>
                        )}

                        {/* Queue List */}
                        <div>
                            <h4 style={{ margin: '0 0 10px 0', color: '#888' }}>Up Next ({hostQueue.length})</h4>
                            {hostQueue.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>Queue is empty</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {hostQueue.map((item, idx) => (
                                        <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, background: '#2a2a2a', borderRadius: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                                                <div style={{ color: '#666', width: 20, textAlign: 'center' }}>{idx + 1}</div>
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                                    <div style={{ fontSize: 12, color: '#888' }}>{item.artist} {item.requester && `• ${item.requester}`}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromQueue(item.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#666', fontSize: 16, padding: '0 10px' }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'remote' && (
                    <div style={{ paddingTop: 20, textAlign: 'center' }}>
                        <h3 style={{ color: '#aaa', marginBottom: 20 }}>Remote Control</h3>

                        {/* Playback Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 30 }}>
                            <button
                                onClick={() => sendRemoteCommand('play')}
                                className="remote-btn"
                                style={{ background: '#4caf50', gridColumn: 'span 2' }}
                            >
                                ⏯ Play / Pause
                            </button>

                            <button
                                onClick={() => sendRemoteCommand('restart')}
                                className="remote-btn"
                                style={{ background: '#ff9800' }}
                            >
                                ⏮ Restart
                            </button>

                            <button
                                onClick={() => sendRemoteCommand('next')}
                                className="remote-btn"
                                style={{ background: '#2196f3' }}
                            >
                                ⏭ Next
                            </button>
                        </div>

                        <div style={{ height: 1, background: '#333', margin: '20px 0' }} />

                        {/* System Controls */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 15 }}>
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to stop the game?')) {
                                        sendRemoteCommand('exit');
                                    }
                                }}
                                className="remote-btn"
                                style={{ background: '#f44336' }}
                            >
                                ⏹ Exit Session
                            </button>
                        </div>

                        <div style={{ marginTop: 40, fontSize: 12, color: '#666' }}>
                            Control the main screen from your phone.
                        </div>
                    </div>
                )}
            </div>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .melodiq-phone-client {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background: #121212;
                    color: white;
                    display: block; /* Removed flex centering */
                    min-height: 100vh;
                    margin: 0;
                    overflow-x: hidden;
                }
                .status-container {
                    text-align: center;
                    max-width: 400px;
                    width: 100%;
                }
                .status-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                .status-text {
                    font-size: 1.2rem;
                    margin-bottom: 2rem;
                }
                .status-connecting { color: #fbbf24; }
                .status-connected { color: #4ade80; }
                .status-error { color: #f87171; }
                .status-disconnected { color: #9ca3af; }
                .status-disconnected { color: #9ca3af; }
                
                .reconnect-btn {
                    background: #90caf9;
                    color: #000;
                    border: none;
                    padding: 0.8rem 1.5rem;
                    font-size: 1rem;
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 1rem;
                }
                .reconnect-btn:active { transform: scale(0.95); }

                .remote-btn {
                    padding: 20px;
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-size: 1.1rem;
                    font-weight: bold;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: transform 0.1s;
                }
                .remote-btn:active {
                    transform: scale(0.96);
                    box-shadow: 0 2px 3px rgba(0,0,0,0.3);
                }

                /* Ensure main content is clickable and on top */
                .main-content {
                    position: relative;
                    z-index: 10;
                }

                /* load library button active state */
                .load-lib-btn:active {
                    transform: scale(0.95);
                    background: #666 !important;
                }
            `}</style>
        </div>
    );
};
