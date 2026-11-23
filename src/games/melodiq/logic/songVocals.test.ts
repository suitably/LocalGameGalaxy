import { describe, expect, it } from 'vitest';
import { parseUltraStarTxt, type ScoreSong } from '../../../modules/music-score';
import { groupNotesIntoLines } from '../gameplay/logic/lyricsLines';
import { activeNoteIndex, isScoredNote, pointsPerBeat } from '../gameplay/logic/noteScoring';
import { songVocals, type Note, type SongTrack } from './songVocals';

// Hand-written fixtures (no real lyrics). Mixed word-boundary styles: leading and trailing spaces.
const SOLO = [
  '#TITLE:Solo',
  '#ARTIST:Nobody',
  '#BPM:287,4',
  '#GAP:1234,5',
  ': 0 4 5 La',
  ': 4 2 7  la',
  ': 8 6 9 lu',
  '- 16',
  ': 18 4 4 Do ', // trailing space ends the word
  ': 22 4 2 re',
  ': 26 0 2 ~',
  '- 32 34',
  ': 34 8 0  mi',
  'E',
].join('\n');

const DUET = `#TITLE:Duet
#ARTIST:Nobody
#BPM:300
#GAP:500
#DUETSINGERP1:Sun
#DUETSINGERP2:Moon
P1
: 0 4 0 Hey
: 4 4 2  you
- 10
: 12 4 4 there
P2
: 20 4 -5 Oh
: 24 6 -3 yes
- 32
: 34 2 -1  sure
E`;

const GOLDEN = `#TITLE:Gold
#BPM:200
#GAP:0
: 0 4 0 Shi
* 4 8 2 ny
- 14
* 16 4 4 gold
: 20 4 5  bar
E`;

const FREESTYLE = `#TITLE:Free
#BPM:240
#GAP:100
: 0 4 0 Sing
F 4 6 0  free
- 12
F 14 4 0 Just
: 18 4 3  talk
E`;

const RAP = `#TITLE:Rap
#BPM:250
#GAP:0
R 0 2 0 Yo
R 2 2 0  yo
G 4 4 0  check
- 10
: 12 4 7 sing
R 14 2 0  it
E`;

const FIXTURES = { solo: SOLO, duet: DUET, golden: GOLDEN, freestyle: FREESTYLE, rap: RAP };

/** Notes as the scoring engine reads them. */
const scored = (t: SongTrack) =>
  t.notes.map(({ type, start, duration, pitch }) => ({ type, start, duration, pitch }));

