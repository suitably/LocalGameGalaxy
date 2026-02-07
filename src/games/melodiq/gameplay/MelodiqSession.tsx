import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Button, Typography, IconButton, Slider, Snackbar, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import db, { type Song, getCachedFiles } from '../db';
import { parseUltraStarTxt } from '../parser';
import { PitchVisualizer, type SongWithNotes, type SungSegment } from './PitchVisualizer';
import { LyricsDisplay } from './LyricsDisplay';
import { MicrophoneManager, type PitchResult } from '../audio/MicrophoneManager';
import { WebRTCMicManager } from '../audio/WebRTCMicManager';
import { type UserProfile, type ActivePlayer } from '../MelodiqSettings';
import { ScoreBoard } from './ScoreBoard';

interface MelodiqSessionProps {
    song: Song;
    onExit: (forceHome?: boolean) => void;
    // Props are now optional/ignored as we read from LS, but kept for compatibility if needed for overrides
    showDebugOverlay?: boolean;
    showDevSlider?: boolean;
    showMicStatus?: boolean;
}

import { useWebRTC } from '../audio/WebRTCContext';

// Helper class to manage runtime state for a single player
class PlayerRuntime {
    // Local Mic
    public mic: MicrophoneManager | null = null;

    // Remote Mic
    public webRtcManager?: WebRTCMicManager;
    public remotePeerId?: string;

    // OLD: public score: number = 0;
    // NEW: Per-Track Scoring
    public trackScores: Record<number, number> = {};
    public score: number = 0; // Keeping for compatibility / total sum or caching

    // Stable refs for high-frequency updates without React renders
    public pitchRef: React.RefObject<PitchResult | null>;
    public segmentsRef: React.RefObject<Record<number, SungSegment[]>>;

    // Helper to track active segment for optimization
    // Helper to track active segment for optimization - Per Track
    public activeSegments: Record<number, SungSegment | null> = {};

    // Duet: Current Track Index (0 = P1, 1 = P2)
    public trackIndex: number = 0;

    public config: UserProfile & { deviceId: string; volume?: number; muted?: boolean; latency?: number; isRemote?: boolean };

    constructor(config: UserProfile & { deviceId?: string, volume?: number, muted?: number | boolean, latency?: number, isRemote?: boolean }, manager?: WebRTCMicManager) {
        this.config = {
            id: config.id,
            name: config.name,
            hue: config.hue,
            deviceId: config.deviceId || '', // Fallback to empty string if undefined
            volume: config.volume ?? 1.0,
            muted: (config.muted === 1 || config.muted === true),
            latency: config.latency ?? 0,
            isRemote: config.isRemote ?? false
        };
        this.pitchRef = { current: null };
        this.segmentsRef = { current: {} };
        // Initialize scores
        this.trackScores = { 0: 0, 1: 0 };

        if (this.config.isRemote && manager) {
            this.webRtcManager = manager;
            this.remotePeerId = this.config.deviceId; // For remote, deviceId is the peerId
        } else {
            this.mic = new MicrophoneManager();
        }
    }

    // Pitch caching for performance throttling
    private lastPitchTime: number = 0;
    private cachedPitch: PitchResult | null = null;
    private static PITCH_THROTTLE_MS = 33; // ~30fps for pitch detection

    getPitch(): PitchResult | null {
        const now = performance.now();

        // Return cached pitch if within throttle window
        if (now - this.lastPitchTime < PlayerRuntime.PITCH_THROTTLE_MS) {
            return this.cachedPitch;
        }

        this.lastPitchTime = now;

        if (this.mic) {
            this.cachedPitch = this.mic.getPitch();
        } else if (this.webRtcManager && this.remotePeerId) {
            this.cachedPitch = this.webRtcManager.getPitch(this.remotePeerId);
        } else {
            this.cachedPitch = null;
        }

        return this.cachedPitch;
    }

    start(): Promise<void> {
        if (this.mic && this.config.deviceId && !this.config.isRemote) {
            return this.mic.start(this.config.deviceId, this.config.volume, this.config.muted);
        }
        return Promise.resolve();
    }

    stop(): void {
        this.mic?.stop();
    }

    attachRemotePeer(manager: WebRTCMicManager, peerId: string) {
        this.webRtcManager = manager;
        this.remotePeerId = peerId;
        // Stop local mic if it was running?
        if (this.mic && this.mic.isActive) {
            this.mic.stop();
            this.mic = null; // Disable local mic effectively
        }
    }
}

