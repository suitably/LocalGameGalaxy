import { useCallback, useMemo, useState } from 'react';
import {
  assessMarks,
  defaultMode,
  marksForMode,
  nearestBar,
  pinBar,
  type AlignResult,
  type BarMark,
  type MarksMode,
  type ScoreSong,
} from '../../../modules/music-score';
import type { StoredBarMarks } from '../../../lib/companion/songScoresApi';
import { nudgeOffset } from './logic/tuning';
import { storedMarksPlan, storedMode } from './logic/marksPolicy';
import type { StageEngine } from './engine/StageEngine';

/**
 * The bar marks of the recording on stage: the marks, how they play (`mode`), the fine-tune
 * offset, bars pinned by hand, which alignment made them and whether someone corrected them.
 * `changed` runs on every change a user makes (the stage then has something to save).
 */
export function useStageMarks(engine: StageEngine, song: ScoreSong | null, changed: () => void) {
  const [marks, setMarks] = useState<BarMark[] | null>(null);
  // bars placed by hand (indices into marks); cleared whenever the marks are replaced
  const [pins, setPins] = useState<number[]>([]);
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState<MarksMode>('bars');
  const [aligner, setAligner] = useState<number | null>(null);
  const [edited, setEdited] = useState(false);
  // stored marks from an older alignment: they play until a fresh alignment replaces them
  const [stale, setStale] = useState(false);

  const replace = useCallback(
    (next: BarMark[] | null, meta: { offset: number; mode: MarksMode; aligner: number | null }) => {
      setMarks(next);
      setPins([]);
      setOffset(meta.offset);
      setMode(meta.mode);
      setAligner(meta.aligner);
      setEdited(false);
      setStale(false);
    },
    [],
  );

  const clear = useCallback(
    () => replace(null, { offset: 0, mode: 'bars', aligner: null }),
    [replace],
  );

  /** Marks stored with the score; returns whether they play as they are (else they are aligned again). */
  const applyStored = useCallback(
    (stored: StoredBarMarks, origin: 'notes' | 'karaoke') => {
      const plan = storedMarksPlan(stored, origin);
      replace(stored.marks, {
        offset: stored.offsetSec,
        mode: storedMode(stored),
        aligner: stored.aligner ?? null,
      });
      setEdited(!!stored.edited);
      setStale(plan === 'realign');
      return plan === 'use';
    },
    [replace],
  );

  const applyAlignment = useCallback(
    (s: ScoreSong, result: AlignResult) =>
      replace(result.marks, {
        offset: 0,
        mode: defaultMode(assessMarks(s, result.marks)),
        aligner: result.version,
      }),
    [replace],
  );

  // what the recording plays with: the marks bar by bar, a steady tempo through them, or none
  const played = useMemo(
    () => (song ? marksForMode(song, marks, mode) : null),
    [song, marks, mode],
  );
  const quality = useMemo(
    () => (song && marks && marks.length >= 2 ? assessMarks(song, marks) : null),
    [song, marks],
  );

  /** Moves the bar line nearest to what the recording plays now onto this moment and pins it. */
  const pinBarNow = useCallback(() => {
    const now = engine.recording?.time();
    if (!marks || now === undefined) return;
    const sec = now - offset;
    const next = pinBar(marks, pins, nearestBar(marks, sec), sec);
    if (!next) return;
    setMarks(next.marks);
    setPins(next.pins);
    // a pinned bar only shows bar by bar
    setMode('bars');
    setEdited(true);
    changed();
  }, [engine, marks, pins, offset, changed]);

  const setOffsetSec = useCallback(
    (sec: number) => {
      setOffset(nudgeOffset(sec, 0));
      setEdited(true);
      changed();
    },
    [changed],
  );

  const nudge = useCallback(
    (deltaSec: number) => {
      setOffset((o) => nudgeOffset(o, deltaSec));
      setEdited(true);
      changed();
    },
    [changed],
  );

  const chooseMode = useCallback(
    (next: MarksMode) => {
      setMode(next);
      changed();
    },
    [changed],
  );

  return {
    marks,
    pins,
    offset,
    mode,
    aligner,
    edited,
    stale,
    played,
    quality,
    clear,
    applyStored,
    applyAlignment,
    pinBarNow,
    setOffsetSec,
    nudge,
    chooseMode,
  };
}
