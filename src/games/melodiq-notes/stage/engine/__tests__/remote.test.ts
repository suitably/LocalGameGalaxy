import { describe, it, expect } from 'vitest';
import { StageEngine } from '../StageEngine';
import { applyRemoteJudged, seatRemotes, showRemoteInput } from '../remote';
import { fakeSound, run, song } from './fixtures';

describe('StageEngine with pults', () => {
  it('seats a pult, never judges it itself and merges what the pult judged', () => {
    const sound = fakeSound();
    const e = new StageEngine(sound);
    e.loadSong(song());
    seatRemotes(e, [{ id: 'a', name: 'Ann', partId: 'piano', inst: 'keyboard' }]);
    expect(e.players[0]).toMatchObject({ remoteId: 'a', name: 'Ann' });
    // local keys must not drive the pult's player
    expect(e.focus).toBeNull();
    e.setMode('perform');
    e.start();
    run(e, 4);
    e.hit(60);
    expect(e.players[0].notes.every((n) => n.judged === null)).toBe(true);
    const score = { score: 100, combo: 1, maxCombo: 1, judged: 1, weightSum: 1 };
    applyRemoteJudged(e, 'a', { seq: 1, marks: [[0, 'perfect']], score });
    expect(e.players[0].notes[0].judged).toBe('perfect');
    // an older batch arriving late changes nothing
    applyRemoteJudged(e, 'a', { seq: 0, marks: [[1, 'miss']], score: { ...score, score: 0 } });
    expect(e.players[0].notes[1].judged).toBeNull();
    expect(e.players[0].stats.score).toBe(100);
    showRemoteInput(e, 'a', { kind: 'lane', lane: 62 });
    expect(e.players[0].pressed.has(62)).toBe(true);
    expect(sound.notes).not.toContain(62);
    seatRemotes(e, []);
    expect(e.players[0].remoteId).toBeUndefined();
  });

  it('seats a pult joining mid-song at once and keeps the others playing', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setMode('perform');
    e.start();
    run(e, 2.02);
    e.hit(60);
    run(e, 1);
    const local = e.players[0];
    seatRemotes(e, [{ id: 'b', name: 'Ben', partId: 'bass', inst: 'bass' }]);
    expect(e.state).toBe('playing');
    expect(e.players[0]).toBe(local);
    expect(e.players[0].notes[0].judged).toBe('perfect');
    expect(e.players.map((p) => [p.no, p.remoteId])).toEqual([
      [1, undefined],
      [2, 'b'],
    ]);
    expect(e.players[1].missIdx).toBeGreaterThan(0);
    expect(e.focus).toBe(local);
    e.setFocus(e.players[1]);
    expect(e.focus).toBe(local);
  });

  it('learn mode waits for a pult player practising alone until the pult judged the note', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    seatRemotes(e, [{ id: 'a', name: 'Ann', partId: 'piano', inst: 'keyboard' }]);
    e.start();
    run(e, 3);
    expect(e.waitingFor).toBe(e.players[0]);
    expect(e.beat).toBe(0);
    const score = { score: 100, combo: 1, maxCombo: 1, judged: 1, weightSum: 1 };
    applyRemoteJudged(e, 'a', { seq: 1, marks: [[0, 'learn']], score });
    run(e, 0.6);
    expect(e.beat).toBe(1);
  });

  it('keeps learn mode for one player: a second player switches to practice', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    expect(e.mode).toBe('learn');
    e.start();
    seatRemotes(e, [{ id: 'b', name: 'Ben', partId: 'bass', inst: 'bass' }]);
    expect(e.mode).toBe('practice');
    e.setMode('learn');
    expect(e.mode).toBe('practice');
    seatRemotes(e, []);
    e.setMode('learn');
    expect(e.mode).toBe('learn');
  });

  it('judges input on this screen at the beat the player heard', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.inputLatencyMs = 100;
    e.setMode('perform');
    e.start();
    run(e, 2.1); // beat 0.2; the player heard beat 0
    e.hit(60);
    expect(e.players[0].notes[0].judged).toBe('perfect');
  });
});
