import { describe, it, expect, vi } from 'vitest';
import { createAudioMap } from '../../../../../modules/music-score';
import { StageEngine } from '../StageEngine';
import { fakeRecording, fakeSound, run, song } from './fixtures';
import { buildBandEvents, nextSeat } from '../players';
import { nothingLeftToPlay } from '../transport';
import { playerResults, weakestSection } from '../results';
import type { StageRecording } from '../types';

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
    expect(e.beat).toBeCloseTo(0.28); // runs on LEARN_LATE_SEC (0.14 s = 0.28 beats) past the note
    expect(e.waitingFor?.no).toBe(1);
    e.hit(65);
    expect(e.players[0].stats.sections[0].errors).toBe(1);
    e.hit(60);
    expect(e.players[0].notes[0].judged).toBe('learn');
    run(e, 0.6);
    expect(e.beat).toBeCloseTo(1.28);
  });

  it('learn mode takes a slightly late hit without stopping and an early one within LEARN_EARLY_SEC', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.start();
    run(e, 2.1); // 0.1 s past note 0
    expect(e.waitingFor).toBeNull();
    e.hit(60);
    expect(e.players[0].notes[0].judged).toBe('learn');
    run(e, 0.1); // 0.3 s before note 1: too early, but no error while the song runs
    e.hit(61);
    expect(e.players[0].notes[1].judged).toBeNull();
    expect(e.players[0].stats.sections[0].errors).toBe(0);
    run(e, 0.1); // 0.2 s before note 1
    e.hit(61);
    expect(e.players[0].notes[1].judged).toBe('learn');
  });

  it('learn mode takes the awaited note however large the input latency is', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.configureInput({ inputLatencyMs: 400 });
    e.start();
    run(e, 5);
    expect(e.waitingFor?.no).toBe(1);
    e.hit(60);
    expect(e.players[0].notes[0].judged).toBe('learn');
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
    e.loadSong(song());
    e.addPlayer();
    e.addPlayer();
    expect(e.players.map((p) => p.instrument.kind)).toEqual(['keyboard', 'drums', 'bass']);
    e.setMode('perform');
    e.start();
    run(e, 12);
    expect(e.state).toBe('done');
    const results = playerResults(e.players);
    expect(results.every((r) => r.accuracy === 0)).toBe(true);
    expect(weakestSection(e.focus)).toBe(0);
  });

  it('adds players on free parts, up to the parts there are, and keeps at least one', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    expect(e.seats).toHaveLength(1);
    e.addPlayer();
    e.addPlayer();
    e.addPlayer();
    expect(e.seats.map((s) => s.partId)).toEqual(['piano', 'drums', 'bass']);
    expect(nextSeat(song(), e.seats)).toBeNull();
    e.setSeat(2, { partId: 'piano' });
    expect(e.seats[2]).toEqual({ partId: 'piano', inst: 'keyboard' });
    e.removePlayer(0);
    e.removePlayer(0);
    e.removePlayer(0);
    expect(e.players.map((p) => p.part.id)).toEqual(['piano']);
  });

  it('band mode decides which parts the synth plays', () => {
    const seats = [{ partId: 'piano', inst: 'keyboard' as const }];
    const notes = (mode: 'all' | 'others' | 'none') =>
      buildBandEvents(song(), seats, mode, 4).filter((ev) => ev.kind !== 'click').length;
    expect(notes('all')).toBe(16 + 4 + 4);
    expect(notes('others')).toBe(4 + 4);
    expect(notes('none')).toBe(0);

    const sound = fakeSound();
    const e = new StageEngine(sound);
    e.loadSong(song());
    e.setMode('perform');
    e.setBand('none');
    e.start();
    run(e, 4);
    expect(sound.clicks).toBe(4);
    expect(sound.notes).toHaveLength(0);
    e.setBand('all');
    run(e, 1);
    // from now on the player's own part (piano, 60–64) is heard too
    expect(sound.notes.some((m) => m >= 60)).toBe(true);
  });

  it('loops a practice section', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setLoop(1, 2);
    expect(e.mode).toBe('practice');
    expect(e.loop).toEqual({ from: 4, to: 12 });
    e.start();
    run(e, 8);
    expect(e.beat).toBeGreaterThanOrEqual(2);
    expect(e.beat).toBeLessThan(12);
  });

  it('starts at the chosen section when one is picked before the start', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setLoop(1);
    expect(e.beat).toBeLessThan(4);
    expect(e.beat).toBeGreaterThan(0);
    e.setLoop(null);
    expect(e.beat).toBe(-4);
  });

  it('follows the tempo of the recording, not the score', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    // the recording plays the 120 bpm score at 100 bpm: 0.6 s per beat
    const marks = [0, 4, 8, 12, 16].map((beat) => ({ beat, sec: beat * 0.6 }));
    let now = 0;
    e.setRecording({
      map: createAudioMap(song(), marks, 0),
      duration: 30,
      time: () => now,
      isPlaying: () => false,
      play: vi.fn(),
      pause: vi.fn(),
      setRate: vi.fn(),
      setVolume: vi.fn(),
    });
    expect(e.secPerBeat(6)).toBeCloseTo(0.6);
    e.setMode('perform');
    e.start();
    run(e, 2.4 + 3); // count-in, then 3 s = 5 beats
    now = 3;
    expect(e.beat).toBeCloseTo(5, 1);
  });

  it('keeps the count-in over a short intro and plays the recording from its 0:00 within it', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    // 1.5 s intro = 3 beats, shorter than the 4-beat count-in
    const rec = fakeRecording(createAudioMap(song(), null, 1.5));
    e.setRecording(rec);
    expect(e.beat).toBe(-e.countIn);
    e.setMode('perform');
    e.start();
    run(e, 0.4);
    expect(rec.play).not.toHaveBeenCalled();
    run(e, 0.2);
    const [from] = (rec.play as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(from).toBeGreaterThanOrEqual(0);
    expect(from).toBeLessThan(0.1);
  });

  it('plays a long intro from the 0:00 of the recording instead of the count-in', () => {
    const sound = fakeSound();
    const e = new StageEngine(sound);
    e.loadSong(song());
    // 4.5 s intro = 9 beats at 120 bpm
    const rec = fakeRecording(createAudioMap(song(), null, 4.5));
    e.setRecording(rec);
    expect(e.firstBeat).toBeCloseTo(-9);
    expect(e.beat).toBeCloseTo(-9);
    e.setMode('perform');
    e.start();
    run(e, 0.1);
    const [from] = (rec.play as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(from).toBeLessThan(0.1);
    run(e, 4.5);
    expect(sound.clicks).toBe(0);
    e.seekTo(-100);
    expect(e.beat).toBeCloseTo(-9);
  });

  it('leaves out bars before the recording starts (an intro it lacks)', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    // bars 1-2 lie before the recording, bar 3 starts at 0 s
    const marks = [0, 4, 8, 12, 16].map((beat) => ({ beat, sec: (beat - 8) * 0.5 }));
    const rec: StageRecording = {
      map: createAudioMap(song(), marks, 0),
      startBeat: 8,
      duration: 30,
      time: () => 0,
      isPlaying: () => false,
      play: vi.fn(),
      pause: vi.fn(),
      setRate: vi.fn(),
      setVolume: vi.fn(),
    };
    e.setRecording(rec);
    expect(e.beat).toBe(8 - e.countIn);
    expect(e.players[0].notes[0].t).toBe(8);
    e.setMode('perform');
    e.start();
    run(e, 2.04);
    const [from] = (rec.play as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(from).toBeGreaterThanOrEqual(0);
    expect(from).toBeLessThan(0.1);
    e.seekTo(0);
    expect(e.beat).toBe(8 - e.countIn);
  });

  it('seeks on the timeline and jumps to the first note with a lead-in', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setMode('perform');
    e.start();
    run(e, 5);
    e.seekTo(8);
    expect(e.beat).toBe(8);
    expect(e.players[0].notes[8].judged).toBeNull();
    expect(e.players[0].missIdx).toBe(8);
    e.seekTo(1000);
    expect(e.beat).toBe(16);
    // first note is at beat 0; 3 s at 0.5 s per beat = 6 beats, clamped to the count-in
    e.jumpToFirstNote(3);
    expect(e.beat).toBe(-e.countIn);
    e.seekTo(10);
    e.jumpToFirstNote(1);
    expect(e.beat).toBe(-2);
  });

  it('loops the bars between two picked ones in either order', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setLoop(3, 1);
    expect(e.loop).toEqual({ from: 4, to: 16 });
    e.setLoop(2);
    expect(e.loop).toEqual({ from: 8, to: 12 });
  });

  it('skips to the results once nobody has notes left', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setMode('perform');
    e.start();
    run(e, 2);
    expect(nothingLeftToPlay(e)).toBe(false);
    e.skipToEnd();
    expect(e.state).toBe('playing');
    // the piano's last note (beat 15) ends at beat 16 = the song's end, so cut the song longer
    e.song = { ...e.song!, end: 24 };
    e.seekTo(16.5);
    expect(nothingLeftToPlay(e)).toBe(true);
    e.skipToEnd();
    expect(e.state).toBe('done');
    expect(e.beat).toBe(24);
  });

  it('ends a loop when the seek leaves it', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song());
    e.setLoop(1);
    expect(e.loop).not.toBeNull();
    e.seekTo(12);
    expect(e.loop).toBeNull();
  });

  it('an e-drum kit switches the focused player to the drum part before playing (#601)', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song(), [
      { partId: 'piano', inst: 'keyboard' },
      { partId: 'bass', inst: 'bass' },
    ]);
    e.setFocus(e.players[1]);
    e.autoDrumView();
    expect(e.seats[1]).toMatchObject({ partId: 'drums', inst: 'drums' });
    expect(e.seats[0]).toMatchObject({ partId: 'piano', inst: 'keyboard' });
    expect(e.focus?.no).toBe(2);
  });

  it('the drum kit never overrides a chosen seat or a running song (#601)', () => {
    const e = new StageEngine(fakeSound());
    e.loadSong(song(), [{ partId: 'piano', inst: 'keyboard', chosen: true }]);
    e.autoDrumView();
    expect(e.seats[0].inst).toBe('keyboard');

    e.loadSong(song(), [{ partId: 'piano', inst: 'keyboard' }]);
    e.start();
    e.autoDrumView();
    expect(e.seats[0].inst).toBe('keyboard');
  });
});
