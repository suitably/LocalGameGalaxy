import type { BarMark } from '../../../../modules/music-score';
import {
  createNotesPiece,
  saveNotesMarks,
  uploadNotesFile,
} from '../../../../lib/companion/notesLibraryApi';

/** The parts of the stage that go to the Notes library on the companion server. */
export interface NotesSaveInput {
  /** Piece and score already on the server (loaded from the library or saved before). */
  stored: { pieceId: string; scoreFile: string } | null;
  title: string;
  artist: string;
  /** Score to upload when the piece is new: the opened file, else the MusicXML text. */
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
  pieceId: string;
  scoreFile: string;
  /** Stored name of the recording, if there is one. */
  recordingName: string | null;
}

export type NotesApi = {
  createPiece: typeof createNotesPiece;
  upload: typeof uploadNotesFile;
  saveMarks: typeof saveNotesMarks;
};

const defaultApi: NotesApi = {
  createPiece: createNotesPiece,
  upload: uploadNotesFile,
  saveMarks: saveNotesMarks,
};

/** MusicXML text as a file to upload, named after the piece. */
export const musicXmlFile = (xml: string, title: string) =>
  new File([xml], `${title.trim() || 'score'}.musicxml`, {
    type: 'application/vnd.recordare.musicxml+xml',
  });

/**
 * Stores what is missing on the server: a new piece with its score, a recording that is still
 * local, and the bar marks. Safe to call again — stored parts are not uploaded twice. The Notes
 * library is the only place the stage saves to (Q18); a piece linked to a Melodiq song keeps its
 * link and stores marks for the song's mix with `recordingName: null`.
 */
export async function saveToNotesLibrary(
  input: NotesSaveInput,
  api: NotesApi = defaultApi,
): Promise<NotesSaveResult> {
  let stored = input.stored;
  if (!stored) {
    const score = input.scoreFile ?? (input.xml ? musicXmlFile(input.xml, input.title) : null);
    if (!score) throw new Error('no score to store');
    const piece = await api.createPiece({ title: input.title || 'Score', artist: input.artist });
    const uploaded = await api.upload(piece.id, score);
    stored = { pieceId: piece.id, scoreFile: uploaded.file };
  }

  let recordingName = input.recordingName;
  if (input.recordingFile) {
    recordingName = (await api.upload(stored.pieceId, input.recordingFile)).file;
  }

  if (input.marks && input.marks.length >= 2) {
    await api.saveMarks(stored.pieceId, stored.scoreFile, {
      marks: input.marks,
      offsetSec: input.offsetSec,
      audio: recordingName,
    });
  }
  return { ...stored, recordingName };
}
