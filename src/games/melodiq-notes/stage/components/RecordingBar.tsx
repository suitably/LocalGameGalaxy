import { Button, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { StageSongState } from '../useStageSong';

const NUDGE_SEC = 0.05;
const STAGES = ['analyse', 'match', 'refine'] as const;
const signed = (n: number) => (n > 0 ? '+' : '−') + Math.abs(n);

/** The recording behind the song: choose it, align it bar by bar, fine-tune, save it to the server or export the score. */
export function RecordingBar({ state }: { state: StageSongState }) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const fileRef = useRef<HTMLInputElement>(null);
  const { recording, align, marks, offset, pins } = state;
  const running = align.kind === 'running';
  const progress = running
    ? ((STAGES.indexOf(align.stage) + align.fraction) / STAGES.length) * 100
    : 0;
  let info = k('not_aligned');
  if (running)
    info = k('aligning', { stage: k(`align_stage.${align.stage}`), percent: Math.round(progress) });
  else if (align.kind === 'failed') info = k('align_failed', { error: align.error });
  else if (marks) {
    info = k('aligned', { bars: marks.length - 1, start: (marks[0].sec + offset).toFixed(2) });
    const tuning = align.kind === 'done' ? align.tuning : undefined;
    if (tuning?.semitones)
      info += ` · ${k('tuning_semitones', {
        shift: signed(tuning.semitones),
        count: Math.abs(tuning.semitones),
      })}`;
    if (tuning && Math.abs(tuning.cents) >= 10)
      info += ` · ${k('tuning_cents', { cents: signed(tuning.cents) })}`;
    if (pins.length) info += ` · ${k('pinned', { count: pins.length })}`;
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" color="text.secondary">
          {k('audio_title')}:
        </Typography>
        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: '32ch' }}>
          {recording ? recording.name : k('audio_none')}
        </Typography>
        <Button size="small" variant="outlined" onClick={() => fileRef.current?.click()}>
          {k('audio_add')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          hidden
          accept="audio/*,.mp3,.m4a,.ogg,.wav,.flac"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) state.setRecordingFile(f);
          }}
        />
        {state.canSaveToServer && (
          <Button
            size="small"
            variant="outlined"
            disabled={state.saved || running}
            onClick={() => void state.saveToServer()}
          >
            {state.saved
              ? k('saved')
              : state.saveTarget === 'song-marks'
                ? k('save_marks')
                : k('save_to_library')}
          </Button>
        )}
        {recording && (
          <>
            <Button
              size="small"
              variant="contained"
              disabled={running}
              onClick={() => void state.alignNow()}
            >
              {marks ? k('realign') : k('align')}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {k('fine_tune')}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              aria-label={k('earlier')}
              onClick={() => state.nudge(-NUDGE_SEC)}
            >
              −
            </Button>
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', minWidth: '6ch', textAlign: 'center' }}
            >
              {offset >= 0 ? '+' : ''}
              {offset.toFixed(2)} s
            </Typography>
            <Button
              size="small"
              variant="outlined"
              aria-label={k('later')}
              onClick={() => state.nudge(NUDGE_SEC)}
            >
              +
            </Button>
            {marks && (
              <Tooltip title={k('pin_bar_hint')} describeChild>
                <Button size="small" variant="outlined" onClick={state.pinBarNow}>
                  {k('pin_bar')}
                </Button>
              </Tooltip>
            )}
            {state.canExport && (
              <Button size="small" variant="text" onClick={state.exportScore}>
                {k('export_score')}
              </Button>
            )}
          </>
        )}
      </Stack>
      {recording && (
        <Typography variant="caption" color={align.kind === 'failed' ? 'error' : 'text.secondary'}>
          {info}
        </Typography>
      )}
      {running && <LinearProgress variant="determinate" value={progress} />}
    </Stack>
  );
}
