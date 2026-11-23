import { describe, expect, it, vi } from 'vitest';
import type { ScorePart, ScoreSong } from '../../../modules/music-score';
import type { SongScore, StoredBarMarks } from '../../../lib/companion/songScoresApi';
import {
  isSingableServerSong,
  loadScoreVocals,
  marksForMix,
  scoreCandidates,
  ScoreVocalsLoadError,
} from './scoreVocals';

const part = (id: string, guess: ScorePart['guess']): ScorePart => ({
  id,
  name: id,
  guess,
  isDrum: false,
  program: null,
  notes: [
    { t: 0, dur: 2, pitch: 64, syl: 'la' },
    { t: 4, dur: 2, pitch: 67, syl: 'lu' },
  ],
});

const score = (parts: ScorePart[]): ScoreSong => ({
  title: 'T',
  artist: 'A',
  source: 'x.musicxml',
  tempoMap: [{ beat: 0, bpm: 120 }],
  measureStarts: [0, 4],
  measureLengths: [4, 4],
  measureNumbers: [1, 2],
  end: 8,
  parts,
});

const file = (name: string, hasMarks = false): SongScore => ({
  file: name,
  url: `/media/${name}`,
  hasMarks,
});

describe('isSingableServerSong (#604)', () => {
  it('lists karaoke songs and songs with sheet music, not empty folders', () => {
    expect(isSingableServerSong({ id: 'a', karaoke: true })).toBe(true);
    expect(isSingableServerSong({ id: 'b' })).toBe(true); // older servers send no flag
    expect(isSingableServerSong({ id: 'c', karaoke: false, scores: [file('s.mxl')] })).toBe(true);
    expect(isSingableServerSong({ id: 'd', karaoke: false, scores: [] })).toBe(false);
    expect(isSingableServerSong({ id: 'e', karaoke: false })).toBe(false);
    expect(isSingableServerSong(null)).toBe(false);
  });
});

describe('score selection (#604)', () => {
  it('tries scores with bar marks first, else in folder order', () => {
    const list = [file('a.mxl'), file('b.mid', true), file('c.gp'), file('d.xml', true)];
    expect(scoreCandidates(list).map((s) => s.file)).toEqual(['b.mid', 'd.xml', 'a.mxl', 'c.gp']);
  });

  it('uses marks of the mix with the fine-tune offset, not those of another recording', () => {
    const marks = [
      { beat: 0, sec: 1 },
      { beat: 4, sec: 3 },
    ];
    const mix: StoredBarMarks = { marks, offsetSec: 0.5, audio: null };
    expect(marksForMix(mix)).toEqual([
      { beat: 0, sec: 1.5 },
      { beat: 4, sec: 3.5 },
    ]);
    expect(marksForMix({ ...mix, audio: 'take1.mp3' })).toBeNull();
    expect(marksForMix(null)).toBeNull();
  });

  it('sings the first score with a vocal part, timed by its marks', async () => {
    const scores: Record<string, ScoreSong> = {
      'piano.mxl': score([part('Piano', 'keyboard')]),
      'voice.mxl': score([part('Voice', 'vocals')]),
    };
    const fetchMarks = vi.fn(async (): Promise<StoredBarMarks> => ({
      marks: [0, 4, 8].map((beat) => ({ beat, sec: 2 + beat / 2 })),
      offsetSec: 0,
      audio: null,
    }));
    const vocals = await loadScoreVocals(
      'song1',
      [file('piano.mxl', true), file('voice.mxl', true)],
      {
        fetchFile: async (url) => new TextEncoder().encode(url.replace('/media/', '')).buffer,
        fetchMarks,
        readScore: (_name, data) => scores[new TextDecoder().decode(data)],
      },
    );
    expect(fetchMarks).toHaveBeenCalledTimes(1);
    expect(fetchMarks).toHaveBeenCalledWith('song1', 'voice.mxl');
    expect(vocals.tracks.map((t) => t.name)).toEqual(['Voice']);
    expect(vocals.gap).toBe(2000);
  });

  it('fails with a clear reason when nothing can be sung', async () => {
    const deps = {
      fetchFile: async () => new ArrayBuffer(0),
      fetchMarks: async () => null,
      readScore: () => score([part('Piano', 'keyboard')]),
    };
    await expect(loadScoreVocals('s', [file('p.mxl')], deps)).rejects.toMatchObject({
      reason: 'no_vocal_part',
    });
    const broken = {
      ...deps,
      readScore: () => {
        throw new Error('bad file');
      },
    };
    const err = await loadScoreVocals('s', [file('p.mxl')], broken).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ScoreVocalsLoadError);
    expect((err as ScoreVocalsLoadError).reason).toBe('score_load_failed');
  });
});
