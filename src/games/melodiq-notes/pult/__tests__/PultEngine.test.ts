import { describe, expect, it } from 'vitest';
import type { ScoreSong } from '../../../../modules/music-score';
import type { StageSound } from '../../stage/engine/types';
import { PultEngine } from '../PultEngine';
import type { StageClock } from '../logic/protocol';
import { packChart, songKeyOf } from '../logic/pultSong';

/** Piano on every beat at 120 bpm (0.5 s per beat). */
function song(): ScoreSong {
  return {
    title: 'T',
    artist: '',
    source: 't',
    tempoMap: [{ beat: 0, bpm: 120 }],
    measureStarts: [0, 4],
    measureLengths: [4, 4],
    measureNumbers: [1, 2],
    end: 8,
    parts: [
      {
        id: 'piano',
        name: 'Piano',
        notes: Array.from({ length: 8 }, (_, t) => ({ t, dur: 1, pitch: 60 })),
        isDrum: false,
        program: 0,
        guess: 'keyboard',
      },
      {
        id: 'bass',
        name: 'Bass',
        notes: [{ t: 0, dur: 4, pitch: 36 }],
        isDrum: false,
        program: 33,
        guess: 'bass',
      },
    ],
  };
}

const silent: StageSound = {
  now: () => 0,
  playNote: () => {},
  playDrum: () => {},
  click: () => {},
  stopAll: () => {},
};

/** A pult whose clock is 1000 ms behind the stage; `time.ms` is its local time. */
function pult() {
  const time = { ms: 0 };
  const e = new PultEngine(silent, () => time.ms);
  e.offset = 1000;
  e.loadChart(packChart(song(), 'piano')!);
  return { e, time };
}

const clock = (over: Partial<StageClock>): StageClock => ({
  songKey: songKeyOf(song()),
  at: 1000,
  beat: 0,
  startBeat: 0,
  rate: 2,
  play: 'playing',
  mode: 'perform',
  loop: null,
  ...over,
});

const run = (e: PultEngine, time: { ms: number }, seconds: number) => {
  for (let t = 0; t < seconds - 1e-9; t += 0.02) {
    time.ms += 20;
    e.tick(0.02);
  }
};

describe('PultEngine', () => {
  it('plays only its part and follows the stage clock', () => {
    const { e, time } = pult();
    expect(e.players.map((p) => p.part.id)).toEqual(['piano']);
    e.applyClock(clock({}));
    expect(e.state).toBe('playing');
    run(e, time, 1);
    expect(e.beat).toBeCloseTo(2, 1);
  });

  it('judges input at the stage beat it was played, minus the input latency', () => {
    const { e, time } = pult();
    e.applyClock(clock({}));
    e.inputLatencyMs = 100;
    run(e, time, 0.6); // stage beat 1.2; played 100 ms earlier → beat 1.0
    e.hit(60);
    expect(e.players[0].notes[1].judged).toBe('perfect');
    const batch = e.takeBatch()!;
    expect(batch.marks).toContainEqual([1, 'perfect']);
    expect(batch.score.score).toBe(e.players[0].stats.score);
    expect(batch.seq).toBe(1);
  });

  it('marks notes nobody played as missed and sends them', () => {
    const { e, time } = pult();
    e.applyClock(clock({}));
    run(e, time, 1);
    const batch = e.takeBatch()!;
    expect(batch.marks.map(([, k]) => k)).toEqual(['miss', 'miss']);
    expect(e.takeBatch()).toBeNull();
  });

  it('judges like practice in learn mode, since the stage does not wait for a pult', () => {
    const { e } = pult();
    e.applyClock(clock({ mode: 'learn' }));
    expect(e.mode).toBe('practice');
  });

  it('starts over when the stage goes back to the start and rewinds on loops', () => {
    const { e, time } = pult();
    e.applyClock(clock({}));
    run(e, time, 1.5);
    expect(e.players[0].notes[0].judged).toBe('miss');
    // the stage loops back to beat 0
    e.applyClock(clock({ at: 1000 + time.ms, beat: 0 }));
    e.tick(0.02);
    expect(e.players[0].notes[0].judged).toBeNull();
    e.applyClock(clock({ play: 'idle', beat: -4 }));
    expect(e.state).toBe('idle');
    expect(e.players[0].stats.judged).toBe(0);
  });

  it('ignores a clock for another song until its chart arrives', () => {
    const { e } = pult();
    e.applyClock(clock({ songKey: 'other' }));
    expect(e.state).toBe('idle');
  });

  it('reports what was played for the stage display', () => {
    const { e } = pult();
    const sent: unknown[] = [];
    e.onInput = (input) => sent.push(input);
    e.hit(62);
    e.hitPitch(64);
    expect(sent).toEqual([
      { kind: 'lane', lane: 62 },
      { kind: 'lane', lane: 64 },
    ]);
  });
});

describe('PultEngine with a recording that starts later', () => {
  it('leaves out the bars before the stage starts, like the stage', () => {
    const { e, time } = pult();
    e.applyClock(clock({ startBeat: 4, beat: 0 }));
    expect(e.players[0].notes[0].t).toBe(4);
    expect(e.players[0].notes[0].id).toBe(4);
    run(e, time, 1);
    expect(e.takeBatch()).toBeNull();
  });
});
