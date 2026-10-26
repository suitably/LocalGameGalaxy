/** Where the recording behind the song stands, for the stage's recording chip and panel. */
export type RecordingStatus =
  | { kind: 'none' }
  | { kind: 'running'; stage: AlignStage; percent: number }
  | { kind: 'failed'; error: string }
  | { kind: 'unaligned' }
  | { kind: 'aligned' };

export const ALIGN_STAGES = ['analyse', 'match', 'refine'] as const;
export type AlignStage = (typeof ALIGN_STAGES)[number];

type AlignInput =
  | { kind: 'none' }
  | { kind: 'running'; stage: AlignStage; fraction: number }
  | { kind: 'done' }
  | { kind: 'failed'; error: string };

/** Overall alignment progress in percent: the three stages share the bar equally. */
export function alignPercent(stage: AlignStage, fraction: number): number {
  return ((ALIGN_STAGES.indexOf(stage) + fraction) / ALIGN_STAGES.length) * 100;
}

export function recordingStatus(
  hasRecording: boolean,
  align: AlignInput,
  hasMarks: boolean,
): RecordingStatus {
  if (!hasRecording) return { kind: 'none' };
  if (align.kind === 'running')
    return {
      kind: 'running',
      stage: align.stage,
      percent: Math.round(alignPercent(align.stage, align.fraction)),
    };
  if (align.kind === 'failed') return { kind: 'failed', error: align.error };
  return hasMarks ? { kind: 'aligned' } : { kind: 'unaligned' };
}
