import fs from 'node:fs';
import path from 'node:path';
import { serverConfig } from '../../../config';
import { resolveSecurePath } from '../../../utils/helpers';
import {
  findScoreFiles,
  marksPathFor,
  uniqueFileName,
  type SongScoreFile,
} from '../../../utils/scoreFiles';
import {
  RECORDING_EXTENSIONS,
  createSongFolder,
  findRecordingFiles,
  songCreationRoot,
  type SongRecordingFile,
} from './songFolder';
import { getSongCache, refreshSongFolder } from './scanner';
import type { Song } from '../../../core/types';

/**
 * One-time move of the old Melodiq Notes library (`NOTES_DIR`, one folder per piece with
 * `piece.json`) into song folders (#568, reverses Q18). A piece linked to a Melodiq song
 * (`songId`) goes into that song's folder; any other piece becomes a new song folder without
 * `.txt`, with `song.json`. Scores, their `.marks.json` and recordings are copied; name clashes
 * get `name (2)`, and a file the song folder already holds with the same content (an earlier
 * import of song-folder scores) is not copied twice. The originals stay in `NOTES_DIR` until the
 * migration is confirmed. The marker file lists each migrated piece, so nothing moves twice.
 */
export const MIGRATION_MARKER = '.song-folders-migrated.json';
const LEGACY_META_FILE = 'piece.json';

interface MigrationMarker {
  version: 1;
  /** Piece folder name (in `NOTES_DIR`) → song folder it was copied into. */
  migrated: Record<string, string>;
  /** Set once a run finished without failures; startup skips the migration from then on. */
  completedAt: string | null;
  /** Set when the originals in `NOTES_DIR` were removed. */
  confirmedAt: string | null;
}

export interface NotesMigrationResult {
  /** Pieces copied by this run. */
  migrated: number;
  /** Pieces listed in the marker by an earlier run. */
  skipped: number;
  /** Pieces that could not be copied (they are tried again on the next run). */
  failed: number;
  /** Song folders that received files. */
  songFolders: string[];
}

export interface NotesMigrationStatus {
  pending: number;
  migrated: number;
  completedAt: string | null;
  confirmedAt: string | null;
}

interface LegacyPiece {
  name: string;
  folder: string;
  title: string;
  artist: string;
  songId: string | null;
  scores: SongScoreFile[];
  recordings: SongRecordingFile[];
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const emptyMarker = (): MigrationMarker => ({
  version: 1,
  migrated: {},
  completedAt: null,
  confirmedAt: null,
});

async function readMarker(notesDir: string): Promise<MigrationMarker> {
  try {
    const raw = JSON.parse(
      await fs.promises.readFile(path.join(notesDir, MIGRATION_MARKER), 'utf-8'),
    ) as Partial<MigrationMarker>;
    const migrated =
      raw.migrated && typeof raw.migrated === 'object' && !Array.isArray(raw.migrated)
        ? Object.fromEntries(Object.entries(raw.migrated).filter(([, v]) => typeof v === 'string'))
        : {};
    return {
      version: 1,
      migrated,
      completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
      confirmedAt: typeof raw.confirmedAt === 'string' ? raw.confirmedAt : null,
    };
  } catch {
    return emptyMarker();
  }
}

async function writeMarker(notesDir: string, marker: MigrationMarker): Promise<void> {
  await fs.promises.mkdir(notesDir, { recursive: true });
  // Through a temp file: a reader (or a crash) never meets a half-written marker
  const target = path.join(notesDir, MIGRATION_MARKER);
  const temp = `${target}.tmp`;
  await fs.promises.writeFile(temp, JSON.stringify(marker, null, 2));
  await fs.promises.rename(temp, target);
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 200) : '');

async function readLegacyPiece(notesDir: string, name: string): Promise<LegacyPiece | null> {
  const folder = path.join(notesDir, name);
  let files: string[];
  try {
    if (!(await fs.promises.stat(folder)).isDirectory()) return null;
    files = await fs.promises.readdir(folder);
  } catch {
    return null;
  }
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(await fs.promises.readFile(path.join(folder, LEGACY_META_FILE), 'utf-8'));
  } catch {
    // no or broken piece.json: the folder name is the title
  }
  return {
    name,
    folder,
    title: str(meta.title) || name,
    artist: str(meta.artist),
    songId: str(meta.songId) || null,
    scores: await findScoreFiles(folder, files),
    recordings: await findRecordingFiles(folder, files),
  };
}

