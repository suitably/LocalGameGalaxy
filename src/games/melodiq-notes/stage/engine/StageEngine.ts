import { bpmAt, type ScoreSong } from '../../../../modules/music-score';
import { lowerBound, type Judgement, type StageNote } from '../logic/charts';
import { pendingNotes, recordJudgement, type BeatRange } from '../logic/judging';
import { buildSections, sectionIndexAt, type Section } from '../logic/sections';
import { advanceMisses, advanceSinging, resetRange, startAwaitedNote } from './advance';
import { playLane, playPitch } from './input';
import { syncRecording } from './transport';
import { buildBandEvents, createPlayers, defaultSetups } from './players';
import type {
  BandEvent,
  PlayState,
  StageMode,
  StagePlayer,
  StageRecording,
  StageSound,
  TrackSetup,
} from './types';

const BAND_VOLUME = 0.45;
const SILENT: StageSound = {
  now: () => 0,
  playNote: () => {},
  playDrum: () => {},
  click: () => {},
  stopAll: () => {},
};
const LOOP_LEAD_BEATS = 2;
const SYNC_SNAP_BEATS = 0.5;

/** The stage: song, players, clock, band and judging. Framework-free; React subscribes via `subscribe`. */
export class StageEngine {
  song: ScoreSong | null = null;
  sections: Section[] = [];
  setups: Record<string, TrackSetup> = {};
  players: StagePlayer[] = [];
  focus: StagePlayer | null = null;
  mode: StageMode = 'learn';
  speed = 1;
  band = true;
  state: PlayState = 'idle';
  beat = 0;
  countIn = 4;
  loop: BeatRange | null = null;
  waitingFor: StagePlayer | null = null;
  recording: StageRecording | null = null;
  private bandEvents: BandEvent[] = [];
  private bandIdx = 0;
  private listeners = new Set<() => void>();
  private version = 0;

  sound: StageSound;

  constructor(sound: StageSound = SILENT) {
    this.sound = sound;
  }

