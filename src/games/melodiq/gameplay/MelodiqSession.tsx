import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Box, Button, Typography, IconButton, Slider, Snackbar, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import db, { type Song, getCachedFiles } from '../db';
import { parseUltraStarTxt } from '../parser';
import { PitchVisualizer, type SongWithNotes, type SungSegment } from './PitchVisualizer';
import { LyricsDisplay } from './LyricsDisplay';
import { MicrophoneManager, type PitchResult } from '../audio/MicrophoneManager';
import { WebRTCMicManager } from '../audio/WebRTCMicManager';
import { type UserProfile, type ActivePlayer } from '../MelodiqSettings';
import { ScoreBoard } from './ScoreBoard';
import { ScoreDisplay, type ScoreDisplayHandle, type RatingType } from './ScoreDisplay';
import { useMelodiqSettings } from '../hooks/SettingsContext';
import { useWebRTC } from '../audio/WebRTCContext';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

export interface MelodiqSessionHandle {
    togglePlay: () => void;
    isPlaying: boolean;
    getDuration: () => number;
    getCurrentTime: () => number;
    finishSong: () => void;
    isFinished: boolean;
    pauseForScore: () => void;
    resumeFromScore: () => void;
    isPausedForScore: boolean;
    handleNext: () => boolean;
    // New: For Host to broadcast state
    getGameState: () => PassiveGameState;
}

export interface PassivePlayerState {
    id: string;
    name: string;
    hue: number;
    score: number;
    trackScores: Record<number, number>;
    currentPitch: PitchResult | null;
    activeSegments: Record<number, SungSegment | null>;
    combo: number;
    lastHit: { rating: RatingType, score: number, timestamp: number } | null;
}

export interface PassiveGameState {
    players: PassivePlayerState[];
    isPlaying: boolean;
    isFinished: boolean;
    isPausedForScore: boolean;
    currentTime: number;
}