export const MelodiqSession: React.FC<MelodiqSessionProps> = ({ song, onExit }) => {
    // Session State
    // Read Settings from LocalStorage
    const [showDebugOverlay] = useState(localStorage.getItem('melodiq_show_overlay') === 'true');
    const [showDevSlider] = useState(localStorage.getItem('melodiq_show_slider') === 'true');
    const [showMicStatus] = useState(() => {
        const stored = localStorage.getItem('melodiq_show_mic_status');
        return stored === null ? true : stored === 'true';
    });
    const [showNoteLabels] = useState(() => {
        const stored = localStorage.getItem('melodiq_show_note_labels');
        return stored === null ? true : stored === 'true';
    });
    const [showVideoErrors] = useState(localStorage.getItem('melodiq_show_video_errors') === 'true');
    // Layout State
    const [layoutOverride] = useState(localStorage.getItem('melodiq_layout_override') || '');

    // Volume State
    const [songVolume] = useState(() => {
        const stored = localStorage.getItem('melodiq_song_volume');
        return stored ? parseFloat(stored) : 0.7;
    });
    const [masterVolume] = useState(() => {
        const stored = localStorage.getItem('melodiq_master_volume');
        return stored ? parseFloat(stored) : 1.0;
    });
    const [goldenNoteMultiplier] = useState(() => {
        const stored = localStorage.getItem('melodiq_golden_note_multiplier');
        return stored ? parseFloat(stored) : 2.0;
    });

    // Dynamic Player State
    const [players, setPlayers] = useState<PlayerRuntime[]>([]);
    const [ready, setReady] = useState(false);

    // We use a ref to hold the runtime objects to avoid re-renders on every pitch update
    // But we also need state to trigger initial render.
    // The `players` state above holds the initial list. The Refs inside PlayerRuntime are mutable.
    // However, to force React to re-render scores, we need a separate state or forceUpdate.
    const [scores, setScores] = useState<Record<string, number>>({});

    // Audio/Video logic
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpmMultiplier] = useState(4);
    const [isFinished, setIsFinished] = useState(false);

    // UI State
    const [_duration, setDuration] = useState(0);
    const [devPitchOverride, setDevPitchOverride] = useState<number | null>(null);
    const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);
    const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [needsFolderAccess, setNeedsFolderAccess] = useState(false);

    const requestRef = useRef<number>(0);
    const lastScoreUpdateRef = useRef<number>(0);
    const playersRef = useRef<PlayerRuntime[]>([]);
    const progressLineRef = useRef<HTMLDivElement>(null);

    // Load Content State
    const [parsedSong, setParsedSong] = useState<SongWithNotes | null>(null);
    const [contentLoading, setContentLoading] = useState(true);

    // Scoring Normalization - Per Track
    const [trackScoreWeights, setTrackScoreWeights] = useState<number[]>([]);

    // Reset state when song changes
    useEffect(() => {
        setIsFinished(false);
        setIsPlaying(false);
        setAudioSrc(undefined);
        setVideoSrc(undefined);
        setParsedSong(null);
        setContentLoading(true);
        hasStartedRef.current = false;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    }, [song.id]);

    useEffect(() => {
        const loadContent = async () => {
            try {
                // Ensure we are loading for the current song
                setContentLoading(true);

                // Check if content was passed via song object (Server/Helper songs from useSongs caching)
                // @ts-ignore - Song interface doesn't strictly include txtContent but useSongs attaches it
                if (song.txtContent) {
                    // @ts-ignore
                    const parsed = parseUltraStarTxt(song.txtContent);
                    const parsedWithMeta = { ...song, notes: parsed.notes, tracks: parsed.tracks, headers: parsed.headers, bpm: parsed.bpm, gap: parsed.gap };
                    setParsedSong(parsedWithMeta);
                    calculateScoreNormalization(parsed);
                    setContentLoading(false);
                    return;
                }

                const content = await db.songsContent.get(song.id);
                if (content?.txtContent) {
                    const parsed = parseUltraStarTxt(content.txtContent);
                    const parsedWithMeta = { ...song, notes: parsed.notes, tracks: parsed.tracks, headers: parsed.headers, bpm: parsed.bpm, gap: parsed.gap };
                    setParsedSong(parsedWithMeta);
                    calculateScoreNormalization(parsed);
                } else {
                    console.error('Song content not found for', song.title);
                }
            } catch (e) {
                console.error('Failed to load song content', e);
            } finally {
                setContentLoading(false);
            }
        };
        loadContent();
    }, [song.id, goldenNoteMultiplier]);

    // Calculate score normalization based on total weighted beats in each track
    const calculateScoreNormalization = (parsed: { notes: any[], tracks: any[] }) => {
        const weights: number[] = [];

        // If we have tracks, calculate for each
        if (parsed.tracks && parsed.tracks.length > 0) {
            parsed.tracks.forEach(track => {
                let total = 0;
                track.notes.forEach((note: any) => {
                    if (note.type === ':') {
                        total += note.duration;
                    } else if (note.type === '*' || note.type === 'F') {
                        total += note.duration * (note.type === '*' ? goldenNoteMultiplier : 1);
                    }
                });
                weights.push(total > 0 ? 1000 / total : 0);
            });
        } else {
            // Fallback for legacy parsing or single track
            let total = 0;
            parsed.notes.forEach(note => {
                if (note.type === ':') {
                    total += note.duration;
                } else if (note.type === '*' || note.type === 'F') {
                    total += note.duration * (note.type === '*' ? goldenNoteMultiplier : 1);
                }
            });
            weights.push(total > 0 ? 1000 / total : 0);
        }

        setTrackScoreWeights(weights);
        console.log(`[MelodiqSession] Scoring Normalized Weights:`, weights);
    };

    // Calculate Grid Layout
    const gridLayout = React.useMemo(() => {
        const count = players.length;
        if (count === 0) return { rows: [], columnWidthPercent: 100 };

        let rowConfig: number[] = [];

        // 1. Check Override
        if (layoutOverride) {
            const parts = layoutOverride.split('.').map(p => parseInt(p.trim())).filter(n => !isNaN(n) && n > 0);
            const sum = parts.reduce((a, b) => a + b, 0);
            if (sum === count) {
                rowConfig = parts;
            }
        }

        // 2. Default Balanced Logic if no valid override
        if (rowConfig.length === 0) {
            // Heuristic:
            // 1-3 Players: Vertical Stack (1 col per row) to maximize timeline width
            if (count <= 3) {
                rowConfig = new Array(count).fill(1);
            } else {
                // 4+ Players: Balanced Grid (Max 3 columns)
                const maxCols = 3;
                const numRows = Math.ceil(count / maxCols);
                const baseCols = Math.floor(count / numRows);
                const remainder = count % numRows;

                rowConfig = [];
                for (let i = 0; i < numRows; i++) {
                    // Distribute remainder to first rows
                    rowConfig.push(baseCols + (i < remainder ? 1 : 0));
                }
            }
        }

        // Calculate Max Columns for Uniform Width
        const maxColumnsInGrid = Math.max(...rowConfig);

        return {
            rows: rowConfig,
            columnWidthPercent: 100 / maxColumnsInGrid
        };
    }, [players.length, layoutOverride]);

    // WebRTC Context
    const { manager, activePeers } = useWebRTC();

    // Initialization Effect: Load Players from Settings
    useEffect(() => {
        const storedProfiles = localStorage.getItem('melodiq_profiles');
        const storedActive = localStorage.getItem('melodiq_active_session');

        if (storedProfiles && storedActive) {
            const allProfiles: UserProfile[] = JSON.parse(storedProfiles);
            const activeSession: ActivePlayer[] = JSON.parse(storedActive);

            const newPlayers: PlayerRuntime[] = [];

            activeSession.forEach(p => {
                const profile = allProfiles.find(prof => prof.id === p.profileId);
                if (profile) {
                    newPlayers.push(new PlayerRuntime({
                        ...profile,
                        deviceId: p.deviceId,
                        volume: p.volume,
                        muted: p.muted,
                        latency: p.latency,
                        isRemote: p.isRemote // Ensure isRemote is passed
                    }));
                }
            });

            console.log('[MelodiqSession] Initialized players:', newPlayers.length);
            setPlayers(newPlayers);
            playersRef.current = newPlayers;
            setReady(true);
        } else {
            console.warn("No dynamic settings found, falling back to empty session.");
            setReady(true);
        }
    }, []);

    // Sync Players with WebRTC Peers
    useEffect(() => {
        if (!manager) return;

        // Message Handling
        manager.onMessage = (peerId, data) => {
            if (data.type === 'trackSelect' && typeof data.trackIndex === 'number') {
                const currentPlayers = playersRef.current;
                const pIdx = currentPlayers.findIndex(p => p.config.deviceId === peerId);
                if (pIdx !== -1) {
                    console.log(`[Session] Remote track switch for ${currentPlayers[pIdx].config.name} -> Track ${data.trackIndex}`);
                    switchTrack(pIdx, data.trackIndex);
                }
            }
        };

        setPlayers(prevPlayers => {
            let updatedPlayers = [...prevPlayers];
            let changed = false;

            // 1. Attach/Add connected peers
            activePeers.forEach(peer => {
                const existingIdx = updatedPlayers.findIndex(p => p.config.deviceId === peer.id);

                if (existingIdx !== -1) {
                    // Attach to existing player
                    const player = updatedPlayers[existingIdx];
                    if (!player.webRtcManager) {
                        console.log(`[Session] Attaching Phone ${peer.name} to existing player ${player.config.name}`);
                        player.attachRemotePeer(manager, peer.id);
                        changed = true;
                    }
                } else {
                    // Create new Guest Player
                    console.log(`[Session] New Phone Guest: ${peer.name}`);
                    const newProfile: UserProfile = {
                        id: peer.id,
                        name: peer.name,
                        hue: peer.hue || Math.floor(Math.random() * 360)
                    };

                    const newPlayer = new PlayerRuntime({
                        ...newProfile,
                        deviceId: peer.id, // Device ID is Peer ID
                        volume: 1.0,
                        muted: false,
                        latency: 0,
                        isRemote: true
                    }, manager);

                    updatedPlayers.push(newPlayer);
                    changed = true;
                }
            });

            // 2. Handle Disconnected Peers
            // Remove Guests who disconnected
            const activePeerIds = new Set(activePeers.map(p => p.id));
            const filtered = updatedPlayers.filter(p => {
                if (p.config.isRemote) {
                    // If peer is gone
                    if (!activePeerIds.has(p.config.deviceId)) {
                        // If Guest (profileId matches deviceId basically)
                        if (p.config.id === p.config.deviceId) {
                            console.log(`[Session] removing disconnected guest ${p.config.name}`);
                            changed = true;
                            return false;
                        }
                    }
                }
                return true;
            });

            if (filtered.length !== updatedPlayers.length) {
                updatedPlayers = filtered;
                changed = true;
            }

            if (changed) {
                playersRef.current = updatedPlayers;
            }
            return changed ? updatedPlayers : prevPlayers;
        });

    }, [activePeers, manager]);

    // Broadcast Song Info (Tracks) to Peers
    useEffect(() => {
        if (!manager || !parsedSong) return;

        const trackNames = parsedSong.tracks && parsedSong.tracks.length > 0
            ? parsedSong.tracks.map((t: any, i: number) => t.name || `Player ${i + 1}`)
            : [];

        const payload = {
            type: 'songInfo',
            title: song.title,
            artist: song.artist,
            tracks: trackNames
        };

        // Send to all connected remote players
        players.forEach(p => {
            if (p.config.isRemote && p.webRtcManager && p.remotePeerId && p.webRtcManager.getConnectedPeers().some(cp => cp.peerId === p.remotePeerId)) {
                p.webRtcManager.sendToPeer(p.remotePeerId, payload);
            }
        });

    }, [manager, parsedSong, players.length, song.title]); // Trigger on players change (new connection) or song load

    const togglePlay = useCallback(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                if (videoRef.current) videoRef.current.pause();
            } else {
                audioRef.current.volume = songVolume * masterVolume;
                audioRef.current.play();
                if (videoRef.current) videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying, songVolume, masterVolume]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay]);

    const processPlayer = (
        player: PlayerRuntime,
        devOverride: number | null,
        deltaTimeMs: number
    ) => {
        let pitch: PitchResult | null = null;
        if (devOverride !== null) {
            pitch = {
                frequency: 440 * Math.pow(2, (devOverride - 69) / 12),
                note: devOverride,
                volume: 1.0
            };
        } else {
            pitch = player.getPitch();
        }
        player.pitchRef.current = pitch;

        if (pitch && pitch.note > 0 && isPlaying && parsedSong && parsedSong.notes && audioRef.current) {
            const beatDuration = 60000 / ((parsedSong.bpm || 120) * bpmMultiplier);
            const latency = player.config.latency || 0;
            const currentBeat = ((audioRef.current.currentTime * 1000) - latency - (parsedSong.gap || 0)) / beatDuration;

            const trackCount = (parsedSong.tracks && parsedSong.tracks.length > 0) ? parsedSong.tracks.length : 1;

            for (let tIdx = 0; tIdx < trackCount; tIdx++) {
                const notesSource: any[] = (parsedSong.tracks && parsedSong.tracks[tIdx]) ? parsedSong.tracks[tIdx].notes : parsedSong.notes;
                const currentScoreWeight = (trackScoreWeights.length > tIdx) ? trackScoreWeights[tIdx] : (trackScoreWeights[0] || 0);

                const activeNoteIndex = notesSource.findIndex((n) =>
                    n.type !== '-' &&
                    currentBeat >= n.start &&
                    currentBeat <= n.start + n.duration
                );

                if (activeNoteIndex !== -1) {
                    const note = notesSource[activeNoteIndex];
                    const targetPitch = note.pitch;
                    const sungPitch = pitch.note;

                    const diff = Math.abs((sungPitch % 12) - (targetPitch % 12));
                    const semitoneDiff = Math.min(diff, 12 - diff);

                    if (semitoneDiff < 1.0) {
                        const durationUnitsCovered = deltaTimeMs / beatDuration;
                        let points = durationUnitsCovered * currentScoreWeight;
                        if (note.type === '*') points *= goldenNoteMultiplier;

                        // Award points to this track
                        if (!player.trackScores[tIdx]) player.trackScores[tIdx] = 0;
                        player.trackScores[tIdx] += points;

                        // Update visualization segments for this track
                        const record = player.segmentsRef.current;
                        if (!record) continue; // Should not happen with RefObject init

                        const activeSeg = player.activeSegments[tIdx];

                        if (activeSeg &&
                            activeSeg.trackIndex === tIdx &&
                            activeSeg.noteIndex === activeNoteIndex) {
                            activeSeg.endBeat = currentBeat;
                        } else {
                            const newSegment = {
                                noteIndex: activeNoteIndex,
                                startBeat: currentBeat,
                                endBeat: currentBeat,
                                trackIndex: tIdx
                            };
                            player.activeSegments[tIdx] = newSegment;

                            if (!record[activeNoteIndex]) record[activeNoteIndex] = [];
                            record[activeNoteIndex].push(newSegment);
                        }
                    } else {
                        // Pitch mismatch, end active segment for this track
                        player.activeSegments[tIdx] = null;
                    }
                } else {
                    // No active note, end active segment for this track
                    player.activeSegments[tIdx] = null;
                }
            }
        }
    };

    const switchTrack = (playerIndex: number, trackIndex: number) => {
        setPlayers(prev => {
            const newPlayers = [...prev];
            const p = newPlayers[playerIndex];
            if (p) {
                // Determine actual track index (prevent out of bounds)
                const safeIndex = (parsedSong?.tracks && trackIndex < parsedSong.tracks.length) ? trackIndex : 0;

                // Create a shallow copy or just mutate if we rely on forceUpdate (setPlayers triggers render)
                // But PlayerRuntime is a class instance.
                // We should probably mutate it, then clone array to trigger React.
                p.trackIndex = safeIndex;
                // No score reset: p.score = 0; 
                // No segment clear: p.segmentsRef.current = {}; 
                // Just clear active segment to prevent continuity across tracks visually if switch happens mid-sing
                p.activeSegments = {};
                console.log(`[Session] Player ${p.config.name} switched to Track ${safeIndex}`);
            }
            return newPlayers;
        });
    };

    const lastTimeRef = useRef<number>(performance.now());

    const updateLoop = useCallback(() => {
        const now = performance.now();
        const deltaTime = now - lastTimeRef.current;
        lastTimeRef.current = now;

        if (audioRef.current && isPlaying) {
            if (videoRef.current && Math.abs(videoRef.current.currentTime - audioRef.current.currentTime) > 0.2) {
                videoRef.current.currentTime = audioRef.current.currentTime;
            }
        }

        // Update Progress Line - Run always, even if paused, to show current state
        if (progressLineRef.current) {
            // Use _duration state if audio duration is not ready or weird
            const duration = (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0)
                ? audioRef.current.duration
                : (_duration > 0 ? _duration : 0);

            if (duration > 0) {
                const currentTime = audioRef.current ? audioRef.current.currentTime : 0;
                const progress = Math.min(100, Math.max(0, (currentTime / duration) * 100));
                progressLineRef.current.style.width = `${progress}%`;
            }
        }

        // Process All Players
        players.forEach((player, index) => {
            // Apply Dev Override only to the first player for simplicity
            const override = (index === 0) ? devPitchOverride : null;
            processPlayer(player, override, deltaTime);
        });

        // Update React State (Throttled)
        if (now - lastScoreUpdateRef.current > 200) {
            const newScores: Record<string, number> = {};
            players.forEach(p => {
                // Display the score for the CURRENTLY SELECTED TRACK
                const currentTrackScore = p.trackScores[p.trackIndex] || 0;
                newScores[p.config.id] = Math.round(currentTrackScore);
            });
            setScores(newScores); // Always set new object to trigger render
            lastScoreUpdateRef.current = now;
        }

        requestRef.current = requestAnimationFrame(updateLoop);
    }, [isPlaying, devPitchOverride, parsedSong, bpmMultiplier, players, trackScoreWeights, goldenNoteMultiplier, _duration]);

    // Start/Stop Mics and Loop
    useEffect(() => {
        if (!ready) return;

        // Start mics if there are players
        if (players.length > 0) {
            players.forEach(p => {
                p.start().catch(e => console.error(`Failed to start mic for ${p.config.name}`, e));
            });
        } else {
            console.log("[MelodiqSession] No players active, starting loop for playback/visuals only.");
        }

        requestRef.current = requestAnimationFrame(updateLoop);

        return () => {
            cancelAnimationFrame(requestRef.current);
            players.forEach(p => p.stop());
        };
    }, [ready, players, updateLoop]);

    // Handle song end - use ref to avoid stale closure issues
    const handleSongEnd = useCallback(() => {
        console.log('Song ended, showing scoreboard');

        // Broadcast Stats to Connected Phones using ref to get latest players
        const now = new Date();
        playersRef.current.forEach(p => {
            if (p.config.isRemote && p.webRtcManager && p.remotePeerId) {
                const statsPayload = {
                    type: 'stats',
                    songTitle: song.title,
                    score: p.score,
                    date: now.toISOString()
                };
                console.log(`[Session] Sending stats to ${p.config.name}`, statsPayload);
                p.webRtcManager.sendToPeer(p.remotePeerId, statsPayload);
            }
        });

        setIsFinished(true);
        setIsPlaying(false);
        if (videoRef.current) videoRef.current.pause();
    }, [song.title]);

    // Audio event handlers - set after audio source is loaded
    useEffect(() => {
        const audio = audioRef.current;
        if (audio && audioSrc) {
            audio.onloadedmetadata = () => setDuration(audio.duration);
        }
    }, [audioSrc]);

    useEffect(() => {
        let activeUrl: string | undefined;
        let mounted = true;

        const loadAudio = async () => {
            if (!song.audio) return;
            try {
                if (song.audio instanceof Blob) {
                    activeUrl = URL.createObjectURL(song.audio);
                } else if (typeof song.audio === 'string') {
                    // Check if it's a full URL, relative URL (server), or just a filename
                    if (song.audio.startsWith('http://') || song.audio.startsWith('https://') || song.audio.startsWith('blob:') || song.audio.startsWith('/')) {
                        activeUrl = song.audio;

                        // If it's a relative URL from our server, we might need to prepend base if not on same origin
                        // But since we use vite proxy or if frontend is on 5173 and server on 3000...
                        // Wait, if frontend is 5173, fetching '/media/...' will go to 5173.
                        // We need the server URL.
                        if (song.audio.startsWith('/') && !window.location.origin.includes('3000')) {
                            // We are on dev server (5173) probably, but media is on 3000.
                            // We should probably rely on the server returning full URLs or configured proxy.
                            // But let's just prepend the server URL for now or assume proxy.
                            // The fetch in useSongs used http://localhost:3000.
                            // So we should prepend http://localhost:3000 if it's just /media
                            const helperUrl = localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000';
                            let finalUrl = song.audio.startsWith('http') ? song.audio : `${helperUrl}${song.audio}`;

                            // Append Token if needed and not present
                            if (finalUrl.includes('/media') && !finalUrl.includes('token=')) {
                                const token = localStorage.getItem('melodiq_helper_token');
                                if (token) {
                                    finalUrl += (finalUrl.includes('?') ? '&' : '?') + `token=${token}`;
                                }
                            }
                            activeUrl = finalUrl;
                        }
                    } else {
                        // It's just a filename (FileList fallback import)
                        // First check the in-memory cache (available during same session)
                        const cached = getCachedFiles(song.id);
                        if (cached?.audio) {
                            activeUrl = URL.createObjectURL(cached.audio);
                            console.log('[Session] Using cached audio file:', cached.audio.name);

                            // Also load cached video if available
                            if (cached.video && mounted) {
                                setVideoSrc(URL.createObjectURL(cached.video));
                            }
                        } else {
                            // Cache empty (page was refreshed) - need to prompt user
                            if (mounted) {
                                setNeedsFolderAccess(true);
                            }
                            return;
                        }
                    }
                } else {
                    // FileSystemFileHandle
                    // @ts-ignore
                    const file = await song.audio.getFile();
                    activeUrl = URL.createObjectURL(file);
                }
            } catch (e) {
                console.error("Failed to load audio", e);
            }
            if (mounted) setAudioSrc(activeUrl);
        };
        loadAudio();

        return () => {
            mounted = false;
            // Revoke if it was created from a blob or handle (which creates a blob url)
            if (activeUrl && typeof song.audio !== 'string') URL.revokeObjectURL(activeUrl);
        };
    }, [song.audio, song.id]);

    useEffect(() => {
        let activeUrl: string | undefined;
        let mounted = true;

        const loadVideo = async () => {
            if (!song.video) return;
            try {
                let fileOrBlob: Blob | File | null = null;
                let fileName: string = '';

                // 1. Resolve to a usable Blob/File
                if (song.video instanceof Blob) {
                    fileOrBlob = song.video;
                    if (song.video instanceof File) {
                        fileName = song.video.name;
                    }
                    // If it's a raw Blob, we might not have a name, but we can check type
                } else if (typeof song.video === 'string') {
                    // Check if it looks like a URL (Server/Remote)
                    if (song.video.startsWith('http') || song.video.startsWith('/') || song.video.startsWith('blob:')) {
                        if (song.video.startsWith('/') && !window.location.origin.includes('3000')) {
                            const helperUrl = localStorage.getItem('melodiq_helper_url')?.replace(/\/$/, "") || 'http://localhost:3000';
                            let finalUrl = `${helperUrl}${song.video}`;
                            // Append Token if needed
                            if (finalUrl.includes('/media') && !finalUrl.includes('token=')) {
                                const token = localStorage.getItem('melodiq_helper_token');
                                if (token) {
                                    finalUrl += (finalUrl.includes('?') ? '&' : '?') + `token=${token}`;
                                }
                            }
                            activeUrl = finalUrl;
                        } else {
                            activeUrl = song.video;
                        }
                    } else {
                        // Likely a filename from Legacy/Fallback Import
                        // Try to retrieve from in-memory cache
                        const cached = getCachedFiles(song.id);
                        if (cached?.video) {
                            fileOrBlob = cached.video;
                            fileName = cached.video.name;
                            console.log('[Session] Using cached video file:', fileName);
                        } else {
                            // Cache miss (e.g. reload). User needs to re-select folder, but that's handled by audio check mostly.
                            console.warn("Video file cache miss:", song.video);
                        }
                    }
                } else {
                    // FileSystemFileHandle
                    // @ts-ignore
                    const fileHandle = await song.video.getFile();
                    fileOrBlob = fileHandle;
                    fileName = fileHandle.name;
                }

                // 2. Apply AVI Workaround if we have a Blob/File
                if (fileOrBlob) {
                    let blobToUrl = fileOrBlob;
                    const type = fileOrBlob.type;
                    const name = fileName.toLowerCase();

                    // Check for AVI by extension or type
                    // Note: fileOrBlob.type might be empty or wrong, so extension is important
                    if (name.endsWith('.avi') || type.includes('avi') || type === 'video/x-msvideo') {
                        console.log('[Melodiq] Attempting to force-load AVI file by masking as MP4:', name, 'Type:', type);
                        blobToUrl = new Blob([fileOrBlob], { type: 'video/mp4' });
                    }

                    activeUrl = URL.createObjectURL(blobToUrl);
                }

            } catch (e) {
                console.error("Failed to load video", e);
            }
            if (mounted) setVideoSrc(activeUrl);
        };
        loadVideo();

        return () => {
            mounted = false;
            if (activeUrl && typeof song.video !== 'string') URL.revokeObjectURL(activeUrl);
        };
    }, [song.video]);

    // Clear error when song changes
    useEffect(() => {
        setVideoError(null);
    }, [song.id]);

    // Ensure video plays if it loads after audio has started
    useEffect(() => {
        if (videoSrc && isPlaying && videoRef.current) {
            videoRef.current.play().catch(e => console.warn("Late video start failed", e));
        }
    }, [videoSrc, isPlaying]);

    // Auto-start logic
    // Auto-start logic
    const hasStartedRef = useRef(false);
    useEffect(() => {
        // We only try to start IF:
        // 1. We haven't started yet (hasStartedRef)
        // 2. We are ready (settings loaded)
        // 3. Content is loaded (not loading)
        // 4. Parsed song exists
        // 5. Audio source is set
        // 6. Audio element is mounted
        if (!hasStartedRef.current && ready && !contentLoading && parsedSong && audioSrc && audioRef.current && !isFinished) {
            hasStartedRef.current = true;
            const audio = audioRef.current;

            // Set volume ensuring it's not overridden later by some other default
            audio.volume = songVolume * masterVolume;

            const startPlay = async () => {
                try {
                    await audio.play();
                    if (videoRef.current) {
                        // Sync video time just in case
                        videoRef.current.currentTime = audio.currentTime;
                        await videoRef.current.play();
                    }
                    setIsPlaying(true);
                } catch (e) {
                    console.error("Auto-start failed (likely browser policy):", e);
                    // Reset so user can try manually
                    hasStartedRef.current = false;
                }
            };
            startPlay();
        }
    }, [ready, contentLoading, parsedSong, audioSrc, songVolume, masterVolume, song.id, isFinished]);

    // Ref for hidden folder input (Firefox compatible)
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Handler for FileList fallback: user selects folder to access files
    const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const audioFilename = typeof song.audio === 'string' ? song.audio : null;
        const videoFilename = typeof song.video === 'string' ? song.video : null;

        if (audioFilename && song.dirPath) {
            // Find the audio file by matching dirPath + filename
            // FileList items have webkitRelativePath like "root/subdir/file.mp3"
            const targetAudioPath = `${song.dirPath}/${audioFilename}`.replace(/^\.\//, '');

            let audioFile: File | undefined;
            let videoFile: File | undefined;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const relativePath = file.webkitRelativePath;

                if (relativePath.endsWith(targetAudioPath) || relativePath === targetAudioPath) {
                    audioFile = file;
                }
                if (videoFilename) {
                    const targetVideoPath = `${song.dirPath}/${videoFilename}`.replace(/^\.\//, '');
                    if (relativePath.endsWith(targetVideoPath) || relativePath === targetVideoPath) {
                        videoFile = file;
                    }
                }

                // Early exit if we found both
                if (audioFile && (!videoFilename || videoFile)) break;
            }

            if (audioFile) {
                setAudioSrc(URL.createObjectURL(audioFile));
                console.log('[Session] Loaded audio from re-selected folder:', audioFile.name);
            } else {
                console.error('Audio file not found in selected folder:', targetAudioPath);
            }

            if (videoFile) {
                setVideoSrc(URL.createObjectURL(videoFile));
                console.log('[Session] Loaded video from re-selected folder:', videoFile.name);
            }
        }

        setNeedsFolderAccess(false);
        // Reset input so same folder can be selected again if needed
        e.target.value = '';
    };

    if (!ready || contentLoading || !parsedSong) return <Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography>Loading...</Typography></Box>; // Loading black screen

    // Show folder access prompt for FileList-imported songs
    if (needsFolderAccess) {
        return (
            <Box sx={{
                bgcolor: 'black',
                height: '100vh',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3
            }}>
                <Typography variant="h5">{song.artist} - {song.title}</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 500, textAlign: 'center' }}>
                    This song was imported without persistent file access.<br />
                    To play, please select the same folder you imported from.
                </Typography>
                {/* Hidden folder input - Firefox compatible */}
                <input
                    ref={folderInputRef}
                    type="file"
                    // @ts-ignore - webkitdirectory is non-standard but supported
                    webkitdirectory=""
                    style={{ display: 'none' }}
                    onChange={handleFolderInputChange}
                />
                <Button variant="contained" onClick={() => folderInputRef.current?.click()}>
                    Select Song Folder
                </Button>
                <Button variant="text" color="inherit" onClick={() => onExit(true)}>
                    Go Back
                </Button>
            </Box>
        );
    }

    if (isFinished) {
        // Prepare props for ScoreBoard from valid players state
        const scoreBoardPlayers = players.map(p => ({
            config: p.config,
            score: p.score // Note: p.score is updated in real-time in the mutable object
        }));

        return <ScoreBoard players={scoreBoardPlayers} onExit={onExit} />;
    }

    return (
        <Box sx={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'black',
            color: 'white',
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Background Video */}
            {videoSrc && (
                <video
                    ref={videoRef}
                    src={videoSrc}
                    muted
                    style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        objectFit: 'cover', zIndex: 0, opacity: 0.6
                    }}
                    onError={(e) => {
                        console.warn("Video playback failed (likely unsupported codec/format).", e);
                        setVideoError("Video format not supported (Firefox does not support AVI/DivX)");
                        setVideoSrc(undefined);
                    }}
                />
            )}

            {/* Transient Video Error Notification */}
            <Snackbar
                open={!!videoError && showVideoErrors}
                autoHideDuration={6000}
                onClose={() => setVideoError(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={() => setVideoError(null)} severity="warning" sx={{ width: '100%' }}>
                    {videoError}
                </Alert>
            </Snackbar>
            {
                videoSrc && (
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.4)', zIndex: 1 }} />
                )
            }

            <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, pointerEvents: 'none' }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(0,0,0,0.5)', pointerEvents: 'auto' }}>
                    <IconButton onClick={() => onExit(true)} color="inherit"><ArrowBackIcon /></IconButton>
                    <Typography variant="h6">{song.artist} - {song.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 4 }}>
                        {players.map(p => {
                            // Determine display name: Only show track suffix for duet songs (more than 1 track)
                            const isDuet = parsedSong?.tracks && parsedSong.tracks.length > 1;
                            const trackName = isDuet && parsedSong?.tracks?.[p.trackIndex] ? parsedSong.tracks[p.trackIndex].name : null;
                            const displayName = trackName ? `${p.config.name} (${trackName})` : p.config.name;

                            return (
                                <Typography key={p.config.id} sx={{ color: `hsl(${p.config.hue}, 100%, 70%)` }} fontWeight="bold">
                                    {displayName}: {scores[p.config.id] || 0}
                                </Typography>
                            );
                        })}
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
                    {/* Dynamic Split Screen Container */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        {players.length === 0 && (
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LyricsDisplay song={parsedSong!} audioRef={audioRef} centered />
                            </Box>
                        )}

                        {/* Grid Rendering */}
                        {(() => {
                            let playerIndex = 0;
                            return gridLayout.rows.map((colsInRow, rowIndex) => (
                                <Box key={rowIndex} sx={{ flex: 1, display: 'flex', minHeight: 0, borderBottom: rowIndex < gridLayout.rows.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
                                    {Array.from({ length: colsInRow }).map((_, colIndex) => {
                                        const player = players[playerIndex++];
                                        if (!player) return null;

                                        return (
                                            <Box
                                                key={player.config.id}
                                                sx={{
                                                    width: `${gridLayout.columnWidthPercent}%`,
                                                    flex: 1,
                                                    minHeight: 0,
                                                    position: 'relative',
                                                    borderRight: colIndex < colsInRow - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                                                }}
                                            >
                                                <PitchVisualizer
                                                    song={parsedSong!}
                                                    audioRef={audioRef}
                                                    currentPitchRef={player.pitchRef}
                                                    sungSegmentsRef={player.segmentsRef}
                                                    showDebugOverlay={showDebugOverlay}
                                                    label={player.config.name}
                                                    hue={player.config.hue}
                                                    showNoteLabels={showNoteLabels}
                                                    latency={player.config.latency}
                                                    trackIndex={player.trackIndex}
                                                />
                                                {/* Track Selector Overlay */}
                                                {parsedSong?.tracks && parsedSong.tracks.length > 1 && (
                                                    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 10, pointerEvents: 'auto' }}>
                                                        <Box sx={{ bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 1, p: 0.5, display: 'flex', gap: 0.5 }}>
                                                            {parsedSong.tracks.map((t: any, tIdx: number) => (
                                                                <Button
                                                                    key={tIdx}
                                                                    variant={player.trackIndex === tIdx ? "contained" : "text"}
                                                                    size="small"
                                                                    sx={{
                                                                        minWidth: 30,
                                                                        p: '2px 8px',
                                                                        fontSize: '0.75rem',
                                                                        bgcolor: player.trackIndex === tIdx ? `hsl(${player.config.hue}, 80%, 40%)` : 'transparent',
                                                                        color: 'white',
                                                                        '&:hover': { bgcolor: player.trackIndex === tIdx ? `hsl(${player.config.hue}, 80%, 50%)` : 'rgba(255,255,255,0.1)' }
                                                                    }}
                                                                    onClick={() => switchTrack(players.indexOf(player), tIdx)}
                                                                >
                                                                    {t.name || `P${tIdx + 1}`}
                                                                </Button>
                                                            ))}
                                                        </Box>
                                                    </Box>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ));
                        })()}
                    </Box>

                    {/* Lyrics (Fixed height at bottom, outside the flex grid) - only show if there are players */}
                    {players.length > 0 && (
                        <Box sx={{
                            flexShrink: 0,
                            width: '100%',
                            pointerEvents: 'none',
                            zIndex: 10,
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            bgcolor: 'rgba(0,0,0,0.2)'
                        }}>
                            <LyricsDisplay song={parsedSong!} audioRef={audioRef} />
                        </Box>
                    )}
                </Box>

                {/* Controls */}
                {showDevSlider && (
                    <Box sx={{ width: 400, alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(0,0,0,0.5)', p: 2, borderRadius: 2, pointerEvents: 'auto', mt: 2 }}>
                        <Typography width={140}>P1 Dev Pitch: {Math.round(devPitchOverride || 0)}</Typography>
                        <Slider value={devPitchOverride || 60} min={36} max={84} onChange={(_, v) => setDevPitchOverride(v as number)} />
                        <Button onClick={() => setDevPitchOverride(null)} variant="outlined" size="small">Reset</Button>
                    </Box>
                )}

                {showMicStatus && (
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', gap: 2, alignItems: 'center', pointerEvents: 'auto' }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            {players.map(p => (
                                <Typography key={p.config.id} variant="caption" sx={{ color: `hsl(${p.config.hue}, 100%, 70%)` }}>
                                    {p.config.name} Mic: {p.mic?.isActive ? 'On' : (p.webRtcManager ? 'Remote' : 'Off')}
                                </Typography>
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>

            {audioSrc && <audio ref={audioRef} src={audioSrc} onEnded={handleSongEnd} style={{ display: 'none' }} />}
            {!audioSrc && <Typography color="error" sx={{ textAlign: 'center', position: 'relative', zIndex: 5 }}>No Audio Source Found</Typography>}

            {/* Progress Line - Fixed at bottom */}
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, bgcolor: 'rgba(255,255,255,0.2)', zIndex: 100, pointerEvents: 'none' }}>
                <Box
                    ref={progressLineRef}
                    sx={{
                        width: '0%',
                        height: '100%',
                        background: 'linear-gradient(90deg, #ff4081 0%, #7c4dff 100%)', // Melodiq gradient
                        boxShadow: '0 0 10px currentColor',
                        transition: 'width 0.1s linear'
                    }}
                />
            </Box>
        </Box >
    );
};
