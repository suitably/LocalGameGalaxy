/**
 * Beep-based latency calibration [ID: MOD-AUDIO-LATENCY-CALIBRATION]
 *
 * Measures the noise floor, then three beeps through `measureOneSample` (the caller decides
 * where the beep sounds: this device, a Melodiq host, a Melodiq Notes stage) and reports the
 * mean when the three agree within 40 ms. Used by Melodiq and Melodiq Notes.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MicrophoneManager } from '../MicrophoneManager';
import type { BeepSample } from './detectBeep';

const SAMPLES = 3;
const MAX_DEVIATION_MS = 40;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useLatencyCalibration(
  deviceId: string,
  onComplete: (latencyMs: number) => void,
  measureOneSample: (mic: MicrophoneManager, threshold: number) => Promise<BeepSample>,
) {
  const { t } = useTranslation();
  const k = useCallback(
    (key: string, opts?: Record<string, unknown>) => t(`latencyCalibrator.${key}`, opts),
    [t],
  );
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [message, setMessage] = useState('');
  const [volume, setVolume] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');
  const micRef = useRef<MicrophoneManager | null>(null);
  const volumeReqRef = useRef<number | null>(null);

  // Volume meter loop
  useEffect(() => {
    const updateVol = () => {
      if (micRef.current) setVolume(micRef.current.getCurrentVolume());
      volumeReqRef.current = requestAnimationFrame(updateVol);
    };
    updateVol();
    return () => {
      if (volumeReqRef.current !== null) cancelAnimationFrame(volumeReqRef.current);
    };
  }, []);

  const startCalibration = useCallback(async () => {
    setStatus('running');
    setMessage(k('noise'));
    setDebugInfo('');

    try {
      if (!micRef.current) micRef.current = new MicrophoneManager();
      await micRef.current.start(deviceId);
      if (!micRef.current.context) throw new Error('No audio context');

      // Noise floor
      let maxNoise = 0;
      const startNoise = Date.now();
      while (Date.now() - startNoise < 500) {
        maxNoise = Math.max(maxNoise, micRef.current.getCurrentVolume());
        await wait(20);
      }

      const threshold = Math.max(0.04, maxNoise * 4.0);
      setMessage(k('threshold', { percent: (threshold * 100).toFixed(1) }));
      await wait(500);

      const samples: number[] = [];
      let failures = 0;
      let lastPeak = 0;
      for (let i = 0; i < SAMPLES; i++) {
        setMessage(k('testing', { no: i + 1, total: SAMPLES }));
        await wait(200);
        const result = await measureOneSample(micRef.current, threshold);
        if (result.found) samples.push(result.latency);
        else {
          failures++;
          lastPeak = result.peak;
        }
        await wait(800);
      }

      micRef.current.stop();
      micRef.current = null;

      if (failures > 0) {
        setStatus('failed');
        setMessage(k('missed', { count: failures, total: SAMPLES }));
        setDebugInfo(
          k('missed_hint', {
            peak: (lastPeak * 100).toFixed(1),
            threshold: (threshold * 100).toFixed(1),
          }),
        );
        return;
      }

      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      const maxDev = Math.max(...samples.map((s) => Math.abs(s - avg)));
      if (maxDev > MAX_DEVIATION_MS) {
        setStatus('failed');
        setMessage(k('inconsistent', { ms: Math.round(maxDev) }));
      } else {
        setStatus('success');
        setMessage(k('done', { ms: Math.round(avg) }));
        onComplete(Math.round(avg));
      }
    } catch (err: unknown) {
      console.error(err);
      setStatus('failed');
      setMessage(k('error', { error: err instanceof Error ? err.message : String(err) }));
      micRef.current?.stop();
      micRef.current = null;
    }
  }, [deviceId, onComplete, measureOneSample, k]);

  return { status, message, volume, debugInfo, startCalibration };
}
