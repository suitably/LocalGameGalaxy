import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotesDialogFrame } from '../../components/NotesDialogFrame';
import { matchSong, planImport } from '../logic/youtubeImport';
import type { StageSongState } from '../useStageSong';
import type { YouTubeImportState } from '../useYouTubeImport';
import { YouTubeResults } from './YouTubeResults';

interface YouTubeRecordingDialogProps {
  open: boolean;
  onClose: () => void;
  state: StageSongState;
  importer: YouTubeImportState;
}

/** Find the recording of the score on stage on YouTube; the server downloads it into a song folder and the score's Notes piece is linked to it. */
export function YouTubeRecordingDialog({
  open,
  onClose,
  state,
  importer,
}: YouTubeRecordingDialogProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  // mounted only while open, so every opening starts from the song on stage
  const [title, setTitle] = useState(() => state.song?.title ?? '');
  const [artist, setArtist] = useState(() => state.song?.artist ?? '');
  const [url, setUrl] = useState<string | null>(null);
  const { run, songs, songsError, refreshSongs } = importer;
  const busy = run.kind === 'running';

  useEffect(() => refreshSongs(), [refreshSongs]);

  const origin = state.origin;
  const linked = origin?.kind === 'notes' || origin?.kind === 'karaoke' ? origin.songId : null;
  const plan = useMemo(
    () => (songs ? planImport(matchSong(songs, title, artist, linked)) : null),
    [songs, title, artist, linked],
  );
  const needsDownload = plan?.kind !== 'reuse';
  // why the main button is still disabled (#562: it looked unclickable without a reason)
  const blocker =
    !title.trim() || !artist.trim()
      ? 'yt_need_meta'
      : !plan
        ? songsError
          ? null
          : 'yt_need_songs'
        : needsDownload && !url
          ? 'yt_need_video'
          : null;
  const ready = !!plan && !blocker;
  const folder =
    plan && plan.kind !== 'download-new' ? `${plan.song.artist} – ${plan.song.title}` : '';

  let progressText = '';
  let progressValue: number | undefined;
  if (run.kind === 'running') {
    const p = run.progress;
    if (p?.stage === 'download') {
      progressText = k(p.status === 'pending' ? 'yt_queued' : 'yt_downloading', {
        percent: p.progress,
      });
      progressValue = p.progress;
    } else progressText = k(p?.stage === 'score' ? 'yt_storing_score' : 'loading');
  }

  const close = () => {
    importer.cancel();
    onClose();
  };
  const confirm = () =>
    void importer
      .start({ title: title.trim(), artist: artist.trim() }, needsDownload ? url : null)
      .then((ok) => ok && onClose());

  return (
    <NotesDialogFrame open={open} onClose={close} title={k('yt_title')} maxWidth="sm">
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {k('yt_hint')}
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              label={k('yt_artist')}
              value={artist}
              disabled={busy}
              onChange={(e) => setArtist(e.target.value)}
            />
            <TextField
              size="small"
              fullWidth
              label={k('yt_song_title')}
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Stack>
          {songsError && (
            <Alert severity="error">{k('yt_songs_error', { error: songsError })}</Alert>
          )}
          {plan && (
            <Alert severity="info">
              {plan.kind === 'reuse'
                ? k('yt_plan_reuse', { folder })
                : plan.kind === 'download-into'
                  ? k('yt_plan_into', { folder })
                  : k('yt_plan_new')}
            </Alert>
          )}
          {open && needsDownload && songs && (
            <YouTubeResults
              initialQuery={`${state.song?.artist ?? ''} ${state.song?.title ?? ''}`.trim()}
              selected={url}
              onSelect={setUrl}
              disabled={busy}
            />
          )}
          {busy && (
            <Stack spacing={0.5}>
              <LinearProgress
                variant={progressValue === undefined ? 'indeterminate' : 'determinate'}
                value={progressValue}
              />
              <Typography variant="caption">{progressText}</Typography>
            </Stack>
          )}
          {blocker && !busy && (
            <Typography variant="caption" color="text.secondary" role="status">
              {k(blocker)}
            </Typography>
          )}
          {run.kind === 'failed' && (
            <Alert severity="error">{k('yt_failed', { error: run.error })}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} color="inherit">
          {t('common.cancel')}
        </Button>
        <Button variant="contained" disabled={!ready || busy} onClick={confirm}>
          {needsDownload ? k('yt_download') : k('yt_use')}
        </Button>
      </DialogActions>
    </NotesDialogFrame>
  );
}
