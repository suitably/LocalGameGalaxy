/**
 * The stage engine on a pult: one player, judged here, on the stage's clock [ID: GAME-MELODIQ-NOTES-PULT-ENGINE]
 *
 * Plays the part the stage sent (`loadChart`) and follows the stage's transport (`applyClock`)
 * instead of running its own: no band, no count-in of its own, seeks and loops come from the
 * stage. The whole part runs `inputLatencyMs` behind the stage clock (tap-along calibration: how
 * late the player hears the stage and how late their input arrives), so the notes cross the line
 * when the player hears them and input is judged against that. Network delay never enters the
 * judging: input is stamped here, only the clock offset (clockSync) depends on the network.
 * The judgements are collected for the stage (`takeBatch`).
 */
import { drumLaneOf } from '../../../modules/music-score';
import { advanceMisses, advanceSinging } from '../stage/engine/advance';
import { playLane, playPitch, type PlayAt } from '../stage/engine/input';
import { StageEngine } from '../stage/engine/StageEngine';
import type { StageSound } from '../stage/engine/types';
import { pendingNotes } from '../stage/logic/judging';
import { toStageTime } from './logic/clockSync';
import type { JudgedMark, PultInput, PultScore, StageClock } from './logic/protocol';
import { unpackChart, type PackedChart } from './logic/pultSong';
import { scoreOf } from './logic/remoteHits';
import { followBeat, REWIND_BEATS, stageBeatAt } from './logic/stageClock';

/** The sung pitch goes to the stage at most this often. */
const VOICE_EVERY_MS = 80;

export class PultEngine extends StageEngine {
  songKey: string | null = null;
  clock: StageClock | null = null;
  /** Stage time − local time (ms), from clockSync; null until measured. */
  offset: number | null = null;
  /** What the player played, for the stage's display. */
  onInput: ((input: PultInput) => void) | null = null;
  private marks: JudgedMark[] = [];
  private seq = 0;
  private lastVoice = { at: -Infinity, singing: false };
  private rate = 2;
  private now: () => number;

  constructor(sound?: StageSound, now: () => number = () => performance.now()) {
    super(sound);
    this.now = now;
    this.band = 'none';
    const judge = this.judge;
    this.judge = (p, n, kind) => {
      judge(p, n, kind);
      this.marks.push([n.id, kind]);
    };
  }

  setOffset(offset: number | null) {
    this.offset = offset;
  }

  setOnInput(fn: ((input: PultInput) => void) | null) {
    this.onInput = fn;
  }

  /** The stage's tempo (last one while paused); the score's own does not know the recording or the speed. */
  secPerBeat = () => 1 / this.rate;

  /** The part this pult plays; the stage builds the same chart for its seat. */
  loadChart(chart: PackedChart, inst = chart.part.guess) {
    this.songKey = chart.songKey;
    this.marks = [];
    this.loadSong(unpackChart(chart), [{ partId: chart.part.id, inst }]);
    if (this.clock) this.applyClock(this.clock);
  }

  /** Bars before the stage's recording are left out here too, so both sides play the same notes. */
  get startBeat() {
    return this.clock?.startBeat ?? 0;
  }

  /** The stage's latest transport; in learn mode the stage waits until this pult's judgement arrives. */
  applyClock(clock: StageClock) {
    const from = this.startBeat;
    this.clock = clock;
    if (clock.rate > 0) this.rate = clock.rate;
    if (clock.songKey !== this.songKey || !this.song) return;
    this.mode = clock.mode;
    this.loop = clock.loop;
    if (from !== clock.startBeat) this.reset();
    else if (clock.play === this.state) return;
    // back to the start (or a new round after the end): fresh notes and score, like the stage
    else if (clock.play === 'idle' || this.state === 'done') this.reset();
    if (clock.play === 'idle' || clock.play === this.state) return;
    this.state = clock.play;
    this.emit();
  }

  /** The stage time this player hears and plays to now. */
  private stageNow() {
    return this.offset === null ? null : toStageTime(this.now(), this.offset, this.inputLatencyMs);
  }

  tick(dt: number) {
    const clock = this.clock;
    const stageNow = this.stageNow();
    if (!this.song || !clock || stageNow === null || clock.songKey !== this.songKey) return;
    const target = stageBeatAt(clock, stageNow);
    if (target < this.beat - REWIND_BEATS) this.rewindTo(target, target);
    if (this.state !== 'playing') {
      this.beat = target;
      return;
    }
    const before = this.beat;
    this.beat = followBeat(this.beat, target, dt, clock.rate);
    for (const p of this.players) {
      if (p.instrument.view === 'pitch')
        advanceSinging(p, this.beat, Math.max(0, this.beat - before), this.loop, this.judge);
      else if (this.mode !== 'learn')
        advanceMisses(p, this.beat, this.secPerBeat, this.loop, this.judge);
      p.pending = pendingNotes(p.notes, this.loop, p.instrument.view === 'pitch');
    }
  }

  /** Who played and when: the stage beat of the moment the player played, latency removed. */
  private inputAt(): PlayAt {
    const clock = this.clock;
    const stageNow = this.stageNow();
    const beat =
      clock && stageNow !== null && clock.songKey === this.songKey
        ? stageBeatAt(clock, stageNow)
        : this.beat;
    return { player: this.focus, beat, silent: false };
  }

  hit(lane: number) {
    playLane(this, lane, undefined, this.inputAt());
    this.onTap?.(this.now());
    this.onInput?.({ kind: 'lane', lane });
  }

  hitPitch(midi: number) {
    const view = this.focus?.instrument.view;
    playPitch(this, midi, this.inputAt());
    this.onTap?.(this.now());
    if (view === 'keys') this.onInput?.({ kind: 'lane', lane: midi });
    else if (view === 'drums') this.onInput?.({ kind: 'lane', lane: drumLaneOf(midi) });
  }

  setVoice(pitch: number, singing: boolean) {
    if (singing && this.focus && !this.focus.voice.singing) this.onTap?.(this.now());
    if (this.focus) this.focus.voice = { pitch, singing };
    const now = this.now();
    if (singing === this.lastVoice.singing && now - this.lastVoice.at < VOICE_EVERY_MS) return;
    this.lastVoice = { at: now, singing };
    this.onInput?.({ kind: 'voice', pitch: singing ? pitch : null });
  }

  /** Judgements since the last call plus the totals, or null when nothing was judged. */
  takeBatch(): { seq: number; marks: JudgedMark[]; score: PultScore } | null {
    const p = this.players[0];
    if (!p || !this.marks.length) return null;
    const marks = this.marks;
    this.marks = [];
    return { seq: ++this.seq, marks, score: scoreOf(p.stats) };
  }
}
