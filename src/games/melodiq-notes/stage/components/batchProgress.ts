import type { BatchProgress } from '../logic/batchImport';

/** The translation key (under `games.melodiq_notes.stage`) and bar value for a step of an import. */
export function batchProgressText(p: BatchProgress | null): {
  key: string;
  opts?: Record<string, unknown>;
  value?: number;
} {
  if (!p) return { key: 'loading' };
  if (p.stage === 'download')
    return {
      key: p.status === 'pending' ? 'yt_queued' : 'yt_downloading',
      opts: { percent: p.progress },
      value: p.progress,
    };
  if (p.stage === 'score') return { key: 'yt_storing_score' };
  return { key: `batch_${p.stage}` };
}
