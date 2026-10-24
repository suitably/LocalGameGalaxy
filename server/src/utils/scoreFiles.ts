import fs from 'node:fs';
import path from 'node:path';

/** Sheet-music files a song folder may hold next to its UltraStar .txt. */
export const SCORE_EXTENSIONS = ['.mxl', '.musicxml', '.xml', '.mid', '.midi'];
/** Bar marks (score ↔ recording alignment) are stored next to the score as `<score file>.marks.json`. */
export const MARKS_SUFFIX = '.marks.json';
export const MAX_SCORE_BYTES = 20 * 1024 * 1024;
const MAX_MARKS = 20000;
const SNIFF_BYTES = 4096;

export interface SongScoreFile {
  file: string;
  path: string;
  marksPath: string | null;
  mtimeMs: number;
}

export interface BarMark {
  beat: number;
  sec: number;
}

export interface StoredMarks {
  version: 1;
  /** File name of the recording the marks belong to (in the same folder), if known. */
  audio: string | null;
  offsetSec: number;
  marks: BarMark[];
  updatedAt: string;
}

export function isScoreFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    !name.startsWith('.') &&
    !lower.endsWith(MARKS_SUFFIX) &&
    SCORE_EXTENSIONS.some((e) => lower.endsWith(e))
  );
}

export const marksPathFor = (scorePath: string): string => scorePath + MARKS_SUFFIX;

/** Plain .xml files only count when they really are MusicXML (song folders hold other XML too). */
async function isMusicXmlFile(filePath: string): Promise<boolean> {
  let handle: fs.promises.FileHandle | null = null;
  try {
    handle = await fs.promises.open(filePath, 'r');
    const buf = Buffer.alloc(SNIFF_BYTES);
    const { bytesRead } = await handle.read(buf, 0, SNIFF_BYTES, 0);
    return /<score-(partwise|timewise)/.test(buf.subarray(0, bytesRead).toString('utf-8'));
  } catch {
    return false;
  } finally {
    await handle?.close();
  }
}

export async function findScoreFiles(dir: string, dirFiles: string[]): Promise<SongScoreFile[]> {
  const out: SongScoreFile[] = [];
  for (const file of dirFiles.filter(isScoreFileName).sort()) {
    const full = path.resolve(dir, file);
    if (file.toLowerCase().endsWith('.xml') && !(await isMusicXmlFile(full))) continue;
    try {
      const stat = await fs.promises.stat(full);
      if (!stat.isFile()) continue;
      const marks = marksPathFor(full);
      out.push({
        file,
        path: full,
        marksPath: fs.existsSync(marks) ? marks : null,
        mtimeMs: stat.mtimeMs,
      });
    } catch {
      // vanished between readdir and stat
    }
  }
  return out;
}

/** Upload name reduced to a plain file name: no directories, safe characters only. */
export function cleanUploadName(original: string): string {
  const base = path.basename(original.replace(/\\/g, '/')).normalize('NFC');
  return base
    .replace(/[^\p{L}\p{N} ._()&,'-]/gu, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(-120);
}

/** File name to store an upload under: no directories, a score extension, safe characters only. */
export function safeScoreFileName(original: string): string | null {
  const cleaned = cleanUploadName(original);
  return cleaned && isScoreFileName(cleaned) ? cleaned : null;
}

/** Picks `name`, or `name (2)`, `name (3)` … when the folder already has a file of that name. */
export function uniqueFileName(
  dir: string,
  name: string,
  extensions: string[] = SCORE_EXTENSIONS,
): string {
  if (!fs.existsSync(path.join(dir, name))) return name;
  const lower = name.toLowerCase();
  const ext = extensions.find((e) => lower.endsWith(e)) ?? path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let i = 2; i < 1000; i++) {
    const candidate = `${stem} (${i})${ext}`;
    if (!fs.existsSync(path.join(dir, candidate))) return candidate;
  }
  return `${stem} (${Date.now()})${ext}`;
}

/** Checks a marks upload; returns the normalised record or an error message. */
export function parseMarksBody(body: unknown): StoredMarks | string {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object';
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.marks) || b.marks.length < 2)
    return 'marks must be an array with at least two entries';
  if (b.marks.length > MAX_MARKS) return `marks must have at most ${MAX_MARKS} entries`;
  const marks: BarMark[] = [];
  for (const m of b.marks) {
    const beat = (m as BarMark)?.beat;
    const sec = (m as BarMark)?.sec;
    if (
      typeof beat !== 'number' ||
      typeof sec !== 'number' ||
      !Number.isFinite(beat) ||
      !Number.isFinite(sec)
    ) {
      return 'every mark needs numeric beat and sec';
    }
    const prev = marks[marks.length - 1];
    if (prev && (beat <= prev.beat || sec <= prev.sec))
      return 'marks must increase in beat and sec';
    marks.push({ beat, sec });
  }
  const offsetSec = b.offsetSec === undefined ? 0 : Number(b.offsetSec);
  if (!Number.isFinite(offsetSec) || Math.abs(offsetSec) > 600)
    return 'offsetSec must be a number of seconds';
  const audio = typeof b.audio === 'string' && b.audio ? path.basename(b.audio) : null;
  return { version: 1, audio, offsetSec, marks, updatedAt: new Date().toISOString() };
}
