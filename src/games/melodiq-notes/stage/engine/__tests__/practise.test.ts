import { describe, it, expect } from 'vitest';
import { StageEngine } from '../StageEngine';
import { practiseBars } from '../transport';
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
