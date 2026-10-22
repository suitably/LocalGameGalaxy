import { useCallback, useState } from 'react';
import type { DemoSong, SheetMusicViewerRef, StoredSheetMusic } from '../types';
import { useAudioSynth } from '../useAudioSynth';
import { useNoteVerifier } from '../useNoteVerifier';
import { loadMusicXmlFile } from '../logic/musicXmlParser';
import type { SongSource } from '../logic/songSource';
import { useScoreTimeline } from './useScoreTimeline';
import { useSongSource } from './useSongSource';
import { useSongLibrary } from './useSongLibrary';
import { useMixerState } from './useMixerState';
import { useViewPreferences } from './useViewPreferences';
import { usePlayerInput } from './usePlayerInput';
import { usePlaybackEngine, useWaitModeAdvance } from './usePlaybackEngine';

export interface UseMelodiqNotesStateOptions {
  viewerRef: React.RefObject<SheetMusicViewerRef | null>;
}

/** Composes the Melodiq Notes feature hooks into one view model, grouped by concern. */
export const useMelodiqNotesState = ({ viewerRef }: UseMelodiqNotesStateOptions) => {
  const [speedPercent, setSpeedPercent] = useState<number>(100);
  const [isSongSelectOpen, setIsSongSelectOpen] = useState<boolean>(false);
  const [isMixerOpen, setIsMixerOpen] = useState<boolean>(false);

  const song = useSongSource(speedPercent);
  const library = useSongLibrary();
  const mixer = useMixerState(song.parts);
  const view = useViewPreferences();
  const timelineTracks = useScoreTimeline(song.resolved.xmlContent, song.parts);
  const { playInstrumentNote, stopAllNotes, reloadSoundConfig } = useAudioSynth();

  const input = usePlayerInput({
    parts: song.parts,
    selectedPartId: mixer.selectedPartId,
    playInstrumentNote,
  });

  const playback = usePlaybackEngine({
    viewerRef,
    mix: {
      channels: mixer.mixerChannels,
      playerPartId: mixer.selectedPartId,
      mutePlayerPart: mixer.mutePlayerPart,
      masterVolume: mixer.masterVolume,
      parts: song.parts,
      bpm: song.effectiveBpm,
    },
    playInstrumentNote,
    stopAllNotes,
  });

  const verifier = useNoteVerifier({
    targetNotes: playback.targetNotes,
    playedPitches: input.playedPitches,
    toleranceSemitones: input.toleranceSemitones,
  });

  useWaitModeAdvance({
    isActive: playback.isPlaying && playback.playMode === 'wait',
    targetNotes: playback.targetNotes,
    isCurrentNoteHit: verifier.isCurrentNoteHit,
    bpm: song.effectiveBpm,
    step: playback.step,
  });

  const { loadSource } = song;
  const { prepareForNewSong } = playback;
  const { resetStats } = verifier;

  const selectSong = useCallback(
    (next: SongSource) => {
      loadSource(next);
      prepareForNewSong();
      resetStats();
    },
    [loadSource, prepareForNewSong, resetStats],
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const { xmlContent, title, artist, baseBpm } = await loadMusicXmlFile(file);
        selectSong({ kind: 'upload', xmlContent, title, artist, baseBpm });
      } catch (err) {
        console.error('[MelodiqNotes] Failed to load file:', err);
      }
      event.target.value = '';
    },
    [selectSong],
  );

  const handleReset = useCallback(() => {
    playback.reset();
    resetStats();
  }, [playback, resetStats]);

  return {
    song: {
      ...song.resolved,
      source: song.source,
      parts: song.parts,
      effectiveBpm: song.effectiveBpm,
      timelineTracks,
      handleBpmDetected: song.handleBpmDetected,
      handleSongChange: (demo: DemoSong) => selectSong({ kind: 'demo', song: demo }),
      handleLocalSongSelect: (stored: StoredSheetMusic) =>
        selectSong({ kind: 'library', song: stored }),
      handleFileUpload,
    },
    library,
    mixer,
    view,
    input,
    playback: { ...playback, speedPercent, setSpeedPercent, handleReset },
    stats: {
      score: verifier.score,
      hitCount: verifier.hitCount,
      isCurrentNoteHit: verifier.isCurrentNoteHit,
    },
    dialogs: { isSongSelectOpen, setIsSongSelectOpen, isMixerOpen, setIsMixerOpen },
    reloadSoundConfig,
  };
};

export type MelodiqNotesState = ReturnType<typeof useMelodiqNotesState>;
