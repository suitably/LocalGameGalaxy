import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../../../../components/common/ConfirmDialog';
import { EmptyState } from '../../../../components/common/EmptyState';
import { ErrorState } from '../../../../components/common/ErrorState';
import { ListSkeleton } from '../../../../components/common/ListSkeleton';
import {
  isCompanionEnabled,
  scoreSearchUrl,
  type CompanionSong,
} from '../../../../lib/companion/songScoresApi';
import { deleteNotesPiece } from '../../../../lib/companion/notesLibraryApi';
import {
  filterCatalog,
  loadScoreCatalog,
  type CatalogEntry,
  type CatalogScore,
  type ScoreCatalog,
} from '../logic/scoreCatalog';

const MAX_LISTED = 80;

interface ScoreLibraryListProps {
  onPlay: (item: CatalogScore) => void;
  /** Plays a Melodiq song's karaoke `.txt` as a vocal part (#566). */
  onPlayKaraoke: (song: CompanionSong) => void;
}

/**
 * The sheet-music library of Melodiq Notes: the pieces of the Notes library (the only score
 * store, Q18). Pieces linked to a Melodiq song carry a badge and play with the song's mix; songs
 * with a karaoke `.txt` also offer their vocals (#566).
 */
export function ScoreLibraryList({ onPlay, onPlayKaraoke }: ScoreLibraryListProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const [catalog, setCatalog] = useState<ScoreCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState<CatalogEntry | null>(null);
  const enabled = isCompanionEnabled();

  const reload = useCallback(() => {
    loadScoreCatalog()
      .then((next) => {
        setCatalog(next);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const shown = useMemo(
    () => filterCatalog(catalog?.entries ?? [], query).slice(0, MAX_LISTED),
    [catalog, query],
  );

  const remove = async (entry: CatalogEntry) => {
    setDeleting(null);
    if (!entry.piece) return;
    try {
      await deleteNotesPiece(entry.piece.id);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!enabled) return <Alert severity="info">{k('server_off')}</Alert>;
  const errors = catalog?.errors ?? {};
  return (
    <Stack spacing={1.5}>
      {error && <ErrorState dense message={k('server_error', { error })} onRetry={reload} />}
      {errors.notes && (
        <Alert severity="warning">{k('notes_server_error', { error: errors.notes })}</Alert>
      )}
      {errors.songs && (
        <Alert severity="warning">{k('server_error', { error: errors.songs })}</Alert>
      )}
      <TextField
        size="small"
        label={k('search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Link
        href={scoreSearchUrl('', query)}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
        title={k('find_scores_hint')}
      >
        {k('find_scores')}
      </Link>
      {!catalog && !error && <ListSkeleton rows={3} />}
      {catalog?.entries.length === 0 && <EmptyState dense message={k('notes_empty')} />}
      {shown.map((entry) => (
        <Box key={entry.key} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.25 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ flexGrow: 1 }}>
              {entry.artist ? `${entry.artist} – ${entry.title}` : entry.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {k('notes_recordings', { count: entry.recordings })}
            </Typography>
            {entry.piece?.songId && (
              <Chip
                size="small"
                variant="outlined"
                label={k('source_song')}
                title={k('source_song_hint')}
              />
            )}
            {entry.piece && (
              <IconButton
                size="small"
                aria-label={k('notes_delete')}
                onClick={() => setDeleting(entry)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            alignItems="center"
            sx={{ mt: 0.75 }}
          >
            {entry.scores.length === 0 && !entry.karaoke && (
              <Typography variant="caption" color="text.secondary">
                {k('no_scores')}
              </Typography>
            )}
            {entry.scores.map((item) => (
              <Button key={item.file} size="small" variant="contained" onClick={() => onPlay(item)}>
                {k('play_score')}: {item.file}
              </Button>
            ))}
            {entry.karaoke && (
              <Button
                size="small"
                variant="outlined"
                title={k('play_karaoke_hint')}
                onClick={() => entry.karaoke && onPlayKaraoke(entry.karaoke)}
              >
                {k('play_karaoke')}
              </Button>
            )}
          </Stack>
        </Box>
      ))}
      <ConfirmDialog
        open={!!deleting}
        title={k('notes_delete')}
        message={
          k('notes_delete_confirm', { title: deleting?.title ?? '' }) +
          (deleting?.piece?.songId ? ` ${k('notes_delete_song_kept')}` : '')
        }
        confirmText={t('common.delete')}
        confirmColor="error"
        onConfirm={() => deleting && void remove(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </Stack>
  );
}
