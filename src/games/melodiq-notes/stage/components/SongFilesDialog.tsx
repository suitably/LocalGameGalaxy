import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  type Theme,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/UploadFileRounded';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import type { CompanionSong } from '../../../../lib/companion/songScoresApi';
import { NotesDialogFrame } from '../../components/NotesDialogFrame';
import {
  SONG_FILE_ACCEPT,
  canEditSongMeta,
  songFileRows,
  type SongFileRow,
} from '../logic/songFileEdits';
import { useSongFilesManager } from '../useSongFilesManager';
import { SongFileRowItem } from './SongFileRowItem';

interface SongFilesDialogProps {
  song: CompanionSong;
  /** `changed`: something was stored on the server, so the library reloads. */
  onClose: (changed: boolean) => void;
}

/**
 * Manages one song folder from the Notes library: names of its scores, title and artist (songs
 * without `.txt`), adding, downloading and deleting scores and extra recordings. Mounted only
 * while open, so every opening starts from the song as listed.
 */
export function SongFilesDialog({ song: initial, onClose }: SongFilesDialogProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const phone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const m = useSongFilesManager(initial);
  const [deleting, setDeleting] = useState<SongFileRow | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const rows = songFileRows(m.song);
  const scores = rows.filter((r) => r.kind === 'score');
  const recordings = rows.filter((r) => r.kind === 'recording');
  const dirty = m.update.kind !== 'none';

  const close = () => (dirty ? setDiscarding(true) : onClose(m.changed));
  const save = async () => {
    if (await m.save()) onClose(true);
  };
  const row = (r: SongFileRow) => (
    <SongFileRowItem
      key={r.file}
      row={r}
      label={m.draft.labels[r.file] ?? ''}
      disabled={m.busy}
      onLabel={(label) => m.setLabel(r.file, label)}
      onDelete={() => setDeleting(r)}
    />
  );

  return (
    <NotesDialogFrame
      open
      onClose={close}
      maxWidth="sm"
      fullScreen={phone}
      title={k('files_title', { title: m.song.title })}
    >
      <DialogContent>
        <Stack spacing={2}>
          {m.error && (
            <Alert severity="error" onClose={m.clearError}>
              {k('action_error', { error: m.error })}
            </Alert>
          )}
          {canEditSongMeta(m.song) ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label={k('files_song_artist')}
                value={m.draft.artist}
                disabled={m.busy}
                onChange={(e) => m.setArtist(e.target.value)}
              />
              <TextField
                size="small"
                fullWidth
                required
                label={k('files_song_title')}
                value={m.draft.title}
                disabled={m.busy}
                error={m.update.kind === 'invalid'}
                helperText={m.update.kind === 'invalid' ? k('files_title_required') : undefined}
                onChange={(e) => m.setTitle(e.target.value)}
              />
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {k('files_meta_locked')}
            </Typography>
          )}
          <Typography variant="subtitle2">{k('files_scores')}</Typography>
          {scores.length ? (
            scores.map(row)
          ) : (
            <Typography variant="body2">{k('no_scores')}</Typography>
          )}
          <Typography variant="subtitle2">{k('files_recordings')}</Typography>
          {recordings.map(row)}
          <Typography variant="caption" color="text.secondary">
            {k('files_recordings_hint')}
          </Typography>
          <input
            ref={input}
            type="file"
            hidden
            multiple
            accept={SONG_FILE_ACCEPT}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              if (files.length) void m.upload(files);
            }}
          />
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            disabled={m.busy}
            onClick={() => input.current?.click()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {k('files_add')}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {k('files_add_hint')}
          </Typography>
          {m.busy && <LinearProgress />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{t('common.close')}</Button>
        <Button
          variant="contained"
          disabled={m.busy || m.update.kind !== 'update'}
          onClick={() => void save()}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
      <ConfirmDialog
        open={!!deleting}
        title={k('files_delete')}
        message={k(
          deleting?.kind === 'score'
            ? 'files_delete_score_confirm'
            : 'files_delete_recording_confirm',
          { file: deleting?.file ?? '' },
        )}
        confirmText={t('common.delete')}
        confirmColor="error"
        onConfirm={() => {
          if (deleting) void m.remove(deleting);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={discarding}
        title={k('files_discard')}
        message={k('files_discard_confirm')}
        confirmText={k('files_discard_action')}
        confirmColor="warning"
        onConfirm={() => onClose(m.changed)}
        onCancel={() => setDiscarding(false)}
      />
    </NotesDialogFrame>
  );
}
