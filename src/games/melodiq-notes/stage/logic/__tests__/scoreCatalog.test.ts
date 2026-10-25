import { describe, expect, it } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import type { NotesPiece } from '../../../../../lib/companion/notesLibraryApi';
import { buildScoreCatalog, catalogKey, filterCatalog, loadScoreCatalog } from '../scoreCatalog';
import { pickRecording } from '../../serverScoreLoad';

const piece = (
  id: string,
  title: string,
  artist: string,
  over: Partial<NotesPiece> = {},
): NotesPiece => ({
  id,
  title,
  artist,
  updatedAt: 0,
  scores: [{ file: 'a.mxl', url: `/notes/media/${id}/a.mxl`, hasMarks: false }],
  recordings: [{ file: 'take.mp3', url: `/notes/media/${id}/take.mp3` }],
  ...over,
});

const song = (id: string, title: string, artist: string, mix: string | null): CompanionSong => ({
  id,
  title,
  artist,
  originalAudio: mix,
  audio: null,
  instrumentalAudio: null,
  cover: null,
});

describe('buildScoreCatalog', () => {
  it('lists every Notes piece on its own, even with the same artist and title', () => {
    const entries = buildScoreCatalog(
      [piece('p1', 'Hey Jude', 'The Beatles'), piece('p2', 'hey  jude!', 'the beatles')],
      [song('s1', 'Hey Jude', 'The Beatles', '/media?path=mix.mp3')],
    );
    expect(entries.map((e) => e.key).sort()).toEqual(['p1', 'p2']);
    // no title heuristic: an unlinked piece gets no song
    expect(entries.every((e) => e.song === null)).toBe(true);
  });

  it('resolves the linked song and counts its mix as a recording', () => {
    const [entry] = buildScoreCatalog(
      [piece('p1', 'Hey Jude', 'The Beatles', { songId: 's1' })],
      [song('s1', 'Hey Jude', 'The Beatles', '/media?path=mix.mp3')],
    );
    expect(entry.song?.id).toBe('s1');
    expect(entry.recordings).toBe(2);
    expect(entry.scores[0]).toMatchObject({ file: 'a.mxl', song: { id: 's1' } });
  });

  it('keeps a piece whose linked song is gone', () => {
    const [entry] = buildScoreCatalog([piece('p1', 'T', 'A', { songId: 'gone' })], []);
    expect(entry.song).toBeNull();
    expect(entry.recordings).toBe(1);
  });

  it('sorts by artist and title and ignores accents and case in the key', () => {
    const entries = buildScoreCatalog([piece('p1', 'Zebra', 'B'), piece('p2', 'Alpha', 'B')], []);
    expect(entries.map((e) => e.title)).toEqual(['Alpha', 'Zebra']);
    expect(catalogKey('Café', 'Björk')).toBe(catalogKey('cafe', 'BJORK'));
  });

  it('filters by artist and title', () => {
    const entries = buildScoreCatalog(
      [piece('p1', 'Hey Jude', 'Beatles'), piece('p2', 'Yes', 'X')],
      [],
    );
    expect(filterCatalog(entries, 'beatles jude').map((e) => e.title)).toEqual(['Hey Jude']);
    expect(filterCatalog(entries, ' ')).toHaveLength(2);
  });
});

describe('loadScoreCatalog', () => {
  it('lists pieces when the song list fails and warns only if a piece is linked', async () => {
    const failing = () => Promise.reject(new Error('404'));
    const plain = await loadScoreCatalog({
      listPieces: async () => [piece('p1', 'T', 'A')],
      listSongs: failing,
    });
    expect(plain.errors).toEqual({});
    expect(plain.entries).toHaveLength(1);
    const linked = await loadScoreCatalog({
      listPieces: async () => [piece('p1', 'T', 'A', { songId: 's1' })],
      listSongs: failing,
    });
    expect(linked.errors).toEqual({ songs: '404' });
  });

  it('reports an unreachable Notes library', async () => {
    const catalog = await loadScoreCatalog({
      listPieces: () => Promise.reject(new Error('down')),
      listSongs: async () => [],
    });
    expect(catalog.errors).toEqual({ notes: 'down' });
    expect(catalog.entries).toEqual([]);
  });
});

describe('pickRecording', () => {
  const marks = {
    marks: [
      { beat: 0, sec: 0 },
      { beat: 4, sec: 2 },
    ],
    offsetSec: 0,
  };
  const linked = piece('p1', 'T', 'A', { songId: 's1' });
  const mixSong = song('s1', 'T', 'A', '/media?path=mix.mp3');

  it('plays an own recording the marks name', () => {
    const r = pickRecording(linked, mixSong, { ...marks, audio: 'take.mp3' });
    expect(r.recording?.name).toBe('take.mp3');
    expect(r.recording?.songMix).toBeUndefined();
    expect(r.marks?.audio).toBe('take.mp3');
  });

  it('plays the linked song mix with marks that name no own recording', () => {
    const r = pickRecording(linked, mixSong, { ...marks, audio: null });
    expect(r.recording).toMatchObject({ songMix: true, local: false });
    expect(r.marks).not.toBeNull();
  });

  it('falls back to the first own recording without marks', () => {
    const r = pickRecording(piece('p1', 'T', 'A'), null, { ...marks, audio: 'gone.mp3' });
    expect(r.recording?.name).toBe('take.mp3');
    expect(r.marks).toBeNull();
  });
});
