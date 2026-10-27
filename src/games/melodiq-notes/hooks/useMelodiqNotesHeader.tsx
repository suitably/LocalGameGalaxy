import { useEffect, type ReactNode } from 'react';
import { alpha, Box, Stack, Typography, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded';
import MusicNoteIcon from '@mui/icons-material/MusicNoteRounded';
import { useTranslation } from 'react-i18next';
import { usePageTitle, useHeaderLayout } from '../../../context/LayoutContext';
import { TOUCH_TARGET } from '../../../lib/touchTarget';

interface UseMelodiqNotesHeaderOptions {
  currentTitle: string | null;
  currentArtist: string | null;
  effectiveBpm: number;
  onOpenSongSelect: () => void;
  /** The recording behind the song: its state as label and icon, and its sheet. */
  recording: { label: string; icon: ReactNode; onOpen: () => void };
}

export function useMelodiqNotesHeader({
  currentTitle,
  currentArtist,
  effectiveBpm,
  onOpenSongSelect,
  recording,
}: UseMelodiqNotesHeaderOptions) {
  const { t } = useTranslation();
  const { setMenuItems, setCustomHeaderTitle } = useHeaderLayout();

  usePageTitle(
    currentTitle
      ? `${currentTitle} - ${t('games.melodiq_notes.title')}`
      : t('games.melodiq_notes.title'),
  );

  // 1. The song title opens the song picker (the only way to it, the chevron says so)
  useEffect(() => {
    setCustomHeaderTitle(
      <Box
        onClick={onOpenSongSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onOpenSongSelect();
        }}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`${t('games.melodiq_notes.stage.song_pick')}: ${currentTitle ?? ''}`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          maxWidth: '100%',
          minWidth: 0,
          cursor: 'pointer',
          minHeight: TOUCH_TARGET,
          px: 1,
          borderRadius: 2,
          transition: 'background-color 0.2s',
          '&:hover': { bgcolor: (theme) => alpha(theme.palette.text.primary, 0.08) },
        }}
      >
        <MusicNoteIcon
          sx={{ color: 'primary.text', fontSize: { xs: 20, sm: 24 }, flexShrink: 0 }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              noWrap
              sx={{ color: 'text.primary', fontSize: { xs: '0.9rem', sm: '1.05rem' } }}
            >
              {currentTitle || t('games.melodiq_notes.title')}
            </Typography>
            {effectiveBpm ? (
              <Chip
                label={`${effectiveBpm} BPM`}
                size="small"
                variant="outlined"
                sx={{
                  height: 18,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  flexShrink: 0,
                  // phones need the room for the title
                  display: { xs: 'none', sm: 'inline-flex' },
                }}
              />
            ) : null}
          </Stack>
          {currentArtist && (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: 'block', lineHeight: 1 }}
            >
              {currentArtist}
            </Typography>
          )}
        </Box>
        <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
      </Box>,
    );

    return () => {
      setCustomHeaderTitle(null);
    };
  }, [currentTitle, currentArtist, effectiveBpm, onOpenSongSelect, setCustomHeaderTitle, t]);

  // 2. The recording behind the song sits next to it; mode, input and players are on the stage
  const { label, icon, onOpen } = recording;
  useEffect(() => {
    setMenuItems([{ label, icon, action: onOpen, showAlways: true }]);
  }, [label, icon, onOpen, setMenuItems]);
  useEffect(() => () => setMenuItems([]), [setMenuItems]);
}
