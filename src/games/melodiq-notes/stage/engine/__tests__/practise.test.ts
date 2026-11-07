import { describe, it, expect } from 'vitest';
import { StageEngine } from '../StageEngine';
import { heardBeat, practiseBars, stopPractising } from '../transport';
import { fakeSound, run, song } from './fixtures';

describe('practiseBars', () => {
  it('practising a bar from the results of a performance jumps there at 75 % in practice mode', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setMode('perform');
    e.start();
    run(e, 12);
    expect(e.state).toBe('done');
    practiseBars(e, 1, 2);
    e.start();
    expect(e.mode).toBe('practice');
    expect(e.speed).toBe(0.75);
    expect(e.loop).toEqual({ from: 4, to: 12 });
    expect(e.state).toBe('playing');
    expect(e.beat).toBeGreaterThanOrEqual(0);
    expect(e.beat).toBeLessThan(4);
  });
});

describe('loop pass hook (#638)', () => {
  it('reports every loop pass and lets the listener pause before it starts over', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    const seen: number[] = [];
    e.onLoopPass = (engine) => {
      seen.push(engine.beat);
      if (seen.length === 2) engine.pause();
    };
    e.setLoop(1, 2);
    e.start();
    run(e, 30);
    expect(seen).toHaveLength(2);
    expect(seen.every((b) => b >= 12)).toBe(true);
    expect(e.state).toBe('paused');
  });
});

describe('stopPractising (#664)', () => {
  it('ends the guided-practice loop and lets the song play on', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    practiseBars(e, 1, 1);
    e.start();
    run(e, 1);
    stopPractising(e);
    expect(e.loop).toBeNull();
    expect(e.state).toBe('playing');
    run(e, 10);
    expect(e.beat).toBeGreaterThan(8);
  });
});

describe('heardBeat', () => {
  it('draws the output latency behind the clock while playing, on the clock otherwise', () => {
    const sound = { ...fakeSound(), outputLatency: () => 0.25 };
    const e = new StageEngine(sound);
    e.loadSong(song());
    e.setMode('perform');
    expect(heardBeat(e)).toBe(e.beat);
    e.start();
    run(e, 3);
    // 120 bpm: 0.5 s per beat, so 0.25 s is half a beat
    expect(heardBeat(e)).toBeCloseTo(e.beat - 0.5);
    e.pause();
    expect(heardBeat(e)).toBe(e.beat);
  });
});
