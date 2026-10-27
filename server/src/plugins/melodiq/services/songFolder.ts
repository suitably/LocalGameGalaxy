import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { serverConfig } from '../../../config';
import { cleanUploadName, findScoreFiles, isScoreFileName } from '../../../utils/scoreFiles';
import type { Song } from '../../../core/types';

/**
 * A song folder is the only store for Melodiq and Melodiq Notes (#568): the karaoke `.txt` with
 * its mix, sheet music (MusicXML/MIDI) with `<score>.marks.json` bar marks, Notes' own recordings,
 * and `song.json` (title, artist, per-score labels, and the stable id of a song without `.txt`).
 */
export const SONG_META_FILE = 'song.json';
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
export const SONG_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_TEXT = 200;
const MAX_LABEL = 100;

export interface SongMeta {
  version: 1;
  /** Identity of a song without `.txt`; a song with `.txt` keeps its id derived from the `.txt`. */
  id: string;
  title: string;
  artist: string;
  /** Free text per score file, shown instead of the file name. */
  labels: Record<string, string>;
}

/** Update body of `PUT /api/songs/:id/meta`; fields left out stay as they are. */
export interface SongMetaInput {
  title?: string;
  artist?: string;
  /** Label per score file; an empty string removes the label. */
  labels?: Record<string, string>;
}

export interface SongRecordingFile {
  file: string;
  path: string;
  mtimeMs: number;
}

export type UploadKind = 'score' | 'recording';

export const newSongId = (): string => crypto.randomBytes(12).toString('hex');

export function isRecordingFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return !name.startsWith('.') && RECORDING_EXTENSIONS.some((e) => lower.endsWith(e));
}

/** Upload name for a song folder plus what it is; null when it is neither a score nor a recording. */
export function classifyUpload(original: string): { name: string; kind: UploadKind } | null {
  const name = cleanUploadName(original);
  if (!name) return null;
  if (isScoreFileName(name)) return { name, kind: 'score' };
  if (isRecordingFileName(name)) return { name, kind: 'recording' };
  return null;
}

/** Folder name for a new song: "Artist - Title" with unsafe characters replaced. */
export function songFolderName(title: string, artist: string): string {
  const label = artist ? `${artist} - ${title}` : title;
  return cleanUploadName(label.replace(/[/\\]/g, '_')).replace(/\.+$/, '') || 'Song';
}

/** Title and artist of a folder without `song.json`: "Artist - Title", else the whole name. */
export function metaFromFolderName(folderName: string): { title: string; artist: string } {
  const at = folderName.indexOf(' - ');
  if (at <= 0) return { title: folderName, artist: '' };
  return { artist: folderName.slice(0, at).trim(), title: folderName.slice(at + 3).trim() };
}

const text = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function parseLabels(raw: unknown): Record<string, string> | string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'labels must be an object';
  const out: Record<string, string> = {};
  for (const [file, label] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof label !== 'string') return 'every label must be a string';
    out[path.basename(file)] = label.trim().slice(0, MAX_LABEL);
  }
  return out;
}

/** Checks a meta update body; returns the normalised input or an error message. */
export function parseSongMetaBody(body: unknown): SongMetaInput | string {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object';
  const b = body as Record<string, unknown>;
  const input: SongMetaInput = {};
  if (b.title !== undefined) {
    input.title = text(b.title);
    if (!input.title) return 'title must not be empty';
  }
  if (b.artist !== undefined) input.artist = text(b.artist);
  if (b.labels !== undefined) {
    const labels = parseLabels(b.labels);
    if (typeof labels === 'string') return labels;
    input.labels = labels;
  }
  return input;
}

/** The folder's `song.json`, or null when it is missing or unreadable. */
export async function readSongMeta(folder: string): Promise<SongMeta | null> {
  try {
    const raw = JSON.parse(
      await fs.promises.readFile(path.join(folder, SONG_META_FILE), 'utf-8'),
    ) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object') return null;
    const labels = parseLabels(raw.labels ?? {});
    return {
      version: 1,
      id: typeof raw.id === 'string' && SONG_ID_PATTERN.test(raw.id) ? raw.id : '',
      title: text(raw.title),
      artist: text(raw.artist),
      labels: typeof labels === 'string' ? {} : labels,
    };
  } catch {
    return null;
  }
}

export async function writeSongMeta(folder: string, meta: SongMeta): Promise<void> {
  const labels = Object.fromEntries(Object.entries(meta.labels).filter(([, l]) => l));
  await fs.promises.writeFile(
    path.join(folder, SONG_META_FILE),
    JSON.stringify({ ...meta, labels, updatedAt: new Date().toISOString() }, null, 2),
    'utf-8',
  );
}

/** Applies an update to the stored meta (labels are merged; an empty label removes it). */
export function mergeSongMeta(current: SongMeta, input: SongMetaInput): SongMeta {
  const labels = { ...current.labels, ...(input.labels ?? {}) };
  for (const [file, label] of Object.entries(labels)) if (!label) delete labels[file];
  return {
    ...current,
    title: input.title ?? current.title,
    artist: input.artist ?? current.artist,
    labels,
  };
}

