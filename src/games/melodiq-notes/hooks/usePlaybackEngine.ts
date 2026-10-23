import { useCallback, useEffect, useRef, useState } from 'react';
import type { CursorNotesResult, PlayMode, SheetMusicViewerRef, TargetNote } from '../types';
import { selectAudibleEnsembleNotes, type EnsembleMixState } from '../logic/ensembleMix';
import { continuousStepDelayMs, waitModeAdvanceDelayMs } from '../logic/playbackTiming';
import type { PlayInstrumentNoteOptions } from '../useAudioSynth';

interface UsePlaybackEngineOptions {
  viewerRef: React.RefObject<SheetMusicViewerRef | null>;
  /** Latest mixer state; read through a ref so the running loop never restarts on mixer changes. */
  mix: EnsembleMixState;
  playInstrumentNote: (options: PlayInstrumentNoteOptions) => void;
  stopAllNotes: () => void;
}

/**
 * Drives the OSMD cursor: continuous mode advances on a timer, wait mode
 * (see `useWaitModeAdvance`) advances once the player hit the note.
 */
export const usePlaybackEngine = ({
  viewerRef,
  mix,
  playInstrumentNote,
  stopAllNotes,
}: UsePlaybackEngineOptions) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playMode, setPlayMode] = useState<PlayMode>('continuous');
  const [targetNotes, setTargetNotes] = useState<TargetNote[]>([]);
  const [currentBeats, setCurrentBeats] = useState<number>(0);

  const mixRef = useRef(mix);
  useEffect(() => {
    mixRef.current = mix;
  });

  const playEnsemble = useCallback(
    (notes: TargetNote[]) => {
      selectAudibleEnsembleNotes(notes, mixRef.current).forEach((note) => playInstrumentNote(note));
    },
    [playInstrumentNote],
  );

  /** Moves the cursor one step; returns `null` when the song has ended. */
  const step = useCallback((): CursorNotesResult | null => {
    const result = viewerRef.current?.nextNote();
    if (!result) return null;
    if (result.isEndReached) {
      setIsPlaying(false);
      stopAllNotes();
      return null;
    }
    setTargetNotes(result.targetNotes);
    setCurrentBeats((prev) => prev + result.stepDuration * 4);
    playEnsemble(result.allCursorNotes);
    return result;
  }, [viewerRef, playEnsemble, stopAllNotes]);

  useEffect(() => {
    if (!isPlaying) stopAllNotes();
  }, [isPlaying, stopAllNotes]);

  // Continuous mode: self-scheduling timer chain.
  useEffect(() => {
    if (!isPlaying || playMode !== 'continuous') return;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    const schedule = (targets: TargetNote[], all: TargetNote[]) => {
      timeout = setTimeout(
        () => {
          const result = step();
          if (result) schedule(result.targetNotes, result.allCursorNotes);
        },
        continuousStepDelayMs(targets, all, mixRef.current.bpm),
      );
    };

    const initial = viewerRef.current?.getCurrentNotes() || viewerRef.current?.resetCursor();
    if (initial && !initial.isEndReached) {
      setTargetNotes(initial.targetNotes);
      playEnsemble(initial.allCursorNotes);
      schedule(initial.targetNotes, initial.allCursorNotes);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isPlaying, playMode, viewerRef, step, playEnsemble]);

  /** Stops playback and rewinds the cursor to the start. */
  const reset = useCallback(() => {
    setIsPlaying(false);
    stopAllNotes();
    setCurrentBeats(0);
    const initial = viewerRef.current?.resetCursor();
    if (initial) setTargetNotes(initial.targetNotes);
  }, [viewerRef, stopAllNotes]);

  /** Stops playback for a newly loaded score; the viewer resets its own cursor on load. */
  const prepareForNewSong = useCallback(() => {
    setIsPlaying(false);
    setCurrentBeats(0);
  }, []);

  return {
    isPlaying,
    setIsPlaying,
    playMode,
    setPlayMode,
    targetNotes,
    currentBeats,
    step,
    reset,
    prepareForNewSong,
    handleSongEnd: useCallback(() => setIsPlaying(false), []),
    handleNotesChanged: useCallback((targets: TargetNote[]) => setTargetNotes(targets), []),
  };
};

interface UseWaitModeAdvanceOptions {
  isActive: boolean;
  targetNotes: TargetNote[];
  isCurrentNoteHit: boolean;
  bpm: number;
  step: () => unknown;
}

/** Wait mode: advance after a short pause once the note is hit (or the step is silent). */
export const useWaitModeAdvance = ({
  isActive,
  targetNotes,
  isCurrentNoteHit,
  bpm,
  step,
}: UseWaitModeAdvanceOptions) => {
  useEffect(() => {
    if (!isActive) return;
    const delayMs = waitModeAdvanceDelayMs(targetNotes, isCurrentNoteHit, bpm);
    if (delayMs === null) return;
    const timeout = setTimeout(step, delayMs);
    return () => clearTimeout(timeout);
  }, [isActive, targetNotes, isCurrentNoteHit, bpm, step]);
};
