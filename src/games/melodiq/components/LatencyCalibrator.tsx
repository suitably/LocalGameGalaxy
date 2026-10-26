import React from 'react';
import type { MicrophoneManager } from '../audio/MicrophoneManager';
import {
  detectBeep,
  LatencyCalibratorPanel,
  type BeepSample,
} from '../../../modules/audio/latency';

interface LatencyCalibratorProps {
  onComplete: (latencyMs: number) => void;
  deviceId: string;
}

/** Beep scheduled this far after the measurement starts. */
const BEEP_OFFSET_MS = 100;

/** Plays a short square-wave beep through this device and measures when the mic hears it. */
function measureLocalBeep(mic: MicrophoneManager, threshold: number): Promise<BeepSample> {
  const ctx = mic.context;
  if (!ctx) return Promise.reject('No Context');

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.connect(gain);
  gain.connect(ctx.destination);

  const startTime = ctx.currentTime + BEEP_OFFSET_MS / 1000;
  osc.start(startTime);
  osc.stop(startTime + 0.1);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.setValueAtTime(0.8, startTime);
  gain.gain.setValueAtTime(0, startTime + 0.1);

  // Assumes Date.now() and ctx.currentTime run roughly in step on the same device.
  return detectBeep(mic, threshold, {
    startDelayMs: 90,
    minElapsedMs: 80,
    latencyOffsetMs: BEEP_OFFSET_MS,
  });
}

export const LatencyCalibrator: React.FC<LatencyCalibratorProps> = ({ onComplete, deviceId }) => (
  <LatencyCalibratorPanel
    deviceId={deviceId}
    onComplete={onComplete}
    measureOneSample={measureLocalBeep}
  />
);
