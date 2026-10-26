import { describe, it, expect } from 'vitest';
import { StageEngine } from '../StageEngine';
import { applyRemoteJudged, seatRemotes, showRemoteInput } from '../remote';
import { fakeSound, run, song } from './stageFixtures';

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

  it('learn mode waits for the players on this screen only', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    seatRemotes(e, [{ id: 'a', name: 'Ann', partId: 'piano', inst: 'keyboard' }]);
    e.start();
    run(e, 3);
    expect(e.waitingFor).toBeNull();
    expect(e.beat).toBeGreaterThan(1);
  });
});
