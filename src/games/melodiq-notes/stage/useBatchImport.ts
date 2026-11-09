import { useCallback, useEffect, useRef, useState } from 'react';
import { browserBatchApi } from './batchImportApi';
import {
  BatchSkipped,
  importScoreFile,
  type BatchProgress,
  type BatchResult,
  type RecordingReview,
} from './logic/batchImport';

export type BatchItemStatus =
  | { kind: 'waiting' }
  | { kind: 'running'; progress: BatchProgress | null }
  | { kind: 'done'; result: BatchResult }
  | { kind: 'waiting-review' }
  | { kind: 'skipped'; reason: BatchSkipped['reason'] }
  | { kind: 'failed'; error: string }
  | { kind: 'cancelled' };

export interface BatchItem {
  id: number;
  file: File;
  status: BatchItemStatus;
}

/** A score waiting for a person to pick one of its YouTube hits or skip it. */
export interface PendingReview extends RecordingReview {
  itemId: number;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Several score files → one song folder each, with the YouTube hit of matching length as recording
 * (a person picks or skips when none matches), aligned.
 * Files run one after another (the server's download queue and the aligner work one at a time);
 * a failing file does not stop the rest.
 */
export function useBatchImport() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [changed, setChanged] = useState(false);
  const [review, setReview] = useState<PendingReview | null>(null);
  const answer = useRef<((url: string | null) => void) | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const nextId = useRef(0);

  const setStatus = (id: number, status: BatchItemStatus) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, status } : i)));

  /** Resolves the open review (null = skip); a stop answers it too so nothing keeps waiting. */
  const resolveReview = useCallback((url: string | null) => {
    answer.current?.(url);
    answer.current = null;
    setReview(null);
  }, []);

  const start = useCallback(async (files: File[]) => {
    const added = files.map((file) => ({
      id: nextId.current++,
      file,
      status: { kind: 'waiting' } as const,
    }));
    setItems(added);
    const controller = new AbortController();
    ctrl.current = controller;
    setRunning(true);
    for (const item of added) {
      if (controller.signal.aborted) {
        setStatus(item.id, { kind: 'cancelled' });
        continue;
      }
      setStatus(item.id, { kind: 'running', progress: null });
      try {
        const result = await importScoreFile(
          item.file,
          browserBatchApi,
          (progress) => {
            if (!controller.signal.aborted) setStatus(item.id, { kind: 'running', progress });
          },
          controller.signal,
          (r) =>
            new Promise<string | null>((resolve) => {
              if (controller.signal.aborted) return resolve(null);
              answer.current = resolve;
              setStatus(item.id, { kind: 'waiting-review' });
              setReview({ ...r, itemId: item.id });
            }),
        );
        setStatus(item.id, { kind: 'done', result });
        setChanged(true);
      } catch (e) {
        if (e instanceof BatchSkipped && !controller.signal.aborted)
          setStatus(item.id, { kind: 'skipped', reason: e.reason });
        else
          setStatus(
            item.id,
            controller.signal.aborted
              ? { kind: 'cancelled' }
              : { kind: 'failed', error: errorText(e) },
          );
      }
    }
    setRunning(false);
  }, []);

  /** Stops after the current step; a download the server already started still finishes there. */
  const cancel = useCallback(() => {
    ctrl.current?.abort();
    resolveReview(null);
  }, [resolveReview]);

  useEffect(() => cancel, [cancel]);

  return { items, running, changed, review, resolveReview, start, cancel };
}

export type BatchImportState = ReturnType<typeof useBatchImport>;
