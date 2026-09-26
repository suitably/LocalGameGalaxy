import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DEMO_SONGS } from '../demoSongs';
import type { PlayMode, InputSource, DemoSong, StoredSheetMusic } from '../types';
import type { SheetMusicViewerRef } from '../SheetMusicViewer';
import { useMidiInput } from '../useMidiInput';
import { useAudioSynth } from '../useAudioSynth';
import { useNoteVerifier, type TargetNote } from '../useNoteVerifier';
import { MicrophoneManager, type PitchResult } from '../../../modules/audio';
import { db } from '../logic/db';
import {
    supportsDirectoryPicker,
    pickAndSyncFolder,
    resyncAllFolders,
    syncFilesFromInput,
    removeFolder,
    type SyncResult,
} from '../logic/folderSync';
import { loadMusicXmlFile } from '../logic/musicXmlParser';

export const useMelodiqNotesState = () => {
    const [selectedSong, setSelectedSong] = useState<DemoSong>(DEMO_SONGS[0]);
    const [customXmlContent, setCustomXmlContent] = useState<string | null>(null);
    const [playMode, setPlayMode] = useState<PlayMode>('continuous');
    const [inputSource, setInputSource] = useState<InputSource>('midi');
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [speedPercent, setSpeedPercent] = useState<number>(100);
    const [baseBpm, setBaseBpm] = useState<number>(DEMO_SONGS[0].baseBpm ?? 100);

    // Local library (IndexedDB, reactive)
    const librarySongs = useLiveQuery(() => db.songs.orderBy('addedAt').reverse().toArray(), []) ?? [];
    const storedFolders = useLiveQuery(() => db.folders.toArray(), []) ?? [];
    const [selectedLocalSong, setSelectedLocalSong] = useState<StoredSheetMusic | null>(null);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    const effectiveBpm = useMemo(() => {
        return Math.max(20, Math.round(baseBpm * (speedPercent / 100)));
    }, [baseBpm, speedPercent]);

    const [targetNotes, setTargetNotes] = useState<TargetNote[]>([]);
    const [micPitch, setMicPitch] = useState<number | null>(null);
    const [isMicActive, setIsMicActive] = useState<boolean>(false);

    const viewerRef = useRef<SheetMusicViewerRef>(null);
    const micManagerRef = useRef<MicrophoneManager | null>(null);

    const {
        isSupported: isMidiSupported,
        devices: midiDevices,
        selectedDeviceId,
        setSelectedDeviceId,
        pressedPitches
    } = useMidiInput();

    const { playNote, stopAllNotes } = useAudioSynth();

    const playedPitches = useMemo(() => {
        if (inputSource === 'midi') {
            return pressedPitches;
        } else if (inputSource === 'mic' && micPitch !== null) {
            return [micPitch];
        }
        return [];
    }, [inputSource, pressedPitches, micPitch]);

    const { score, hitCount, isCurrentNoteHit, resetStats } = useNoteVerifier({
        targetNotes,
        playedPitches,
        toleranceSemitones: inputSource === 'mic' ? 1 : 0
    });

    // Play sound when MIDI notes are pressed
    useEffect(() => {
        if (inputSource === 'midi' && pressedPitches.length > 0) {
            pressedPitches.forEach(pitch => playNote(pitch, 0.4));
        }
    }, [pressedPitches, inputSource, playNote]);

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

    // Microphone polling loop
    useEffect(() => {
        if (!isMicActive || !micManagerRef.current) return;

        const interval = setInterval(() => {
            if (micManagerRef.current) {
                const pitchResult: PitchResult | null = micManagerRef.current.getPitch();
                if (pitchResult && pitchResult.note > 0) {
                    setMicPitch(Math.round(pitchResult.note));
                } else {
                    setMicPitch(null);
                }
            }
        }, 80);

        return () => clearInterval(interval);
    }, [isMicActive]);

    // Stop microphone on unmount
    useEffect(() => {
        return () => {
            if (micManagerRef.current) {
                micManagerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const effectiveBpmRef = useRef<number>(effectiveBpm);
    useEffect(() => {
        effectiveBpmRef.current = effectiveBpm;
    }, [effectiveBpm]);

    // Compute single note duration in seconds based on fraction of whole note (1.0 = whole note) and bpm
    const calculateNoteSeconds = useCallback((fraction: number | undefined, currentBpm: number): number => {
        const beatDuration = 60 / currentBpm;
        if (!fraction || fraction <= 0) return beatDuration;
        // fraction: 1.0 = whole note, 0.5 = half, 0.25 = quarter, 0.125 = eighth, etc.
        const seconds = fraction * 4 * beatDuration;
        return Math.max(0.08, seconds);
    }, []);

    // Compute step duration until next cursor change based on stepDuration (fraction of whole note)
    const calculateStepSeconds = useCallback((notes: TargetNote[], currentBpm: number): number => {
        const beatDuration = 60 / currentBpm;
        if (!notes || notes.length === 0) return beatDuration;
        const stepFraction = notes[0]?.stepDuration ?? Math.min(...notes.map(n => n.duration ?? 0.25));
        if (!stepFraction || stepFraction <= 0) return beatDuration;
        const seconds = stepFraction * 4 * beatDuration;
        return Math.max(0.05, seconds);
    }, []);

    // Plays all active playable targets with their individual note durations.
    // Sustaining notes (e.g. whole notes on upper staff) continue ringing while shorter notes on other staves advance.
    const playCurrentTargets = useCallback((targets: TargetNote[]) => {
        if (!targets || targets.length === 0) return;
        const isRest = targets.every(t => t.isRest);
        if (isRest) return;
        targets.forEach(target => {
            if (!target.isRest && !target.isTiedContinuation && target.pitch > 0) {
                const noteSec = calculateNoteSeconds(target.duration ?? 0.25, effectiveBpmRef.current);
                playNote(target.pitch, noteSec);
            }
        });
    }, [calculateNoteSeconds, playNote]);

    // Playback Step: advances cursor and plays audio with true individual note durations
    const advancePlayback = useCallback((): TargetNote[] => {
        if (!viewerRef.current) return [];

        const nextTargets = viewerRef.current.nextNote();
        setTargetNotes(nextTargets);

        if (nextTargets.length > 0) {
            playCurrentTargets(nextTargets);
        } else {
            setIsPlaying(false);
            stopAllNotes();
        }
        return nextTargets;
    }, [playCurrentTargets, stopAllNotes]);

    // Silence active synth voices when playback is stopped
    useEffect(() => {
        if (!isPlaying) {
            stopAllNotes();
        }
    }, [isPlaying, stopAllNotes]);

    // Continuous Mode Loop with Variable Duration Timers
    useEffect(() => {
        if (!isPlaying || playMode !== 'continuous') {
            if (playbackTimeoutRef.current) {
                clearTimeout(playbackTimeoutRef.current);
                playbackTimeoutRef.current = null;
            }
            return;
        }

        let isCancelled = false;

        const scheduleStep = (currentNotes: TargetNote[]) => {
            if (isCancelled) return;
            const delaySec = calculateStepSeconds(currentNotes, effectiveBpmRef.current);
            const delayMs = Math.max(30, Math.round(delaySec * 1000));

            playbackTimeoutRef.current = setTimeout(() => {
                if (isCancelled) return;
                if (!viewerRef.current) return;

                const nextTargets = viewerRef.current.nextNote();
                if (nextTargets.length === 0) {
                    setIsPlaying(false);
                    stopAllNotes();
                    return;
                }

                setTargetNotes(nextTargets);
                playCurrentTargets(nextTargets);
                scheduleStep(nextTargets);
            }, delayMs);
        };

        // When starting playback, ensure cursor notes are loaded
        let initialNotes = viewerRef.current?.getCurrentNotes() ?? [];
        if (initialNotes.length === 0) {
            initialNotes = viewerRef.current?.resetCursor() ?? [];
        }

        if (initialNotes.length > 0) {
            setTargetNotes(initialNotes);
            playCurrentTargets(initialNotes);
            scheduleStep(initialNotes);
        } else {
            setIsPlaying(false);
        }

        return () => {
            isCancelled = true;
            if (playbackTimeoutRef.current) {
                clearTimeout(playbackTimeoutRef.current);
                playbackTimeoutRef.current = null;
            }
        };
    }, [isPlaying, playMode, playCurrentTargets, calculateStepSeconds, stopAllNotes]);

    // Wait Mode initial note sound
    useEffect(() => {
        if (isPlaying && playMode === 'wait') {
            const initialNotes = viewerRef.current?.getCurrentNotes() ?? [];
            if (initialNotes.length > 0) {
                playCurrentTargets(initialNotes);
            }
        }
    }, [isPlaying, playMode, playCurrentTargets]);

    // Wait Mode Auto-Advance (on note hit OR auto-advance on rest)
    useEffect(() => {
        if (!isPlaying || playMode !== 'wait') return;

        const isRest = targetNotes.length > 0 && targetNotes.every(t => t.isRest);
        const isAllTied = targetNotes.length > 0 && targetNotes.every(t => t.isRest || t.isTiedContinuation);

        if (isRest || isAllTied) {
            // Automatically pause for the duration of the rest / held tied note, then advance!
            const stepSec = calculateStepSeconds(targetNotes, effectiveBpmRef.current);
            const pauseMs = Math.max(200, Math.round(stepSec * 1000));
            const timeout = setTimeout(() => {
                advancePlayback();
            }, pauseMs);
            return () => clearTimeout(timeout);
        }

        if (isCurrentNoteHit) {
            const stepSec = calculateStepSeconds(targetNotes, effectiveBpmRef.current);
            // In wait mode, advance smoothly after hitting the note, minimum 180ms
            const waitMs = Math.min(400, Math.max(180, Math.round(stepSec * 500)));
            const timeout = setTimeout(() => {
                advancePlayback();
            }, waitMs);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying, playMode, isCurrentNoteHit, advancePlayback, calculateStepSeconds, targetNotes]);

    /** Handles single-file upload from the file input (.xml / .musicxml / .mxl). */
    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const parsed = await loadMusicXmlFile(file);
            if (playbackTimeoutRef.current) {
                clearTimeout(playbackTimeoutRef.current);
                playbackTimeoutRef.current = null;
            }
            setSelectedLocalSong(null);
            setCustomXmlContent(parsed.xmlContent);
            setBaseBpm(parsed.baseBpm);
            setIsPlaying(false);
            resetStats();
        } catch (err) {
            console.error('[MelodiqNotes] Failed to load file:', err);
            setSyncError(err instanceof Error ? err.message : String(err));
        }
        // Reset the input value so the same file can be re-selected.
        event.target.value = '';
    }, [resetStats]);

    /** Selects a song from the local library (IndexedDB). */
    const handleLocalSongSelect = useCallback((song: StoredSheetMusic) => {
        if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current);
            playbackTimeoutRef.current = null;
        }
        setSelectedLocalSong(song);
        setCustomXmlContent(null);
        setBaseBpm(song.baseBpm);
        setIsPlaying(false);
        resetStats();
    }, [resetStats]);

    /** Opens a directory picker, scans for sheet-music files, and imports them. */
    const handleSyncFolder = useCallback(async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            const result: SyncResult = await pickAndSyncFolder();
            console.info(`[MelodiqNotes] Synced ${result.imported.length} songs (${result.skipped} skipped).`);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return; // User cancelled picker
            setSyncError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSyncing(false);
        }
    }, []);

    /** Re-syncs all previously saved folder handles. */
    const handleResyncFolders = useCallback(async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            const result: SyncResult = await resyncAllFolders();
            console.info(`[MelodiqNotes] Re-synced ${result.imported.length} songs (${result.skipped} skipped).`);
        } catch (err) {
            setSyncError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSyncing(false);
        }
    }, []);

    /**
     * Fallback for browsers without showDirectoryPicker:
     * handles a FileList from <input type="file" webkitdirectory>.
     */
    const handleFolderFileInput = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsSyncing(true);
        setSyncError(null);
        try {
            const result: SyncResult = await syncFilesFromInput(files);
            console.info(`[MelodiqNotes] Imported ${result.imported.length} songs from folder input (${result.skipped} skipped).`);
        } catch (err) {
            setSyncError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSyncing(false);
            event.target.value = '';
        }
    }, []);

    /** Removes a synced folder and all its songs from the library. */
    const handleRemoveFolder = useCallback(async (folderId: string) => {
        try {
            await removeFolder(folderId);
            // If the currently selected local song was from that folder, clear it.
            if (selectedLocalSong?.folderId === folderId) {
                setSelectedLocalSong(null);
                setCustomXmlContent(null);
            }
        } catch (err) {
            console.error('[MelodiqNotes] Failed to remove folder:', err);
        }
    }, [selectedLocalSong]);

    const handleSongChange = (song: DemoSong) => {
        if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current);
            playbackTimeoutRef.current = null;
        }
        setSelectedLocalSong(null);
        setCustomXmlContent(null);
        setSelectedSong(song);
        setBaseBpm(song.baseBpm ?? 100);
        setIsPlaying(false);
        resetStats();
    };


    const handleBpmDetected = useCallback((detectedBpm: number) => {
        if (detectedBpm > 0) {
            setBaseBpm(detectedBpm);
        }
    }, []);

    const handleReset = () => {
        setIsPlaying(false);
        stopAllNotes();
        if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current);
            playbackTimeoutRef.current = null;
        }
        resetStats();
        if (viewerRef.current) {
            const initialNotes = viewerRef.current.resetCursor();
            setTargetNotes(initialNotes);
        }
    };

    const handleSongEnd = useCallback(() => {
        setIsPlaying(false);
    }, []);

    const handleNotesChanged = useCallback((notes: TargetNote[]) => {
        setTargetNotes(notes);
    }, []);

    // Priority: custom file upload > local library song > demo song
    const currentXmlContent =
        customXmlContent ??
        selectedLocalSong?.xmlContent ??
        selectedSong.xmlContent;

    return {
        // Demo song selection
        selectedSong,
        customXmlContent,
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
        viewerRef,
        currentXmlContent,
        // Local library
        librarySongs,
        storedFolders,
        selectedLocalSong,
        isSyncing,
        syncError,
        supportsDirectoryPicker: supportsDirectoryPicker(),
        // Handlers
        toggleMicrophone,
        handleFileUpload,
        handleSongChange,
        handleLocalSongSelect,
        handleSyncFolder,
        handleResyncFolders,
        handleFolderFileInput,
        handleRemoveFolder,
        handleBpmDetected,
        handleReset,
        handleSongEnd,
        handleNotesChanged,
    };
};
