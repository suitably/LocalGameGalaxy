import type { SongMetaInput } from '../../../../lib/companion/notesLibraryApi';
import type { CompanionSong } from '../../../../lib/companion/songScoresApi';

/**
 * Managing one song folder's files from the Notes library: renaming scores (their `song.json`
 * label, so file names, bar marks and links stay as they are), editing title and artist of a
 * song without karaoke `.txt`, deleting scores and extra recordings.
 */

/** One file of a song folder the library can manage; the mix and its stems are not listed. */
export type SongFileRow =
  | { kind: 'score'; file: string; url: string; label: string; hasMarks: boolean }
  | { kind: 'recording'; file: string; url: string };

/** The draft the manage dialog edits. */
export interface SongFilesDraft {
  title: string;
  artist: string;
  /** Label per score file; empty shows the file name. */
  labels: Record<string, string>;
}

/** Title and artist come from the `.txt` headers when a song has one; only `song.json` is edited. */
export const canEditSongMeta = (song: CompanionSong) => song.karaoke === false;

export function songFileRows(song: CompanionSong): SongFileRow[] {
  return [
    ...(song.scores ?? []).map((s): SongFileRow => ({
      kind: 'score',
      file: s.file,
      url: s.url,
      label: s.label ?? '',
      hasMarks: s.hasMarks,
    })),
    ...(song.recordings ?? []).map((r): SongFileRow => ({
      kind: 'recording',
      file: r.file,
      url: r.url,
    })),
  ];
}

export function initialDraft(song: CompanionSong): SongFilesDraft {
  return {
    title: song.title,
    artist: song.artist,
    labels: Object.fromEntries((song.scores ?? []).map((s) => [s.file, s.label ?? ''])),
  };
}

/** Trims and collapses whitespace, so " Bass  " and "Bass" are the same label. */
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

export type MetaUpdate =
  | { kind: 'none' }
  | { kind: 'invalid'; reason: 'title_required' }
  | { kind: 'update'; input: SongMetaInput };

/**
 * What `PUT /api/songs/:id/meta` needs for the draft: only changed fields, an empty label
 * removes it (the file name shows again), labels of files that are gone are dropped.
 */
export function metaUpdate(song: CompanionSong, draft: SongFilesDraft): MetaUpdate {
  const input: SongMetaInput = {};
  if (canEditSongMeta(song)) {
    const title = clean(draft.title);
    if (!title) return { kind: 'invalid', reason: 'title_required' };
    if (title !== clean(song.title)) input.title = title;
    const artist = clean(draft.artist);
    if (artist !== clean(song.artist)) input.artist = artist;
  }
  const labels: Record<string, string> = {};
  for (const score of song.scores ?? []) {
    const next = clean(draft.labels[score.file] ?? '');
    // a label equal to the file name adds nothing
    const label = next === score.file ? '' : next;
    if (label !== clean(score.label ?? '')) labels[score.file] = label;
  }
  if (Object.keys(labels).length) input.labels = labels;
  return Object.keys(input).length ? { kind: 'update', input } : { kind: 'none' };
}

/** File types the library accepts in a song folder (server: `classifyUpload`). */
export const SONG_FILE_ACCEPT = '.mxl,.musicxml,.xml,.mid,.midi,.gp,audio/*';
