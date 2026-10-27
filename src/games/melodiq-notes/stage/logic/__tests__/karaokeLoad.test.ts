import { describe, expect, it } from 'vitest';
import type { CompanionSong } from '../../../../../lib/companion/songScoresApi';
import { loadKaraokeVocals } from '../../serverScoreLoad';

const song = (mix: string | null, txtContent: string): CompanionSong => ({
  id: 's1',
  title: 'Song',
  artist: 'Band',
  originalAudio: mix,
  audio: null,
  instrumentalAudio: null,
  cover: null,
  txtContent,
});

const TXT = '#BPM:240\n#GAP:500\n: 0 8 0 la\nE';

describe('loadKaraokeVocals (#566)', () => {
  it('opens the vocals with the song mix and marks from #BPM / #GAP', async () => {
    const load = await loadKaraokeVocals(song('/media?path=mix.mp3', TXT));
    expect(load.origin).toEqual({ kind: 'karaoke', title: 'Song', songId: 's1' });
    expect(load.loaded.song.parts.map((p) => p.guess)).toEqual(['vocals']);
    expect(load.loaded.song).toMatchObject({ title: 'Song', artist: 'Band' });
    expect(load.recording).toMatchObject({ songMix: true, local: false });
    // BPM 240 → 0.25 s per quarter; GAP 0.5 s
    expect(load.marks?.marks.slice(0, 2)).toEqual([
      { beat: 0, sec: 0.5 },
      { beat: 4, sec: 1.5 },
    ]);
    expect(load.marks?.offsetSec).toBe(0);
  });

  it('plays without marks when the song has no mix, and refuses an empty file', async () => {
    const load = await loadKaraokeVocals(song(null, TXT));
    expect(load.recording).toBeNull();
    expect(load.marks).toBeNull();
    await expect(loadKaraokeVocals(song(null, '#BPM:120\nE'))).rejects.toThrow();
  });
});
