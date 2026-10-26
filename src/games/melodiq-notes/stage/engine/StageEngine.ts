import type { ScoreSong } from '../../../../modules/music-score';
import { lowerBound, type Judgement, type StageNote } from '../logic/charts';
import { pendingNotes, recordJudgement, type BeatRange } from '../logic/judging';
import { buildSections, sectionIndexAt, type Section } from '../logic/sections';
import { advanceMisses, advanceSinging, resetRange, startAwaitedNote, trackVoice } from './advance';
import { playLane, playPitch } from './input';
import { secPerBeatAt, seekStage, seekToFirstNote, syncRecording } from './transport';
import { buildBandEvents, createPlayers, defaultSeats, nextSeat } from './players';
import type {
  BandEvent,
  BandMode,
  PlayerSeat,
  PlayState,
  StageMode,
  StagePlayer,
  StageRecording,
  StageSound,
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
  seats: PlayerSeat[] = [];
  players: StagePlayer[] = [];
  focus: StagePlayer | null = null;
  mode: StageMode = 'learn';
  speed = 1;
  band: BandMode = 'others';
  /** With a recording, it replaces the band; this mutes it. */
  recordingAudible = true;
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
  private liveListeners = new Set<() => void>();
  private liveVersion = 0;

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

  /**
   * Progress while playing (position, section results, what learn mode waits for).
   * Only the small views that show it subscribe, so the page itself re-renders on
   * real changes (start, pause, song, players) and not several times per second.
   */
  subscribeLive = (fn: () => void) => {
    this.liveListeners.add(fn);
    return () => this.liveListeners.delete(fn);
  };
  getLiveVersion = () => this.liveVersion;
  notifyLive() {
    this.liveVersion++;
    this.liveListeners.forEach((fn) => fn());
  }

  emit() {
    this.version++;
    this.listeners.forEach((fn) => fn());
    this.notifyLive();
  }

  loadSong(song: ScoreSong, seats?: PlayerSeat[]) {
    this.song = song;
    this.sections = buildSections(song);
    this.seats = seats ?? defaultSeats(song);
    this.loop = null;
    this.reset();
  }

  /** Adds a player on a part nobody plays yet (up to four). */
  addPlayer() {
    const seat = this.song && nextSeat(this.song, this.seats);
    if (!seat) return;
    this.seats = [...this.seats, seat];
    this.reset();
  }

  removePlayer(index: number) {
    if (this.seats.length <= 1) return;
    this.seats = this.seats.filter((_, i) => i !== index);
    this.reset();
  }

  /** Changes which part a player plays, or the instrument it is shown as. */
  setSeat(index: number, change: Partial<PlayerSeat>) {
    const seat = this.seats[index];
    const part = change.partId && this.song?.parts.find((p) => p.id === change.partId);
    if (!seat) return;
    // a new part brings its own instrument unless one is chosen at the same time
    const inst = change.inst ?? (part ? part.guess : seat.inst);
    this.seats = this.seats.map((s, i) => (i === index ? { ...s, ...change, inst } : s));
    this.reset();
  }

  /** Back to the count-in with fresh players; keeps song, seats and loop. */
  reset() {
    this.sound.stopAll();
    this.recording?.pause();
    this.state = 'idle';
    if (!this.song) return this.emit();
    this.players = createPlayers(this.song, this.seats, this.sections.length, this.startBeat);
    this.focus = this.players.find((p) => !p.remoteId) ?? this.players[0] ?? null;
    this.countIn = Math.min(6, Math.max(2, this.song.measureLengths[0] ?? 4));
    this.bandEvents = this.bandFor(this.song, this.band);
    this.bandIdx = 0;
    this.beat = this.startBeat - this.countIn;
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

  /** What the synth plays; takes effect at once, also mid-song. */
  setBand(mode: BandMode) {
    this.band = mode;
    if (this.song) {
      this.bandEvents = this.bandFor(this.song, mode);
      this.bandIdx = lowerBound(this.bandEvents, this.beat);
    }
    this.emit();
  }

  setRecordingAudible(on: boolean) {
    this.recordingAudible = on;
    this.recording?.setVolume(on ? 1 : 0);
    this.emit();
  }

  /** First beat that is played: with a recording, its first bar (an intro it lacks is left out). */
  get startBeat() {
    return this.recording?.startBeat ?? 0;
  }

  setRecording(recording: StageRecording | null) {
    const from = this.startBeat;
    this.recording?.pause();
    this.recording = recording;
    recording?.setVolume(this.recordingAudible ? 1 : 0);
    // other bars are played now: back to the count-in
    if (this.startBeat !== from) this.reset();
    else this.emit();
  }

  /** Keys, MIDI and microphone of this screen only ever drive a player on this screen. */
  setFocus(player: StagePlayer) {
    if (player.remoteId) return;
    this.focus = player;
    this.emit();
  }

  focusNext() {
    const local = this.players.filter((p) => !p.remoteId);
    if (local.length < 2 || !this.focus) return;
    this.setFocus(local[(local.indexOf(this.focus) + 1) % local.length]);
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
  secPerBeat = (beat: number) => secPerBeatAt(this, beat);
  sectionAt = (beat: number) => sectionIndexAt(this.sections, beat);

  /** Advances the song by `dt` seconds of real time. */
  tick(dt: number) {
    const song = this.song;
    if (!song || this.state !== 'playing') return;
    const before = this.beat;
    const awaited = this.waitingFor?.pending[0];
    let next = this.beat + dt / this.secPerBeat(Math.max(0, this.beat));
    const rec = this.recording;
    if (rec?.isPlaying()) {
      const heard = rec.map.beatAt(rec.time());
      if (Math.abs(heard - next) < SYNC_SNAP_BEATS) next += (heard - next) * 0.25;
    }
    this.waitingFor = null;
    if (this.mode === 'learn') {
      // learn mode waits for the players on this screen; a pult follows the clock
      for (const p of this.players.filter((x) => !x.remoteId)) {
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
      if (p.remoteId) trackVoice(p, this.beat);
      else if (p.instrument.view === 'pitch') {
        if (this.waitingFor) startAwaitedNote(p);
        advanceSinging(p, this.beat, this.beat - before, this.loop, this.judge);
      } else if (this.mode !== 'learn')
        advanceMisses(p, this.beat, this.secPerBeat, this.loop, this.judge);
      p.pending = pendingNotes(p.notes, this.loop, p.instrument.view === 'pitch');
    }
    if (this.loop && this.beat >= this.loop.to) this.restartAt(this.loop.from);
    else if (!this.loop && this.beat >= song.end + 1) this.finish();
    syncRecording(this);
    if (
      this.waitingFor?.pending[0] !== awaited ||
      this.sectionAt(Math.max(0, before)) !== this.sectionAt(Math.max(0, this.beat))
    )
      this.notifyLive();
  }

  private bandFor(song: ScoreSong, mode: BandMode) {
    return buildBandEvents(song, this.seats, mode, this.countIn, this.startBeat);
  }

  private playBand(until: number) {
    while (this.bandIdx < this.bandEvents.length && this.bandEvents[this.bandIdx].t <= until) {
      const e = this.bandEvents[this.bandIdx++];
      if (e.kind === 'click') this.sound.click(!!e.accent);
      else if (this.recording || (this.loop && (e.t < this.loop.from || e.t >= this.loop.to)))
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
    this.rewindTo(from - Math.min(LOOP_LEAD_BEATS, this.countIn), from);
  }

  /** Puts the playhead on `beat` and makes everything from `from` on playable again. */
  rewindTo(beat: number, from: number) {
    const to = this.loop?.to ?? this.song?.end ?? 0;
    this.beat = beat;
    const first = this.sectionAt(from);
    for (const p of this.players) {
      resetRange(p, from, to, this.beat);
      for (let s = first; s < this.sections.length && this.sections[s].from < to; s++)
        p.stats.sections[s] = { weight: 0, count: 0, errors: 0 };
    }
    this.bandIdx = lowerBound(this.bandEvents, this.beat);
  }

  /** Jumps to `beat` (the timeline bar); earlier notes are skipped, later ones can be played. */
  seekTo(beat: number) {
    seekStage(this, beat, LOOP_LEAD_BEATS);
  }

  /** Jumps to `leadInSec` real seconds before the first note of any player. */
  jumpToFirstNote(leadInSec: number) {
    seekToFirstNote(this, leadInSec, LOOP_LEAD_BEATS);
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
