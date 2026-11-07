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
import ZipIcon from '@mui/icons-material/FolderZipRounded';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { songArchiveUrl } from '../../../../lib/companion/notesLibraryApi';
import type { CompanionSong } from '../../../../lib/companion/songScoresApi';
import { NotesDialogFrame } from '../../components/NotesDialogFrame';
import {
  SONG_FILE_ACCEPT,
  canEditSongMeta,
  songFileRows,
  type SongFileRow,
} from '../logic/songFileEdits';
import { useFolderAlignment } from '../useFolderAlignment';
import { useSongFilesManager } from '../useSongFilesManager';
import { RecordingSearch } from './RecordingSearch';
import { ScoreAlignmentLine } from './ScoreAlignmentLine';
import { SongFileRowItem } from './SongFileRowItem';

interface SongFilesDialogProps {
  song: CompanionSong;
  /** `changed`: something was stored on the server, so the library reloads. */
  onClose: (changed: boolean) => void;
}

/**
 * Manages one song folder from the Notes library: names of its scores, title and artist (songs
 * without `.txt`), aligning its scores with the recording, adding, downloading and deleting scores
 * and extra recordings. Mounted only
 * while open, so every opening starts from the song as listed.
 */
export function SongFilesDialog({ song: initial, onClose }: SongFilesDialogProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const phone = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const m = useSongFilesManager(initial);
  const aligner = useFolderAlignment(m.song);
  const [deleting, setDeleting] = useState<SongFileRow | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const rows = songFileRows(m.song);
  const scores = rows.filter((r) => r.kind === 'score');
  const recordings = rows.filter((r) => r.kind === 'recording');
  const dirty = m.update.kind !== 'none' || aligner.pendingCount > 0;
  const busy = m.busy || aligner.running;

  const close = () => (dirty ? setDiscarding(true) : onClose(m.changed));
  const save = async () => {
    const stored = await m.storeAll(aligner.savePending);
    if (stored) onClose(true);
  };
  const row = (r: SongFileRow) => (
    <SongFileRowItem
      key={r.file}
      row={r}
      label={m.draft.labels[r.file] ?? ''}
      disabled={busy}
      onLabel={(label) => m.setLabel(r.file, label)}
      onDelete={() => setDeleting(r)}
    />
  );
  const scoreRow = (r: SongFileRow) => (
    <Stack key={r.file} spacing={0.5}>
      {row(r)}
      <ScoreAlignmentLine
        row={aligner.rows[r.file]}
        disabled={busy}
        onAlign={() => void aligner.align(r.file)}
      />
    </Stack>
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
                disabled={busy}
                onChange={(e) => m.setArtist(e.target.value)}
              />
              <TextField
                size="small"
                fullWidth
                required
                label={k('files_song_title')}
                value={m.draft.title}
                disabled={busy}
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
            scores.map(scoreRow)
          ) : (
            <Typography variant="body2">{k('no_scores')}</Typography>
          )}
          {scores.length > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                disabled={busy || !aligner.canAlignAll}
                onClick={() => void aligner.alignAll()}
              >
                {k('files_align_all')}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {k('files_align_hint')}
              </Typography>
            </Stack>
          )}
          <Typography variant="subtitle2">{k('files_recordings')}</Typography>
          {recordings.map(row)}
          <Typography variant="caption" color="text.secondary">
            {k('files_recordings_hint')}
          </Typography>
          <RecordingSearch song={m.song} disabled={busy} onReplaced={m.adopt} />
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
            disabled={busy}
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
        <Button
          component="a"
          href={songArchiveUrl(m.song.id)}
          download
          startIcon={<ZipIcon />}
          title={k('files_zip_hint')}
          sx={{ mr: 'auto' }}
        >
          {k('files_zip')}
        </Button>
        <Button onClick={close}>{t('common.close')}</Button>
        <Button
          variant="contained"
          disabled={busy || m.update.kind === 'invalid' || !dirty}
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
