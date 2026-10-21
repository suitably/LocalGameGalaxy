import React from 'react';
import type { MicrophoneManager } from '../audio/MicrophoneManager';
import { LatencyCalibratorPanel } from './LatencyCalibratorPanel';
import { detectBeep } from './hooks/detectBeep';

interface RemoteLatencyCalibratorProps {
  onComplete: (latencyMs: number) => void;
  deviceId: string;
  sendClientCommand: (command: string, data?: Record<string, unknown>) => void;
}

/** Phone side: the host plays the beep, this phone's mic measures the round trip. */
export const RemoteLatencyCalibrator: React.FC<RemoteLatencyCalibratorProps> = ({
  onComplete,
  deviceId,
  sendClientCommand,
}) => {
  const measureOneSample = (mic: MicrophoneManager, threshold: number) => {
    const sample = detectBeep(mic, threshold, {
      startDelayMs: 10,
      // Room acoustics (10-30 ms) plus TV audio lag (50-200 ms) and network RTT (5-20 ms)
      minElapsedMs: 20,
      latencyOffsetMs: 0,
    });
    sendClientCommand('CALIBRATE_PLAY_BEEP');
    return sample;
  };

  return (
    <LatencyCalibratorPanel
      deviceId={deviceId}
      onComplete={onComplete}
      measureOneSample={measureOneSample}
    />
  );
};
