/** Shared song, sound and clock helpers for the stage engine tests. */
import type { ScoreSong } from '../../../../../modules/music-score';
import type { StageEngine } from '../StageEngine';
import type { StageSound } from '../types';

/** 4 bars of 4/4 at 120 bpm (0.5 s per beat): piano melody on every beat, bass on every bar, drums. */
export function song(): ScoreSong {
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

export function fakeSound(): StageSound & { notes: number[]; clicks: number; drums: number } {
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

export const run = (e: StageEngine, seconds: number, step = 0.02) => {
  for (let t = 0; t < seconds - 1e-9; t += step) e.tick(step);
};
