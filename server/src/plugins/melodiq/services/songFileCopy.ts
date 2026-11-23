import fs from 'node:fs';
import path from 'node:path';
import { marksPathFor, uniqueFileName, type SongScoreFile } from '../../../utils/scoreFiles';
import { RECORDING_EXTENSIONS, type SongRecordingFile } from './songFolder';

/**
 * Copying scores (with their bar marks) and recordings into a song folder: the migration of the
 * old Notes library and moving a song's files into another song (#563) share it.
 */
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

/**
 * Copies recordings, then scores with their marks into `folder`; name clashes get `name (2)`.
 * Returns the name each score has in the folder (by its old file name).
 */
export async function copySongFiles(
  scores: SongScoreFile[],
  recordings: SongRecordingFile[],
  folder: string,
): Promise<Map<string, string>> {
  const renamed = new Map<string, string>();
  for (const rec of recordings) {
    renamed.set(rec.file, await copyInto(rec.path, folder, RECORDING_EXTENSIONS));
  }
  const scoreNames = new Map<string, string>();
  for (const score of scores) {
    const name = await copyInto(score.path, folder, [path.extname(score.file).toLowerCase()]);
    if (score.marksPath) await copyMarks(score.marksPath, path.join(folder, name), renamed);
    scoreNames.set(score.file, name);
  }
  return scoreNames;
}
