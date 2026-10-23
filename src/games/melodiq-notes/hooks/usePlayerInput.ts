import { useEffect, useMemo, useState } from 'react';
import type { InputSource, ScorePartInfo } from '../types';
import { useMidiInput } from '../useMidiInput';
import type { PlayInstrumentNoteOptions } from '../useAudioSynth';
import { useMicPitch } from './useMicPitch';

const MIDI_ECHO_DURATION_SECONDS = 0.4;

interface UsePlayerInputOptions {
  parts: ScorePartInfo[];
  selectedPartId: string;
  playInstrumentNote: (options: PlayInstrumentNoteOptions) => void;
}

/**
 * What the player is playing right now, from MIDI or microphone. MIDI notes are
 * echoed through the synth with the sound of the practised part.
 */
export const usePlayerInput = ({
  parts,
  selectedPartId,
  playInstrumentNote,
}: UsePlayerInputOptions) => {
  const [inputSource, setInputSource] = useState<InputSource>('midi');
  const {
    devices: midiDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    pressedPitches,
  } = useMidiInput();
  const { isMicActive, micPitch, toggleMicrophone } = useMicPitch();

  const playedPitches = useMemo(() => {
    if (inputSource === 'midi') return pressedPitches;
    return micPitch !== null ? [micPitch] : [];
  }, [inputSource, pressedPitches, micPitch]);

  useEffect(() => {
    if (inputSource !== 'midi' || pressedPitches.length === 0) return;
    const activePart = parts.find((p) => p.id === selectedPartId);
    pressedPitches.forEach((pitch) => {
      playInstrumentNote({
        midiPitch: pitch,
        durationSeconds: MIDI_ECHO_DURATION_SECONDS,
        partId: selectedPartId,
        midiProgram: activePart?.midiProgram,
        category: activePart?.category || 'piano',
      });
    });
  }, [pressedPitches, inputSource, playInstrumentNote, parts, selectedPartId]);

  return {
    inputSource,
    setInputSource,
    /** Mic pitch detection is fuzzier than MIDI, so allow one semitone. */
    toleranceSemitones: inputSource === 'mic' ? 1 : 0,
    playedPitches,
    midiDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    isMicActive,
    micPitch,
    toggleMicrophone,
  };
};
