import { describe, expect, it } from 'vitest';
import { StageEngine } from '../StageEngine';
import { fakeSound, song } from './fixtures';

describe('StageEngine seek before the start', () => {
  it('shows a jump made before the start, and starts playing from there', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setMode('perform');
    e.seekTo(8);
    expect(e.state).toBe('paused');
    e.start();
    expect(e.state).toBe('playing');
    expect(e.beat).toBe(8);
  });
});
