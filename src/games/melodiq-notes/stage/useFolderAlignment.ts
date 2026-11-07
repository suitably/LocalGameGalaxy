import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MarkQuality } from '../../../modules/music-score';
import { getSongMarks, saveSongMarks } from '../../../lib/companion/notesLibraryApi';
import {
  fetchCompanionFile,
  type CompanionSong,
  type StoredBarMarks,
} from '../../../lib/companion/songScoresApi';
import { alignRecordingInBrowser } from './engine/browserRecording';
import {
  freshMarks,
  needsAlignment,
  storedStatus,
  type StoredMarksStatus,
} from './logic/folderAlignment';
import type { CheckSong } from './logic/markCheckText';
import { readScoreFile } from './loadScore';
import { pickRecording } from './serverScoreLoad';

export interface ScoreAlignment {
  /** null while the stored marks are being read. */
  status: StoredMarksStatus | null;
  stored: StoredBarMarks | null;
  /** Aligned on this device and not saved yet. */
  pending: StoredBarMarks | null;
  quality: MarkQuality | null;
  /** What the check text needs of the score (bar numbers, written tempo). */
  score: CheckSong | null;
  running: boolean;
  error: string | null;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const empty: ScoreAlignment = {
  status: null,
  stored: null,
  pending: null,
  quality: null,
  score: null,
  running: false,
  error: null,
};

/**
 * Alignment of every score of one song folder, for the "manage files" dialog: what is stored,
 * aligning one score or all that need it on this device, and storing the results on "Save".
 */
export function useFolderAlignment(song: CompanionSong) {
  const [rows, setRows] = useState<Record<string, ScoreAlignment>>({});
  // the recording is fetched once for "align all"
  const audio = useRef<{ url: string; data: ArrayBuffer } | null>(null);
  const scores = useMemo(() => song.scores ?? [], [song.scores]);
  const scoreKey = scores.map((s) => `${s.file}:${s.hasMarks}`).join('|');

  const patch = useCallback(
    (file: string, change: Partial<ScoreAlignment>) =>
      setRows((r) => ({ ...r, [file]: { ...empty, ...r[file], ...change } })),
    [],
  );

  useEffect(() => {
    let alive = true;
    for (const s of song.scores ?? []) {
      void (s.hasMarks ? getSongMarks(song.id, s.file) : Promise.resolve(null)).then((stored) => {
        if (alive) patch(s.file, { stored, status: storedStatus(stored) });
      });
    }
    return () => {
      alive = false;
    };
    // scoreKey stands for the scores and whether they have marks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.id, scoreKey, patch]);

  const align = useCallback(
    async (file: string) => {
      const score = scores.find((s) => s.file === file);
      if (!score) return;
      patch(file, { running: true, error: null });
      try {
        const { recording } = pickRecording(song, rows[file]?.stored ?? null);
        if (!recording) throw new Error('no recording');
        if (audio.current?.url !== recording.url) {
          const data = await (await fetch(recording.url)).arrayBuffer();
          audio.current = { url: recording.url, data };
        }
        const parsed = readScoreFile(file, await fetchCompanionFile(score.url)).song;
        const result = await alignRecordingInBrowser(audio.current.data.slice(0), parsed);
        const name = recording.songMix ? null : recording.name;
        const { stored, quality } = freshMarks(parsed, result.marks, name);
        const checked = { measureNumbers: parsed.measureNumbers, tempoMap: parsed.tempoMap };
        patch(file, { pending: stored, quality, score: checked, running: false });
      } catch (e) {
        patch(file, { running: false, error: message(e) });
      }
    },
    [scores, song, rows, patch],
  );

  /** Aligns, one after another, every score without marks or with outdated ones. */
  const alignAll = useCallback(async () => {
    for (const s of scores) {
      const row = rows[s.file];
      if (row?.status && needsAlignment(row.status) && !row.pending) await align(s.file);
    }
  }, [scores, rows, align]);

  const pendingFiles = Object.keys(rows).filter((f) => rows[f].pending);

  /** Stores every pending alignment next to its score. */
  const savePending = useCallback(async () => {
    for (const file of pendingFiles) {
      const pending = rows[file].pending;
      if (!pending) continue;
      await saveSongMarks(song.id, file, pending);
      patch(file, { stored: pending, pending: null, status: 'current' });
    }
    return pendingFiles.length > 0;
  }, [pendingFiles, rows, song.id, patch]);

  return {
    rows,
    running: Object.values(rows).some((r) => r.running),
    pendingCount: pendingFiles.length,
    canAlignAll: scores.some((s) => {
      const row = rows[s.file];
      return !!row?.status && needsAlignment(row.status) && !row.pending;
    }),
    align,
    alignAll,
    savePending,
  };
}

export type FolderAlignment = ReturnType<typeof useFolderAlignment>;
