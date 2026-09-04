import React, { useState, useRef, useEffect } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import { useTranslation } from 'react-i18next';
import { ExcalidrawViewer } from '../../../modules/drawing';
import type { GarticGameState } from '../types';

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
  const [localBookIndex, setLocalBookIndex] = useState(state.currentRevealBookIndex || 0);
  const [localRevealedStepsCount, setLocalRevealedStepsCount] = useState((state.currentRevealStepIndex || 0) + 1);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  // Sync with host's broadcast if not host
  const bookIndex = isHost ? localBookIndex : (state.currentRevealBookIndex ?? localBookIndex);
  const revealedStepsCount = isHost ? localRevealedStepsCount : Math.max(1, (state.currentRevealStepIndex ?? 0) + 1);

  const prevBookIndexRef = useRef(bookIndex);

  // Auto-scroll logic: scroll down on new step, scroll to top on new album
  useEffect(() => {
    if (prevBookIndexRef.current !== bookIndex) {
      prevBookIndexRef.current = bookIndex;
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (revealedStepsCount > 1) {
      // Delay slightly so the new step's DOM is rendered
      const timer = setTimeout(() => {
        if (bottomAnchorRef.current) {
          bottomAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [bookIndex, revealedStepsCount]);

  const currentBook = state.books[bookIndex] || state.books[0];
  if (!currentBook) return null;

  const totalSteps = currentBook.steps.length;
  const isBookFullyRevealed = revealedStepsCount >= totalSteps;
  const hasNextBook = bookIndex < state.books.length - 1;

  const handleNextStep = () => {
    if (!isHost) return;
    let nextBook = bookIndex;
    let nextStepCount = revealedStepsCount;

    if (revealedStepsCount < totalSteps) {
      nextStepCount = revealedStepsCount + 1;
      setLocalRevealedStepsCount(nextStepCount);
    } else if (hasNextBook) {
      nextBook = bookIndex + 1;
      nextStepCount = 1;
      setLocalBookIndex(nextBook);
      setLocalRevealedStepsCount(1);
    }

    if (onRevealStateChange) {
      onRevealStateChange(nextBook, nextStepCount - 1);
    }
  };

  const handlePrevStep = () => {
    if (!isHost) return;
    let prevBook = bookIndex;
    let prevStepCount = revealedStepsCount;

    if (revealedStepsCount > 1) {
      prevStepCount = revealedStepsCount - 1;
      setLocalRevealedStepsCount(prevStepCount);
    } else if (bookIndex > 0) {
      prevBook = bookIndex - 1;
      const prevB = state.books[prevBook];
      prevStepCount = prevB ? prevB.steps.length : 1;
      setLocalBookIndex(prevBook);
      setLocalRevealedStepsCount(prevStepCount);
    }

    if (onRevealStateChange) {
      onRevealStateChange(prevBook, prevStepCount - 1);
    }
  };

  const handleSelectBook = (idx: number) => {
    if (!isHost) return;
    setLocalBookIndex(idx);
    setLocalRevealedStepsCount(1);
    if (onRevealStateChange) {
      onRevealStateChange(idx, 0);
    }
  };

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
      {/* Book Selection Row */}
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <AutoStoriesRoundedIcon color="secondary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={800}>
            {t('guessart.albumOf', { name: currentBook.ownerName, defaultValue: `Album von ${currentBook.ownerName}` })}
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

      {/* Steps Progression */}
      <Stack spacing={2}>
        {visibleSteps.map((step, idx) => {
          const isInitial = idx === 0;
          return (
            <Card
              key={`${currentBook.ownerId}-step-${idx}`}
              elevation={3}
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: isInitial ? 'primary.main' : 'divider',
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.85rem', bgcolor: 'primary.main' }}>
                    {step.authorName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="subtitle2" fontWeight={800}>
                    {step.authorName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.type === 'prompt'
                      ? isInitial
                        ? `• ${t('guessart.originalPrompt', 'Original-Satz')}`
                        : `• ${t('guessart.guess', 'Tipp')}`
                      : `• ${t('guessart.drawing', 'Zeichnung')}`}
                  </Typography>
                </Box>

                {step.type === 'prompt' ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: isInitial ? 'action.selected' : 'action.hover',
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      color={isInitial ? 'primary.main' : 'text.primary'}
                    >
                      "{step.content}"
                    </Typography>
                  </Paper>
                ) : (
                  <Box
                    sx={{
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <ExcalidrawViewer data={step.content} animate={false} height={320} />
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Auto-scroll anchor right before navigation controls */}
      <div ref={bottomAnchorRef} style={{ height: 1 }} />

      {/* Navigation Controls: Only host can advance/reveal */}
      <Paper
        elevation={4}
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
              onClick={handlePrevStep}
              disabled={bookIndex === 0 && revealedStepsCount === 1}
            >
              {t('common.back', 'Zurück')}
            </Button>

            <Typography variant="body2" fontWeight={700} color="text.secondary">
              {revealedStepsCount} / {totalSteps} {t('guessart.steps', 'Schritte')}
            </Typography>

            {isBookFullyRevealed && !hasNextBook ? (
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<HomeRoundedIcon />} onClick={onBackToMenu}>
                  {t('common.menu', 'Menü')}
                </Button>
                <Button variant="contained" color="primary" startIcon={<ReplayRoundedIcon />} onClick={onRestartGame}>
                  {t('guessart.newGarticGame', 'Neues Spiel')}
                </Button>
              </Stack>
            ) : (
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardRoundedIcon />}
                onClick={handleNextStep}
                sx={{ fontWeight: 700 }}
              >
                {isBookFullyRevealed ? t('guessart.nextAlbum', 'Nächstes Album ➔') : t('guessart.revealNext', 'Weiter aufdecken')}
              </Button>
            )}
          </>
        ) : (
          <>
            <Chip
              label={t('gartic.hostControlsShow', '🎬 Der Host steuert die Album-Show')}
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="body2" fontWeight={700} color="text.secondary">
              {revealedStepsCount} / {totalSteps} {t('guessart.steps', 'Schritte')}
            </Typography>
            <Button variant="outlined" startIcon={<HomeRoundedIcon />} onClick={onBackToMenu}>
              {t('common.menu', 'Menü')}
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};
