import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { isCompanionEnabled } from '../../../../lib/companion/songScoresApi';
import {
  deleteNotesPiece,
  listNotesPieces,
  type NotesPiece,
  type NotesPieceScore,
} from '../../../../lib/companion/notesLibraryApi';

interface NotesLibraryListProps {
  onPlay: (piece: NotesPiece, score: NotesPieceScore) => void;
}

/** Pieces saved to the Notes library on the companion server: scores with their recordings. */
export function NotesLibraryList({ onPlay }: NotesLibraryListProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [pieces, setPieces] = useState<NotesPiece[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<NotesPiece | null>(null);
  const enabled = isCompanionEnabled();

  const reload = useCallback(() => {
    listNotesPieces()
      .then((list) => {
        setPieces(list);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (pieces ?? []).filter((p) => !q || `${p.artist} ${p.title}`.toLowerCase().includes(q));
  }, [pieces, query]);

  const remove = async (piece: NotesPiece) => {
    setDeleting(null);
    try {
      await deleteNotesPiece(piece.id);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!enabled) return <Alert severity="info">{k('server_off')}</Alert>;
  return (
    <Stack spacing={1.5}>
      {error && <Alert severity="warning">{k('notes_server_error', { error })}</Alert>}
      <TextField
        size="small"
        label={k('search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {!pieces && !error && <CircularProgress size={24} sx={{ alignSelf: 'center' }} />}
      {pieces?.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {k('notes_empty')}
        </Typography>
      )}
      {shown.map((p) => (
        <Box key={p.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.25 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ flexGrow: 1 }}>
              {p.artist ? `${p.artist} – ${p.title}` : p.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {k('notes_recordings', { count: p.recordings.length })}
            </Typography>
            <IconButton size="small" aria-label={k('notes_delete')} onClick={() => setDeleting(p)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
            {p.scores.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                {k('no_scores')}
              </Typography>
            )}
            {p.scores.map((score) => (
              <Button
                key={score.file}
                size="small"
                variant="contained"
                onClick={() => onPlay(p, score)}
              >
                {k('play_score')}: {score.file}
              </Button>
            ))}
          </Stack>
        </Box>
      ))}
      <ConfirmDialog
        open={!!deleting}
        title={k('notes_delete')}
        message={k('notes_delete_confirm', { title: deleting?.title ?? '' })}
        confirmText={t('common.delete')}
        confirmColor="error"
        onConfirm={() => deleting && void remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </Stack>
  );
}
