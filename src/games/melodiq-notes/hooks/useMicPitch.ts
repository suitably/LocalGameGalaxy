import { useCallback, useEffect, useRef, useState } from 'react';
import { MicrophoneManager } from '../../../modules/audio';
import { initialMicOnsetState, nextMicFrame, type MicOnsetResult } from '../logic/micOnset';

const PITCH_POLL_INTERVAL_MS = 80;

/** What one microphone poll heard: the pitch (fractional MIDI) and a note that started now. */
export type MicHeard = Omit<MicOnsetResult, 'state'>;

/**
 * Microphone on/off. Every poll calls `onHeard` with the fractional pitch and, when a note
 * started (energy onset, see `logic/micOnset.ts`), its onset, so repeated notes register too.
 */
export const useMicPitch = (onHeard: (heard: MicHeard) => void) => {
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const micManagerRef = useRef<MicrophoneManager | null>(null);
  const onHeardRef = useRef(onHeard);
  useEffect(() => {
    onHeardRef.current = onHeard;
  }, [onHeard]);

  const toggleMicrophone = useCallback(async () => {
    if (isMicActive && micManagerRef.current) {
      await micManagerRef.current.stop();
      micManagerRef.current = null;
      setIsMicActive(false);
      onHeardRef.current({ pitch: null, onset: null });
      return;
    }
    try {
      const mic = new MicrophoneManager();
      await mic.start();
      micManagerRef.current = mic;
      setIsMicActive(true);
    } catch (err) {
      console.error('[MelodiqNotes] Error accessing microphone:', err);
    }
  }, [isMicActive]);

  useEffect(() => {
    if (!isMicActive) return;
    let state = initialMicOnsetState();
    const interval = setInterval(() => {
      const mic = micManagerRef.current;
      if (!mic) return;
      const rms = mic.getCurrentVolume();
      const res = mic.getPitch();
      const next = nextMicFrame(state, { rms, pitch: res && res.note > 0 ? res.note : null });
      state = next.state;
      onHeardRef.current({ pitch: next.pitch, onset: next.onset });
    }, PITCH_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isMicActive]);

  useEffect(
    () => () => {
      micManagerRef.current?.stop().catch(() => {});
    },
    [],
  );

  return { isMicActive, toggleMicrophone };
};
