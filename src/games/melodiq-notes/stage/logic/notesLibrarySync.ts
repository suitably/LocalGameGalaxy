import type { BarMark } from '../../../../modules/music-score';
import {
  createLibrarySong,
  saveSongMarks,
  uploadSongFile,
} from '../../../../lib/companion/notesLibraryApi';
import { listLibrarySongs, type CompanionSong } from '../../../../lib/companion/songScoresApi';
import { findSongFolder } from './scoreCatalog';

/** The parts of the stage that go to a song folder on the companion server. */
export interface NotesSaveInput {
  /**
   * Song (and score) already on the server: loaded from the library or saved before. A karaoke
   * `.txt` on stage has no score file; its bar marks come from the `.txt` and are not stored.
   */
  stored: { songId: string; scoreFile: string | null } | null;
  title: string;
  artist: string;
  /** Score to upload when it is not stored yet: the opened file, else the MusicXML text. */
  scoreFile: File | null;
  xml: string | null;
  /** Local recording that is not on the server yet. */
  recordingFile: File | null;
  /** Name of the recording the marks belong to when it is already stored. */
  recordingName: string | null;
  marks: BarMark[] | null;
  offsetSec: number;
}

export interface NotesSaveResult {
  songId: string;
  scoreFile: string | null;
  /** Stored name of the recording, if there is one. */
  recordingName: string | null;
}

export interface NotesApi {
  listSongs: () => Promise<CompanionSong[]>;
  createSong: typeof createLibrarySong;
  upload: (songId: string, file: File) => Promise<{ file: string }>;
  saveMarks: typeof saveSongMarks;
}

const defaultApi: NotesApi = {
  listSongs: listLibrarySongs,
  createSong: createLibrarySong,
  upload: uploadSongFile,
  saveMarks: saveSongMarks,
};

/** MusicXML text as a file to upload, named after the song. */
export const musicXmlFile = (xml: string, title: string) =>
  new File([xml], `${title.trim() || 'score'}.musicxml`, {
    type: 'application/vnd.recordare.musicxml+xml',
  });

/**
 * Stores what is missing on the server: a score that is not stored yet (into the song folder with
 * the same artist and title, else a new song folder with `song.json`), a recording that is still
 * local, and the bar marks next to the score. Safe to call again — stored parts are not uploaded
 * twice. The song folder is the only place the stage saves to (#568); marks for the song's mix
 * are stored with `recordingName: null`.
 */
export async function saveToNotesLibrary(
  input: NotesSaveInput,
  api: NotesApi = defaultApi,
): Promise<NotesSaveResult> {
  let stored = input.stored;
  if (!stored) {
    const score = input.scoreFile ?? (input.xml ? musicXmlFile(input.xml, input.title) : null);
    if (!score) throw new Error('no score to store');
    const title = input.title || 'Score';
    const song =
      findSongFolder(await api.listSongs(), title, input.artist) ??
      (await api.createSong({ title, artist: input.artist }));
    const uploaded = await api.upload(song.id, score);
    stored = { songId: song.id, scoreFile: uploaded.file };
  }

  let recordingName = input.recordingName;
  if (input.recordingFile) {
    recordingName = (await api.upload(stored.songId, input.recordingFile)).file;
  }

  if (stored.scoreFile && input.marks && input.marks.length >= 2) {
    await api.saveMarks(stored.songId, stored.scoreFile, {
      marks: input.marks,
      offsetSec: input.offsetSec,
      audio: recordingName,
    });
  }
  return { ...stored, recordingName };
}
