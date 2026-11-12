export interface ScheduleBeepOptions {
  type: OscillatorType;
  frequencyHz: number;
  /** Absolute AudioContext time the beep starts; defaults to now. */
  startTime?: number;
  durationSec: number;
  peakGain: number;
  /** 'step' switches the gain instantly; 'ramp' fades in over rampSec and out to durationSec. */
  envelope: 'step' | 'ramp';
  rampSec?: number;
}

/** Plays one oscillator beep on a caller-owned AudioContext (shared by the latency calibrators). */
export function scheduleBeep(ctx: AudioContext, o: ScheduleBeepOptions): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.frequencyHz, ctx.currentTime);
  const start = o.startTime ?? ctx.currentTime;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  if (o.envelope === 'step') {
    gain.gain.setValueAtTime(o.peakGain, start);
    gain.gain.setValueAtTime(0, start + o.durationSec);
  } else {
    gain.gain.linearRampToValueAtTime(o.peakGain, start + (o.rampSec ?? 0.01));
    gain.gain.linearRampToValueAtTime(0, start + o.durationSec);
  }
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + o.durationSec + (o.envelope === 'ramp' ? 0.01 : 0));
}
