import { describe, it, expect } from 'vitest';
import { StageEngine } from '../StageEngine';
import { fakeSound, song } from './fixtures';

describe('hitPitch sound', () => {
  it('plays the pitch on the instrument unless it is silent (microphone, MIDI sound off)', () => {
    const sound = fakeSound();
    const e = new StageEngine(sound);
    e.loadSong(song());
    e.hitPitch(64, true);
    expect(sound.notes).not.toContain(64);
    e.hitPitch(65);
    expect(sound.notes).toContain(65);
  });

  it('still lights the lane and judges a silent hit', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.start();
    for (let t = 0; t < 2.1; t += 0.02) e.tick(0.02);
    e.hitPitch(60, true);
    expect(e.players[0].notes[0].judged).toBe('learn');
    expect(e.players[0].pressed.has(60)).toBe(true);
  });
});