  /** Swaps the sound output (the browser one is created and closed with the mounted stage). */
  attachSound(sound: StageSound | null) {
    this.sound.stopAll();
    this.sound = sound ?? SILENT;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = () => this.version;
  /** Lets React re-read the state (the UI refreshes a few times per second while playing). */
  notify() {
    this.emit();
  }

  private emit() {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }

  loadSong(song: ScoreSong, setups?: Record<string, TrackSetup>) {
    this.song = song;
    this.sections = buildSections(song);
    this.setups = setups ?? defaultSetups(song);
    this.loop = null;
    this.reset();
  }

  setTrack(partId: string, change: Partial<TrackSetup>) {
    const prev = this.setups[partId];
    if (!prev) return;
    const rank = change.role === 'play' && prev.role !== 'play' ? Date.now() : prev.rank;
    this.setups = { ...this.setups, [partId]: { ...prev, ...change, rank } };
    this.reset();
  }

  applyPreset(preset: 'solo' | 'band') {
    if (!this.song) return;
    this.setups = defaultSetups(this.song, preset);
    this.reset();
  }

  /** Back to the count-in with fresh players; keeps song, setups and loop. */
  reset() {
    this.sound.stopAll();
    this.recording?.pause();
    this.state = 'idle';
    if (!this.song) return this.emit();
    this.players = createPlayers(this.song, this.setups, this.sections.length);
    this.focus = this.players[0] ?? null;
    this.countIn = Math.min(6, Math.max(2, this.song.measureLengths[0] ?? 4));
    this.bandEvents = buildBandEvents(this.song, this.setups, this.players, this.countIn);
    this.bandIdx = 0;
    this.beat = -this.countIn;
    this.waitingFor = null;
    if (this.loop) this.restartAt(this.loop.from);
    this.emit();
  }

  setMode(mode: StageMode) {
    this.mode = mode;
    if (mode === 'perform') {
      this.setSpeed(1);
      this.loop = null;
    } else if (mode === 'practice' && this.speed === 1) this.setSpeed(0.75);
    this.emit();
  }

  setSpeed(speed: number) {
    this.speed = speed;
    this.recording?.setRate(speed);
    this.emit();
  }

  setBand(on: boolean) {
    this.band = on;
    this.recording?.setVolume(on ? 1 : 0);
    this.emit();
  }

  setRecording(recording: StageRecording | null) {
    this.recording?.pause();
    this.recording = recording;
    recording?.setVolume(this.band ? 1 : 0);
    this.emit();
  }

  setFocus(player: StagePlayer) {
    this.focus = player;
    this.emit();
  }

  focusNext() {
    if (this.players.length < 2 || !this.focus) return;
    this.setFocus(this.players[(this.players.indexOf(this.focus) + 1) % this.players.length]);
  }

  /** Loops a practice section (and the next one when sections are single bars); null ends the loop. */
  setLoop(section: number | null) {
    if (section === null || this.mode === 'perform') {
      const had = this.loop;
      this.loop = null;
      // before the start, the playhead goes back to the count-in of bar 1
      if (had && this.state === 'idle') this.reset();
    } else {
      const s = this.sections[section];
      const end =
        this.sections[
          Math.min(this.sections.length - 1, section + (this.sections.length >= 16 ? 0 : 1))
        ];
      this.loop = { from: s.from, to: end.to };
      if (this.mode === 'learn') this.setMode('practice');
      if (this.state === 'done') this.reset();
      else this.restartAt(this.loop.from);
    }
    this.emit();
  }

  start() {
    if (!this.song || !this.players.length) return;
    if (this.state === 'done') this.reset();
    this.state = 'playing';
    this.emit();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.recording?.pause();
    this.sound.stopAll();
    this.emit();
  }

  /** Real seconds per beat at `beat`: the recording's tempo when one is attached, else the score's. */
  secPerBeat = (beat: number) => {
    if (!this.song) return 0.5;
    const map = this.recording?.map;
    const from = Math.max(0, beat - 0.5);
    const recorded = map ? map.secAt(from + 1) - map.secAt(from) : 0;
    return (recorded > 0 ? recorded : 60 / bpmAt(this.song.tempoMap, beat)) / this.speed;
  };
  sectionAt = (beat: number) => sectionIndexAt(this.sections, beat);

  /** Advances the song by `dt` seconds of real time. */
  tick(dt: number) {
    const song = this.song;
    if (!song || this.state !== 'playing') return;
    const before = this.beat;
    let next = this.beat + dt / this.secPerBeat(Math.max(0, this.beat));
    const rec = this.recording;
    if (rec?.isPlaying()) {
      const heard = rec.map.beatAt(rec.time());
      if (Math.abs(heard - next) < SYNC_SNAP_BEATS) next += (heard - next) * 0.25;
    }
    this.waitingFor = null;
    if (this.mode === 'learn') {
      for (const p of this.players) {
        p.pending = pendingNotes(p.notes, this.loop, p.instrument.view === 'pitch');
        const first = p.pending[0];
        if (
          first &&
          next >= first.t &&
          (!this.waitingFor || first.t < this.waitingFor.pending[0].t)
        )
          this.waitingFor = p;
      }
      if (this.waitingFor) next = Math.max(this.beat, this.waitingFor.pending[0].t);
    }
    this.playBand(next);
    this.beat = next;
    for (const p of this.players) {
      if (p.instrument.view === 'pitch') {
        if (this.waitingFor) startAwaitedNote(p);
        advanceSinging(p, this.beat, this.beat - before, this.loop, this.judge);
      } else if (this.mode !== 'learn')
        advanceMisses(p, this.beat, this.secPerBeat, this.loop, this.judge);
      p.pending = pendingNotes(p.notes, this.loop, p.instrument.view === 'pitch');
    }
    if (this.loop && this.beat >= this.loop.to) this.restartAt(this.loop.from);
    else if (!this.loop && this.beat >= song.end + 1) this.finish();
    syncRecording(this);
    this.version++;
  }

  private playBand(until: number) {
    while (this.bandIdx < this.bandEvents.length && this.bandEvents[this.bandIdx].t <= until) {
      const e = this.bandEvents[this.bandIdx++];
      if (e.kind === 'click') this.sound.click(!!e.accent);
      else if (
        !this.band ||
        this.recording ||
        (this.loop && (e.t < this.loop.from || e.t >= this.loop.to))
      )
        continue;
      else if (e.kind === 'drum') this.sound.playDrum(e.lane ?? 1, BAND_VOLUME);
      else
        this.sound.playNote(
          e.inst ?? 'keyboard',
          e.midi ?? 60,
          (e.dur ?? 1) * this.secPerBeat(e.t),
          BAND_VOLUME,
        );
    }
  }

  private restartAt(from: number) {
    const to = this.loop?.to ?? this.song?.end ?? 0;
    this.beat = from - Math.min(LOOP_LEAD_BEATS, this.countIn);
    const first = this.sectionAt(from);
    for (const p of this.players) {
      resetRange(p, from, to, this.beat);
      for (let s = first; s < this.sections.length && this.sections[s].from < to; s++)
        p.stats.sections[s] = { weight: 0, count: 0, errors: 0 };
    }
    this.bandIdx = lowerBound(this.bandEvents, this.beat);
  }

  /** Records a judgement and queues it for the renderer's effects. */
  judge = (p: StagePlayer, n: StageNote, kind: Judgement) => {
    n.judged = kind;
    recordJudgement(p.stats, this.sectionAt(n.t), kind);
    p.fx.push({ kind, note: n, lane: n.lane });
  };

  /** The focused player played `lane` (MIDI key, string, drum lane). */
  hit(lane: number) {
    playLane(this, lane);
  }

  /** A pitch from MIDI or microphone, mapped to what the focused player's instrument plays. */
  hitPitch(midi: number) {
    playPitch(this, midi);
  }

  /** The focused player's sung pitch (MIDI, fractional) and whether they are singing. */
  setVoice(pitch: number, singing: boolean) {
    if (this.focus) this.focus.voice = { pitch, singing };
  }

  private finish() {
    this.state = 'done';
    this.recording?.pause();
    this.emit();
  }
}
