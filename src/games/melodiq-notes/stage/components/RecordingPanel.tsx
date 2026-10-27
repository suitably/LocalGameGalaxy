import React, { useRef, useState } from 'react';
import { Button, Divider, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { isCompanionEnabled } from '../../../../lib/companion/songScoresApi';
import { recordingStatus } from '../logic/recordingStatus';
import type { StageSongState } from '../useStageSong';
import { useYouTubeImport } from '../useYouTubeImport';
import { YouTubeRecordingDialog } from './YouTubeRecordingDialog';
import { OffsetControls } from './OffsetControls';
import { UltraStarExport } from './UltraStarExport';
import { ultraStarChoices } from '../logic/ultraStarExport';

const signed = (n: number) => (n > 0 ? '+' : '−') + Math.abs(n);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Stack>
  );
}

/**
 * The recording behind the song, in the order it is set up: choose it, align it bar by bar,
 * fine-tune, then save it to the Notes library or export the score.
 */
export function RecordingPanel({ state }: { state: StageSongState }) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const fileRef = useRef<HTMLInputElement>(null);
  const [youTubeOpen, setYouTubeOpen] = useState(false);
  const importer = useYouTubeImport(state);
  const { recording, align, marks, offset, pins } = state;
  const status = recordingStatus(!!recording, align, !!marks);
  const running = status.kind === 'running';

  let info = k('not_aligned');
  if (status.kind === 'running')
    info = k('aligning', { stage: k(`align_stage.${status.stage}`), percent: status.percent });
  else if (status.kind === 'failed') info = k('align_failed', { error: status.error });
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
  const canExportUltraStar = !!marks && ultraStarChoices(state.song).parts.length > 0;
  const canKeep = state.canSaveToServer || state.canExport || canExportUltraStar;

  return (
    <>
      <Stack spacing={2} divider={<Divider flexItem />}>
        <Section title={k('rec_source')}>
          <Typography variant="body2" fontWeight={recording ? 600 : 400}>
            {recording ? recording.name : k('audio_none')}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" onClick={() => fileRef.current?.click()}>
              {k('audio_add')}
            </Button>
            {state.song && isCompanionEnabled() && (
              <Button variant="outlined" disabled={running} onClick={() => setYouTubeOpen(true)}>
                {k('yt_open')}
              </Button>
            )}
          </Stack>
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
        </Section>
        {recording && (
          <Section title={k('rec_sync')}>
            <Typography
              variant="body2"
              color={status.kind === 'failed' ? 'error' : 'text.secondary'}
            >
              {info}
            </Typography>
            {status.kind === 'running' && (
              <LinearProgress variant="determinate" value={status.percent} />
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="contained" disabled={running} onClick={() => void state.alignNow()}>
                {marks ? k('realign') : k('align')}
              </Button>
              {marks && (
                <Button variant="outlined" onClick={state.pinBarNow}>
                  {k('pin_bar')}
                </Button>
              )}
            </Stack>
            {marks && (
              <Typography variant="caption" color="text.secondary">
                {k('pin_bar_hint')}
              </Typography>
            )}
          </Section>
        )}
        {recording && (
          <Section title={k('fine_tune')}>
            <OffsetControls state={state} />
          </Section>
        )}
        {canKeep && (
          <Section title={k('rec_keep')}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {state.canSaveToServer && (
                <Button
                  variant="outlined"
                  disabled={state.saved || running}
                  onClick={() => void state.saveToServer()}
                >
                  {state.saved ? k('saved') : k('save_to_library')}
                </Button>
              )}
              {state.canExport && (
                <Button variant="text" onClick={state.exportScore}>
                  {k('export_score')}
                </Button>
              )}
            </Stack>
            <UltraStarExport state={state} />
          </Section>
        )}
      </Stack>
      {youTubeOpen && (
        <YouTubeRecordingDialog
          open
          onClose={() => setYouTubeOpen(false)}
          state={state}
          importer={importer}
        />
      )}
    </>
  );
}
