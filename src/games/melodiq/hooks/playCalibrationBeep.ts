/** Plays a short 880 Hz beep used by the remote latency calibration. */
export function playCalibrationBeep(): void {
  const ctx = new window.AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);

  osc.connect(gain);
  gain.connect(ctx.destination);

  const startTime = ctx.currentTime + 0.05;
  osc.start(startTime);
  osc.stop(startTime + 0.15);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.setValueAtTime(1.0, startTime);
  gain.gain.setValueAtTime(0, startTime + 0.15);

  setTimeout(() => ctx.close(), 500);
}
