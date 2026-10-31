import { describe, expect, it } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import { canEditSongMeta, initialDraft, metaUpdate, songFileRows } from '../songFileEdits';

const song = (over: Partial<CompanionSong> = {}): CompanionSong => ({
  id: 's1',
  title: 'Song',
  artist: 'Band',
  originalAudio: null,
  audio: null,
  instrumentalAudio: null,
  cover: null,
  karaoke: false,
  scores: [
    { file: 'Drums.gp', url: '/media?d', hasMarks: true, label: null },
    { file: 'Bass.mxl', url: '/media?b', hasMarks: false, label: 'Bass line' },
  ],
  recordings: [{ file: 'take 1.webm', url: '/media?r' }],
  ...over,
});

describe('songFileRows', () => {
  it('lists scores first, then extra recordings', () => {
    expect(songFileRows(song()).map((r) => [r.kind, r.file])).toEqual([
      ['score', 'Drums.gp'],
      ['score', 'Bass.mxl'],
      ['recording', 'take 1.webm'],
    ]);
  });

  it('copes with a server that sends no files', () => {
    expect(songFileRows(song({ scores: undefined, recordings: undefined }))).toEqual([]);
  });
});

describe('metaUpdate', () => {
  it('sends nothing when the draft is unchanged', () => {
    expect(metaUpdate(song(), initialDraft(song()))).toEqual({ kind: 'none' });
  });

  it('sends only changed labels; an empty label removes it', () => {
    const draft = initialDraft(song());
    draft.labels['Drums.gp'] = '  Drums  (Songsterr) ';
    draft.labels['Bass.mxl'] = '';
    expect(metaUpdate(song(), draft)).toEqual({
      kind: 'update',
      input: { labels: { 'Drums.gp': 'Drums (Songsterr)', 'Bass.mxl': '' } },
    });
  });

  it('treats a label equal to the file name as no label', () => {
    const draft = initialDraft(song());
    draft.labels['Drums.gp'] = 'Drums.gp';
    expect(metaUpdate(song(), draft)).toEqual({ kind: 'none' });
  });

  it('edits title and artist of a song without karaoke .txt', () => {
    const draft = { ...initialDraft(song()), title: ' New title ', artist: '' };
    expect(metaUpdate(song(), draft)).toEqual({
      kind: 'update',
      input: { title: 'New title', artist: '' },
    });
  });

  it('refuses an empty title', () => {
    const draft = { ...initialDraft(song()), title: '   ' };
    expect(metaUpdate(song(), draft)).toEqual({ kind: 'invalid', reason: 'title_required' });
  });

  it('never sends title or artist for a Melodiq song (the .txt headers win)', () => {
    const karaoke = song({ karaoke: true });
    expect(canEditSongMeta(karaoke)).toBe(false);
    const draft = { ...initialDraft(karaoke), title: '', artist: 'Other' };
    draft.labels['Drums.gp'] = 'Drums';
    expect(metaUpdate(karaoke, draft)).toEqual({
      kind: 'update',
      input: { labels: { 'Drums.gp': 'Drums' } },
    });
  });
});
