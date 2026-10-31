import { Alert, Button, LinearProgress, Stack, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/YouTube';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CompanionSong } from '../../../../lib/companion/songScoresApi';
import { recordingQuery } from '../logic/batchImport';
import { canReplaceRecording } from '../logic/songFileEdits';
import { useRecordingReplace } from '../useRecordingReplace';
import { batchProgressText } from './batchProgress';
import { YouTubeResults } from './YouTubeResults';

interface RecordingSearchProps {
  song: CompanionSong;
  disabled: boolean;
  onReplaced: (next: CompanionSong) => void;
}

/** Folder view: search YouTube again for the song and swap the folder's mix for the chosen video. */
export function RecordingSearch({ song, disabled, onReplaced }: RecordingSearchProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const { run, start } = useRecordingReplace(song, onReplaced);
  const busy = run.kind === 'running';

  if (!canReplaceRecording(song))
    return (
      <Typography variant="caption" color="text.secondary">
        {k('replace_locked')}
      </Typography>
    );
  if (!open)
    return (
      <Button
        variant="outlined"
        startIcon={<SearchIcon />}
        disabled={disabled}
        onClick={() => setOpen(true)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {k('replace_open')}
      </Button>
    );
  const progress = run.kind === 'running' ? batchProgressText(run.progress) : null;
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        {k('replace_hint')}
      </Typography>
      <YouTubeResults
        initialQuery={recordingQuery(song.title, song.artist)}
        selected={url}
        onSelect={setUrl}
        disabled={busy || disabled}
      />
      {progress && (
        <Stack spacing={0.5}>
          <Typography variant="body2">{k(progress.key, progress.opts)}</Typography>
          <LinearProgress
            variant={progress.value === undefined ? 'indeterminate' : 'determinate'}
            value={progress.value}
          />
        </Stack>
      )}
      {run.kind === 'failed' && (
        <Alert severity="error">{k('yt_failed', { error: run.error })}</Alert>
      )}
      {run.kind === 'done' && (
        <Alert severity="success">{k('replace_done', { count: run.aligned })}</Alert>
      )}
      <Button
        variant="contained"
        disabled={!url || busy || disabled}
        onClick={() => url && void start(url)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {k('replace_start')}
      </Button>
    </Stack>
  );
}
