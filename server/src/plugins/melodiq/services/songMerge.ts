import fs from 'node:fs';
import path from 'node:path';
import { marksPathFor } from '../../../utils/scoreFiles';
import { copySongFiles } from './songFileCopy';
import { withScoreParts } from './partSettings';
import { SONG_META_FILE, mergeSongMeta, songMetaOf, writeSongMeta } from './songFolder';
import type { Song } from '../../../core/types';

/** Why a song cannot be moved into another one, or null when it can. */
export function mergeRefusal(source: Song, target: Song): string | null {
  if (source.id === target.id) return 'A song cannot be moved into itself';
  if (source.karaoke || source.txtPath) return 'Only a song without karaoke .txt can be moved';
  if (path.resolve(source.folder) === path.resolve(target.folder)) {
    return 'Both songs share one folder';
  }
  return null;
}

/**
 * Moves the scores (with marks and labels) and recordings of a song without `.txt` into another
 * song's folder (#563 "link to a Melodiq song"), then removes the source's `song.json` and its
 * folder when nothing else is left in it. Name clashes get `name (2)`; an identical file the
 * target already holds is reused. Returns the score names in the target (by old file name).
 */
export async function mergeSongInto(source: Song, target: Song): Promise<Map<string, string>> {
  const names = await copySongFiles(source.folderScores, source.recordings, target.folder);
  const current = await songMetaOf(target);
  const labels: Record<string, string> = {};
  let meta = current;
  for (const [file, name] of names) {
    const label = source.labels[file];
    if (label && !current.labels[name]) labels[name] = label;
    const parts = source.partSettings[file];
    if (parts && !current.parts[name]) meta = withScoreParts(meta, name, parts);
  }
  if (Object.keys(labels).length || meta !== current) {
    await writeSongMeta(target.folder, mergeSongMeta(meta, { labels }));
  }
  for (const score of source.folderScores) {
    await fs.promises.rm(score.path, { force: true });
    await fs.promises.rm(marksPathFor(score.path), { force: true });
  }
  for (const rec of source.recordings) await fs.promises.rm(rec.path, { force: true });
  await fs.promises.rm(path.join(source.folder, SONG_META_FILE), { force: true });
  // only an empty folder goes; anything else the user put there stays
  await fs.promises.rmdir(source.folder).catch(() => undefined);
  return names;
}
