import React from 'react';
import { Button, Chip, Paper, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import SlideshowRoundedIcon from '@mui/icons-material/SlideshowRounded';
import { useTranslation } from 'react-i18next';

interface AlbumRevealControlsProps {
  isHost: boolean;
  bookIndex: number;
  revealedStepsCount: number;
  totalSteps: number;
  isBookFullyRevealed: boolean;
  hasNextBook: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRestartGame: () => void;
  onBackToMenu: () => void;
}

/** Navigation row below the album: only the host can step back/forward or restart. */
export const AlbumRevealControls: React.FC<AlbumRevealControlsProps> = ({
  isHost,
  bookIndex,
  revealedStepsCount,
  totalSteps,
  isBookFullyRevealed,
  hasNextBook,
  onPrev,
  onNext,
  onRestartGame,
  onBackToMenu,
}) => {
  const { t } = useTranslation();
  const progress = (
    <Typography variant="body2" fontWeight={700} color="text.secondary">
      {revealedStepsCount} / {totalSteps} {t('guessart.steps', 'Schritte')}
    </Typography>
  );
  const menuButton = (
    <Button variant="outlined" startIcon={<HomeRoundedIcon />} onClick={onBackToMenu}>
      {t('common.menu', 'Menü')}
    </Button>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mt: 1,
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      {isHost ? (
        <>
          <Button
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onPrev}
            disabled={bookIndex === 0 && revealedStepsCount === 1}
          >
            {t('common.back', 'Zurück')}
          </Button>

          {progress}

          {isBookFullyRevealed && !hasNextBook ? (
            <Stack direction="row" spacing={1}>
              {menuButton}
              <Button
                variant="contained"
                color="primary"
                startIcon={<ReplayRoundedIcon />}
                onClick={onRestartGame}
              >
                {t('guessart.newGarticGame', 'Neues Spiel')}
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              color="primary"
              endIcon={<ArrowForwardRoundedIcon />}
              onClick={onNext}
              sx={{ fontWeight: 700 }}
            >
              {isBookFullyRevealed
                ? t('guessart.nextAlbum', 'Nächstes Album')
                : t('guessart.revealNext', 'Weiter aufdecken')}
            </Button>
          )}
        </>
      ) : (
        <>
          <Chip
            icon={<SlideshowRoundedIcon />}
            label={t('gartic.hostControlsShow', 'Der Host steuert die Album-Show')}
            color="secondary"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
          {progress}
          {menuButton}
        </>
      )}
    </Paper>
  );
};
