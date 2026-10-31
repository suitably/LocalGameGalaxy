import { useCallback, useEffect, useRef, useState } from 'react';
import { browserBatchApi } from './batchImportApi';
import { importScoreFile, type BatchProgress, type BatchResult } from './logic/batchImport';

export type BatchItemStatus =
  | { kind: 'waiting' }
  | { kind: 'running'; progress: BatchProgress | null }
  | { kind: 'done'; result: BatchResult }
  | { kind: 'failed'; error: string }
  | { kind: 'cancelled' };

export interface BatchItem {
  id: number;
  file: File;
  status: BatchItemStatus;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Several score files → one song folder each, with the top YouTube hit as recording, aligned.
 * Files run one after another (the server's download queue and the aligner work one at a time);
 * a failing file does not stop the rest.
 */
export function useBatchImport() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const [changed, setChanged] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const nextId = useRef(0);

  const setStatus = (id: number, status: BatchItemStatus) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, status } : i)));

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
        );
        setStatus(item.id, { kind: 'done', result });
        setChanged(true);
      } catch (e) {
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
  const cancel = useCallback(() => ctrl.current?.abort(), []);

  useEffect(() => () => ctrl.current?.abort(), []);

  return { items, running, changed, start, cancel };
}

export type BatchImportState = ReturnType<typeof useBatchImport>;
