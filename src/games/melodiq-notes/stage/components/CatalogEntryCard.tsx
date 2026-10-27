import { Box, Button, Chip, IconButton, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import PlayIcon from '@mui/icons-material/PlayArrowRounded';
import { useTranslation } from 'react-i18next';
import type { CompanionSong } from '../../../../lib/companion/songScoresApi';
import type { CatalogMatch } from '../logic/catalogSearch';
import type { CatalogItem, CatalogScore } from '../logic/scoreCatalog';

interface CatalogEntryCardProps {
  match: CatalogMatch;
  onPlay: (item: CatalogScore) => void;
  onPlayKaraoke: (song: CompanionSong) => void;
  onDelete: () => void;
}

/**
 * One song of the library: its scores and karaoke vocals as play buttons, each with its
 * instruments and format. Songs with a karaoke `.txt` carry a badge; only songs without
 * `.txt` can be deleted here (Melodiq songs are deleted in Melodiq).
 */
export function CatalogEntryCard({
  match,
  onPlay,
  onPlayKaraoke,
  onDelete,
}: CatalogEntryCardProps) {
  const { t } = useTranslation();
  const k = (key: string, opts?: Record<string, unknown>) =>
    t(`games.melodiq_notes.stage.${key}`, opts);
  const { entry, items } = match;
  const meta = [
    entry.genre,
    entry.language,
    entry.year,
    k('notes_recordings', { count: entry.recordings }),
  ]
    .filter(Boolean)
    .join(' · ');
  // karaoke vocals are named by their instrument, a score by its label or file
  const name = (item: CatalogItem) =>
    item.kind === 'score' ? (item.score.label ?? item.score.file) : k('instruments.vocals');
  const details = (item: CatalogItem) =>
    [
      ...(item.kind === 'score' ? item.instruments.map((i) => k(`instruments.${i}`)) : []),
      k(`formats.${item.format}`),
    ].join(' · ');
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.25 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700}>
            {entry.artist ? `${entry.artist} – ${entry.title}` : entry.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="div">
            {meta}
          </Typography>
        </Box>
        {entry.song.karaoke !== false && (
          <Chip
            size="small"
            variant="outlined"
            label={k('source_song')}
            title={k('source_song_hint')}
          />
        )}
        {!entry.karaoke && entry.song.karaoke === false && (
          <IconButton size="small" aria-label={k('notes_delete')} onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
        {items.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            {k('no_scores')}
          </Typography>
        )}
        {items.map((item) => (
          <Button
            key={item.kind === 'score' ? item.score.file : 'karaoke'}
            size="small"
            variant={item.kind === 'score' ? 'contained' : 'outlined'}
            startIcon={<PlayIcon />}
            title={item.kind === 'karaoke' ? k('play_karaoke_hint') : item.score.file}
            onClick={() => (item.kind === 'score' ? onPlay(item.score) : onPlayKaraoke(item.song))}
            sx={{ textTransform: 'none', alignItems: 'baseline' }}
          >
            {name(item)}
            <Box component="span" sx={{ ml: 0.75, opacity: 0.75, fontSize: '0.75em' }}>
              {details(item)}
            </Box>
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
