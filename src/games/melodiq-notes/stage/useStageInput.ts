import { useCallback, useEffect, useRef, useState } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { useMidiInput } from '../useMidiInput';
import { lostMidiInstrument, midiInstrument } from '../logic/midiPorts';
import { useMicPitch, type MicHeard } from '../hooks/useMicPitch';
import type { StageEngine } from './engine/StageEngine';
import { GM_DRUM_CHANNEL } from './engine/players';

export type StageInputSource = 'keys' | 'midi' | 'mic';

/**
 * Routes a MIDI device or the microphone to the highlighted player (the computer keyboard always
 * works). Until the player picks an input, MIDI is used whenever a real instrument is connected.
 * Sung or played microphone notes never sound again through the speakers. MIDI notes only do when
 * the player turns that on: the synth's echo lags behind an instrument's own sound (#663).
 */
export function useStageInput(engine: StageEngine) {
  // null: automatic (MIDI with an instrument, else the computer keys)
  const [chosen, setChosen] = useState<StageInputSource | null>(null);
  const sourceRef = useRef<StageInputSource>(chosen ?? 'keys');
  const [midiSound, setMidiSoundState] = useState(
    () => storage.get(STORAGE_KEYS.MELODIQ_NOTES_MIDI_SOUND) === '1',
  );
  const midiSoundRef = useRef(midiSound);
  const setMidiSound = (on: boolean) => {
    midiSoundRef.current = on;
    setMidiSoundState(on);
    storage.set(STORAGE_KEYS.MELODIQ_NOTES_MIDI_SOUND, on ? '1' : '0');
  };
  // Hits go straight to the engine, without a render per note.
  const [midiLost, setMidiLost] = useState<string | null>(null);
  const midiLostRef = useRef<string | null>(null);
  const onNoteOn = useCallback(
    (pitch: number, _velocity: number, channel: number) => {
      // a note proves the instrument works again; render only for that first note
      if (midiLostRef.current) {
        midiLostRef.current = null;
        setMidiLost(null);
      }
      if (sourceRef.current !== 'midi') return;
      // an e-drum kit (GM percussion channel) shows the focused player the drum view
      if (channel === GM_DRUM_CHANNEL) engine.autoDrumView();
      engine.hitPitch(pitch, !midiSoundRef.current);
    },
    [engine],
  );
  // automatic mode keeps looking, so an instrument plugged in later is picked up in Firefox too
  const midi = useMidiInput({ onNoteOn, rescan: chosen === null || chosen === 'midi' });
  const instrument = midiInstrument(midi.devices, midi.selectedDeviceId);
  const source: StageInputSource = chosen ?? (instrument ? 'midi' : 'keys');
  const instrumentName = instrument?.name ?? null;
  const lastInstrument = useRef<string | null>(instrumentName);
  useEffect(() => {
    const next = lostMidiInstrument(midiLostRef.current, lastInstrument.current, instrumentName);
    lastInstrument.current = instrumentName;
    if (next === midiLostRef.current) return;
    midiLostRef.current = next;
    setMidiLost(next);
  }, [instrumentName]);
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);
  // A sung line follows the fractional pitch; an instrument gets a hit per onset (repeated notes
  // too), with its cents. Straight to the engine, without a render per poll.
  const onHeard = useCallback(
    ({ pitch, onset }: MicHeard) => {
      if (sourceRef.current !== 'mic') return;
      const focus = engine.focus;
      if (focus?.instrument.view === 'pitch')
        engine.setVoice(pitch ?? focus.voice.pitch, pitch !== null);
      else if (onset !== null) engine.hitPitch(onset, true);
    },
    [engine],
  );
  const mic = useMicPitch(onHeard);

  const choose = (next: StageInputSource) => {
    if ((next === 'mic') !== mic.isMicActive) void mic.toggleMicrophone();
    setChosen(next);
  };

  return {
    source,
    choose,
    midiDevices: midi.devices,
    midiName: instrumentName,
    /** A real instrument that went away and has sent nothing since (hint: restart the browser). */
    midiLost,
    micActive: mic.isMicActive,
    midiSound,
    setMidiSound,
  };
}
