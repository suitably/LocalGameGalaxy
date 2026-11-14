import { useEffect, useRef } from 'react';
import { MicrophoneManager } from '../audio/MicrophoneManager';
import { startSteadyTicker } from '../../../lib/utils/steadyTicker';

const SEND_INTERVAL_MS = 33;

interface Options {
  isSessionPlaying: boolean;
  /** The host scores this phone in the running song (see `logic/phoneSinging.ts`). */
  isSinging: boolean;
  micDeviceId?: string;
  sendData: (data: Record<string, unknown>) => void;
}

/**
 * Streams the singer's pitch to the host (about 30 Hz) while a session is playing and this
 * phone sings; the microphone is released otherwise to save battery. The ticks come from
 * `startSteadyTicker`, so the pitch keeps flowing while the browser is in the background.
 */
export const usePhoneMicStreaming = ({
  isSessionPlaying,
  isSinging,
  micDeviceId,
  sendData,
}: Options) => {
  const lastSendRef = useRef(0);

  useEffect(() => {
    if (!isSessionPlaying || !isSinging) return;

    let mounted = true;
    let mic: MicrophoneManager | null = null;
    let stopTicker: (() => void) | null = null;

    const tick = (active: MicrophoneManager) => {
      if (!mounted) return;
      const now = performance.now();
      if (now - lastSendRef.current < SEND_INTERVAL_MS - 5) return;
      const pitch = active.getPitch();
      if (pitch) {
        sendData({
          type: 'pitch',
          frequency: pitch.frequency,
          note: pitch.note,
          volume: pitch.volume,
        });
      } else {
        sendData({ type: 'pitch', frequency: -1, note: -1, volume: active.getCurrentVolume() });
      }
      window.dispatchEvent(new CustomEvent('melodiq_local_pitch', { detail: { pitch } }));
      lastSendRef.current = now;
    };

    const start = async () => {
      const next = new MicrophoneManager();
      mic = next;
      try {
        await next.start(micDeviceId);
        if (!mounted) {
          next.stop();
          return;
        }
        console.log('[PhoneClientEngine] Microphone started successfully.');
        stopTicker = startSteadyTicker(SEND_INTERVAL_MS, () => tick(next));
      } catch (err) {
        console.error('[PhoneClientEngine] Failed to start microphone:', err);
      }
    };
    void start();

    return () => {
      mounted = false;
      stopTicker?.();
      mic?.stop();
    };
  }, [isSessionPlaying, sendData, micDeviceId, isSinging]);
};