interface MelodiqSessionProps {
    song: Song;
    onExit: (forceHome?: boolean) => void;
    onMinimize?: () => void;
    onPlaybackUpdate?: (state: { isPlaying: boolean; currentTime: number; duration: number; progress: number }) => void;
    // Props are now optional/ignored as we read from LS, but kept for compatibility if needed for overrides
    showDebugOverlay?: boolean;
    showDevSlider?: boolean;
    showMicStatus?: boolean;
    isTVMode?: boolean;
    muteAudio?: boolean;
    // Passive Mode (TV rendering Host brain)
    isPassive?: boolean;
    passiveState?: PassiveGameState | null;
    suppressResults?: boolean;
    uiScale?: number;
}



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

    // Combo Tracking
    public combo: number = 0;
    public maxCombo: number = 0;
    public lastHit: { rating: RatingType, score: number, timestamp: number } | null = null;

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

    async stop(): Promise<void> {
        if (this.mic) {
            await this.mic.stop();
        }
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

const MelodiqSessionContent = forwardRef(({ song, onExit, onMinimize, onPlaybackUpdate, isTVMode = false, muteAudio = false, isPassive = false, passiveState, suppressResults = false, uiScale = 1.0 }: MelodiqSessionProps, ref: React.ForwardedRef<MelodiqSessionHandle>): React.ReactNode => {
    // Session State - Read from shared SettingsContext (reactive / live updates)
    const { settings } = useMelodiqSettings();
    const {
        showDebugOverlay,
        showDevSlider,
        showMicStatus,
        showNoteLabels,
        showVideoErrors,
        layoutOverride,
        songVolume,
        masterVolume,
        goldenNoteMultiplier
    } = settings;

    // Dynamic Player State
    const [players, setPlayers] = useState<PlayerRuntime[]>([]);
    const [ready, setReady] = useState(false);

    // We use a ref to hold the runtime objects to avoid re-renders on every pitch update
    // But we also need state to trigger initial render.
    // The `players` state above holds the initial list. The Refs inside PlayerRuntime are mutable.
    const [, setScores] = useState<Record<string, number>>({});
    const [results, setResults] = useState<any[]>([]);

    // Sync Passive State (TV Side)
    useEffect(() => {
        if (isPassive && passiveState) {
            // Update local players to match remote state
            // We need to map passiveState.players to PlayerRuntime objects or update existing ones
            // Since PlayerRuntime has complex logic, we might just update the properties we need for rendering (pitchRef, segmentsRef, score)

            if (players.length !== passiveState.players.length) {
                // Re-init players if count changes (or on first load)
                const newPlayers = passiveState.players.map(p => new PlayerRuntime({
                    id: p.id,
                    name: p.name,
                    hue: p.hue,
                    isRemote: true // All are remote effectively on TV
                }));
                setPlayers(newPlayers);
                playersRef.current = newPlayers;
            }

            // Sync Data
            passiveState.players.forEach((pState, idx) => {
                const rt = playersRef.current[idx];
                if (rt) {
                    rt.pitchRef.current = pState.currentPitch;
                    rt.activeSegments = pState.activeSegments;
                    rt.trackScores = pState.trackScores;
                    rt.score = pState.score;
                    rt.combo = pState.combo;

                    // Sync Hit Events (Popups)
                    if (pState.lastHit && (!rt.lastHit || pState.lastHit.timestamp > rt.lastHit.timestamp)) {
                        rt.lastHit = pState.lastHit;
                        scoreDisplayRef.current?.triggerHit(
                            pState.id,
                            pState.lastHit.rating,
                            pState.combo,
                            pState.lastHit.score
                        );
                    }

                    // Update visualization segments
                    // This is tricky: Host sends activeSegments. 
                    // To keep history, we need to append? 
                    // Actually, for visualization, `segmentsRef.current` stores the history.
                    // If Host sends "activeSegments", that's just the current note being sung.
                    // The Host *also* needs to send the *committed* segments or we replicate logic.
                    // Simpler approach: 
                    // TV is dumb. It just renders what Host says is happening NOW.
                    // But `PitchVisualizer` needs history (committed notes) to draw the trail.
                    // If we don't sync history, trails will disappear or not form.
                    // FIX: Host calculates segments. TV just adds them to its local history when they "finish" (become null in activeSegments)?
                    // OR: We just run the visualizer "append" logic on TV too?
                    // Better: Let's trust the current PitchVisualizer to handle "live" pitch updates if we assume `activeSegments` is enough?
                    // No, `PitchVisualizer` reads `segmentsRef` for history.

                    // QUICK FIX: 
                    // We just update `pitchRef.current`. 
                    // And we run the `processPlayer` loop on TV too, BUT without scoring?
                    // No, "Brain on Host". Host decides if a note was hit.
                    // If we run logic on TV, we duplicate it.
                    // IF we want "Dumb TV", Host must send EVERYTHING to render.
                    // That includes all historical segments. Too much bandwidth.

                    // Hybrid:
                    // Host sends "Current Pitch".
                    // TV uses that Pitch to run visualizer logic (hit testing) purely for visuals?
                    // Use `processPlayer` but with weight=0 (no scoring)?
                    // But scoring logic determines if a segment is "hit" (colored fill).

                    // Let's rely on Host sending `trackScores` for the ScoreBoard.
                    // For the Visualizer, let's inject the `pitch` from Host and run the local `processPlayer` logic 
                    // so it generates the segments locally. Since audio/video is on TV, the timing should be "close enough" 
                    // to the Host's timing if they started together.
                    // Actually, if Host sends Pitch, and TV plays Audio, TV is the one who knows "Time vs Pitch".
                    // Wait, Host processes Audio (Muted). Host knows "Time vs Pitch" (from Mic).
                    // Host sends: "At HostTime T, Pitch is P".
                    // TV receives P. TV is at TvTime T'.
                    // If TV applies P at T', and T' ~= T, then visual is correct.
                    // So: pass received pitch to pitchRef.
                    // AND let the loop runs `processPlayer` to update segments/visuals. 
                }
            });

            // Sync Play State
            if (passiveState.isPlaying !== isPlaying) {
                if (passiveState.isPlaying) {
                    audioRef.current?.play().catch(e => console.log('[Session] Passive play interrupted:', e.name));
                    videoRef.current?.play().catch(() => { });
                    setIsPlaying(true);
                } else {
                    audioRef.current?.pause();
                    videoRef.current?.pause();
                    setIsPlaying(false);
                }
            }

            // Sync Game State (Results/Pause)
            if (passiveState.isFinished !== isFinished) setIsFinished(passiveState.isFinished);
            if (passiveState.isPausedForScore !== isPausedForScore) setIsPausedForScore(passiveState.isPausedForScore);

            // Sync Time (Drift Correction)
            if (audioRef.current && passiveState.isPlaying && Math.abs(audioRef.current.currentTime - passiveState.currentTime) > 1.0) {
                console.log(`[Session] Syncing time drift: Local=${audioRef.current.currentTime.toFixed(2)} Remote=${passiveState.currentTime.toFixed(2)}`);
                // Smooth sync: if only slightly off, maybe playbackRate adjustment? 
                // For now, hard seek if > 1s off
                audioRef.current.currentTime = passiveState.currentTime;
                if (videoRef.current) videoRef.current.currentTime = passiveState.currentTime;
            }

        }
    }, [isPassive, passiveState]);

    // Audio/Video logic
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpmMultiplier] = useState(4);
    const [isFinished, setIsFinished] = useState(false);
    const [isPausedForScore, setIsPausedForScore] = useState(false);

    // UI State
    const [_duration, setDuration] = useState(0);
    const [devPitchOverride, setDevPitchOverride] = useState<number | null>(null);
    const [audioSrc, setAudioSrc] = useState<string | undefined>(undefined);
    const [videoSrc, setVideoSrc] = useState<string | undefined>(undefined);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [needsFolderAccess, setNeedsFolderAccess] = useState(false);
    const playPromiseRef = useRef<Promise<void> | null>(null);

    // Live Volume Sync: update audio volume when settings change during playback
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = muteAudio ? 0 : songVolume * masterVolume;
        }
    }, [songVolume, masterVolume, muteAudio]);

    // Auto-Hide UI State
    const [isUIVisible, setIsUIVisible] = useState(true);
    const uiTimeoutRef = useRef<any>(null);
    const requestRef = useRef<number>(0);

    const resetUITimer = useCallback(() => {
        setIsUIVisible(true);
        if (uiTimeoutRef.current) {
            clearTimeout(uiTimeoutRef.current);
        }
        uiTimeoutRef.current = setTimeout(() => {
            if (isPlaying && !isFinished) {
                setIsUIVisible(false);
            }
        }, 3000); // Hide after 3 seconds
    }, [isPlaying, isFinished]);

    useEffect(() => {
        const handleActivity = () => resetUITimer();

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('click', handleActivity);

        resetUITimer(); // Start timer initially

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('click', handleActivity);
            if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
        };
    }, [resetUITimer]);
    const lastScoreUpdateRef = useRef<number>(0);
    const playersRef = useRef<PlayerRuntime[]>([]);
    const progressLineRef = useRef<HTMLDivElement>(null);
    const scoreDisplayRef = useRef<ScoreDisplayHandle>(null);

    // Load Content State
    const [parsedSong, setParsedSong] = useState<SongWithNotes | null>(null);
    const [contentLoading, setContentLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Scoring Normalization - Per Track
    const [trackScoreWeights, setTrackScoreWeights] = useState<number[]>([]);

    // Reset state when song changes
    useEffect(() => {
        setIsFinished(false);
        setIsPausedForScore(false);
        setResults([]);
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
                    setLoadError(`Song content not found for "${song.title}". Please try re-scanning your library.`);
                }
            } catch (e) {
                console.error('Failed to load song content', e);
                setLoadError("Failed to load song content: " + (e as Error).message);
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
                if (p.profileId === 'BOT') {
                    newPlayers.push(new PlayerRuntime({
                        id: 'BOT',
                        name: 'Bot',
                        hue: 330, // Pink
                        deviceId: 'BOT',
                        volume: 0.8,
                        muted: false,
                        latency: 0,
                        isRemote: false
                    }));
                } else {
                    const profile = allProfiles.find(prof => prof.id === p.profileId);
                    if (profile) {
                        newPlayers.push(new PlayerRuntime({
                            ...profile,
                            deviceId: p.deviceId,
                            volume: p.volume,
                            muted: p.muted,
                            latency: p.latency,
                            isRemote: p.isRemote
                        }));
                    }
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

        return () => {
            console.log('[MelodiqSession] Cleaning up players on unmount...');
            // Create a copy to cleanup, as ref might change
            const playersToStop = [...playersRef.current];
            playersToStop.forEach(p => {
                p.stop().catch(e => console.warn("Error stopping player:", e));
            });
        };
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

            if (data.type === 'history_report') {
                console.log(`[Session] Received history from ${peerId}`, data);
                setResults(prev => prev.map(r => {
                    if (r.config.deviceId === peerId && r.isRemote) {
                        return {
                            ...r,
                            history: data.history,
                            isNewRecord: data.isNewRecord,
                            loadingHistory: false
                        };
                    }
                    return r;
                }));
            }

            // Phone Remote Control Commands
            if (data.type === 'remote.command') {
                console.log(`[Session] Remote command from ${peerId}:`, data.command);
                switch (data.command) {
                    case 'play':
                        togglePlay();
                        break;
                    case 'restart':
                        if (audioRef.current) {
                            audioRef.current.currentTime = 0;
                            if (videoRef.current) videoRef.current.currentTime = 0;
                        }
                        break;
                    case 'next':
                        // Skip to end to trigger song-end handler
                        if (audioRef.current && audioRef.current.duration) {
                            audioRef.current.currentTime = audioRef.current.duration - 0.1;
                        }
                        break;
                    case 'exit':
                        onExit();
                        break;
                }
            }
        };

        setPlayers(prevPlayers => {
            let updatedPlayers = [...prevPlayers];
            let changed = false;

            // 1. Attach/Add/Update connected peers
            activePeers.forEach(peer => {
                const existingIdx = updatedPlayers.findIndex(p => p.config.deviceId === peer.id);

                if (existingIdx !== -1) {
                    // Attach to existing player AND Update Details
                    const player = updatedPlayers[existingIdx];

                    // Check for identity updates (Name/Hue)
                    if (player.config.name !== peer.name || player.config.hue !== peer.hue) {
                        console.log(`[Session] Updating details for ${player.config.name} -> ${peer.name}`);
                        player.config.name = peer.name;
                        if (peer.hue !== undefined) player.config.hue = peer.hue;
                        changed = true;
                    }

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

    const pauseForScore = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            if (videoRef.current) videoRef.current.pause();
        }
        setIsPlaying(false);
        if (!isFinished) setIsPausedForScore(true);
    }, [isFinished]);

    const safePlay = useCallback(async () => {
        if (!audioRef.current) return;
        try {
            playPromiseRef.current = audioRef.current.play();
            await playPromiseRef.current;
            if (videoRef.current) {
                // Video play might fail if not fully loaded, ignore for now
                videoRef.current.play().catch(e => console.warn("Video play failed", e));
            }
            setIsPlaying(true);
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('[Session] Playback aborted (likely fast skip)');
            } else {
                console.error('[Session] Playback failed', error);
            }
            setIsPlaying(false);
        } finally {
            playPromiseRef.current = null;
        }
    }, []);

    const resumeFromScore = useCallback(() => {
        setIsPausedForScore(false);
        if (audioRef.current && !isFinished) {
            safePlay();
        }
    }, [isFinished, safePlay]);

    const togglePlay = useCallback(() => {
        // If we are showing results (paused for score), togglePlay means RESUME
        if (isPausedForScore) {
            resumeFromScore();
            return;
        }

        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                if (videoRef.current) videoRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.volume = muteAudio ? 0 : songVolume * masterVolume;
                safePlay();
            }
        }
    }, [isPlaying, songVolume, masterVolume, muteAudio, isPausedForScore, resumeFromScore, safePlay]);

    const handleNext = useCallback((): boolean => {
        // Returns true if the session handled the "Next" action (by showing scores)
        // Returns false if the session ignored it (because it's already showing scores or finished)

        if (!isFinished && !isPausedForScore) {
            pauseForScore();
            return true;
        }
        return false;
    }, [isFinished, isPausedForScore, pauseForScore]);

    // useImperativeHandle moved to end to access handleSongEnd

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // TV Remote / Keyboard Shortcuts
            switch (e.key) {
                case ' ':
                case 'Enter': // TV Remote "OK"
                case 'MediaPlayPause':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowRight':
                case 'MediaFastForward':
                    if (audioRef.current) {
                        e.preventDefault();
                        audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
                        resetUITimer();
                    }
                    break;
                case 'ArrowLeft': // TV Remote "Left" (Seek Back) or MediaRewind
                case 'MediaRewind':
                    if (audioRef.current) {
                        e.preventDefault();
                        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                        resetUITimer();
                    }
                    break;
                case 'ArrowUp': // TV Remote "Up" (Volume Up?) - Optional, might conflict with navigation if we add UI later
                    // For now, let's allow it as volume control if no UI is focused
                    e.preventDefault();
                    // Increase volume? implementation left out for now to avoid complexity, usually TV handles system volume.
                    // But we can implement internal gain if needed.
                    break;
                case 'Escape':
                case 'Backspace': // TV Remote "Back"
                    e.preventDefault();
                    onExit();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, onExit, resetUITimer]);

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
        } else if (player.config.deviceId === 'BOT') {
            // Auto-Sing Logic
            if (audioRef.current && isPlaying && parsedSong) {
                const beatDuration = 60000 / ((parsedSong.bpm || 120) * bpmMultiplier);
                const latency = player.config.latency || 0;
                const currentBeat = ((audioRef.current.currentTime * 1000) - latency - (parsedSong.gap || 0)) / beatDuration;

                const tIdx = player.trackIndex;
                const notesSource = (parsedSong.tracks && parsedSong.tracks.length > 0 && parsedSong.tracks[tIdx])
                    ? ((parsedSong.tracks[tIdx].notes ?? []) as any[])
                    : (tIdx === 0 ? (parsedSong.notes || []) : []);

                if (notesSource) {
                    const activeNote = notesSource.find((n) =>
                        n.type !== '-' &&
                        currentBeat >= n.start &&
                        currentBeat <= n.start + n.duration
                    );

                    if (activeNote) {
                        pitch = {
                            frequency: 440 * Math.pow(2, (activeNote.pitch - 69) / 12),
                            note: activeNote.pitch,
                            volume: 0.8 // Simulated volume
                        };
                    }
                }
            }
        } else {
            pitch = player.getPitch();
        }
        player.pitchRef.current = pitch;

        if (pitch && pitch.note > 0 && isPlaying && parsedSong && parsedSong.notes && audioRef.current) {
            const beatDuration = 60000 / ((parsedSong.bpm || 120) * bpmMultiplier);
            const latency = player.config.latency || 0;
            const currentBeat = ((audioRef.current.currentTime * 1000) - latency - (parsedSong.gap || 0)) / beatDuration;

            // FIX: Only process the player's SELECTED TRACK. 
            // Previous logic iterated all tracks, causing "0 score" updates from unselected tracks to overwrite the actual score in the UI.
            const tIdx = player.trackIndex;

            // Ensure we fallback to main notes if tracks aren't defined or index is 0
            const notesSource: any[] = (parsedSong.tracks && parsedSong.tracks.length > 0 && parsedSong.tracks[tIdx])
                ? parsedSong.tracks[tIdx].notes
                : (tIdx === 0 ? parsedSong.notes : []); // If tIdx > 0 but no tracks, return empty to avoid error

            if (!notesSource || notesSource.length === 0) return;

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

                    // Visual Feedback Trigger
                    const activeSegment = player.activeSegments[tIdx];
                    const wasHitting = activeSegment ? activeSegment.noteIndex === activeNoteIndex : false;

                    if (!wasHitting) {
                        // First frame of hitting this note
                        player.combo += 1;
                        if (player.combo > player.maxCombo) player.maxCombo = player.combo;

                        // Determine Rating
                        let rating: RatingType = 'Good';
                        if (semitoneDiff < 0.2) rating = 'Perfect';
                        else if (semitoneDiff < 0.5) rating = 'Good';
                        else rating = 'Okay';

                        // Trigger Visuals - Use TOTAL score logic if we were summing, but for now strict track score is fine
                        const hitScore = Math.round(player.trackScores[tIdx] || 0);

                        // Store last hit for sync
                        player.lastHit = {
                            rating,
                            score: hitScore,
                            timestamp: Date.now()
                        };

                        scoreDisplayRef.current?.triggerHit(
                            player.config.id,
                            rating,
                            player.combo,
                            hitScore
                        );
                    } else {
                        // Sustained hit - Optimize updates
                        if (Math.random() < 0.1) { // Approx every 10 frames
                            scoreDisplayRef.current?.triggerHit(
                                player.config.id,
                                'Good',
                                player.combo,
                                Math.round(player.trackScores[tIdx])
                            )
                        }
                    }

                    // Update visualization segments for this track
                    const record = player.segmentsRef.current;
                    if (!record) return;

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
                    // Pitch mismatch, end active segment
                    if (player.activeSegments[tIdx] !== null) {
                        player.combo = 0;
                        const hitScore = Math.round(player.trackScores[tIdx] || 0);
                        player.lastHit = {
                            rating: 'Miss',
                            score: hitScore,
                            timestamp: Date.now()
                        };

                        scoreDisplayRef.current?.triggerHit(
                            player.config.id,
                            'Miss',
                            0, // combo reset
                            hitScore
                        );
                    }
                    player.activeSegments[tIdx] = null;
                }
            } else {
                // No active note
                if (player.activeSegments[tIdx] !== null) {
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

        const duration = (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0)
            ? audioRef.current.duration
            : (_duration > 0 ? _duration : 0);

        const currentTime = audioRef.current ? audioRef.current.currentTime : 0;

        if (onPlaybackUpdate) {
            onPlaybackUpdate({
                isPlaying,
                currentTime,
                duration,
                progress: duration > 0 ? (currentTime / duration) * 100 : 0
            });
        }

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
                // --- PASSIVE MODE BYPASS ---
                // If passive (TV), we skip all audio processing/scoring logic. 
                // We assume `players` state is updated via the useEffect syncing with `passiveState`.
                // However, we still need to run the loop to keep the animation frame going for visuals? 
                // Actually, if we update `pitchRef.current` in the effect, the visualizer components (if they use rAF) might need this loop?
                // `PitchVisualizer` is a component. It might have its own loop or rely on props?
                // Let's check `PitchVisualizer`. It usually takes `pitch` as a prop or ref.
                // If it takes a ref, we need to make sure the ref is updated. We did that in the Effect.
                // So we can just RETURN here if passive.
                if (isPassive) {
                    requestRef.current = requestAnimationFrame(updateLoop);
                    return;
                }

                // 1. Get current time from audio
                const now = audioRef.current?.currentTime || 0;
                const progress = Math.min(100, Math.max(0, (now / duration) * 100));
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
    }, [isPlaying, devPitchOverride, parsedSong, bpmMultiplier, players, trackScoreWeights, goldenNoteMultiplier, _duration, onPlaybackUpdate]);

    // Start/Stop Mics and Loop
    useEffect(() => {
        if (!ready) return;

        // Start mics if there are players
        if (!isPassive && players.length > 0) {
            players.forEach(p => {
                p.start().catch(e => console.error(`Failed to start mic for ${p.config.name}`, e));
            });
        } else {
            console.log("[MelodiqSession] No players active (or passive mode), starting loop for playback/visuals only.");
        }

        requestRef.current = requestAnimationFrame(updateLoop);

        return () => {
            cancelAnimationFrame(requestRef.current);
            players.forEach(p => p.stop());
        };
    }, [ready, players, updateLoop]);

    // Handle song end - use ref to avoid stale closure issues
    // Handle song end - use ref to avoid stale closure issues
    const handleSongEnd = useCallback(async () => {
        console.log('Song ended, showing scoreboard');

        // Broadcast Stats to Connected Phones using ref to get latest players
        const now = new Date();
        const currentResults: any[] = [];
        const isoDate = now.toISOString();

        for (const p of playersRef.current) {
            // Calculate Total Score 
            const totalScore = Math.round(Object.values(p.trackScores).reduce((a, b) => a + b, 0));
            p.score = totalScore;

            if (p.config.isRemote) {
                // Remote Player: Send Stats, Wait for History
                if (p.webRtcManager && p.remotePeerId) {
                    const statsPayload = {
                        type: 'stats',
                        songTitle: song.title,
                        score: totalScore,
                        date: isoDate
                    };
                    console.log(`[Session] Sending stats to ${p.config.name}`, statsPayload);
                    p.webRtcManager.sendToPeer(p.remotePeerId, statsPayload);
                }

                // Add preliminary result
                currentResults.push({
                    config: p.config,
                    score: totalScore,
                    history: [],
                    isNewRecord: false,
                    isRemote: true,
                    loadingHistory: true
                });
            } else {
                // Local Player: Save & Load History
                try {
                    await db.scores.add({
                        songId: song.id,
                        profileId: p.config.id,
                        score: totalScore,
                        date: isoDate
                    });

                    // Get History for this song & profile
                    const allScores = await db.scores
                        .where({ songId: song.id, profileId: p.config.id })
                        .toArray();

                    // Sort descending by score
                    const sorted = allScores.sort((a, b) => b.score - a.score);

                    // Determine if new record: 
                    // Best score should be the one we just added (if it's the best)
                    // We can check if sorted[0].date === isoDate
                    const isRecord = sorted.length > 0 && sorted[0].date === isoDate;

                    currentResults.push({
                        config: p.config,
                        score: totalScore,
                        history: sorted,
                        isNewRecord: isRecord,
                        isRemote: false,
                        loadingHistory: false
                    });

                } catch (e) {
                    console.error("Failed to save score", e);
                    currentResults.push({
                        config: p.config,
                        score: totalScore,
                        history: [],
                        isNewRecord: false,
                        isRemote: false
                    });
                }
            }
        }

        setResults(currentResults);
        setIsFinished(true);
        setIsPlaying(false);
        if (videoRef.current) videoRef.current.pause();
    }, [song.title, song.id]);

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

                        if (song.audio.startsWith('/') && !window.location.origin.includes('3000')) {
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
                            console.log(`[MelodiqSession] Using cached audio file for ${song.title}:`, cached.audio.name, `(${cached.audio.size} bytes)`);

                            // Also load cached video if available
                            if (cached.video && mounted) {
                                // check if we already have a video src, if not, set it
                                // But video is handled in its own effect usually. 
                                // However, for simple local playback, setting it here might be a sync optimization?
                                // Actually, let's leave video to its own effect to avoid race/double-set.
                            }
                        } else {
                            // Cache miss (page was refreshed) - need to prompt user
                            console.warn(`[MelodiqSession] Cache miss for audio: ${song.audio}. ID: ${song.id}`);
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
                if ((e as Error).name === 'NotAllowedError') {
                    console.debug("Audio permission not granted yet");
                    if (mounted) setNeedsFolderAccess(true);
                } else {
                    console.error("Failed to load audio", e);
                }
            }
            if (mounted) setAudioSrc(activeUrl);
        };
        loadAudio();

        return () => {
            mounted = false;
            // Revoke if it was created from a blob or handle (which creates a blob url)
            // IMPORTANT: If we created a blob URL from cache (string source), we MUST revoke it.
            // The check `typeof song.audio !== 'string'` was preventing cleanup of cached files!
            if (activeUrl && activeUrl.startsWith('blob:')) {
                URL.revokeObjectURL(activeUrl);
                console.log(`[MelodiqSession] Revoked audio URL: ${activeUrl}`);
            }
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
                            console.log(`[MelodiqSession] Using cached video file for ${song.title}:`, fileName, `(${cached.video.size} bytes)`);
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
                    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

                    // Check for AVI by extension or type
                    // Note: fileOrBlob.type might be empty or wrong, so extension is important
                    if (name.endsWith('.avi') || type.includes('avi') || type === 'video/x-msvideo') {
                        if (isFirefox) {
                            console.warn('[Melodiq] Firefox detected: Skipping AVI-as-MP4 hack to prevent browser crash. Video may not play.');
                            // We do NOT modify blobToUrl, leaving it as is. 
                            // Firefox might still try to play it and fail safely, or just show black screen.
                            // Better than crashing the tab!
                        } else {
                            console.log('[Melodiq] Attempting to force-load AVI file by masking as MP4:', name, 'Type:', type);
                            blobToUrl = new Blob([fileOrBlob], { type: 'video/mp4' });
                        }
                    }

                    activeUrl = URL.createObjectURL(blobToUrl);
                }

            } catch (e) {
                if ((e as Error).name !== 'NotAllowedError') {
                    console.error("Failed to load video", e);
                }
            }
            if (mounted) setVideoSrc(activeUrl);
        };
        loadVideo();

        return () => {
            mounted = false;
            // Revoke if it was created from a blob or handle (which creates a blob url)
            if (activeUrl && activeUrl.startsWith('blob:')) {
                URL.revokeObjectURL(activeUrl);
                console.log(`[MelodiqSession] Revoked video URL: ${activeUrl}`);
            }
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
                    await safePlay();
                } catch (e) {
                    console.error("Auto-start failed (likely browser policy):", e);
                    // Reset so user can try manually
                    hasStartedRef.current = false;
                }
            };
            startPlay();
        }
    }, [ready, contentLoading, parsedSong, audioSrc, songVolume, masterVolume, song.id, isFinished]);

    // Immediately notify parent when isPlaying changes (don't wait for rAF loop)
    useEffect(() => {
        if (onPlaybackUpdate) {
            const duration = audioRef.current?.duration || 0;
            const currentTime = audioRef.current?.currentTime || 0;
            onPlaybackUpdate({
                isPlaying,
                currentTime,
                duration,
                progress: duration > 0 ? (currentTime / duration) * 100 : 0
            });
        }
    }, [isPlaying]);

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

    useImperativeHandle(ref, () => ({
        togglePlay,
        isPlaying,
        getDuration: () => audioRef.current?.duration || 0,
        getCurrentTime: () => audioRef.current?.currentTime || 0,
        finishSong: () => handleSongEnd(),
        isFinished,
        pauseForScore,
        resumeFromScore,
        isPausedForScore,
        handleNext,
        getGameState: () => ({
            isPlaying,
            isFinished,
            isPausedForScore,
            players: playersRef.current.map(p => ({
                id: p.config.id,
                name: p.config.name,
                hue: p.config.hue,
                score: p.score,
                trackScores: p.trackScores,
                currentPitch: p.pitchRef.current,
                activeSegments: p.activeSegments,
                combo: p.combo,
                lastHit: p.lastHit
            })),
            currentTime: audioRef.current?.currentTime || 0
        })
    }), [togglePlay, isPlaying, handleSongEnd, isFinished, pauseForScore, resumeFromScore, isPausedForScore, handleNext]);

    if (loadError) {
        return (
            <Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
                <Typography variant="h6" color="error" align="center">{loadError}</Typography>
                <Button variant="contained" onClick={() => onExit(true)}>Go Back</Button>
            </Box>
        );
    }

    if (!isPausedForScore && (!ready || contentLoading || !parsedSong)) return <Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography>Loading...</Typography></Box>; // Loading black screen

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


    if (isFinished && !suppressResults) {
        // Prepare props for ScoreBoard from valid players state
        return <ScoreBoard players={results.length > 0 ? results : players.map(p => ({ config: p.config, score: p.score, history: [], isNewRecord: false }))} onExit={onExit} />;
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
                        objectFit: 'cover', zIndex: 0, opacity: 1.0
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

            {/* Removed global dimming overlay */}

            <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, pointerEvents: 'none' }}>
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    zIndex: 20, // Higher than content
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)', // Optional: Nice touch for overlay
                    pointerEvents: isUIVisible ? 'auto' : 'none',
                    opacity: isUIVisible ? 1 : 0,
                    transition: 'opacity 0.5s ease-in-out'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {!isTVMode && <IconButton onClick={() => onExit(true)} color="inherit"><ArrowBackIcon /></IconButton>}
                        {onMinimize && !isTVMode && (
                            <IconButton onClick={onMinimize} color="inherit" sx={{ ml: 1 }}>
                                <KeyboardArrowDownIcon />
                            </IconButton>
                        )}
                    </Box>
                    <Typography variant="h6" sx={{ fontSize: `${1.25 * uiScale}rem` }}>{song.artist} - {song.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 4 }}>
                        {/* Mic Status - kept if needed, but scores moved to bottom */}
                        {showMicStatus && players.map(p => (
                            <Box key={p.config.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>
                                    {p.config.name}: {p.mic?.isActive ? 'On' : (p.webRtcManager ? 'Remote' : 'Off')}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0, pt: 10 }}>
                    {/* Dynamic Split Screen Container */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        {players.length === 0 && (
                            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LyricsDisplay song={parsedSong!} audioRef={audioRef} centered uiScale={uiScale} />
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
                                                    scale={uiScale}
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
                            bgcolor: 'rgba(0,0,0,0.2)',
                            position: 'relative' // Added for absolute positioning of scores
                        }}>
                            <LyricsDisplay song={parsedSong!} audioRef={audioRef} uiScale={uiScale} />

                            {/* ScoreDisplay moved to root */}
                        </Box>
                    )}
                </Box>

                {/* Scores Overlay - Global Top Right */}
                <Box sx={{
                    position: 'absolute',
                    top: 16, // Aligned with header
                    right: 24,
                    zIndex: 1500, // Very high z-index
                    pointerEvents: 'none'
                }}>
                    <ScoreDisplay
                        ref={scoreDisplayRef}
                        players={players.map(p => ({
                            id: p.config.id,
                            name: p.config.name,
                            hue: p.config.hue
                        }))}
                        scale={uiScale}
                    />
                </Box>

                {/* Controls */}
                {showDevSlider && (
                    <Box sx={{ width: 400, alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(0,0,0,0.5)', p: 2, borderRadius: 2, pointerEvents: 'auto', mt: 2 }}>
                        <Typography width={140}>P1 Dev Pitch: {Math.round(devPitchOverride || 0)}</Typography>
                        <Slider value={devPitchOverride || 60} min={36} max={84} onChange={(_, v) => setDevPitchOverride(v as number)} />
                        <Button onClick={() => setDevPitchOverride(null)} variant="outlined" size="small">Reset</Button>
                    </Box>
                )}

                {/* Mic Status moved to Header */}
            </Box>

            {audioSrc && <audio ref={audioRef} src={audioSrc} onEnded={handleSongEnd} style={{ display: 'none' }} />}
            {!audioSrc && <Typography color="error" sx={{ textAlign: 'center', position: 'relative', zIndex: 5 }}>No Audio Source Found</Typography>}

            {/* Progress Line - Fixed at bottom */}
            <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 6,
                bgcolor: 'rgba(255,255,255,0.2)',
                zIndex: 100,
                pointerEvents: 'none',
                opacity: isUIVisible ? 1 : 0,
                transition: 'opacity 0.5s ease-in-out'
            }}>
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

            {/* Paused-for-Score Overlay - rendered ON TOP to keep audio alive */}
            {isPausedForScore && !suppressResults && (() => {
                const pausedPlayers = players.map(p => ({
                    config: p.config,
                    score: Math.round(p.trackScores[p.trackIndex] || 0),
                    history: [],
                    isNewRecord: false
                }));
                return <ScoreBoard
                    players={pausedPlayers}
                    onExit={(forceHome) => {
                        setIsPausedForScore(false);
                        onExit(forceHome);
                    }}
                    onResume={resumeFromScore}
                />;
            })()}
        </Box >
    );
});
MelodiqSessionContent.displayName = 'MelodiqSessionContent';

export const MelodiqSession = forwardRef<MelodiqSessionHandle, MelodiqSessionProps>((props, ref) => (
    <ErrorBoundary fallback={<Box sx={{ bgcolor: 'black', height: '100vh', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h5" color="error">Session Crashed</Typography>
        <Button onClick={() => props.onExit(true)} sx={{ mt: 2 }} variant="contained">Exit</Button>
    </Box>}>
        <MelodiqSessionContent {...props} ref={ref} />
    </ErrorBoundary>
));
MelodiqSession.displayName = 'MelodiqSession';
