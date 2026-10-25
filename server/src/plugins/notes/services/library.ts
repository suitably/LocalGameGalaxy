import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { serverConfig } from '../../../config';
import { cleanUploadName, findScoreFiles, isScoreFileName } from '../../../utils/scoreFiles';
import type { SongScoreFile } from '../../../utils/scoreFiles';

/**
 * Melodiq Notes library on disk: one folder per piece in `serverConfig.notesDir`, holding
 * sheet music (MusicXML/MIDI), recordings, `<score>.marks.json` bar marks and `piece.json`.
 */
export const PIECE_META_FILE = 'piece.json';
export const RECORDING_EXTENSIONS = [
  '.mp3',
  '.m4a',
  '.ogg',
  '.oga',
  '.opus',
  '.flac',
  '.wav',
  '.webm',
  '.aac',
];
export const MAX_RECORDING_BYTES = 300 * 1024 * 1024;

export interface PieceMeta {
  title: string;
  artist: string;
  /**
   * Melodiq song the piece belongs to: it plays with that song folder's mix instead of a copy.
   * The song folder itself holds no sheet music for Melodiq Notes (Q18).
   */
  songId: string | null;
}

/** Create/update body: `songId` left out keeps the stored link, `null` removes it. */
export type PieceMetaInput = Omit<PieceMeta, 'songId'> & { songId?: string | null };

const SONG_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export interface NotesRecordingFile {
  file: string;
  path: string;
  mtimeMs: number;
}

export interface NotesPiece extends PieceMeta {
  id: string;
  /** Absolute path of the piece folder. */
  folder: string;
  scores: SongScoreFile[];
  recordings: NotesRecordingFile[];
  updatedAt: number;
}

export interface ClientNotesPiece extends PieceMeta {
  id: string;
  updatedAt: number;
  scores: { file: string; url: string; hasMarks: boolean }[];
  recordings: { file: string; url: string }[];
}

export type UploadKind = 'score' | 'recording';

export const pieceIdFor = (folderName: string): string =>
  crypto.createHash('md5').update(folderName.normalize('NFC')).digest('hex').slice(0, 16);

export function isRecordingFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return !name.startsWith('.') && RECORDING_EXTENSIONS.some((e) => lower.endsWith(e));
}

/** Upload name for a piece folder plus what it is; null when it is neither a score nor a recording. */
export function classifyUpload(original: string): { name: string; kind: UploadKind } | null {
  const name = cleanUploadName(original);
  if (!name) return null;
  if (isScoreFileName(name)) return { name, kind: 'score' };
  if (isRecordingFileName(name)) return { name, kind: 'recording' };
  return null;
}

/** Folder name for a new piece: "Artist - Title" with unsafe characters replaced. */
export function folderNameFor(meta: PieceMeta): string {
  const label = meta.artist ? `${meta.artist} - ${meta.title}` : meta.title;
  return cleanUploadName(label.replace(/[/\\]/g, '_')).replace(/\.+$/, '') || 'Piece';
}

/** Checks a create/update body; returns the normalised metadata or an error message. */
export function parsePieceMeta(body: unknown): PieceMetaInput | string {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object';
  const b = body as Record<string, unknown>;
  const title = typeof b.title === 'string' ? b.title.trim().slice(0, 200) : '';
  const artist = typeof b.artist === 'string' ? b.artist.trim().slice(0, 200) : '';
  if (!title) return 'title is required';
  if (b.songId === undefined) return { title, artist };
  if (b.songId === null || b.songId === '') return { title, artist, songId: null };
  if (typeof b.songId !== 'string' || !SONG_ID_PATTERN.test(b.songId))
    return 'songId must be a Melodiq song id';
  return { title, artist, songId: b.songId };
}

async function readMeta(folder: string, fallbackTitle: string): Promise<PieceMeta> {
  try {
    const raw = JSON.parse(await fs.promises.readFile(path.join(folder, PIECE_META_FILE), 'utf-8'));
    const parsed = parsePieceMeta(raw);
    if (typeof parsed !== 'string') return { ...parsed, songId: parsed.songId ?? null };
  } catch {
    // no or broken piece.json: fall back to the folder name
  }
  return { title: fallbackTitle, artist: '', songId: null };
}