const lineText = (notes: readonly Note[]) =>
  notes
    .map((n) => n.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
const lines = (t: SongTrack) =>
  groupNotesIntoLines(t.notes).map((g) => ({
    startBeat: g.startBeat,
    endBeat: g.endBeat,
    text: lineText(g.notes),
  }));

/** A singer hitting every scored note at full length, sampled mid-way through every 0.25 UltraStar beats. */
function perfectScore(notes: Note[], golden = 2): number {
  const perBeat = pointsPerBeat(notes, golden);
  const end = Math.max(...notes.map((n) => n.start + n.duration));
  let points = 0;
  for (let beat = 0.125; beat < end; beat += 0.25) {
    const i = activeNoteIndex(notes, beat);
    if (i !== -1) points += 0.25 * perBeat * (notes[i].type === '*' ? golden : 1);
  }
  return Math.round(points * 1e6) / 1e6;
}

describe('songVocals (#604): the same .txt through ParsedSong and through ScoreSong', () => {
  for (const [name, txt] of Object.entries(FIXTURES)) {
    it(`${name}: identical notes, grid, line breaks and scores`, () => {
      const legacy = parseUltraStarTxt(txt);
      const sung = songVocals({ txtContent: txt });
      expect(sung.bpm).toBe(legacy.bpm);
      expect(sung.gap).toBe(legacy.gap);
      expect(sung.headers).toEqual(legacy.headers);
      expect(sung.tracks.map((t) => t.name)).toEqual(legacy.tracks.map((t) => t.name));
      sung.tracks.forEach((track, i) => {
        const old = legacy.tracks[i];
        expect(scored(track)).toEqual(scored(old));
        expect(lines(track)).toEqual(lines(old));
        expect(pointsPerBeat(track.notes, 2)).toBe(pointsPerBeat(old.notes, 2));
        expect(perfectScore(track.notes)).toBe(perfectScore(old.notes));
      });
    });
  }

  it('keeps the note kinds the scoring engine tells apart', () => {
    const kinds = (txt: string) =>
      songVocals({ txtContent: txt }).tracks[0].notes.map((n) => n.type);
    expect(kinds(GOLDEN)).toEqual([':', '*', '-', '*', ':']);
    expect(kinds(FREESTYLE)).toEqual([':', 'F', '-', 'F', ':']);
    expect(kinds(RAP)).toEqual(['R', 'R', 'G', '-', ':', 'R']);
    expect(songVocals({ txtContent: RAP }).tracks[0].notes.filter(isScoredNote)).toHaveLength(1);
  });

  it('starts lines without a leading space and keeps word boundaries', () => {
    const solo = songVocals({ txtContent: SOLO }).tracks[0];
    expect(solo.notes.map((n) => n.text)).toEqual([
      'La',
      ' la',
      'lu',
      '',
      'Do',
      ' re',
      '~',
      '',
      'mi',
    ]);
  });
});

/** A score-only song: one vocal part in 4/4 at 120 bpm, no phrase breaks, no `.txt`. */
const SCORE: ScoreSong = {
  title: 'Score only',
  artist: 'Nobody',
  source: 'song.musicxml',
  tempoMap: [{ beat: 0, bpm: 120 }],
  measureStarts: [0, 4, 8],
  measureLengths: [4, 4, 4],
  measureNumbers: [1, 2, 3],
  end: 12,
  parts: [
    {
      id: 'P1',
      name: 'Piano',
      notes: [{ t: 0, dur: 1, pitch: 48 }],
      isDrum: false,
      program: 0,
      guess: 'keyboard',
    },
    {
      id: 'P2',
      name: 'Voice',
      isDrum: false,
      program: null,
      guess: 'vocals',
      notes: [
        { t: 0, dur: 1, pitch: 60, syl: 'Ah-' },
        { t: 1, dur: 1, pitch: 62, syl: 'men' },
        { t: 6, dur: 2, pitch: 64, syl: 'oh' },
      ],
    },
  ],
};

describe('songVocals (#604): a song without .txt sings its score', () => {
  it('produces sung lines from the vocal part, timed by the bar marks', () => {
    const marks = [0, 4, 8, 12].map((beat) => ({ beat, sec: 2 + beat * 0.5 }));
    const sung = songVocals({ score: { song: SCORE, marks } });
    expect(sung.tracks).toHaveLength(1);
    expect(sung.tracks[0].name).toBe('Voice');
    expect(sung.gap).toBe(2000);
    const groups = groupNotesIntoLines(sung.tracks[0].notes);
    expect(groups.map((g) => lineText(g.notes))).toEqual(['Ahmen', 'oh']);
    expect(sung.tracks[0].notes.filter(isScoredNote).map((n) => n.pitch)).toEqual([0, 2, 4]);
    expect(perfectScore(sung.tracks[0].notes)).toBeCloseTo(1000, 0);
  });

  it('plays without marks at the score tempo', () => {
    const sung = songVocals({ score: { song: SCORE, marks: null } });
    expect(sung.gap).toBe(0);
    expect(sung.tracks[0].notes.filter(isScoredNote)).toHaveLength(3);
  });

  it('prefers the .txt when a song has both', () => {
    const sung = songVocals({ txtContent: SOLO, score: { song: SCORE, marks: null } });
    expect(sung.headers.TITLE).toBe('Solo');
  });

  it('fails without either', () => {
    expect(() => songVocals({})).toThrow();
  });
});
