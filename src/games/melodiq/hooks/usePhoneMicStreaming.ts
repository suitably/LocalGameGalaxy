import { useEffect, useRef } from 'react';
import { MicrophoneManager } from '../audio/MicrophoneManager';
import { startSteadyTicker } from '../../../lib/utils/steadyTicker';
import { createLogger } from '../../../lib/logger';
import { micGainFactor } from '../logic/clientProfile';
import { createPitchBundler } from '../logic/pitchFrames';

const log = createLogger('PhoneClientEngine');

const SEND_INTERVAL_MS = 33;

interface Options {
  isSessionPlaying: boolean;
  /** The host scores this phone in the running song (see `logic/phoneSinging.ts`). */
  isSinging: boolean;
  micDeviceId?: string;
  /** Input gain in percent (see `ClientProfile.micGain`). */
  micGain?: number;
  sendData: (data: Record<string, unknown>) => void;
}

/**
 * Streams the singer's pitch to the host while a session is playing and this phone sings: a
 * detection about 30 times a second, sent as dated frames (`logic/pitchFrames.ts`, voiced only,
 * about 3 per message); the microphone is released otherwise to save battery. The ticks come from
 * `startSteadyTicker`, so the pitch keeps flowing while the browser is in the background.
 */
export const usePhoneMicStreaming = ({
  isSessionPlaying,
  isSinging,
  micDeviceId,
  micGain,
  sendData,
}: Options) => {
  const lastSendRef = useRef(0);
  const micRef = useRef<MicrophoneManager | null>(null);
  const gainRef = useRef(micGainFactor(micGain));

  // Gain changes apply to the running microphone without restarting it.
  useEffect(() => {
    gainRef.current = micGainFactor(micGain);
    micRef.current?.setGain(gainRef.current);
  }, [micGain]);

  useEffect(() => {
    if (!isSessionPlaying || !isSinging) return;

    let mounted = true;
    let mic: MicrophoneManager | null = null;
    let stopTicker: (() => void) | null = null;
    const bundler = createPitchBundler((message) => sendData({ ...message }));

    const tick = (active: MicrophoneManager) => {
      if (!mounted) return;
      const now = performance.now();
      if (now - lastSendRef.current < SEND_INTERVAL_MS - 5) return;
      const pitch = active.getPitch();
      bundler.push(pitch, now);
      window.dispatchEvent(new CustomEvent('melodiq_local_pitch', { detail: { pitch } }));
      lastSendRef.current = now;
    };

    const start = async () => {
      const next = new MicrophoneManager();
      mic = next;
      micRef.current = next;
      try {
        await next.start(micDeviceId, gainRef.current);
        if (!mounted) {
          next.stop();
          return;
        }
        log.debug('Microphone started successfully.');
        stopTicker = startSteadyTicker(SEND_INTERVAL_MS, () => tick(next));
      } catch (err) {
        console.error('[PhoneClientEngine] Failed to start microphone:', err);
      }
    };
    void start();

    return () => {
      mounted = false;
      stopTicker?.();
      if (micRef.current === mic) micRef.current = null;
      mic?.stop();
    };
  }, [isSessionPlaying, sendData, micDeviceId, isSinging]);
};