/** Piece folders of the old Notes library (direct sub-folders of `NOTES_DIR`), by name. */
async function listLegacyPieceNames(notesDir: string): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(notesDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

async function sameContent(a: string, b: string): Promise<boolean> {
  try {
    const [sa, sb] = await Promise.all([fs.promises.stat(a), fs.promises.stat(b)]);
    if (sa.size !== sb.size) return false;
    if (sa.size > 32 * 1024 * 1024) return true;
    const [ba, bb] = await Promise.all([fs.promises.readFile(a), fs.promises.readFile(b)]);
    return ba.equals(bb);
  } catch {
    return false;
  }
}

/** Copies a file into the folder; returns the name it has there (an identical file is reused). */
async function copyInto(source: string, folder: string, extensions: string[]): Promise<string> {
  const name = path.basename(source);
  if (await sameContent(source, path.join(folder, name))) return name;
  const target = uniqueFileName(folder, name, extensions);
  await fs.promises.copyFile(source, path.join(folder, target));
  return target;
}

/**
 * Marks follow their score; `audio` is renamed with its recording. When the song folder already
 * has marks for an identical score, the newer of the two wins.
 */
async function copyMarks(
  source: string,
  targetScorePath: string,
  renamed: Map<string, string>,
): Promise<void> {
  const target = marksPathFor(targetScorePath);
  try {
    const [s, t] = await Promise.all([
      fs.promises.stat(source),
      fs.promises.stat(target).catch(() => null),
    ]);
    if (t && t.mtimeMs >= s.mtimeMs) return;
  } catch {
    return;
  }
  const marks = JSON.parse(await fs.promises.readFile(source, 'utf-8')) as Record<string, unknown>;
  if (typeof marks.audio === 'string' && renamed.has(marks.audio)) {
    marks.audio = renamed.get(marks.audio);
  }
  await fs.promises.writeFile(target, JSON.stringify(marks), 'utf-8');
}

/** The linked song's folder, else a new song folder without `.txt` for the piece. */
async function targetFolder(piece: LegacyPiece, songs: Song[], root: string | null) {
  const song = piece.songId ? songs.find((s) => s.id === piece.songId) : undefined;
  const linked = song && resolveSecurePath(song.folder);
  if (linked) return linked;
  if (!root) throw new Error('no song library directory is configured');
  return (await createSongFolder(root, { title: piece.title, artist: piece.artist })).folder;
}

async function migratePiece(piece: LegacyPiece, songs: Song[], root: string | null) {
  const folder = await targetFolder(piece, songs, root);
  const renamed = new Map<string, string>();
  for (const rec of piece.recordings) {
    renamed.set(rec.file, await copyInto(rec.path, folder, RECORDING_EXTENSIONS));
  }
  for (const score of piece.scores) {
    const name = await copyInto(score.path, folder, [path.extname(score.file).toLowerCase()]);
    if (score.marksPath) await copyMarks(score.marksPath, path.join(folder, name), renamed);
  }
  return folder;
}

/**
 * Copies every piece of the old Notes library not migrated yet into a song folder. `songs` is the
 * song cache (to find linked songs), `root` where new song folders go.
 */
export async function migrateNotesPieces(
  options: { notesDir?: string; songs?: Song[]; root?: string | null } = {},
): Promise<NotesMigrationResult> {
  const notesDir = options.notesDir ?? serverConfig.notesDir;
  const songs = options.songs ?? getSongCache();
  const root = options.root === undefined ? songCreationRoot() : options.root;
  const result: NotesMigrationResult = { migrated: 0, skipped: 0, failed: 0, songFolders: [] };
  const names = await listLegacyPieceNames(notesDir);
  if (names.length === 0) return result;
  const marker = await readMarker(notesDir);
  const touched = new Set<string>();
  for (const name of names) {
    if (marker.migrated[name]) {
      result.skipped++;
      continue;
    }
    const piece = await readLegacyPiece(notesDir, name);
    if (!piece) continue;
    try {
      const folder = await migratePiece(piece, songs, root);
      marker.migrated[name] = folder;
      touched.add(folder);
      result.migrated++;
      await writeMarker(notesDir, marker);
    } catch (e: unknown) {
      result.failed++;
      console.warn(`[Notes] Could not move piece "${name}" into a song folder:`, errorText(e));
    }
  }
  // the cache knows the new folders before the marker says the migration is complete
  for (const folder of touched) await refreshSongFolder(folder);
  if (result.failed === 0 && !marker.completedAt) {
    marker.completedAt = new Date().toISOString();
    await writeMarker(notesDir, marker);
  }
  result.songFolders = [...touched].sort();
  if (result.migrated > 0) {
    console.log(
      `[Notes] Moved ${result.migrated} Notes piece(s) from ${notesDir} into song folders`,
    );
  }
  return result;
}

/** Startup: runs the migration unless an earlier run completed it. */
export async function migrateNotesPiecesOnce(notesDir = serverConfig.notesDir) {
  const marker = await readMarker(notesDir);
  if (marker.completedAt) return null;
  return migrateNotesPieces({ notesDir });
}

export async function notesMigrationStatus(
  notesDir = serverConfig.notesDir,
): Promise<NotesMigrationStatus> {
  const [marker, names] = await Promise.all([readMarker(notesDir), listLegacyPieceNames(notesDir)]);
  return {
    pending: names.filter((n) => !marker.migrated[n]).length,
    migrated: Object.keys(marker.migrated).length,
    completedAt: marker.completedAt,
    confirmedAt: marker.confirmedAt,
  };
}

/**
 * Removes the originals of migrated pieces from `NOTES_DIR`, but only those whose song folder
 * still exists; returns how many were removed.
 */
export async function confirmNotesMigration(notesDir = serverConfig.notesDir): Promise<number> {
  const marker = await readMarker(notesDir);
  let removed = 0;
  for (const [name, folder] of Object.entries(marker.migrated)) {
    const original = path.join(notesDir, path.basename(name));
    if (!fs.existsSync(original) || !fs.existsSync(folder)) continue;
    await fs.promises.rm(original, { recursive: true, force: true });
    removed++;
  }
  marker.confirmedAt = new Date().toISOString();
  await writeMarker(notesDir, marker);
  return removed;
}
