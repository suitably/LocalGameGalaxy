import fs from 'node:fs';
import path from 'node:path';
import { serverConfig } from '../../../config';
import { marksPathFor, uniqueFileName } from '../../../utils/scoreFiles';
import { createPiece, listPieces, type NotesPiece } from '../../notes/services/library';
import type { Song } from '../../../core/types';

/**
 * One-time import of song-folder sheet music into the Notes library (Q18): the Notes library is
 * the only score store. Every `.mxl/.musicxml/.xml/.mid` in a song folder becomes a score of a
 * Notes piece linked to the song (`songId`), with its `<score>.marks.json` bar marks. Originals
 * stay where they are. The marker file in the notes folder lists every source file already
 * imported, so a restart never imports one twice — not even after its piece was deleted.
 */
export const MIGRATION_MARKER = '.song-scores-imported.json';

interface MigrationMarker {
  version: 1;
  /** Absolute paths of imported song-folder score files. */
  imported: string[];
}

export interface MigrationResult {
  imported: number;
  /** Listed in the marker file by an earlier run. */
  skipped: number;
}

async function readMarker(root: string): Promise<Set<string>> {
  try {
    const raw = JSON.parse(
      await fs.promises.readFile(path.join(root, MIGRATION_MARKER), 'utf-8'),
    ) as Partial<MigrationMarker>;
    return new Set(
      Array.isArray(raw.imported) ? raw.imported.filter((p) => typeof p === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

async function writeMarker(root: string, imported: Set<string>): Promise<void> {
  const marker: MigrationMarker = { version: 1, imported: [...imported].sort() };
  await fs.promises.writeFile(path.join(root, MIGRATION_MARKER), JSON.stringify(marker, null, 2));
}

/** Same name and size: the file was copied by an earlier run whose marker was not written. */
async function alreadyInPiece(piece: NotesPiece, file: string, source: string): Promise<boolean> {
  const existing = piece.scores.find((s) => s.file === file);
  if (!existing) return false;
  try {
    const [a, b] = await Promise.all([fs.promises.stat(existing.path), fs.promises.stat(source)]);
    return a.size === b.size;
  } catch {
    return false;
  }
}

export async function migrateSongFolderScores(
  songs: Song[],
  root = serverConfig.notesDir,
): Promise<MigrationResult> {
  const result: MigrationResult = { imported: 0, skipped: 0 };
  const done = await readMarker(root);
  const pending = songs
    .map((song) => ({ song, scores: (song.folderScores ?? []).filter((s) => !done.has(s.path)) }))
    .filter((p) => p.scores.length > 0);
  const total = songs.reduce((n, s) => n + (s.folderScores ?? []).length, 0);
  result.skipped = total - pending.reduce((n, p) => n + p.scores.length, 0);
  if (pending.length === 0) return result;

  const pieces = await listPieces(root);
  for (const { song, scores } of pending) {
    let piece =
      pieces.find((p) => p.songId === song.id) ??
      (await createPiece({ title: song.title, artist: song.artist, songId: song.id }, root));
    for (const score of scores) {
      try {
        if (!(await alreadyInPiece(piece, score.file, score.path))) {
          const target = uniqueFileName(piece.folder, score.file);
          const targetPath = path.join(piece.folder, target);
          await fs.promises.copyFile(score.path, targetPath);
          if (score.marksPath)
            await fs.promises.copyFile(score.marksPath, marksPathFor(targetPath));
          piece = {
            ...piece,
            scores: [...piece.scores, { ...score, file: target, path: targetPath }],
          };
          result.imported++;
        }
        done.add(score.path);
      } catch (e: unknown) {
        console.warn(
          `[Notes] Could not import ${score.path}:`,
          e instanceof Error ? e.message : String(e),
        );
      }
    }
    await writeMarker(root, done);
  }
  if (result.imported > 0) {
    console.log(`[Notes] Imported ${result.imported} song-folder score(s) into ${root}`);
  }
  return result;
}