export async function writeMeta(folder: string, meta: PieceMeta): Promise<void> {
  await fs.promises.writeFile(
    path.join(folder, PIECE_META_FILE),
    JSON.stringify({ ...meta, updatedAt: new Date().toISOString() }, null, 2),
    'utf-8',
  );
}

async function readPiece(root: string, folderName: string): Promise<NotesPiece | null> {
  const folder = path.join(root, folderName);
  let files: string[];
  try {
    if (!(await fs.promises.stat(folder)).isDirectory()) return null;
    files = await fs.promises.readdir(folder);
  } catch {
    return null;
  }
  const scores = await findScoreFiles(folder, files);
  const recordings: NotesRecordingFile[] = [];
  let updatedAt = 0;
  for (const file of files.filter(isRecordingFileName).sort()) {
    try {
      const stat = await fs.promises.stat(path.join(folder, file));
      if (!stat.isFile()) continue;
      recordings.push({ file, path: path.join(folder, file), mtimeMs: stat.mtimeMs });
      updatedAt = Math.max(updatedAt, stat.mtimeMs);
    } catch {
      // vanished between readdir and stat
    }
  }
  for (const s of scores) updatedAt = Math.max(updatedAt, s.mtimeMs);
  const meta = await readMeta(folder, folderName);
  return {
    id: pieceIdFor(folderName),
    folder,
    ...meta,
    scores,
    recordings,
    updatedAt: Math.round(updatedAt),
  };
}

/** All pieces (direct sub-folders of the notes folder), newest first. */
export async function listPieces(root = serverConfig.notesDir): Promise<NotesPiece[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const pieces: NotesPiece[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const piece = await readPiece(root, entry.name);
    if (piece) pieces.push(piece);
  }
  return pieces.sort((a, b) => b.updatedAt - a.updatedAt || a.title.localeCompare(b.title));
}

/** Pieces are addressed by id only, so a request can never name a path outside the notes folder. */
export async function findPiece(
  id: string,
  root = serverConfig.notesDir,
): Promise<NotesPiece | null> {
  return (await listPieces(root)).find((p) => p.id === id) ?? null;
}

/** Creates a piece folder (never reuses an existing one) and writes its piece.json. */
export async function createPiece(
  input: PieceMetaInput,
  root = serverConfig.notesDir,
): Promise<NotesPiece> {
  const meta: PieceMeta = { ...input, songId: input.songId ?? null };
  await fs.promises.mkdir(root, { recursive: true });
  const base = folderNameFor(meta);
  let name = base;
  for (let i = 2; fs.existsSync(path.join(root, name)); i++) name = `${base} (${i})`;
  await fs.promises.mkdir(path.join(root, name));
  await writeMeta(path.join(root, name), meta);
  const piece = await readPiece(root, name);
  if (!piece) throw new Error('Piece folder vanished');
  return piece;
}

/** Pieces linked to Melodiq songs, by song id (a song may have several pieces). */
export async function piecesBySong(
  root = serverConfig.notesDir,
): Promise<Map<string, NotesPiece[]>> {
  const out = new Map<string, NotesPiece[]>();
  for (const piece of await listPieces(root)) {
    if (!piece.songId) continue;
    out.set(piece.songId, [...(out.get(piece.songId) ?? []), piece]);
  }
  return out;
}

/** Only files the listing found for a piece can be addressed, which rules out path tricks. */
export function pieceFile(piece: NotesPiece, file: string): string | null {
  const entry =
    piece.scores.find((s) => s.file === file) ?? piece.recordings.find((r) => r.file === file);
  return entry?.path ?? null;
}

export function toClientPiece(piece: NotesPiece, token: string): ClientNotesPiece {
  const media = (file: string) =>
    `/notes/media/${piece.id}/${encodeURIComponent(file)}?token=${encodeURIComponent(token)}`;
  return {
    id: piece.id,
    title: piece.title,
    artist: piece.artist,
    songId: piece.songId,
    updatedAt: piece.updatedAt,
    scores: piece.scores.map((s) => ({
      file: s.file,
      url: media(s.file),
      hasMarks: !!s.marksPath,
    })),
    recordings: piece.recordings.map((r) => ({ file: r.file, url: media(r.file) })),
  };
}
