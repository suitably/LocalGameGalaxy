import { describe, it, expect, vi } from 'vitest';
import { createAudioMap, type ScoreSong } from '../../../../../modules/music-score';
import { StageEngine } from '../StageEngine';
import { defaultSetups } from '../players';
import { playerResults, weakestSection } from '../results';
import type { StageRecording, StageSound } from '../types';

/** 4 bars of 4/4 at 120 bpm (0.5 s per beat): piano melody on every beat, bass on every bar, drums. */
function song(): ScoreSong {
  const melody = Array.from({ length: 16 }, (_, t) => ({ t, dur: 1, pitch: 60 + (t % 5) }));
  return {
    title: 'T',
    artist: '',
    source: 't',
    tempoMap: [{ beat: 0, bpm: 120 }],
    measureStarts: [0, 4, 8, 12],
    measureLengths: [4, 4, 4, 4],
    measureNumbers: [1, 2, 3, 4],
    end: 16,
    parts: [
      { id: 'piano', name: 'Piano', notes: melody, isDrum: false, program: 0, guess: 'keyboard' },
      {
        id: 'bass',
        name: 'Bass',
        notes: [0, 4, 8, 12].map((t) => ({ t, dur: 4, pitch: 36 })),
        isDrum: false,
        program: 33,
        guess: 'bass',
      },
      {
        id: 'drums',
        name: 'Drums',
        notes: [0, 1, 2, 3].map((t) => ({ t, dur: 0.25, pitch: 36 })),
        isDrum: true,
        program: null,
        guess: 'drums',
      },
    ],
  };
}

function fakeSound(): StageSound & { notes: number[]; clicks: number; drums: number } {
  const s = {
    notes: [] as number[],
    clicks: 0,
    drums: 0,
    now: () => 0,
    playNote: (_: unknown, midi: number) => s.notes.push(midi),
    playDrum: () => {
      s.drums++;
    },
    click: () => {
      s.clicks++;
    },
    stopAll: () => {},
  };
  return s;
}

const run = (e: StageEngine, seconds: number, step = 0.02) => {
  for (let t = 0; t < seconds - 1e-9; t += step) e.tick(step);
};

describe('StageEngine', () => {
  it('picks the keyboard player by default and lets the band play the rest', () => {
    const sound = fakeSound();
    const e = new StageEngine(sound);
    e.loadSong(song());
    expect(e.players.map((p) => p.part.id)).toEqual(['piano']);
    e.setMode('perform');
    e.start();
    run(e, 2 + 0.6); // count-in (4 beats) and a little more
    expect(sound.clicks).toBe(4);
    expect(sound.notes).toContain(36);
    expect(sound.drums).toBeGreaterThan(0);
    expect(sound.notes).not.toContain(60);
  });

  it('learn mode waits for the right note and counts wrong ones', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.start();
    run(e, 5);
    expect(e.beat).toBe(0);
    expect(e.waitingFor?.no).toBe(1);
    e.hit(65);
    expect(e.players[0].stats.sections[0].errors).toBe(1);
    e.hit(60);
    expect(e.players[0].notes[0].judged).toBe('learn');
    run(e, 0.6);
    expect(e.beat).toBe(1);
  });

  it('perform mode judges timing and misses notes that pass', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setMode('perform');
    e.start();
    run(e, 2.02); // count-in done, 0.02 s into beat 0
    e.hit(60);
    run(e, 1.0);
    const [first, second] = e.players[0].notes;
    expect(first.judged).toBe('perfect');
    expect(second.judged).toBe('miss');
    expect(e.players[0].stats.combo).toBe(0);
  });

  it('plays the whole song, finishes and reports results', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song(), defaultSetups(song(), 'band'));
    expect(e.players.map((p) => p.instrument.kind)).toEqual(['keyboard', 'drums', 'bass']);
    e.setMode('perform');
    e.start();
    run(e, 12);
    expect(e.state).toBe('done');
    const results = playerResults(e.players);
    expect(results.every((r) => r.accuracy === 0)).toBe(true);
    expect(weakestSection(e.focus)).toBe(0);
  });

  it('loops a practice section', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setLoop(1);
    expect(e.mode).toBe('practice');
    expect(e.loop).toEqual({ from: 4, to: 12 });
    e.start();
    run(e, 8);
    expect(e.beat).toBeGreaterThanOrEqual(2);
    expect(e.beat).toBeLessThan(12);
  });

  it('starts the recording after the count-in at the mapped position', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    const rec: StageRecording = {
      map: createAudioMap(song(), null, 1.5),
      duration: 30,
      time: () => 0,
      isPlaying: () => false,
      play: vi.fn(),
      pause: vi.fn(),
      setRate: vi.fn(),
      setVolume: vi.fn(),
    };
    e.setRecording(rec);
    e.setMode('perform');
    e.start();
    run(e, 1.9);
    expect(rec.play).not.toHaveBeenCalled();
    run(e, 0.2);
    expect(rec.play).toHaveBeenCalled();
    const [from] = (rec.play as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(from).toBeGreaterThanOrEqual(1.5);
    expect(from).toBeLessThan(1.6);
  });
});
