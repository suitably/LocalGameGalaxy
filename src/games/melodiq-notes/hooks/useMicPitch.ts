import { useCallback, useEffect, useRef, useState } from 'react';
import { MicrophoneManager } from '../../../modules/audio';

const PITCH_POLL_INTERVAL_MS = 80;

/** Microphone on/off plus the currently detected MIDI pitch (polled). */
export const useMicPitch = () => {
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [micPitch, setMicPitch] = useState<number | null>(null);
  const micManagerRef = useRef<MicrophoneManager | null>(null);

  const toggleMicrophone = useCallback(async () => {
    if (isMicActive && micManagerRef.current) {
      await micManagerRef.current.stop();
      micManagerRef.current = null;
      setIsMicActive(false);
      setMicPitch(null);
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
    const interval = setInterval(() => {
      const res = micManagerRef.current?.getPitch() ?? null;
      setMicPitch(res && res.note > 0 ? Math.round(res.note) : null);
    }, PITCH_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isMicActive]);

  useEffect(
    () => () => {
      micManagerRef.current?.stop().catch(() => {});
    },
    [],
  );

  return { isMicActive, micPitch, toggleMicrophone };
};
