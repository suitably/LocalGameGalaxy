import {
  Alert,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listLibrarySongs, type CompanionSong } from '../../../../lib/companion/songScoresApi';
import { NotesDialogFrame } from '../../components/NotesDialogFrame';
import { defaultSongChoice, rankSongChoices, type SaveTarget } from '../logic/songLink';

interface SongChoiceDialogProps {
  /** `save`: a new score — offers a new song and a label; `move`: a song moving into another. */
  mode: 'save' | 'move';
  /** Artist and title of the score: the same normalised pair is offered first. */
  score: { title: string; artist: string };
  /** The song being moved, left out of the list. */
  excludeId?: string;
  onChoose: (target: SaveTarget) => void;
  onCancel: () => void;
}

/**
 * Picks the song a score goes to (#563), searched by artist and title; mounted only while open.
 * With `mode: 'save'` "New song" is a choice and the score gets a free-text label.
 */
export function SongChoiceDialog({
  mode,
  score,
  excludeId,
  onChoose,
  onCancel,
}: SongChoiceDialogProps) {
  const { t } = useTranslation();
  const k = (key: string) => t(`games.melodiq_notes.stage.${key}`);
  const [songs, setSongs] = useState<CompanionSong[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [label, setLabel] = useState('');
  // undefined: not chosen yet (the default applies once the songs are loaded)
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    listLibrarySongs()
      .then((list) => live && setSongs(list))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, []);

  const choices = useMemo(
    () => rankSongChoices(songs ?? [], score, query, excludeId),
    [songs, score, query, excludeId],
  );
  const selected = chosen === undefined ? defaultSongChoice(choices) : chosen;
  const canChoose = mode === 'save' || !!selected;

  return (
    <NotesDialogFrame
      open
      onClose={onCancel}
      maxWidth="sm"
      title={k(mode === 'save' ? 'link_save_title' : 'link_move_title')}
    >
      <DialogContent>
        <Stack spacing={1.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            size="small"
            label={k('link_search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {!songs && !error && <LinearProgress />}
          <List dense sx={{ maxHeight: 280, overflowY: 'auto' }}>
            {mode === 'save' && (
              <ListItemButton selected={selected === null} onClick={() => setChosen(null)}>
                <ListItemText primary={k('link_new_song')} secondary={score.title} />
              </ListItemButton>
            )}
            {choices.map(({ song, exact }) => (
              <ListItemButton
                key={song.id}
                selected={selected === song.id}
                onClick={() => setChosen(song.id)}
              >
                <ListItemText primary={song.title} secondary={song.artist || undefined} />
                {exact && <Chip size="small" color="primary" label={k('link_same_song')} />}
                {song.karaoke !== false && (
                  <Chip size="small" variant="outlined" label={k('source_song')} sx={{ ml: 1 }} />
                )}
              </ListItemButton>
            ))}
          </List>
          {mode === 'save' && (
            <TextField
              size="small"
              label={k('link_label')}
              helperText={k('link_label_hint')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!canChoose}
          onClick={() => onChoose({ songId: selected ?? null, label: label.trim() })}
        >
          {k(mode === 'save' ? 'save_to_library' : 'link_move_action')}
        </Button>
      </DialogActions>
    </NotesDialogFrame>
  );
}
