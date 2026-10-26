import type { InstrumentKind } from '../../../../modules/music-score';
import { SoundfontPlayer } from '../../logic/soundfontPlayer';
import { getStoredSoundConfig, resolveSoundfontName } from '../../logic/soundSettings';
import { STAGE_INSTRUMENTS } from '../logic/instruments';
import type { StageSound } from './types';

const MAX_VOICES = 48;

/** StageSound on a real AudioContext: soundfont instruments, synthesised drums and click. */
export class BrowserStageSound implements StageSound {
  readonly ctx: AudioContext;
  private master: GainNode;
  private noise: AudioBuffer;
  private soundfonts: SoundfontPlayer;
  private stoppers = new Set<() => void>();

  constructor() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.soundfonts = new SoundfontPlayer(this.ctx);
  }

  /** Browsers start audio only after a user gesture; call from a click or key handler. */
  resume() {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  now() {
    return this.ctx.currentTime;
  }

  playNote(inst: InstrumentKind, midi: number, durationSec: number, volume: number) {
    if (this.stoppers.size > MAX_VOICES) return;
    const config = getStoredSoundConfig();
    const category = STAGE_INSTRUMENTS[inst].sound;
    const voice = this.soundfonts.play(
      config.provider,
      resolveSoundfontName(undefined, category),
      category,
      midi,
      Math.min(Math.max(durationSec, 0.1), 3),
      volume,
      config.customBaseUrl,
    );
    this.stoppers.add(voice.stop);
    setTimeout(() => this.stoppers.delete(voice.stop), (durationSec + 0.2) * 1000);
  }

  playDrum(lane: number, volume: number) {
    if (lane === 0) this.burst(1.0, 0.2 * volume, 'highpass', 5000);
    else if (lane === 1) this.burst(0.06, 0.22 * volume, 'highpass', 7000);
    else if (lane === 2) {
      this.burst(0.18, 0.38 * volume, 'bandpass', 1800);
      this.sweep(220, 160, 0.1, 0.18 * volume);
    } else if (lane === 3) this.sweep(200, 95, 0.32, 0.5 * volume);
    else this.sweep(150, 42, 0.28, 0.9 * volume);
  }

  click(accent: boolean) {
    this.clickAt(performance.now(), accent, 0.08);
  }

  /** A click at `perfMs` (`performance.now()` time), placed exactly on the audio clock. */
  clickAt(perfMs: number, accent: boolean, volume = 0.3) {
    const t = this.ctx.currentTime + Math.max(0, (perfMs - performance.now()) / 1000);
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = accent ? 2093 : 1047;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.06);
  }

  stopAll() {
    this.stoppers.forEach((stop) => {
      try {
        stop();
      } catch {
        // already stopped
      }
    });
    this.stoppers.clear();
  }

  close() {
    this.stopAll();
    void this.ctx.close();
  }

  private burst(dur: number, vol: number, type: BiquadFilterType, freq: number) {
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  private sweep(f0: number, f1: number, dur: number, vol: number) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
