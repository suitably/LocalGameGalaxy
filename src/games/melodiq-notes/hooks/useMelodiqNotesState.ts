import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DEMO_SONGS } from '../demoSongs';
import type {
    PlayMode,
    InputSource,
    DemoSong,
    StoredSheetMusic,
    ScorePartInfo,
    InstrumentMixerChannel,
    MelodiqNotesViewMode,
    ModernViewSubMode,
} from '../types';
import type { SheetMusicViewerRef } from '../SheetMusicViewer';
import { useMidiInput } from '../useMidiInput';
import { useAudioSynth } from '../useAudioSynth';
import { useNoteVerifier, type TargetNote } from '../useNoteVerifier';
import { MicrophoneManager, type PitchResult } from '../../../modules/audio';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { db } from '../logic/db';
import {
    supportsDirectoryPicker,
    pickAndSyncFolder,
    resyncAllFolders,
    syncFilesFromInput,
    removeFolder,
} from '../logic/folderSync';
import { loadMusicXmlFile, extractPartsFromXml } from '../logic/musicXmlParser';
import { useScoreTimeline } from './useScoreTimeline';

export interface UseMelodiqNotesStateOptions {
    viewerRef: React.RefObject<SheetMusicViewerRef | null>;
}

export const useMelodiqNotesState = ({ viewerRef }: UseMelodiqNotesStateOptions) => {
    const [selectedSong, setSelectedSong] = useState<DemoSong>(DEMO_SONGS[0]);
    const [customXmlContent, setCustomXmlContent] = useState<string | null>(null);
    const [customSongTitle, setCustomSongTitle] = useState<string>('');
    const [customSongArtist, setCustomSongArtist] = useState<string>('');
    const [playMode, setPlayMode] = useState<PlayMode>('continuous');
    const [inputSource, setInputSource] = useState<InputSource>('midi');
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [speedPercent, setSpeedPercent] = useState<number>(100);
    const [baseBpm, setBaseBpm] = useState<number>(DEMO_SONGS[0].baseBpm ?? 100);

    // View Modes
    const [viewMode, setViewMode] = useState<MelodiqNotesViewMode>(() => {
        const val = storage.get(STORAGE_KEYS.MELODIQ_NOTES_VIEW_MODE, 'classic');
        return val === 'modern' ? 'modern' : 'classic';
    });
    const [sheetRenderMode, setSheetRenderMode] = useState<'horizontal' | 'vertical'>(() => {
        const val = storage.get(STORAGE_KEYS.MELODIQ_NOTES_SHEET_RENDER_MODE, 'vertical');
        return val === 'horizontal' ? 'horizontal' : 'vertical';
    });
    const [modernSubMode, setModernSubMode] = useState<ModernViewSubMode>('focus');
    const [currentBeats, setCurrentBeats] = useState<number>(0);

    // Dialogs state
    const [isSongSelectOpen, setIsSongSelectOpen] = useState<boolean>(false);
    const [isMixerOpen, setIsMixerOpen] = useState<boolean>(false);
    const [isSoundSettingsOpen, setIsSoundSettingsOpen] = useState<boolean>(false);

    // Local library (IndexedDB)
    const librarySongs = useLiveQuery(() => db.songs.orderBy('addedAt').reverse().toArray(), []) ?? [];
    const storedFolders = useLiveQuery(() => db.folders.toArray(), []) ?? [];
    const [selectedLocalSong, setSelectedLocalSong] = useState<StoredSheetMusic | null>(null);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    const effectiveBpm = useMemo(() => {
        return Math.max(20, Math.round(baseBpm * (speedPercent / 100)));
    }, [baseBpm, speedPercent]);

    // Priority: custom file upload > local library song > demo song
    const currentXmlContent =
        customXmlContent ??
        selectedLocalSong?.xmlContent ??
        selectedSong.xmlContent;

    const currentTitle = selectedLocalSong?.title || customSongTitle || selectedSong.title;
    const currentArtist = selectedLocalSong?.artist || customSongArtist || selectedSong.artist;

    // Multi-Instrument Part Extraction
    const parts = useMemo<ScorePartInfo[]>(() => {
        return extractPartsFromXml(currentXmlContent);
    }, [currentXmlContent]);

    const [selectedPartId, setSelectedPartId] = useState<string>(() => parts[0]?.id || 'P1');
    useEffect(() => {
        if (parts.length > 0 && !parts.some(p => p.id === selectedPartId)) {
            // Default to first guitar or first part
            const defaultPart = parts.find(p => p.category === 'guitar') || parts[0];
            setSelectedPartId(defaultPart.id);
        }
    }, [parts, selectedPartId]);

    // Mixer Channels & Audio Options
    const [mixerChannels, setMixerChannels] = useState<Record<string, InstrumentMixerChannel>>({});
    const [masterVolume, setMasterVolume] = useState<number>(1.0);
    const [mutePlayerPart, setMutePlayerPart] = useState<boolean>(false);
    const [soloInstrumentInSheet, setSoloInstrumentInSheet] = useState<boolean>(false);

    const handleChannelChange = useCallback((partId: string, updates: Partial<InstrumentMixerChannel>) => {
        setMixerChannels(prev => ({
            ...prev,
            [partId]: {
                partId,
                volume: prev[partId]?.volume ?? 1.0,
                muted: prev[partId]?.muted ?? false,
                solo: prev[partId]?.solo ?? false,
                ...updates,
            }
        }));
    }, []);

    // Timeline tracks for modern visualization
    const timelineTracks = useScoreTimeline(currentXmlContent, parts);

    const [targetNotes, setTargetNotes] = useState<TargetNote[]>([]);
    const [micPitch, setMicPitch] = useState<number | null>(null);
    const [isMicActive, setIsMicActive] = useState<boolean>(false);

    const micManagerRef = useRef<MicrophoneManager | null>(null);

    const {
        isSupported: isMidiSupported,
        devices: midiDevices,
        selectedDeviceId,
        setSelectedDeviceId,
        pressedPitches
    } = useMidiInput();

    const { playInstrumentNote, stopAllNotes, reloadSoundConfig } = useAudioSynth();

    const playedPitches = useMemo(() => {
        if (inputSource === 'midi') return pressedPitches;
        if (inputSource === 'mic' && micPitch !== null) return [micPitch];
        return [];
    }, [inputSource, pressedPitches, micPitch]);

    const { score, hitCount, isCurrentNoteHit, resetStats } = useNoteVerifier({
        targetNotes,
        playedPitches,
        toleranceSemitones: inputSource === 'mic' ? 1 : 0
    });

    // Play MIDI keyboard notes live
    useEffect(() => {
        if (inputSource === 'midi' && pressedPitches.length > 0) {
            const activePart = parts.find(p => p.id === selectedPartId);
            pressedPitches.forEach(pitch => {
                playInstrumentNote({
                    midiPitch: pitch,
                    durationSeconds: 0.4,
                    partId: selectedPartId,
                    midiProgram: activePart?.midiProgram,
                    category: activePart?.category || 'piano',
                });
            });
        }
    }, [pressedPitches, inputSource, playInstrumentNote, parts, selectedPartId]);

    // Microphone setup
    const toggleMicrophone = useCallback(async () => {
        if (isMicActive && micManagerRef.current) {
            await micManagerRef.current.stop();
            micManagerRef.current = null;
            setIsMicActive(false);
            setMicPitch(null);
        } else {
            try {
                const mic = new MicrophoneManager();
                await mic.start();
                micManagerRef.current = mic;
                setIsMicActive(true);
            } catch (err) {
                console.error('[MelodiqNotes] Error accessing microphone:', err);
            }
        }
    }, [isMicActive]);

    useEffect(() => {
        if (!isMicActive || !micManagerRef.current) return;
        const interval = setInterval(() => {
            if (micManagerRef.current) {
                const res: PitchResult | null = micManagerRef.current.getPitch();
                setMicPitch(res && res.note > 0 ? Math.round(res.note) : null);
            }
        }, 80);
        return () => clearInterval(interval);
    }, [isMicActive]);

    useEffect(() => {
        return () => {
            if (micManagerRef.current) {
                micManagerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const effectiveBpmRef = useRef<number>(effectiveBpm);
    const mixerChannelsRef = useRef(mixerChannels);
    const selectedPartIdRef = useRef(selectedPartId);
    const mutePlayerPartRef = useRef(mutePlayerPart);
    const partsRef = useRef(parts);
    const masterVolumeRef = useRef(masterVolume);

    useEffect(() => {
        effectiveBpmRef.current = effectiveBpm;
        mixerChannelsRef.current = mixerChannels;
        selectedPartIdRef.current = selectedPartId;
        mutePlayerPartRef.current = mutePlayerPart;
        partsRef.current = parts;
        masterVolumeRef.current = masterVolume;
    });

    const calculateNoteSeconds = useCallback((fraction: number | undefined, currentBpm: number): number => {
        const beatDuration = 60 / currentBpm;
        if (!fraction || fraction <= 0) return beatDuration;
        return Math.max(0.08, fraction * 4 * beatDuration);
    }, []);

    const calculateStepSeconds = useCallback((notes: TargetNote[], currentBpm: number): number => {
        const beatDuration = 60 / currentBpm;
        if (!notes || notes.length === 0) return beatDuration;
        const stepFraction = notes[0]?.stepDuration ?? Math.min(...notes.map(n => n.duration ?? 0.25));
        if (!stepFraction || stepFraction <= 0) return beatDuration;
        return Math.max(0.05, stepFraction * 4 * beatDuration);
    }, []);

    // Full Ensemble Audio Playback
    const playCurrentEnsembleNotes = useCallback((notes: TargetNote[]) => {
        if (!notes || notes.length === 0) return;
        const channels = mixerChannelsRef.current;
        const activePartId = selectedPartIdRef.current;
        const mutePart = mutePlayerPartRef.current;
        const currentParts = partsRef.current;
        const mVolume = masterVolumeRef.current;

        const anySolo = Object.values(channels).some(c => c.solo);

        notes.forEach(note => {
            if (note.isRest || note.isTiedContinuation || note.pitch <= 0) return;

            const partId = note.partId || 'P1';
            const isPlayerPart = partId === activePartId;
            if (isPlayerPart && mutePart) return;

            const ch = channels[partId];
            if (ch?.muted) return;
            if (anySolo && !ch?.solo) return;

            const noteSec = calculateNoteSeconds(note.duration ?? 0.25, effectiveBpmRef.current);
            const partInfo = currentParts.find(p => p.id === partId);

            playInstrumentNote({
                midiPitch: note.pitch,
                durationSeconds: noteSec,
                velocity: 0.8,
                partId,
                midiProgram: note.midiProgram || partInfo?.midiProgram,
                category: partInfo?.category || 'piano',
                volume: (ch?.volume ?? 1.0) * mVolume,
            });
        });
    }, [calculateNoteSeconds, playInstrumentNote]);

    // Advance Playback
    const advancePlayback = useCallback(() => {
        if (!viewerRef.current) return;
        const result = viewerRef.current.nextNote();
        if (result.isEndReached) {
            setIsPlaying(false);
            stopAllNotes();
            return;
        }

        setTargetNotes(result.targetNotes);
        setCurrentBeats(prev => prev + (result.stepDuration * 4));

        if (result.allCursorNotes.length > 0) {
            playCurrentEnsembleNotes(result.allCursorNotes);
        }
    }, [viewerRef, playCurrentEnsembleNotes, stopAllNotes]);

    useEffect(() => {
        if (!isPlaying) stopAllNotes();
    }, [isPlaying, stopAllNotes]);

    // Continuous Playback Loop
    useEffect(() => {
        if (!isPlaying || playMode !== 'continuous') {
            if (playbackTimeoutRef.current) {
                clearTimeout(playbackTimeoutRef.current);
                playbackTimeoutRef.current = null;
            }
            return;
        }

        let isCancelled = false;

        const scheduleStep = (currentTargets: TargetNote[], allNotes: TargetNote[]) => {
            if (isCancelled) return;
            const delaySec = calculateStepSeconds(currentTargets.length > 0 ? currentTargets : allNotes, effectiveBpmRef.current);
            const delayMs = Math.max(30, Math.round(delaySec * 1000));

            playbackTimeoutRef.current = setTimeout(() => {
                if (isCancelled || !viewerRef.current) return;
                const result = viewerRef.current.nextNote();

                if (result.isEndReached) {
                    setIsPlaying(false);
                    stopAllNotes();
                    return;
                }

                setTargetNotes(result.targetNotes);
                setCurrentBeats(prev => prev + (result.stepDuration * 4));
                playCurrentEnsembleNotes(result.allCursorNotes);
                scheduleStep(result.targetNotes, result.allCursorNotes);
            }, delayMs);
        };

        const initial = viewerRef.current?.getCurrentNotes() || viewerRef.current?.resetCursor();
        if (initial && !initial.isEndReached) {
            setTargetNotes(initial.targetNotes);
            playCurrentEnsembleNotes(initial.allCursorNotes);
            scheduleStep(initial.targetNotes, initial.allCursorNotes);
        }

        return () => {
            isCancelled = true;
            if (playbackTimeoutRef.current) {
                clearTimeout(playbackTimeoutRef.current);
                playbackTimeoutRef.current = null;
            }
        };
    }, [isPlaying, playMode, viewerRef, playCurrentEnsembleNotes, calculateStepSeconds, stopAllNotes]);

    // Wait Mode Auto-Advance
    useEffect(() => {
        if (!isPlaying || playMode !== 'wait') return;

        const isRest = targetNotes.length > 0 && targetNotes.every(t => t.isRest);
        const isAllTied = targetNotes.length > 0 && targetNotes.every(t => t.isRest || t.isTiedContinuation);

        if (isRest || isAllTied || isCurrentNoteHit) {
            const stepSec = calculateStepSeconds(targetNotes, effectiveBpmRef.current);
            const pauseMs = (isRest || isAllTied)
                ? Math.max(200, Math.round(stepSec * 1000))
                : Math.min(400, Math.max(180, Math.round(stepSec * 500)));

            const timeout = setTimeout(() => advancePlayback(), pauseMs);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying, playMode, isCurrentNoteHit, advancePlayback, calculateStepSeconds, targetNotes]);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const parsed = await loadMusicXmlFile(file);
            setSelectedLocalSong(null);
            setCustomXmlContent(parsed.xmlContent);
            setCustomSongTitle(parsed.title);
            setCustomSongArtist(parsed.artist);
            setBaseBpm(parsed.baseBpm);
            setIsPlaying(false);
            resetStats();
            setCurrentBeats(0);
        } catch (err) {
            console.error('[MelodiqNotes] Failed to load file:', err);
        }
        event.target.value = '';
    }, [resetStats]);

    const handleLocalSongSelect = useCallback((song: StoredSheetMusic) => {
        setSelectedLocalSong(song);
        setCustomXmlContent(null);
        setBaseBpm(song.baseBpm);
        setIsPlaying(false);
        resetStats();
        setCurrentBeats(0);
    }, [resetStats]);

    const handleSongChange = (song: DemoSong) => {
        setSelectedLocalSong(null);
        setCustomXmlContent(null);
        setSelectedSong(song);
        setBaseBpm(song.baseBpm ?? 100);
        setIsPlaying(false);
        resetStats();
        setCurrentBeats(0);
    };

    const handleReset = () => {
        setIsPlaying(false);
        stopAllNotes();
        if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current);
            playbackTimeoutRef.current = null;
        }
        resetStats();
        setCurrentBeats(0);
        if (viewerRef.current) {
            const initial = viewerRef.current.resetCursor();
            setTargetNotes(initial.targetNotes);
        }
    };

    const handleViewModeChange = (mode: MelodiqNotesViewMode) => {
        setViewMode(mode);
        storage.set(STORAGE_KEYS.MELODIQ_NOTES_VIEW_MODE, mode);
    };

    const handleSheetRenderModeChange = (mode: 'horizontal' | 'vertical') => {
        setSheetRenderMode(mode);
        storage.set(STORAGE_KEYS.MELODIQ_NOTES_SHEET_RENDER_MODE, mode);
    };

    return {
        selectedSong,
        currentXmlContent,
        currentTitle,
        currentArtist,
        playMode,
        setPlayMode,
        inputSource,
        setInputSource,
        isPlaying,
        setIsPlaying,
        speedPercent,
        setSpeedPercent,
        baseBpm,
        effectiveBpm,
        parts,
        selectedPartId,
        setSelectedPartId,
        mixerChannels,
        handleChannelChange,
        masterVolume,
        setMasterVolume,
        mutePlayerPart,
        setMutePlayerPart,
        soloInstrumentInSheet,
        setSoloInstrumentInSheet,
        viewMode,
        handleViewModeChange,
        sheetRenderMode,
        setSheetRenderMode: handleSheetRenderModeChange,
        modernSubMode,
        setModernSubMode,
        currentBeats,
        timelineTracks,
        targetNotes,
        playedPitches,
        score,
        hitCount,
        isCurrentNoteHit,
        isMidiSupported,
        midiDevices,
        selectedDeviceId,
        setSelectedDeviceId,
        micPitch,
        isMicActive,
        librarySongs,
        storedFolders,
        selectedLocalSong,
        isSyncing,
        supportsDirectoryPicker: supportsDirectoryPicker(),
        isSongSelectOpen,
        setIsSongSelectOpen,
        isMixerOpen,
        setIsMixerOpen,
        isSoundSettingsOpen,
        setIsSoundSettingsOpen,
        toggleMicrophone,
        handleFileUpload,
        handleSongChange,
        handleLocalSongSelect,
        handleSyncFolder: async () => {
            setIsSyncing(true);
            try { await pickAndSyncFolder(); } finally { setIsSyncing(false); }
        },
        handleResyncFolders: async () => {
            setIsSyncing(true);
            try { await resyncAllFolders(); } finally { setIsSyncing(false); }
        },
        handleFolderFileInput: async (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files) return;
            setIsSyncing(true);
            try { await syncFilesFromInput(e.target.files); } finally { setIsSyncing(false); }
        },
        handleRemoveFolder: removeFolder,
        handleBpmDetected: useCallback((bpm: number) => { if (bpm > 0) setBaseBpm(bpm); }, []),
        handleReset,
        handleSongEnd: useCallback(() => setIsPlaying(false), []),
        handleNotesChanged: useCallback((targets: TargetNote[]) => setTargetNotes(targets), []),
        reloadSoundConfig,
    };
};