/** Audio files of a folder, sorted by name, except the ones in `exclude` (absolute paths). */
export async function findRecordingFiles(
  dir: string,
  dirFiles: string[],
  exclude: (string | null)[] = [],
): Promise<SongRecordingFile[]> {
  const skip = new Set(exclude.filter((p): p is string => !!p).map((p) => path.resolve(p)));
  const out: SongRecordingFile[] = [];
  for (const file of dirFiles.filter(isRecordingFileName).sort()) {
    const full = path.resolve(dir, file);
    if (skip.has(full)) continue;
    try {
      const stat = await fs.promises.stat(full);
      if (stat.isFile()) out.push({ file, path: full, mtimeMs: stat.mtimeMs });
    } catch {
      // vanished between readdir and stat
    }
  }
  return out;
}

/** Creates a new song folder without `.txt` (never reuses one) and writes its `song.json`. */
export async function createSongFolder(
  root: string,
  input: { title: string; artist: string; id?: string },
): Promise<{ folder: string; meta: SongMeta }> {
  await fs.promises.mkdir(root, { recursive: true });
  const base = songFolderName(input.title, input.artist);
  let name = base;
  for (let i = 2; fs.existsSync(path.join(root, name)); i++) name = `${base} (${i})`;
  const folder = path.join(root, name);
  await fs.promises.mkdir(folder);
  const meta: SongMeta = {
    version: 1,
    id: input.id ?? newSongId(),
    title: input.title,
    artist: input.artist,
    labels: {},
  };
  await writeSongMeta(folder, meta);
  return { folder, meta };
}

/** The configured library directory a path lies in, if any. */
export function libraryFor(target: string): string | null {
  const resolved = path.resolve(target);
  return (
    (serverConfig.directories || []).find((d) => {
      const dir = path.resolve(d);
      return resolved === dir || resolved.startsWith(dir + path.sep);
    }) ?? null
  );
}

/**
 * A song folder without a karaoke `.txt` (#568): sheet music and/or `song.json`. Its id is stored
 * in `song.json`, so it survives renaming the folder; a folder without one gets it written now.
 */
export async function readScoreOnlySong(dir: string, dirFiles: string[]): Promise<Song | null> {
  const folderScores = await findScoreFiles(dir, dirFiles);
  const stored = await readSongMeta(dir);
  if (!stored && folderScores.length === 0) return null;
  let meta: SongMeta = stored ?? {
    version: 1,
    id: '',
    ...metaFromFolderName(path.basename(dir)),
    labels: {},
  };
  if (!meta.title) meta = { ...meta, title: path.basename(dir) };
  if (!meta.id) {
    meta = { ...meta, id: newSongId() };
    try {
      await writeSongMeta(dir, meta);
    } catch (e: unknown) {
      console.warn(
        `[Scanner] Could not write ${SONG_META_FILE} in ${dir}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }
  const recordings = await findRecordingFiles(dir, dirFiles);
  return {
    id: meta.id,
    title: meta.title,
    artist: meta.artist,
    bpm: 0,
    gap: 0,
    video: null,
    audio: null,
    originalAudio: null,
    instrumentalAudio: null,
    vocalsAudio: null,
    hasSeparation: false,
    cover: null,
    background: null,
    txtPath: '',
    txtContent: '',
    duration: 0,
    folder: dir,
    karaoke: false,
    folderScores,
    recordings,
    labels: meta.labels,
    searchString: `${meta.title} ${meta.artist}`.toLowerCase(),
  };
}

/**
 * A valid `song.json` id is the song's id, with or without `.txt` (it survives a `.txt` being
 * added or the folder renamed); only the folder's first `.txt` takes it, so ids stay unique.
 */
export function storedSongId(meta: SongMeta | null, dirFiles: string[], txtPath: string): string {
  const firstTxt = dirFiles.filter((f) => f.toLowerCase().endsWith('.txt')).sort()[0];
  return meta?.id && firstTxt === path.basename(txtPath) ? meta.id : '';
}

/** A copied folder carries the same `song.json` id: the later one (by path) gets a new id. */
export async function dedupeSongIds(songs: Song[]): Promise<void> {
  const seen = new Set<string>();
  for (const song of [...songs].sort((a, b) => a.folder.localeCompare(b.folder))) {
    if (!seen.has(song.id)) {
      seen.add(song.id);
      continue;
    }
    // only a `song.json` id can repeat (a copied folder); `.txt`-derived ids are left alone
    const meta = await readSongMeta(song.folder);
    if (!meta || meta.id !== song.id) continue;
    song.id = newSongId();
    seen.add(song.id);
    await writeSongMeta(song.folder, { ...meta, id: song.id }).catch(() => undefined);
  }
}

/** Files that make a folder a song: a karaoke `.txt`, sheet music or `song.json` (#568). */
export const SONG_FOLDER_GLOBS = [
  '**/*.txt',
  `**/${SONG_META_FILE}`,
  '**/*.{mxl,musicxml,xml,mid,midi}',
];

/**
 * Library directory new song folders go to (a new song from Notes, a migrated Notes piece): the
 * download folder when it lies in a library directory, else the first library directory.
 */
export function songCreationRoot(): string | null {
  const download = serverConfig.downloadDir;
  if (download && libraryFor(download)) return download;
  return serverConfig.directories?.[0] ?? null;
}
