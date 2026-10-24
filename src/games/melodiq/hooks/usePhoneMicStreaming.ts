import { useEffect, useRef } from 'react';
import { MicrophoneManager } from '../audio/MicrophoneManager';

const SEND_INTERVAL_MS = 33;

interface Options {
  isSessionPlaying: boolean;
  clientRole: string;
  micDeviceId?: string;
  sendData: (data: Record<string, unknown>) => void;
}

/**
 * Streams the singer's pitch to the host (about 30 Hz) while a session is playing and this
 * phone is a singer; the microphone is released otherwise to save battery.
 */
export const usePhoneMicStreaming = ({
  isSessionPlaying,
  clientRole,
  micDeviceId,
  sendData,
}: Options) => {
  const lastSendRef = useRef(0);

  useEffect(() => {
    if (!isSessionPlaying || clientRole !== 'singer') return;

    let mounted = true;
    let mic: MicrophoneManager | null = null;
    let frameId = 0;

    const loop = (active: MicrophoneManager) => {
      if (!mounted) return;
      const now = performance.now();
      if (now - lastSendRef.current > SEND_INTERVAL_MS) {
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
      }
      frameId = requestAnimationFrame(() => loop(active));
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
        loop(next);
      } catch (err) {
        console.error('[PhoneClientEngine] Failed to start microphone:', err);
      }
    };
    void start();

    return () => {
      mounted = false;
      cancelAnimationFrame(frameId);
      mic?.stop();
    };
  }, [isSessionPlaying, sendData, micDeviceId, clientRole]);
};
