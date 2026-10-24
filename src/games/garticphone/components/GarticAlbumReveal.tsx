import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import { useTranslation } from 'react-i18next';
import type { GarticGameState } from '../types';
import { AlbumRevealControls } from './AlbumRevealControls';
import { AlbumStepCard } from './AlbumStepCard';
import { useAlbumReveal } from './useAlbumReveal';

interface GarticAlbumRevealProps {
  state: GarticGameState;
  isHost?: boolean;
  onRevealStateChange?: (bookIndex: number, stepIndex: number) => void;
  onRestartGame: () => void;
  onBackToMenu: () => void;
}

export const GarticAlbumReveal: React.FC<GarticAlbumRevealProps> = ({
  state,
  isHost = false,
  onRevealStateChange,
  onRestartGame,
  onBackToMenu,
}) => {
  const { t } = useTranslation();
  const {
    scrollContainerRef,
    bottomAnchorRef,
    currentBook,
    bookIndex,
    revealedStepsCount,
    totalSteps,
    isBookFullyRevealed,
    hasNextBook,
    handleNextStep,
    handlePrevStep,
    handleSelectBook,
  } = useAlbumReveal({ state, isHost, onRevealStateChange });
  if (!currentBook) return null;

  const visibleSteps = currentBook.steps.slice(0, revealedStepsCount);

  return (
    <Box
      ref={scrollContainerRef}
      sx={{
        flexGrow: 1,
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
        p: { xs: 1.5, sm: 2.5 },
        maxWidth: 720,
        mx: 'auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <AutoStoriesRoundedIcon color="secondary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={800}>
            {t('guessart.albumOf', {
              name: currentBook.ownerName,
              defaultValue: `Album von ${currentBook.ownerName}`,
            })}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5 }}>
          {state.books.map((b, idx) => (
            <Chip
              key={b.ownerId}
              label={b.ownerName}
              size="small"
              color={idx === bookIndex ? 'secondary' : 'default'}
              variant={idx === bookIndex ? 'filled' : 'outlined'}
              onClick={isHost ? () => handleSelectBook(idx) : undefined}
              sx={{ fontWeight: 700, cursor: isHost ? 'pointer' : 'default' }}
            />
          ))}
        </Stack>
      </Box>

      <Stack spacing={2}>
        {visibleSteps.map((step, idx) => (
          <AlbumStepCard
            key={`${currentBook.ownerId}-step-${idx}`}
            step={step}
            isInitial={idx === 0}
          />
        ))}
      </Stack>

      {/* Auto-scroll anchor right before navigation controls */}
      <div ref={bottomAnchorRef} style={{ height: 1 }} />

      <AlbumRevealControls
        isHost={isHost}
        bookIndex={bookIndex}
        revealedStepsCount={revealedStepsCount}
        totalSteps={totalSteps}
        isBookFullyRevealed={isBookFullyRevealed}
        hasNextBook={hasNextBook}
        onPrev={handlePrevStep}
        onNext={handleNextStep}
        onRestartGame={onRestartGame}
        onBackToMenu={onBackToMenu}
      />
    </Box>
  );
};
